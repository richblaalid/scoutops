# Plan: Achieve 70% Test Coverage Across All Files

## Goal
Increase test coverage from current 69.46% statements / 43.84% branches to **70%+ on all files** by systematically adding unit tests for untested code.

---

## Current State

### Existing Test Coverage (8 test files, 212 tests)
| File | Statements | Tests |
|------|------------|-------|
| `src/lib/billing.ts` | 100% | 23 |
| `src/lib/encryption.ts` | 100% | 22 |
| `src/lib/roles.ts` | 92.85% | 36 |
| `src/lib/utils.ts` | 90% | 12 |
| `src/app/actions/members.ts` | ~70% | 40 |
| `src/lib/sync/scoutbook/parsers/roster.ts` | 56.66% | 13 |
| Payment links API | ~70% | 40 |
| Square payments API | ~70% | 26 |

### Files With No Tests (Priority Order)
1. **Server Actions**: `roster.ts`, `funds.ts`, `profile.ts`, `fundraiser-types.ts`
2. **Sync Logic**: `import.ts`, `sync-orchestrator.ts`
3. **Library Code**: `bsa-roster-parser.ts`, `constants.ts`, `auth.ts`, `analytics.ts`
4. **API Routes**: 24 route handlers with no tests

---

## Implementation Plan

### Phase 1: Pure Logic Functions (Easiest - No Mocking)

#### 1.1 `src/lib/constants.ts`
**File**: `tests/unit/constants.test.ts`
```
Functions to test:
- parseDateParts(dateString) - parse "YYYY-MM-DD" to {year, month, day}
- formatDateParts(parts) - format parts back to string
- getYearOptions(startYear, endYear) - generate year dropdown options
- getDaysInMonth(year, month) - return days in month (leap year aware)
```
**Estimated tests**: 15

#### 1.2 `src/lib/import/bsa-roster-parser.ts`
**File**: `tests/unit/bsa-roster-parser.test.ts`
```
Functions to test:
- parseCSVLine(line) - handle quoted fields, commas
- parseRosterCSV(content) - full CSV parsing
- validateRoster(roster) - validation rules
- deriveRole(positions) - position to role mapping
- getCurrentPosition(positions) - priority position selection
- getScoutPosition(positions) - scout leadership position
- Helper functions: mapGender, parseSwimClass, extractDate, parseHealthForm, parseTrainings, parsePositions, parseMeritBadges
```
**Estimated tests**: 25

#### 1.3 `src/lib/sync/scoutbook/import.ts` - Pure Functions Only
**File**: `tests/unit/sync/import.test.ts`
```
Functions to test:
- isRenewalStatusActive(status) - "Expired" vs other statuses
- parseName(nameString) - "Last, First" parsing
```
**Estimated tests**: 12

---

### Phase 2: Server Actions (Requires Supabase Mocking)

#### 2.1 `src/app/actions/roster.ts`
**File**: `tests/unit/actions/roster.test.ts`
```
Functions to test:
- updateRosterAdult() - profile updates with email conditions
  - Admin permission check
  - Unit membership verification
  - Email update only when no user_id
  - All field updates
```
**Estimated tests**: 15

#### 2.2 `src/app/actions/funds.ts`
**File**: `tests/unit/actions/funds.test.ts`
```
Functions to test:
- addFundsToScout() - fund addition with RPC
  - Permission check (admin/treasurer)
  - Amount validation
  - Fundraiser type lookup
  - RPC execution
- voidPayment() - payment voiding
  - Permission check
  - Journal reversal
```
**Estimated tests**: 20

#### 2.3 `src/app/actions/profile.ts`
**File**: `tests/unit/actions/profile.test.ts`
```
Functions to test:
- updateProfile() - profile updates
- Any other profile-related actions
```
**Estimated tests**: 10

---

### Phase 3: Improve Existing Coverage

#### 3.1 `src/lib/sync/scoutbook/parsers/roster.ts` (56% → 70%)
**File**: `tests/unit/roster-parser.test.ts` (extend existing)
```
Add tests for:
- parseRosterFromRefs() - ref-based parsing path
- hasNextPage() - pagination detection
- findNextPageRef() - pagination ref lookup
- getTotalMemberCount() - count extraction
- getCurrentPage() - page number extraction
- extractTableRows() - row filtering edge cases
```
**Estimated additional tests**: 20

#### 3.2 `src/lib/roles.ts` (92% → 95%)
**File**: `tests/unit/roles.test.ts` (extend existing)
```
Cover uncovered line 142 and any remaining branches
```
**Estimated additional tests**: 3

---

### Phase 4: Complex Sync Logic (Requires Heavy Mocking)

#### 4.1 `src/lib/sync/scoutbook/import.ts` - Main Functions
**File**: `tests/unit/sync/import.test.ts` (extend from Phase 1)
```
Functions to test:
- stageRosterMembers() - staging logic
  - Youth create/update/skip decisions
  - Adult BSA ID matching
  - Name-based matching
  - Change detection
- getStagedMembers() - retrieval and ordering
- confirmStagedImport() - execution
  - Scout creation with patrols
  - Adult profile creation
  - Unit membership creation
- getOrCreatePatrols() - patrol management
```
**Estimated tests**: 35

---

### Phase 5: API Routes (Lower Priority)

#### 5.1 High-Value API Routes
**Files to create**:
- `tests/unit/api/import-roster.test.ts` - roster import endpoint
- `tests/unit/api/billing-notify.test.ts` - billing notifications

```
Focus on:
- Input validation
- Permission checks
- Error handling
- Success paths
```
**Estimated tests**: 30

---

## Files to Create

| Test File | Source File(s) | Est. Tests |
|-----------|---------------|------------|
| `tests/unit/constants.test.ts` | `src/lib/constants.ts` | 15 |
| `tests/unit/bsa-roster-parser.test.ts` | `src/lib/import/bsa-roster-parser.ts` | 25 |
| `tests/unit/sync/import.test.ts` | `src/lib/sync/scoutbook/import.ts` | 47 |
| `tests/unit/actions/roster.test.ts` | `src/app/actions/roster.ts` | 15 |
| `tests/unit/actions/funds.test.ts` | `src/app/actions/funds.ts` | 20 |
| `tests/unit/actions/profile.test.ts` | `src/app/actions/profile.ts` | 10 |
| `tests/unit/api/import-roster.test.ts` | `src/app/api/import/roster/route.ts` | 15 |
| `tests/unit/api/billing-notify.test.ts` | `src/app/api/billing-*/notify/route.ts` | 15 |

## Files to Modify

| Test File | Changes |
|-----------|---------|
| `tests/unit/roster-parser.test.ts` | Add 20 tests for uncovered functions |
| `tests/unit/roles.test.ts` | Add 3 tests for line 142 |

---

## Testing Patterns to Follow

### Supabase Mocking (from existing tests)
```typescript
import { createMockSupabaseClient, mockSuccess, mockError } from '@/tests/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))
```

### Fixture Usage
```typescript
import { mockUnit, mockProfile, createFixtureWith } from '@/tests/mocks/fixtures'

const customProfile = createFixtureWith(mockProfile, { is_active: false })
```

### Server Action Testing Pattern
```typescript
describe('actionName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup mock returns
  })

  it('returns error when not authenticated', async () => { ... })
  it('returns error when not authorized', async () => { ... })
  it('succeeds with valid input', async () => { ... })
  it('handles edge case X', async () => { ... })
})
```

---

## Verification

After each phase:
1. Run `npm run test:coverage`
2. Verify coverage increased
3. Check no regressions in existing tests

Final verification:
```bash
npm run test:coverage
# Expect: All files >= 70% statement coverage
```

---

## Execution Order

1. **Phase 1** (Pure logic) - Quick wins, no mocking complexity
2. **Phase 3.1** (Roster parser) - Improve existing low coverage
3. **Phase 2** (Server actions) - Core business logic
4. **Phase 4** (Sync import) - Complex but critical
5. **Phase 5** (API routes) - Lower priority, do if time permits

**Estimated total new tests**: ~185
**Estimated time**: 4-6 hours of implementation
