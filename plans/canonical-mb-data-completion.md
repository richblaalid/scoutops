# Canonical Merit Badge Data Completion Plan

## Overview

Complete and enhance the existing `bsa-data-canonical.json` file to have:
1. All Scoutbook requirement IDs with descriptions
2. Proper hierarchy/nesting structure
3. Correct display ordering

---

## Progress Summary (Updated 2026-01-28)

### ✅ Completed Tasks

| Task | Status | Result |
|------|--------|--------|
| Fish & Wildlife name fix | ✅ Complete | Renamed from "Fish & Wildlife Management" to "Fish and Wildlife Management" |
| Validation script | ✅ Complete | `scripts/validate-canonical-hierarchy.ts` |
| Hierarchy fix script | ✅ Complete | `scripts/fix-canonical-hierarchy.ts` |
| CSV ID coverage | ✅ 100% | All 8,937 CSV IDs now match exactly |
| Duplicate display_order | ✅ Fixed | 577 issues → 0 |
| Empty header children | ✅ Mostly Fixed | 510 issues → 91 (82% reduction) |
| Duplicate requirements | ✅ Removed | 39 duplicates removed |

### Current State

```
Total Badges:       141
Total Versions:     361
Total Requirements: 10,916 (was 10,955 - removed 39 duplicates)
  - Headers:        1,668 (was 1,705)
  - Completable:    9,248 (was 9,250)

CSV ID Coverage:    8,937 / 8,937 (100%)
Remaining Issues:   91 empty_header_children
```

### Remaining Issues by Badge

| Badge | Issues | Notes |
|-------|--------|-------|
| Archery | 10 | Complex option patterns (5A(e) headers) |
| Nature | 7 | |
| Environmental Science | 6 | |
| Radio | 6 | |
| Athletics | 4 | |
| Geology | 4 | |
| Plant Science | 4 | Complex nesting |
| Public Health | 4 | |
| Rifle Shooting | 4 | |
| Shotgun Shooting | 4 | |
| + 15 more badges | 38 | |

### Issue Patterns

The remaining 91 "empty_header_children" issues follow these patterns where children don't match expected naming:

- `#` - Number only (e.g., "5")
- `#.` - Number with period (e.g., "3.")
- `#X` - Number + uppercase letter (e.g., "5A")
- `#X#` - Number + uppercase + number (e.g., "5A1")
- `#X(x)` - Number + uppercase + wrapped letter (e.g., "5A(e)")

These are complex option headers where:
1. Children use different naming conventions (e.g., "5A(e)" header has children like "5e Opt A")
2. Headers may be incorrectly marked (should be completable)
3. Data inconsistencies in source material

---

## Scripts Created

### `scripts/validate-canonical-hierarchy.ts`

Validates canonical data and outputs report:
- Checks all CSV IDs have matching entries
- Verifies headers have children
- Detects duplicate display_order values
- Outputs `data/hierarchy-verification-report.json`

```bash
npx tsx scripts/validate-canonical-hierarchy.ts
```

### `scripts/fix-canonical-hierarchy.ts`

Fixes hierarchy structure:
- Nests children inside parent's `children[]` array
- Assigns sequential display_order values
- Removes duplicate requirements
- Supports `--dry-run` flag

```bash
npx tsx scripts/fix-canonical-hierarchy.ts --dry-run  # Preview changes
npx tsx scripts/fix-canonical-hierarchy.ts            # Apply changes
```

---

## Next Steps

### Option A: Accept Current State (Recommended)

The current state is functional for Chuckbox:
- 100% CSV ID coverage (all completable requirements trackable)
- 92% issue reduction (1,087 → 91)
- Remaining issues are cosmetic (headers without nested children display flat)

**Benefits:**
- Ready to use immediately
- Complex badges still function (requirements are present, just not nested)
- Can iterate on remaining issues later

### Option B: Manual Review of Remaining Issues

Review and fix the 91 remaining issues manually:
1. Export list of affected requirements
2. Determine if each header should be:
   - Kept as header with correct children identified
   - Changed to completable requirement
   - Left as-is (children use different naming)
3. Apply manual fixes to canonical file

**Effort:** Medium - requires understanding each badge's structure

### Option C: Mark Headers as Completable

For headers without children, change `is_header: true` to `is_header: false`:
- Treats them as regular requirements
- Eliminates "empty header" display issues
- May not be semantically correct

---

## Deliverables

### Completed ✅

1. **Updated `bsa-data-canonical.json`**
   - Fish & Wildlife Management name fixed
   - Hierarchy restructured (children properly nested)
   - Sequential display_order values
   - Duplicates removed
   - All 8,937 CSV IDs present

2. **Verification Report** (`data/hierarchy-verification-report.json`)
   - Badge-by-badge issue list
   - Issue counts by type
   - Complex badge identification

3. **Validation Script** (`scripts/validate-canonical-hierarchy.ts`)
   - Automated checks for data integrity
   - Run before any import to database

4. **Fix Script** (`scripts/fix-canonical-hierarchy.ts`)
   - Automated hierarchy restructuring
   - Supports dry-run for preview

---

## Questions Resolved

1. **Fish & Wildlife Management** - ✅ Fixed by renaming (data was present)

2. **Hierarchy depth** - The data supports up to 4 levels:
   - Level 0: Top-level requirements (1, 2, 3...)
   - Level 1: Sub-requirements (1a, 1b...)
   - Level 2: Sub-sub-requirements (1a(1), 1a(2)...)
   - Level 3: Deep nesting (complex badges)

3. **Approval workflow** - Automated fixes applied, manual review needed only for 91 remaining issues

4. **Priority badges** - All badges now have 100% CSV ID coverage
