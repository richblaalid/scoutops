# BSA Roster Import Feature Plan

## Overview

Enable troops to upload their BSA roster CSV exports to quickly onboard scouts and adults into ChuckBox. The system will parse the CSV, map fields to the database schema, auto-create guardian relationships, and provide a review step before committing.

## CSV Structure (BSA Roster Export)

The CSV has two sections:
1. **ADULT MEMBERS** (rows 2-11) - Leaders, parents, committee members
2. **YOUTH MEMBERS** (rows 15+) - Scouts with embedded parent info

Key fields per section are documented in the CSV headers.

## Schema Changes Required

### 1. Add fields to `scouts` table
```sql
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS gender VARCHAR(20); -- 'male', 'female'
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS date_joined DATE;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS health_form_status VARCHAR(50); -- 'current', 'expired', 'none'
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS health_form_expires DATE;
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS swim_classification VARCHAR(20); -- 'swimmer', 'beginner', 'non-swimmer'
ALTER TABLE scouts ADD COLUMN IF NOT EXISTS swim_class_date DATE;
```

### 2. Add fields to `profiles` table
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bsa_member_id VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_joined DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_form_status VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_form_expires DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS swim_classification VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS swim_class_date DATE;
```

### 3. Create `adult_trainings` table
```sql
CREATE TABLE adult_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  training_code VARCHAR(50) NOT NULL,
  training_name VARCHAR(255) NOT NULL,
  completed_at DATE,
  expires_at DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, training_code)
);

-- RLS policies for admin/treasurer access
```

### 4. Add `current_position` to `unit_memberships`
```sql
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS current_position VARCHAR(100);
-- e.g., "Scoutmaster", "Committee Chairman", "Assistant Scoutmaster"
```

## Import Flow

### Step 1: Upload & Parse
- User uploads CSV file on Settings > Import page
- Parse CSV, detect ADULT MEMBERS and YOUTH MEMBERS sections
- Validate required fields (first name, last name)

### Step 2: Preview & Review
- Show parsed data in two tabs: Adults and Scouts
- Display field mapping with any issues highlighted
- Show which records are NEW vs EXISTING (match by email for adults, BSA number for scouts)
- Allow user to deselect rows they don't want to import

### Step 3: Confirm & Import
- Create/update records in transaction
- For adults: create profile (if new), create unit_membership, insert trainings
- For scouts: create scout record, create scout_account
- Auto-link guardians: match parent email from youth rows to adult profiles

### Step 4: Summary
- Show import results: X adults imported, Y scouts imported, Z guardians linked
- List any errors/skipped rows

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── import/
│   │           └── page.tsx          # Import page (server component)
│   └── api/
│       └── import/
│           └── roster/
│               └── route.ts          # POST endpoint for import
├── components/
│   └── import/
│       ├── roster-upload.tsx         # File upload component
│       ├── roster-preview.tsx        # Preview table with tabs
│       └── import-progress.tsx       # Progress/results display
├── lib/
│   └── import/
│       └── bsa-roster-parser.ts      # CSV parsing logic
└── supabase/
    └── migrations/
        └── 20260112_roster_import_schema.sql
```

## Implementation Steps

### Phase 1: Schema Migration
1. Create migration file with new columns and tables
2. Run `supabase db reset` locally to test
3. Update `src/types/database.ts` with new types

### Phase 2: CSV Parser
1. Create `bsa-roster-parser.ts` with functions:
   - `parseRosterCSV(content: string)` - split into adult/youth sections
   - `parseAdultRow(row)` - extract adult fields
   - `parseYouthRow(row)` - extract scout + parent fields
   - `parseTrainings(trainingStr, expirationStr)` - parse training list

### Phase 3: Import API
1. Create `/api/import/roster` POST endpoint
2. Accept parsed data, validate, insert in transaction
3. Handle duplicate detection (email match for adults, BSA ID for scouts)
4. Auto-create guardian links

### Phase 4: UI Components
1. Create import page at `/settings/import`
2. Build upload component with drag-drop
3. Build preview component with editable table
4. Add progress indicator and results summary

### Phase 5: Guardian Auto-Linking
1. After importing adults and scouts, match parent emails
2. Create scout_guardians records with relationship from CSV
3. Handle multiple guardians per scout

## Key Parsing Logic

### Detecting Sections
```typescript
// Find section headers
const adultHeaderIndex = lines.findIndex(line => line.includes('ADULT MEMBERS'))
const youthHeaderIndex = lines.findIndex(line => line.includes('YOUTH MEMBERS'))
```

### Role Mapping from Positions
```typescript
function deriveRole(positions: string): string {
  if (positions.includes('Scoutmaster')) return 'leader'
  if (positions.includes('Assistant Scoutmaster')) return 'leader'
  if (positions.includes('Committee')) return 'leader'
  if (positions.includes('Parent/Guardian')) return 'parent'
  return 'parent' // default
}
```

### Gender Mapping
```typescript
function mapGender(csvGender: string): string {
  if (csvGender === 'M') return 'male'
  if (csvGender === 'F') return 'female'
  return 'prefer_not_to_say'
}
```

## Verification

1. **Upload test CSV** - Use the provided sample file
2. **Check adult import** - Verify profiles, memberships, trainings created
3. **Check scout import** - Verify scouts, accounts, patrol assignments
4. **Verify guardian links** - Confirm scout_guardians records match CSV parent info
5. **Test duplicate handling** - Re-import same file, verify no duplicates
6. **RLS check** - Ensure only unit admins can access import

## Critical Files to Modify

- `supabase/migrations/` - New migration for schema changes
- `src/types/database.ts` - Update generated types
- `src/app/(dashboard)/settings/` - Add import route
- `src/lib/roles.ts` - May need to add import permission check

## Security Considerations

- Only admin/treasurer roles can access import
- Validate CSV structure before processing
- Use transactions to ensure atomic imports
- Sanitize all text inputs
- Rate limit import endpoint
