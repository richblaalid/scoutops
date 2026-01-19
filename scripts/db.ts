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
 *
 * Flags:
 *   --prod       - Use production environment (.env.prod instead of .env.local)
 *
 * Production usage:
 *   npx tsx scripts/db.ts --prod seed:all
 *   npm run db:seed:all -- --prod
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Check for --prod flag
const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.prod' : '.env.local';

// Load environment variables
dotenv.config({ path: envFile });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
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
    { id: '20000000-0000-4000-a000-000000000001', first_name: 'Alex', last_name: 'A.', patrol_name: 'Eagle', rank: 'First Class', bsa_member_id: '123456001', current_position: 'Senior Patrol Leader', current_position_2: null },
    { id: '20000000-0000-4000-a000-000000000002', first_name: 'Ben', last_name: 'B.', patrol_name: 'Eagle', rank: 'Star', bsa_member_id: '123456002', current_position: 'Patrol Leader', current_position_2: 'Outdoor Ethics Guide' },
    { id: '20000000-0000-4000-a000-000000000003', first_name: 'Charlie', last_name: 'C.', patrol_name: 'Eagle', rank: 'Life', bsa_member_id: '123456003', current_position: 'Quartermaster', current_position_2: null },
    { id: '20000000-0000-4000-a000-000000000004', first_name: 'David', last_name: 'D.', patrol_name: 'Wolf', rank: 'Tenderfoot', bsa_member_id: '123456004', current_position: null, current_position_2: null },
    { id: '20000000-0000-4000-a000-000000000005', first_name: 'Ethan', last_name: 'E.', patrol_name: 'Wolf', rank: 'Second Class', bsa_member_id: '123456005', current_position: 'Patrol Leader', current_position_2: null },
    { id: '20000000-0000-4000-a000-000000000006', first_name: 'Frank', last_name: 'F.', patrol_name: 'Wolf', rank: 'Scout', bsa_member_id: '123456006', current_position: 'Assistant Patrol Leader', current_position_2: null },
    { id: '20000000-0000-4000-a000-000000000007', first_name: 'George', last_name: 'G.', patrol_name: 'Bear', rank: 'First Class', bsa_member_id: '123456007', current_position: 'Patrol Leader', current_position_2: 'Historian' },
    { id: '20000000-0000-4000-a000-000000000008', first_name: 'Henry', last_name: 'H.', patrol_name: 'Bear', rank: 'Star', bsa_member_id: '123456008', current_position: 'Scribe', current_position_2: null },
  ];

  for (const scout of scouts) {
    const { patrol_name, current_position, current_position_2, ...scoutData } = scout;
    const { error } = await supabase.from('scouts').upsert({
      ...scoutData,
      unit_id: UNIT_ID,
      patrol_id: patrolIds[patrol_name] || null,
      current_position: current_position,
      current_position_2: current_position_2,
      is_active: true,
      date_of_birth: '2012-01-15',
    });
    if (error) console.log(`  Warning: ${error.message}`);
    else console.log(`  Created scout: ${scout.first_name} ${scout.last_name}${current_position ? ` (${current_position})` : ''}`);
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

  // 8. Get scout account IDs for financial data
  console.log('\nFetching scout account IDs...');
  const { data: scoutAccounts } = await supabase
    .from('scout_accounts')
    .select('id, scout_id')
    .in('scout_id', scouts.map(s => s.id));

  const scoutAccountMap = new Map(scoutAccounts?.map(sa => [sa.scout_id, sa.id]) || []);

  // 9. Create billing records (spread over 90+ days for aging report testing)
  // Today is 2026-01-18, so dates go back to October 2025
  console.log('\nCreating billing records...');
  const billingRecords = [
    { id: '40000000-0000-4000-a000-000000000001', description: 'October Dues', total_amount: 200.00, billing_date: '2025-10-01' },       // 109 days old -> 90+ bucket
    { id: '40000000-0000-4000-a000-000000000002', description: 'November Dues', total_amount: 200.00, billing_date: '2025-11-01' },      // 78 days old -> 61-90 bucket
    { id: '40000000-0000-4000-a000-000000000003', description: 'Fall Campout - Lost Pines', total_amount: 320.00, billing_date: '2025-11-15' }, // 64 days old -> 61-90 bucket
    { id: '40000000-0000-4000-a000-000000000004', description: 'December Dues', total_amount: 200.00, billing_date: '2025-12-01' },      // 48 days old -> 31-60 bucket
    { id: '40000000-0000-4000-a000-000000000005', description: 'January Dues', total_amount: 200.00, billing_date: '2026-01-01' },       // 17 days old -> Current bucket
    { id: '40000000-0000-4000-a000-000000000006', description: 'Merit Badge Day Registration', total_amount: 120.00, billing_date: '2026-01-10' }, // 8 days old -> Current bucket
  ];

  for (const record of billingRecords) {
    const { error } = await supabase.from('billing_records').insert({
      ...record,
      unit_id: UNIT_ID,
    });
    if (error) console.log(`  Warning: ${error.message}`);
    else console.log(`  Created billing: ${record.description}`);
  }

  // 10. Create billing charges for each scout
  console.log('\nCreating billing charges...');
  const chargeAmounts: Record<string, number[]> = {
    '40000000-0000-4000-a000-000000000001': [25, 25, 25, 25, 25, 25, 25, 25], // Oct Dues: $25 each
    '40000000-0000-4000-a000-000000000002': [25, 25, 25, 25, 25, 25, 25, 25], // Nov Dues: $25 each
    '40000000-0000-4000-a000-000000000003': [40, 40, 40, 40, 40, 40, 40, 40], // Fall Campout: $40 each
    '40000000-0000-4000-a000-000000000004': [25, 25, 25, 25, 25, 25, 25, 25], // Dec Dues: $25 each
    '40000000-0000-4000-a000-000000000005': [25, 25, 25, 25, 25, 25, 25, 25], // Jan Dues: $25 each
    '40000000-0000-4000-a000-000000000006': [15, 15, 15, 15, 15, 15, 15, 15], // Merit Badge Day: $15 each
  };

  // Track which charges are paid for each scout (mix of payment patterns for testing)
  const paidCharges: Record<string, string[]> = {
    // Alex - all paid up (fully current)
    '20000000-0000-4000-a000-000000000001': ['40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000004', '40000000-0000-4000-a000-000000000005', '40000000-0000-4000-a000-000000000006'],
    // Ben - only Oct paid (owes Nov, campout, Dec, Jan, MB day = $130)
    '20000000-0000-4000-a000-000000000002': ['40000000-0000-4000-a000-000000000001'],
    // Charlie - Oct + Nov paid (owes campout, Dec, Jan, MB day = $105)
    '20000000-0000-4000-a000-000000000003': ['40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002'],
    // David - nothing paid (owes everything = $155)
    // Ethan - all paid (fully current)
    '20000000-0000-4000-a000-000000000005': ['40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000004', '40000000-0000-4000-a000-000000000005', '40000000-0000-4000-a000-000000000006'],
    // Frank - nothing paid (owes everything = $155)
    // George - all paid + overpaid (has credit)
    '20000000-0000-4000-a000-000000000007': ['40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000004', '40000000-0000-4000-a000-000000000005', '40000000-0000-4000-a000-000000000006'],
    // Henry - Oct + Nov + campout paid (owes Dec, Jan, MB day = $65)
    '20000000-0000-4000-a000-000000000008': ['40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000003'],
  };

  let chargeCount = 0;
  for (const [billingId, amounts] of Object.entries(chargeAmounts)) {
    for (let i = 0; i < scouts.length; i++) {
      const scoutId = scouts[i].id;
      const scoutAccountId = scoutAccountMap.get(scoutId);
      if (!scoutAccountId) continue;

      const isPaid = paidCharges[scoutId]?.includes(billingId) || false;

      const { error } = await supabase.from('billing_charges').insert({
        billing_record_id: billingId,
        scout_account_id: scoutAccountId,
        amount: amounts[i],
        is_paid: isPaid,
      });
      if (!error) chargeCount++;
    }
  }
  console.log(`  Created ${chargeCount} billing charges`);

  // 11. Create payments (spread over 90+ days)
  console.log('\nCreating payments...');
  const payments = [
    // Alex A. - paid everything over time
    { scout_id: '20000000-0000-4000-a000-000000000001', amount: 25.00, fee_amount: 0, net_amount: 25.00, payment_method: 'cash', status: 'completed', notes: 'October dues', created_at: '2025-10-05' },
    { scout_id: '20000000-0000-4000-a000-000000000001', amount: 25.00, fee_amount: 0, net_amount: 25.00, payment_method: 'check', status: 'completed', notes: 'November dues - Check #101', created_at: '2025-11-03' },
    { scout_id: '20000000-0000-4000-a000-000000000001', amount: 40.00, fee_amount: 1.34, net_amount: 38.66, payment_method: 'card', status: 'completed', notes: 'Fall campout', created_at: '2025-11-18', square_payment_id: 'sq_pay_alex_001' },
    { scout_id: '20000000-0000-4000-a000-000000000001', amount: 25.00, fee_amount: 0, net_amount: 25.00, payment_method: 'cash', status: 'completed', notes: 'December dues', created_at: '2025-12-08' },
    { scout_id: '20000000-0000-4000-a000-000000000001', amount: 40.00, fee_amount: 1.34, net_amount: 38.66, payment_method: 'card', status: 'completed', notes: 'Jan dues + MB day', created_at: '2026-01-12', square_payment_id: 'sq_pay_alex_002' },
    // Ben B. - only paid October
    { scout_id: '20000000-0000-4000-a000-000000000002', amount: 25.00, fee_amount: 0, net_amount: 25.00, payment_method: 'check', status: 'completed', notes: 'Check #1042', created_at: '2025-10-10' },
    // Charlie C. - paid Oct + Nov
    { scout_id: '20000000-0000-4000-a000-000000000003', amount: 50.00, fee_amount: 1.65, net_amount: 48.35, payment_method: 'card', status: 'completed', notes: 'Oct + Nov dues', created_at: '2025-11-05', square_payment_id: 'sq_pay_charlie_001' },
    // Ethan E. - all paid via multiple methods
    { scout_id: '20000000-0000-4000-a000-000000000005', amount: 90.00, fee_amount: 0, net_amount: 90.00, payment_method: 'check', status: 'completed', notes: 'Check #500 - Oct/Nov/Campout', created_at: '2025-11-20' },
    { scout_id: '20000000-0000-4000-a000-000000000005', amount: 65.00, fee_amount: 2.09, net_amount: 62.91, payment_method: 'card', status: 'completed', notes: 'Dec/Jan/MB day', created_at: '2026-01-08', square_payment_id: 'sq_pay_ethan_001' },
    // George G. - prepaid everything with check
    { scout_id: '20000000-0000-4000-a000-000000000007', amount: 200.00, fee_amount: 0, net_amount: 200.00, payment_method: 'check', status: 'completed', notes: 'Check #2001 - Full year prepay', created_at: '2025-10-02' },
    // Henry H. - paid through campout
    { scout_id: '20000000-0000-4000-a000-000000000008', amount: 50.00, fee_amount: 1.65, net_amount: 48.35, payment_method: 'card', status: 'completed', notes: 'Oct + Nov dues', created_at: '2025-11-08', square_payment_id: 'sq_pay_henry_001' },
    { scout_id: '20000000-0000-4000-a000-000000000008', amount: 40.00, fee_amount: 1.34, net_amount: 38.66, payment_method: 'card', status: 'completed', notes: 'Fall campout', created_at: '2025-11-20', square_payment_id: 'sq_pay_henry_002' },
  ];

  for (const payment of payments) {
    const scoutAccountId = scoutAccountMap.get(payment.scout_id);
    if (!scoutAccountId) continue;

    const { error } = await supabase.from('payments').insert({
      unit_id: UNIT_ID,
      scout_account_id: scoutAccountId,
      amount: payment.amount,
      fee_amount: payment.fee_amount,
      net_amount: payment.net_amount,
      payment_method: payment.payment_method,
      status: payment.status,
      notes: payment.notes,
      created_at: payment.created_at,
      square_payment_id: payment.square_payment_id || null,
    });
    if (error) console.log(`  Warning: ${error.message}`);
  }
  console.log(`  Created ${payments.length} payments`);

  // 12. Create Square transactions (matching payment dates)
  console.log('\nCreating Square transactions...');
  const squareTransactions = [
    {
      square_payment_id: 'sq_pay_alex_001',
      scout_id: '20000000-0000-4000-a000-000000000001',
      amount_money: 4000, // in cents
      fee_money: 134,
      net_money: 3866,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'VISA',
      last_4: '4242',
      receipt_number: 'RCPT-001',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_alex_001',
      square_created_at: '2025-11-18T14:30:00Z',
      note: 'Fall campout - Alex A.',
    },
    {
      square_payment_id: 'sq_pay_alex_002',
      scout_id: '20000000-0000-4000-a000-000000000001',
      amount_money: 4000,
      fee_money: 134,
      net_money: 3866,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'VISA',
      last_4: '4242',
      receipt_number: 'RCPT-002',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_alex_002',
      square_created_at: '2026-01-12T10:00:00Z',
      note: 'Jan dues + MB day - Alex A.',
    },
    {
      square_payment_id: 'sq_pay_charlie_001',
      scout_id: '20000000-0000-4000-a000-000000000003',
      amount_money: 5000,
      fee_money: 165,
      net_money: 4835,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'MASTERCARD',
      last_4: '5555',
      receipt_number: 'RCPT-003',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_charlie_001',
      square_created_at: '2025-11-05T10:15:00Z',
      note: 'Oct + Nov dues - Charlie C.',
    },
    {
      square_payment_id: 'sq_pay_ethan_001',
      scout_id: '20000000-0000-4000-a000-000000000005',
      amount_money: 6500,
      fee_money: 209,
      net_money: 6291,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'AMEX',
      last_4: '1234',
      receipt_number: 'RCPT-004',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_ethan_001',
      square_created_at: '2026-01-08T16:45:00Z',
      note: 'Dec/Jan/MB day - Ethan E.',
    },
    {
      square_payment_id: 'sq_pay_henry_001',
      scout_id: '20000000-0000-4000-a000-000000000008',
      amount_money: 5000,
      fee_money: 165,
      net_money: 4835,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'DISCOVER',
      last_4: '6789',
      receipt_number: 'RCPT-005',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_henry_001',
      square_created_at: '2025-11-08T09:30:00Z',
      note: 'Oct + Nov dues - Henry H.',
    },
    {
      square_payment_id: 'sq_pay_henry_002',
      scout_id: '20000000-0000-4000-a000-000000000008',
      amount_money: 4000,
      fee_money: 134,
      net_money: 3866,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'DISCOVER',
      last_4: '6789',
      receipt_number: 'RCPT-006',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_henry_002',
      square_created_at: '2025-11-20T11:00:00Z',
      note: 'Fall campout - Henry H.',
    },
    // Unreconciled transaction (not linked to a scout yet)
    {
      square_payment_id: 'sq_pay_unlinked_001',
      scout_id: null,
      amount_money: 7500,
      fee_money: 248,
      net_money: 7252,
      status: 'COMPLETED',
      source_type: 'CARD',
      card_brand: 'VISA',
      last_4: '9999',
      receipt_number: 'RCPT-007',
      receipt_url: 'https://squareup.com/receipt/preview/sq_pay_unlinked_001',
      square_created_at: '2026-01-15T11:00:00Z',
      note: 'Payment from parent - needs reconciliation',
      buyer_email_address: 'parent@example.com',
    },
  ];

  for (const txn of squareTransactions) {
    const scoutAccountId = txn.scout_id ? scoutAccountMap.get(txn.scout_id) : null;

    const { error } = await supabase.from('square_transactions').insert({
      unit_id: UNIT_ID,
      square_payment_id: txn.square_payment_id,
      scout_account_id: scoutAccountId,
      amount_money: txn.amount_money,
      fee_money: txn.fee_money,
      net_money: txn.net_money,
      status: txn.status,
      source_type: txn.source_type,
      card_brand: txn.card_brand,
      last_4: txn.last_4,
      receipt_number: txn.receipt_number,
      receipt_url: txn.receipt_url,
      square_created_at: txn.square_created_at,
      note: txn.note,
      buyer_email_address: txn.buyer_email_address || null,
      is_reconciled: txn.scout_id !== null,
      currency: 'USD',
    });
    if (error) console.log(`  Warning: ${error.message}`);
  }
  console.log(`  Created ${squareTransactions.length} Square transactions`);

  // 13. Create journal entries for transactions
  console.log('\nCreating journal entries...');

  // Get account IDs
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('unit_id', UNIT_ID);

  const accountMap = new Map(accountsData?.map(a => [a.code, a.id]) || []);
  const bankAccountId = accountMap.get('1000');
  const arAccountId = accountMap.get('1200');
  const feeAccountId = accountMap.get('5600');
  const duesIncomeId = accountMap.get('4000');
  const campingIncomeId = accountMap.get('4100');

  if (!bankAccountId || !arAccountId) {
    console.log('  Warning: Required accounts not found, skipping journal entries');
  } else {
    // Create journal entries for billing records (matching billing dates)
    const billingEntries = [
      { date: '2025-10-01', description: 'October Dues - All Scouts', amount: 200.00, type: 'billing', incomeAccount: duesIncomeId },
      { date: '2025-11-01', description: 'November Dues - All Scouts', amount: 200.00, type: 'billing', incomeAccount: duesIncomeId },
      { date: '2025-11-15', description: 'Fall Campout Fees', amount: 320.00, type: 'billing', incomeAccount: campingIncomeId },
      { date: '2025-12-01', description: 'December Dues - All Scouts', amount: 200.00, type: 'billing', incomeAccount: duesIncomeId },
      { date: '2026-01-01', description: 'January Dues - All Scouts', amount: 200.00, type: 'billing', incomeAccount: duesIncomeId },
      { date: '2026-01-10', description: 'Merit Badge Day Registration', amount: 120.00, type: 'billing', incomeAccount: campingIncomeId },
    ];

    for (const entry of billingEntries) {
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          unit_id: UNIT_ID,
          entry_date: entry.date,
          description: entry.description,
          entry_type: entry.type,
          is_posted: true,
          posted_at: entry.date,
        })
        .select()
        .single();

      if (jeError || !journalEntry) {
        console.log(`  Warning: Failed to create billing journal entry: ${jeError?.message}`);
        continue;
      }

      // Create journal lines: Debit AR, Credit Income
      await supabase.from('journal_lines').insert([
        { journal_entry_id: journalEntry.id, account_id: arAccountId, debit: entry.amount, credit: 0 },
        { journal_entry_id: journalEntry.id, account_id: entry.incomeAccount || duesIncomeId, debit: 0, credit: entry.amount },
      ]);
    }
    console.log(`  Created ${billingEntries.length} billing journal entries`);

    // Create journal entries for payments (matching payment dates)
    const paymentEntries = [
      { date: '2025-10-02', description: 'Payment from George G. - Check #2001', amount: 200.00, fee: 0, method: 'check' },
      { date: '2025-10-05', description: 'Payment from Alex A. - Cash', amount: 25.00, fee: 0, method: 'cash' },
      { date: '2025-10-10', description: 'Payment from Ben B. - Check #1042', amount: 25.00, fee: 0, method: 'check' },
      { date: '2025-11-03', description: 'Payment from Alex A. - Check #101', amount: 25.00, fee: 0, method: 'check' },
      { date: '2025-11-05', description: 'Payment from Charlie C. - Square', amount: 50.00, fee: 1.65, method: 'card' },
      { date: '2025-11-08', description: 'Payment from Henry H. - Square', amount: 50.00, fee: 1.65, method: 'card' },
      { date: '2025-11-18', description: 'Payment from Alex A. - Square', amount: 40.00, fee: 1.34, method: 'card' },
      { date: '2025-11-20', description: 'Payment from Ethan E. - Check #500', amount: 90.00, fee: 0, method: 'check' },
      { date: '2025-11-20', description: 'Payment from Henry H. - Square', amount: 40.00, fee: 1.34, method: 'card' },
      { date: '2025-12-08', description: 'Payment from Alex A. - Cash', amount: 25.00, fee: 0, method: 'cash' },
      { date: '2026-01-08', description: 'Payment from Ethan E. - Square', amount: 65.00, fee: 2.09, method: 'card' },
      { date: '2026-01-12', description: 'Payment from Alex A. - Square', amount: 40.00, fee: 1.34, method: 'card' },
    ];

    for (const entry of paymentEntries) {
      const { data: journalEntry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          unit_id: UNIT_ID,
          entry_date: entry.date,
          description: entry.description,
          entry_type: 'payment',
          is_posted: true,
          posted_at: entry.date,
        })
        .select()
        .single();

      if (jeError || !journalEntry) {
        console.log(`  Warning: Failed to create payment journal entry: ${jeError?.message}`);
        continue;
      }

      // Create journal lines
      const netAmount = entry.amount - entry.fee;
      const lines = [
        { journal_entry_id: journalEntry.id, account_id: bankAccountId, debit: netAmount, credit: 0 },
        { journal_entry_id: journalEntry.id, account_id: arAccountId, debit: 0, credit: entry.amount },
      ];
      if (entry.fee > 0 && feeAccountId) {
        lines.push({ journal_entry_id: journalEntry.id, account_id: feeAccountId, debit: entry.fee, credit: 0 });
      }
      await supabase.from('journal_lines').insert(lines);
    }
    console.log(`  Created ${paymentEntries.length} payment journal entries`);
  }

  // 15. Update scout account balances based on charges and payments
  // Each scout was billed: $25 (Oct) + $25 (Nov) + $40 (Campout) + $25 (Dec) + $25 (Jan) + $15 (MB) = $155
  // billing_balance: negative = owes money, positive = credit
  // funds_balance: scout's savings from fundraising (always >= 0)
  console.log('\nUpdating scout account balances...');
  const accountBalances = [
    { scout_id: '20000000-0000-4000-a000-000000000001', billing_balance: 0, funds_balance: 45.00 },      // Alex - all paid ($155), has fundraising
    { scout_id: '20000000-0000-4000-a000-000000000002', billing_balance: -130.00, funds_balance: 0 },   // Ben - only Oct paid, owes $130 (Nov+Camp+Dec+Jan+MB)
    { scout_id: '20000000-0000-4000-a000-000000000003', billing_balance: -105.00, funds_balance: 50.00 }, // Charlie - Oct+Nov paid, owes $105 (Camp+Dec+Jan+MB)
    { scout_id: '20000000-0000-4000-a000-000000000004', billing_balance: -155.00, funds_balance: 0 },   // David - nothing paid, owes everything
    { scout_id: '20000000-0000-4000-a000-000000000005', billing_balance: 0, funds_balance: 0 },         // Ethan - all paid ($155)
    { scout_id: '20000000-0000-4000-a000-000000000006', billing_balance: -155.00, funds_balance: 25.00 }, // Frank - nothing paid, owes everything
    { scout_id: '20000000-0000-4000-a000-000000000007', billing_balance: 45.00, funds_balance: 100.00 }, // George - prepaid $200, has $45 credit
    { scout_id: '20000000-0000-4000-a000-000000000008', billing_balance: -65.00, funds_balance: 75.00 }, // Henry - Oct+Nov+Camp paid, owes $65 (Dec+Jan+MB)
  ];

  for (const balance of accountBalances) {
    const { error } = await supabase
      .from('scout_accounts')
      .update({
        billing_balance: balance.billing_balance,
        funds_balance: balance.funds_balance,
      })
      .eq('scout_id', balance.scout_id);
    if (error) console.log(`  Warning: ${error.message}`);
  }
  console.log(`  Updated ${accountBalances.length} scout account balances`);

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
  // Filter out --prod flag to get command and args
  const args = process.argv.slice(2).filter(a => a !== '--prod');
  const command = args[0];
  const arg = args[1];

  console.log('🌱 Chuckbox Database Tool');
  console.log(`   Environment: ${isProd ? '🔴 PRODUCTION' : '🟢 Development'}`);
  console.log(`   Database: ${supabaseUrl}\n`);

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
      console.log('Usage: npx tsx scripts/db.ts [--prod] <command>');
      console.log('');
      console.log('Commands:');
      console.log('  reset          - Clear all data from database');
      console.log('  seed:base      - Seed base unit with admin user');
      console.log('  seed:test      - Seed test data (scouts, parents, role users)');
      console.log('  seed:all       - Run base + test seeds');
      console.log('  dump [name]    - Dump current database to JSON file');
      console.log('  restore <file> - Restore from a dump file');
      console.log('  list           - List available dump files');
      console.log('');
      console.log('Flags:');
      console.log('  --prod         - Use production database (.env.prod)');
      console.log('');
      console.log('Examples:');
      console.log('  npm run db:seed:all           # Seed dev database');
      console.log('  npm run db:seed:all -- --prod # Seed prod database');
      process.exit(1);
  }
}

main().catch(console.error);
