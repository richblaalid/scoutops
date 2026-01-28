# Hierarchy and Manual Test Issue Fixes

> **Status:** In Progress
> **Created:** 2026-01-27
> **Author:** Claude
> **Context:** Fixes for issues found during manual testing of troop advancement import

---

## Background

After implementing troop advancement import, manual testing revealed 14 issues. This plan addresses the hierarchy and display issues, excluding items that are out of scope (leadership data, activity data, patrol info - not in CSV).

---

## Phase 1: Basic Hierarchy Support ✅ COMPLETED

### What Was Done
- [x] **1.1** Updated `scripts/build-canonical-from-scoutbook.ts` to nest children into parents
- [x] **1.2** Rebuilt canonical file with hierarchy (4,242 children nested)
- [x] **1.3** Re-imported to database (4,270 requirements now have `parent_requirement_id`)

### Results
| Metric | Before | After |
|--------|--------|-------|
| Total requirements | 10,955 | 10,955 |
| With parent_requirement_id | 28 | 4,270 |
| Headers (is_header=true) | ~28 | 1,706 |

### Patterns Supported (Simple)
- `1a` → child of `1` (letter suffix)
- `1a[1]` → child of `1a` (bracket suffix)
- `4 Option A` → child of `4` (option suffix with space)

### Limitation Discovered
Complex badges like **Multisport** have unique naming patterns that don't follow simple rules:
- `4a1 Triathlon Option` should nest as: `4` → `Triathlon Option` → `(a)` → `(1)`
- Scoutbook does NOT maintain consistent patterns between versions
- Each badge+version needs explicit hierarchy configuration

---

## Phase 2: Complex Badge Hierarchy Overrides (PENDING)

### Approach
Create explicit per-version override configuration for complex badges.

### 2.1 Create Override Config File
**File:** `data/hierarchy-overrides.json`

```json
{
  "complex_badges": ["Multisport"],
  "versions": {
    "Multisport:2025": {
      "verified": true,
      "rules": [
        { "id": "4a1 Triathlon Option", "parent": "4a Triathlon Option" },
        { "id": "4a Triathlon Option", "parent": "4 Triathlon Option" },
        { "id": "4 Triathlon Option", "parent": "4" }
      ]
    }
  }
}
```

### 2.2 Update Build Script
- [ ] **2.2.1** Load override config in `build-canonical-from-scoutbook.ts`
- [ ] **2.2.2** Apply explicit parent IDs from overrides after pattern matching
- [ ] **2.2.3** Warn if complex badge version is missing from overrides

### 2.3 Create Validation Script
**File:** `scripts/validate-hierarchy.ts`
- [ ] **2.3.1** Flag requirements without parents that look nested (contain letters/brackets)
- [ ] **2.3.2** Flag complex badge versions missing from overrides
- [ ] **2.3.3** Flag orphaned children (parent_id references non-existent requirement)
- [ ] **2.3.4** Block import if validation fails

### Key Principle
**No inheritance between versions.** Each badge+version must be explicitly configured. When a new version appears for a complex badge, import is blocked until overrides are added.

---

## Phase 3: Approved vs Awarded Status (PENDING)

### Issues
- #9: Approved vs awarded not distinguished in import
- #10: Requirements not marked when badge is awarded

### Tasks
- [ ] **3.1** Update import logic to distinguish `approved=1` vs `awarded=1`
- [ ] **3.2** When badge is awarded, propagate completion to all requirements

---

## Phase 4: UI Display Fixes (PENDING)

### Issues
- #4: Full ID shown instead of leaf element
- #6, #11: No version dropdown selector

### Tasks
- [ ] **4.1** Verify `getDisplayLabel()` works with hierarchy (should work after Phase 1)
- [ ] **4.2** Verify/add version selector on advancement pages

---

## Phase 5: Investigate Regressions (PENDING)

### Issues
- #2: Rank requirements missing from UI
- #8: Regression on non-completed requirements

### Tasks
- [ ] **5.1** Investigate rank requirements query
- [ ] **5.2** Investigate non-completed requirements display

---

## Issue Summary

| # | Issue | Phase | Status |
|---|-------|-------|--------|
| 1 | Advancements uploaded with no errors | - | ✅ Working |
| 2 | Rank requirements missing from UI | 5 | ⬜ Pending |
| 3 | Merit badge requirements not nested | 1+2 | 🟡 Partial (simple patterns done) |
| 4 | Full ID shown instead of leaf element | 4 | ⬜ Pending |
| 5 | Requirements not in proper order | 1+2 | 🟡 Partial |
| 6 | No version dropdown selector | 4 | ⬜ Pending |
| 7 | Roster data empty (position, patrol) | - | ⏭️ Ignored (not in CSV) |
| 8 | Regression on non-completed requirements | 5 | ⬜ Pending |
| 9 | Approved vs awarded not distinguished | 3 | ⬜ Pending |
| 10 | Requirements not marked when badge awarded | 3 | ⬜ Pending |
| 11 | No version switcher on scout page | 4 | ⬜ Pending |
| 12 | Same hierarchy issues on scout page | 1+2 | 🟡 Partial |
| 13 | Leadership records not imported | - | ⏭️ Ignored (not in CSV) |
| 14 | Activity data not imported | - | ⏭️ Ignored (not in CSV) |

---

## Files Modified (Phase 1)

| File | Changes |
|------|---------|
| `scripts/build-canonical-from-scoutbook.ts` | Added Step 4b for hierarchy nesting |
| `data/bsa-data-canonical.json` | Rebuilt with nested children |

---

## Files to Create (Phase 2+)

| File | Purpose |
|------|---------|
| `data/hierarchy-overrides.json` | Explicit parent IDs for complex badges |
| `scripts/validate-hierarchy.ts` | Pre-import validation |

---

## Task Log

| Task | Date | Commit | Notes |
|------|------|--------|-------|
| Phase 1.1 | 2026-01-27 | (pending) | Updated build script with Step 4b |
| Phase 1.2 | 2026-01-27 | (pending) | Rebuilt canonical file, 4,242 children nested |
| Phase 1.3 | 2026-01-27 | (pending) | Verified DB has 4,270 parent_requirement_id |

---

## Next Steps

1. **Commit Phase 1 changes** (build script + canonical file)
2. **Phase 2**: Define overrides for Multisport and other complex badges
3. **Phase 3-5**: Address remaining issues

---

## Notes

- Scoutbook uses inconsistent naming patterns between badge versions
- Previous work was done on "Option A/B structure fixes" for complex nesting
- Each complex badge+version needs manual verification and explicit override rules
- Simple patterns (1a→1) work for ~95% of badges automatically
