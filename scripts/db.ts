#!/usr/bin/env npx tsx

/**
 * Database CLI Tool
 *
 * Commands:
 *   reset        - Clear all data from public tables (keeps schema)
 *   seed:base    - Seed base unit with admin user
 *   seed:test    - Seed test data (scouts, parents, role users)
 *   seed:all     - Run base + test seeds
 *   dump [name]  - Dump current database to a seed file
 *   restore <file> - Restore from a dump file
 *
 * Usage:
 *   npx tsx scripts/db.ts reset
 *   npx tsx scripts/db.ts seed:base
 *   npx tsx scripts/db.ts seed:test
 *   npx tsx scripts/db.ts seed:all
 *   npx tsx scripts/db.ts dump my-snapshot
 *   npx tsx scripts/db.ts restore supabase/seeds/my-snapshot.json
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Fixed UUIDs for predictable testing
const UNIT_ID = '10000000-0000-4000-a000-000000000001';

// Test user emails
const TEST_USERS = {
  admin: 'richard.blaalid+admin@withcaldera.com',
  treasurer: 'richard.blaalid+treasurer@withcaldera.com',
  leader: 'richard.blaalid+leader@withcaldera.com',
  parent: 'richard.blaalid+parent@withcaldera.com',
  scout: 'richard.blaalid+scout@withcaldera.com',
};

const TEST_PASSWORD = 'testpassword123';

async function createOrGetUser(email: string, name: string): Promise<string> {
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    console.log(`  User exists: ${email}`);
    return existing.id;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  console.log(`  Created user: ${email}`);
  return data.user.id;
}

async function deleteAllTestUsers(): Promise<void> {
  console.log('Deleting test users...');
  const { data: users } = await supabase.auth.admin.listUsers();

  for (const user of users?.users || []) {
    if (user.email && Object.values(TEST_USERS).includes(user.email)) {
      await supabase.auth.admin.deleteUser(user.id);
      console.log(`  Deleted: ${user.email}`);
    }
  }
}

async function resetDatabase(): Promise<void> {
  console.log('Resetting database...');

  // Tables in dependency order (children first)
  // Must clear tables that reference others before the referenced tables
  const tables = [
    // Sync/staging tables
    'sync_staged_members',
    'scoutbook_sync_sessions',
    // Square/payment tables (must come before payments and billing)
    'square_transactions',
    'payment_links',
    // Billing tables
    'billing_charges',
    'billing_records',
    // Journal tables
    'journal_lines',
    'journal_entries',
    // Payment tables
    'payments',
    // Event tables
    'event_registrations',
    'events',
    // Scout tables
    'scout_guardians',
    'scout_accounts',
    'scouts',
    // Unit tables
    'unit_invites',
    'unit_memberships',
    'patrols',
    'accounts',
    // Audit log (before units due to FK)
    'audit_log',
    // Core tables
    'units',
    'profiles',
    // Waitlist
    'waitlist_entries',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
          // Table doesn't exist, skip silently
        } else {
          console.log(`  Warning (${table}): ${error.message}`);
        }
      } else {
        console.log(`  Cleared: ${table}`);
      }
    } catch (e) {
      // Ignore errors for non-existent tables
    }
  }

  // Also delete test auth users
  await deleteAllTestUsers();

  console.log('Database reset complete!');
}

async function seedBase(): Promise<void> {
  console.log('Seeding base data...');

  // 1. Create admin user
  console.log('Creating admin user...');
  const adminUserId = await createOrGetUser(TEST_USERS.admin, 'Admin User');

  // 2. Create/update profile for admin (user_id links to auth, id is auto-generated)
  // Note: The handle_new_user trigger may have already created a profile
  console.log('Creating admin profile...');

  // First check if profile already exists (created by trigger)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', adminUserId)
    .single();

  let adminProfileId: string;

  if (existingProfile) {
    // Update existing profile
    adminProfileId = existingProfile.id;
    const { error: updateError } = await supabase.from('profiles').update({
      email: TEST_USERS.admin,
      full_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      phone_primary: '555-123-0001',
    }).eq('id', adminProfileId);
    if (updateError) console.log(`  Warning: ${updateError.message}`);
    console.log(`  Updated existing profile: ${adminProfileId}`);
  } else {
    // Create new profile
    const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
      user_id: adminUserId,
      email: TEST_USERS.admin,
      full_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      phone_primary: '555-123-0001',
    }).select('id').single();
    if (insertError) {
      console.error(`  Failed to create profile: ${insertError.message}`);
      return;
    }
    adminProfileId = newProfile.id;
    console.log(`  Created new profile: ${adminProfileId}`);
  }

  // 3. Create unit
  console.log('Creating unit...');
  const { error: unitError } = await supabase.from('units').upsert({
    id: UNIT_ID,
    name: 'Troop 123',
    unit_number: '123',
    unit_type: 'troop',
    council: 'Test Council',
    district: 'Test District',
    chartered_org: 'Test Chartered Org',
  });
  if (unitError) console.log(`  Warning: ${unitError.message}`);

  // 4. Create admin membership (use profile_id, not user_id)
  console.log('Creating admin membership...');
  // First delete any existing membership for this profile
  await supabase.from('unit_memberships').delete().eq('profile_id', adminProfileId);
  const { error: memberError } = await supabase.from('unit_memberships').insert({
    unit_id: UNIT_ID,
    profile_id: adminProfileId,
    role: 'admin',
    status: 'active',
  });
  if (memberError) console.log(`  Warning: ${memberError.message}`);
  else console.log(`  Created admin membership`);

  console.log('\n✅ Base seed complete!');
  console.log(`\nLogin credentials:`);
  console.log(`  Email: ${TEST_USERS.admin}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
}

async function seedTestData(): Promise<void> {
  console.log('Seeding test data...');

  // 1. Create test users for each role
  console.log('\nCreating test users for each role...');
  const userIds: Record<string, string> = {};
  const profileIds: Record<string, string> = {};

  for (const [role, email] of Object.entries(TEST_USERS)) {
    if (role === 'admin') continue; // Already created in base seed
    const name = `${role.charAt(0).toUpperCase() + role.slice(1)} User`;
    userIds[role] = await createOrGetUser(email, name);
  }

  // 2. Create/update profiles for test users (user_id links to auth, id is auto-generated)
  // Note: The handle_new_user trigger may have already created profiles
  console.log('\nCreating profiles...');
  for (const [role, userId] of Object.entries(userIds)) {
    // First check if profile already exists (created by trigger)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      profileIds[role] = existingProfile.id;
      const { error: updateError } = await supabase.from('profiles').update({
        email: TEST_USERS[role as keyof typeof TEST_USERS],
        full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        first_name: role.charAt(0).toUpperCase() + role.slice(1),
        last_name: 'User',
        phone_primary: `555-123-${String(Object.keys(userIds).indexOf(role) + 2).padStart(4, '0')}`,
      }).eq('id', existingProfile.id);
      if (updateError) console.log(`  Warning: ${updateError.message}`);
      else console.log(`  Updated profile: ${role}`);
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
        user_id: userId,
        email: TEST_USERS[role as keyof typeof TEST_USERS],
        full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        first_name: role.charAt(0).toUpperCase() + role.slice(1),
        last_name: 'User',
        phone_primary: `555-123-${String(Object.keys(userIds).indexOf(role) + 2).padStart(4, '0')}`,
      }).select('id').single();
      if (insertError) console.log(`  Warning: ${insertError.message}`);
      else {
        profileIds[role] = newProfile.id;
        console.log(`  Created profile: ${role}`);
      }
    }
  }

  // 3. Create memberships for test users (use profile_id, not user_id)
  console.log('\nCreating memberships...');
  const roleMapping: Record<string, string> = {
    treasurer: 'treasurer',
    leader: 'leader',
    parent: 'parent',
    scout: 'scout',
  };

  for (const [role, profileId] of Object.entries(profileIds)) {
    if (role === 'admin' || !profileId) continue;
    // First delete any existing membership for this profile
    await supabase.from('unit_memberships').delete().eq('profile_id', profileId);
    const { error } = await supabase.from('unit_memberships').insert({
      unit_id: UNIT_ID,
      profile_id: profileId,
      role: roleMapping[role],
      status: 'active',
    });
    if (error) console.log(`  Warning: ${error.message}`);
    else console.log(`  Created membership: ${role}`);
  }

  // 4. Create patrols and get their IDs
  console.log('\nCreating patrols...');
  const patrolNames = ['Eagle', 'Wolf', 'Bear'];
  const patrolIds: Record<string, string> = {};

  for (const patrolName of patrolNames) {
    const { data, error } = await supabase.from('patrols').upsert(
      {
        unit_id: UNIT_ID,
        name: patrolName,
      },
      { onConflict: 'unit_id,name' }
    ).select('id').single();
    if (error && !error.message.includes('duplicate')) {
      console.log(`  Warning: ${error.message}`);
    } else {
      // If upsert didn't return data, fetch it
      if (data) {
        patrolIds[patrolName] = data.id;
      } else {
        const { data: existing } = await supabase
          .from('patrols')
          .select('id')
          .eq('unit_id', UNIT_ID)
          .eq('name', patrolName)
          .single();
        if (existing) patrolIds[patrolName] = existing.id;
      }
      console.log(`  Created patrol: ${patrolName}`);
    }
  }

  // 5. Create scouts (using patrol_id instead of patrol name)
  console.log('\nCreating scouts...');
  const scouts = [
    { id: '20000000-0000-4000-a000-000000000001', first_name: 'Alex', last_name: 'Anderson', patrol_name: 'Eagle', rank: 'First Class', bsa_member_id: '123456001' },
    { id: '20000000-0000-4000-a000-000000000002', first_name: 'Ben', last_name: 'Baker', patrol_name: 'Eagle', rank: 'Star', bsa_member_id: '123456002' },
    { id: '20000000-0000-4000-a000-000000000003', first_name: 'Charlie', last_name: 'Chen', patrol_name: 'Eagle', rank: 'Life', bsa_member_id: '123456003' },
    { id: '20000000-0000-4000-a000-000000000004', first_name: 'David', last_name: 'Davis', patrol_name: 'Wolf', rank: 'Tenderfoot', bsa_member_id: '123456004' },
    { id: '20000000-0000-4000-a000-000000000005', first_name: 'Ethan', last_name: 'Evans', patrol_name: 'Wolf', rank: 'Second Class', bsa_member_id: '123456005' },
    { id: '20000000-0000-4000-a000-000000000006', first_name: 'Frank', last_name: 'Fisher', patrol_name: 'Wolf', rank: 'Scout', bsa_member_id: '123456006' },
    { id: '20000000-0000-4000-a000-000000000007', first_name: 'George', last_name: 'Garcia', patrol_name: 'Bear', rank: 'First Class', bsa_member_id: '123456007' },
    { id: '20000000-0000-4000-a000-000000000008', first_name: 'Henry', last_name: 'Harris', patrol_name: 'Bear', rank: 'Star', bsa_member_id: '123456008' },
  ];

  for (const scout of scouts) {
    const { patrol_name, ...scoutData } = scout;
    const { error } = await supabase.from('scouts').upsert({
      ...scoutData,
      unit_id: UNIT_ID,
      patrol_id: patrolIds[patrol_name] || null,
      is_active: true,
      date_of_birth: '2012-01-15',
    });
    if (error) console.log(`  Warning: ${error.message}`);
    else console.log(`  Created scout: ${scout.first_name} ${scout.last_name}`);
  }

  // 6. Link parent user to scouts as guardian (use profile_id, not user_id)
  console.log('\nLinking parent to scouts...');
  const parentProfileId = profileIds['parent'];
  if (parentProfileId) {
    // Link to first two scouts
    for (const scoutId of [scouts[0].id, scouts[1].id]) {
      const { error } = await supabase.from('scout_guardians').upsert(
        {
          scout_id: scoutId,
          profile_id: parentProfileId,
          relationship: 'parent',
          is_primary: true,
        },
        { onConflict: 'scout_id,profile_id' }
      );
      if (error) console.log(`  Warning: ${error.message}`);
      else console.log(`  Linked parent to scout: ${scoutId}`);
    }
  }

  // 7. Link scout user to a scout profile (use profile_id, not user_id)
  console.log('\nLinking scout user to scout profile...');
  const scoutProfileId = profileIds['scout'];
  if (scoutProfileId) {
    const { error } = await supabase
      .from('scouts')
      .update({ profile_id: scoutProfileId })
      .eq('id', scouts[2].id); // Charlie Chen
    if (error) console.log(`  Warning: ${error.message}`);
    else console.log(`  Linked scout user to: Charlie Chen`);
  }

  console.log('\n✅ Test data seed complete!');
  console.log('\nTest user credentials (all use same password):');
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log('');
  for (const [role, email] of Object.entries(TEST_USERS)) {
    console.log(`  ${role.padEnd(10)}: ${email}`);
  }
}

// Tables to dump/restore in dependency order (parents first for restore)
const DUMP_TABLES = [
  'profiles',
  'units',
  'accounts',
  'patrols',
  'unit_memberships',
  'unit_invites',
  'scouts',
  'scout_accounts',
  'scout_guardians',
  'events',
  'event_registrations',
  'journal_entries',
  'journal_lines',
  'billing_records',
  'billing_charges',
  'payments',
  'payment_links',
  'square_transactions',
  'scoutbook_sync_sessions',
  'sync_staged_members',
];

interface DumpData {
  version: string;
  createdAt: string;
  tables: Record<string, unknown[]>;
  authUsers: Array<{ id: string; email: string; user_metadata: unknown }>;
}

async function dumpDatabase(name?: string): Promise<void> {
  console.log('Dumping database...\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = name || `dump-${timestamp}`;
  const filepath = path.join('supabase', 'seeds', `${filename}.json`);

  // Ensure seeds directory exists
  const seedsDir = path.join('supabase', 'seeds');
  if (!fs.existsSync(seedsDir)) {
    fs.mkdirSync(seedsDir, { recursive: true });
  }

  const dump: DumpData = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    tables: {},
    authUsers: [],
  };

  // Dump auth users (only test users)
  console.log('Dumping auth users...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  if (authUsers?.users) {
    dump.authUsers = authUsers.users
      .filter((u) => u.email) // Only users with email
      .map((u) => ({
        id: u.id,
        email: u.email!,
        user_metadata: u.user_metadata || {},
      }));
    console.log(`  Found ${dump.authUsers.length} auth users`);
  }

  // Dump each table
  for (const table of DUMP_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        if (!error.message.includes('does not exist') && !error.message.includes('schema cache')) {
          console.log(`  Warning (${table}): ${error.message}`);
        }
        continue;
      }
      if (data && data.length > 0) {
        dump.tables[table] = data;
        console.log(`  ${table}: ${data.length} rows`);
      }
    } catch (e) {
      // Skip non-existent tables
    }
  }

  // Write dump file
  fs.writeFileSync(filepath, JSON.stringify(dump, null, 2));
  console.log(`\n✅ Database dumped to: ${filepath}`);
  console.log(`   Tables: ${Object.keys(dump.tables).length}`);
  console.log(`   Auth users: ${dump.authUsers.length}`);
  console.log(`   Total rows: ${Object.values(dump.tables).reduce((sum, rows) => sum + rows.length, 0)}`);
}

async function restoreDatabase(filepath: string): Promise<void> {
  console.log(`Restoring from: ${filepath}\n`);

  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  const dump: DumpData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  console.log(`Dump created: ${dump.createdAt}`);
  console.log(`Tables: ${Object.keys(dump.tables).length}`);
  console.log(`Auth users: ${dump.authUsers.length}\n`);

  // First, reset the database
  console.log('Clearing existing data...');
  await resetDatabase();

  // Restore auth users
  console.log('\nRestoring auth users...');
  for (const user of dump.authUsers) {
    try {
      const { error } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: user.user_metadata as Record<string, unknown>,
        // Note: We can't restore the original ID, so users will get new IDs
        // This means we need to update the profile references
      });
      if (error && !error.message.includes('already been registered')) {
        console.log(`  Warning creating ${user.email}: ${error.message}`);
      } else {
        console.log(`  Created: ${user.email}`);
      }
    } catch (e) {
      console.log(`  Error creating ${user.email}: ${e}`);
    }
  }

  // Build a mapping of old user IDs to new user IDs
  console.log('\nBuilding user ID mapping...');
  const { data: newUsers } = await supabase.auth.admin.listUsers();
  const userIdMap = new Map<string, string>();

  for (const oldUser of dump.authUsers) {
    const newUser = newUsers?.users?.find((u) => u.email === oldUser.email);
    if (newUser) {
      userIdMap.set(oldUser.id, newUser.id);
      console.log(`  Mapped: ${oldUser.email} (${oldUser.id.slice(0, 8)}... -> ${newUser.id.slice(0, 8)}...)`);
    }
  }

  // Helper to remap user IDs in data
  // Note: profiles.user_id links to auth.users, but profiles.id is independent
  // Other tables use profile_id which references profiles.id (not auth.users.id)
  const remapUserIds = (data: Record<string, unknown>, table: string): Record<string, unknown> => {
    const remapped = { ...data };

    // For profiles table, only remap user_id (which links to auth.users)
    if (table === 'profiles') {
      if (remapped['user_id'] && typeof remapped['user_id'] === 'string' && userIdMap.has(remapped['user_id'] as string)) {
        remapped['user_id'] = userIdMap.get(remapped['user_id'] as string);
      }
      return remapped;
    }

    // For other tables, remap created_by/updated_by if they reference auth users
    const authUserFields = ['created_by', 'updated_by'];
    for (const field of authUserFields) {
      if (remapped[field] && typeof remapped[field] === 'string' && userIdMap.has(remapped[field] as string)) {
        remapped[field] = userIdMap.get(remapped[field] as string);
      }
    }
    // Note: profile_id references profiles.id which is preserved as-is
    return remapped;
  };

  // Restore tables in order
  console.log('\nRestoring tables...');
  for (const table of DUMP_TABLES) {
    const rows = dump.tables[table];
    if (!rows || rows.length === 0) continue;

    try {
      // Remap user IDs if this table has auth user references
      const remappedRows = rows.map((row) => remapUserIds(row as Record<string, unknown>, table));

      const { error } = await supabase.from(table).upsert(remappedRows);
      if (error) {
        console.log(`  Warning (${table}): ${error.message}`);
      } else {
        console.log(`  Restored: ${table} (${rows.length} rows)`);
      }
    } catch (e) {
      console.log(`  Error (${table}): ${e}`);
    }
  }

  console.log('\n✅ Database restored!');
}

async function listDumps(): Promise<void> {
  const seedsDir = path.join('supabase', 'seeds');
  if (!fs.existsSync(seedsDir)) {
    console.log('No dumps found. Run `npm run db:dump` to create one.');
    return;
  }

  const files = fs.readdirSync(seedsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No dumps found. Run `npm run db:dump` to create one.');
    return;
  }

  console.log('Available dumps:\n');
  for (const file of files) {
    const filepath = path.join(seedsDir, file);
    try {
      const dump: DumpData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      const tables = Object.keys(dump.tables).length;
      const rows = Object.values(dump.tables).reduce((sum, r) => sum + r.length, 0);
      console.log(`  ${file}`);
      console.log(`    Created: ${dump.createdAt}`);
      console.log(`    Tables: ${tables}, Rows: ${rows}, Users: ${dump.authUsers.length}\n`);
    } catch (e) {
      console.log(`  ${file} (invalid JSON)`);
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const arg = process.argv[3];

  console.log('🌱 Chuckbox Database Tool\n');

  switch (command) {
    case 'reset':
      await resetDatabase();
      break;
    case 'seed:base':
      await seedBase();
      break;
    case 'seed:test':
      await seedTestData();
      break;
    case 'seed:all':
      await seedBase();
      await seedTestData();
      break;
    case 'dump':
      await dumpDatabase(arg);
      break;
    case 'restore':
      if (!arg) {
        console.log('Usage: npx tsx scripts/db.ts restore <filepath>');
        console.log('');
        await listDumps();
        process.exit(1);
      }
      await restoreDatabase(arg);
      break;
    case 'dumps':
    case 'list':
      await listDumps();
      break;
    default:
      console.log('Usage: npx tsx scripts/db.ts <command>');
      console.log('');
      console.log('Commands:');
      console.log('  reset          - Clear all data from database');
      console.log('  seed:base      - Seed base unit with admin user');
      console.log('  seed:test      - Seed test data (scouts, parents, role users)');
      console.log('  seed:all       - Run base + test seeds');
      console.log('  dump [name]    - Dump current database to JSON file');
      console.log('  restore <file> - Restore from a dump file');
      console.log('  list           - List available dump files');
      process.exit(1);
  }
}

main().catch(console.error);
