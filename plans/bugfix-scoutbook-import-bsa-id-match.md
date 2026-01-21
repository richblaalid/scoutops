# Bugfix: ScoutBook Import BSA ID Matching

## Bug Description

The scout history import recognizes the scout details and reports the same BSA ID# as an existing scout, but reports "Could not auto-match scout. Please select manually."

**User Impact**: Users must manually select scouts even when BSA IDs match, adding friction to the import process.

## Root Cause Analysis

The primary issue was **using the wrong column name** for filtering active scouts:

1. **Wrong column name**: The code used `.eq('status', 'active')` but the scouts table uses `is_active` (boolean), not `status` (string). This caused database query errors.

2. **RLS blocking queries**: The functions used `createClient()` which respects RLS policies. Even after fixing the column name, we switched to `createAdminClient()` since access is already verified via `verifyLeaderRole()`.

3. **Missing trimming**: BSA ID extraction didn't explicitly trim whitespace.

4. **Not returning bsa_member_id from database**: The original query didn't include `bsa_member_id` in the select.

5. **Silent error handling**: The `loadScouts` function didn't display errors when `getUnitScoutsForImport` failed.

## Changes Made

### 1. Parser Trimming (`src/lib/import/scoutbook-history-parser.ts`)

Added explicit `.trim()` to BSA ID extraction:

```typescript
// Line 534
scout.bsaId = nextPart.trim()
```

### 2. Server Actions - Fix Column Name & Use Admin Client (`src/app/actions/scoutbook-import.ts`)

Both `findScoutByBsaIdOrName` and `getUnitScoutsForImport` now:
- Use `createAdminClient()` instead of `createClient()` since access is already verified via `verifyLeaderRole()`
- Use correct column `is_active` (boolean) instead of non-existent `status` column
- Filter with `.neq('is_active', false)` to include scouts where `is_active` is true or null

Updated `findScoutByBsaIdOrName` to:
- Use admin client to bypass RLS (access already verified)
- Normalize BSA ID with trim before searching
- Include `bsa_member_id` and `is_active` in select statement
- Trim firstName and lastName in fallback name search
- Return the actual `bsa_member_id` from database

Updated `getUnitScoutsForImport` to:
- Use admin client to bypass RLS (access already verified)
- Filter active scouts in JavaScript after fetching (allows logging)

### 3. Error Handling (`src/app/(dashboard)/settings/import/advancement/page.tsx`)

Added error display when `getUnitScoutsForImport` returns an error, so users can see what went wrong instead of just seeing an empty dropdown.

## Files Modified

- `src/lib/import/scoutbook-history-parser.ts` - Added trim to BSA ID extraction
- `src/app/actions/scoutbook-import.ts` - Use admin client, improved matching logic
- `src/app/(dashboard)/settings/import/advancement/page.tsx` - Added error handling

## Testing

- [x] Parser tests pass (28 tests)
- [x] Build passes
- [ ] Manual test with actual CSV upload

## Date

2026-01-20
