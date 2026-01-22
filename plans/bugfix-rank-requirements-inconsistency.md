# Bugfix: Rank Requirements Display Inconsistency

> **Status:** Investigation Complete - Ready for Implementation
> **Created:** 2026-01-22
> **Reporter:** Richard
> **Severity:** Medium (UI/UX inconsistency)

---

## Problem Description

Rank requirements on `/scouts/[id]` and `/advancement` pages display inconsistently compared to merit badge requirements:

1. **Missing hierarchical fields** - Rank requirements don't pass `parentRequirementId`, `isAlternative`, etc. to `HierarchicalRequirementsList`
2. **Lost category headings** - No section/category grouping in rank requirements
3. **Inconsistent nesting** - Sub-requirements not properly nested with visual indicators

### Expected Behavior (Merit Badge - Working)
- Collapsible parent requirements with expandable children
- Proper requirement numbering (1, 1a, 1b, 2, 2a, etc.)
- Visual nesting with left borders
- "Choose X" indicators for alternative requirements
- Matches Scoutbook format

### Actual Behavior (Ranks - Broken)
- Flat list or manual parent/child filtering
- No collapsible sections
- Missing visual hierarchy indicators
- No alternative requirement support

---

## Root Cause Analysis

### Issue 1: ScoutRankPanel Missing Hierarchy Fields

**File:** `src/components/advancement/scout-rank-panel.tsx`
**Lines:** 262-284

The `formattedRequirements` mapping does NOT include hierarchy fields:

```typescript
// CURRENT (broken) - lines 262-284
const formattedRequirements = hasProgressData
  ? sortedRequirements.map(req => ({
      id: req.bsa_rank_requirements.id,
      requirementProgressId: req.id,
      requirementNumber: req.bsa_rank_requirements.requirement_number,
      description: req.bsa_rank_requirements.description,
      status: req.status as AdvancementStatus,
      completedAt: req.completed_at,
      completedBy: req.completed_by,
      notes: req.notes,
      approvalStatus: req.approval_status,
      // MISSING: parentRequirementId, isAlternative, alternativesGroup, nestingDepth, requiredCount
    }))
```

Compare to **ScoutMeritBadgePanel** (working) - lines 131-150:

```typescript
// WORKING - passes all hierarchy fields
.map(req => ({
  id: req.id,
  requirementProgressId: progress?.id || null,
  requirementNumber: req.requirement_number,
  description: req.description,
  status: (progress?.status || 'not_started') as AdvancementStatus,
  // ... other fields ...
  parentRequirementId: req.parent_requirement_id,      // ✓
  isAlternative: req.is_alternative,                   // ✓
  alternativesGroup: req.alternatives_group,           // ✓
  nestingDepth: req.nesting_depth,                     // ✓
  requiredCount: req.required_count,                   // ✓
}))
```

### Issue 2: Data Not Fetched with Hierarchy Fields

**File:** `src/components/advancement/scout-rank-panel.tsx`

The `RankProgress` interface for progress data only includes basic requirement fields:

```typescript
interface RankProgress {
  // ...
  scout_rank_requirement_progress: Array<{
    bsa_rank_requirements: {
      id: string
      requirement_number: string
      description: string
      // MISSING: parent_requirement_id, is_alternative, alternatives_group
    }
  }>
}
```

### Issue 3: UnitRankPanel Uses Manual Hierarchy

**File:** `src/components/advancement/unit-rank-panel.tsx`

This component does NOT use `HierarchicalRequirementsList` at all. It manually:
1. Filters to parent requirements only (line 87-88)
2. Gets sub-requirements via `getSubRequirements()` function
3. Renders its own flat list with manual nesting

This approach:
- Doesn't support multi-level nesting (grandchildren)
- Doesn't support alternatives/options
- Has different visual styling than merit badges

### Issue 4: Database Query Missing Fields

When fetching rank progress, the query doesn't include hierarchy fields:

**File:** Multiple locations where `scout_rank_requirement_progress` is fetched

```sql
-- Current query shape
scout_rank_requirement_progress (
  id,
  status,
  bsa_rank_requirements (
    id,
    requirement_number,
    description
    -- MISSING: parent_requirement_id, is_alternative, alternatives_group
  )
)
```

---

## Fix Approach

### Phase 1: Update ScoutRankPanel to Match ScoutMeritBadgePanel

1. **Update data fetching** - Include hierarchy fields in the query
2. **Update interface** - Add hierarchy fields to `RankProgress` interface
3. **Update mapping** - Pass hierarchy fields to `HierarchicalRequirementsList`

### Phase 2: Update UnitRankPanel to Use HierarchicalRequirementsList

1. Replace manual rendering with `HierarchicalRequirementsList`
2. Adapt multi-select behavior to work with the hierarchical component
3. Ensure consistent styling with merit badge views

### Phase 3: Update Data Queries

1. Update queries in `advancement/page.tsx` to include hierarchy fields
2. Update queries in scout profile data fetching
3. Ensure `getRankRequirements` action returns hierarchy fields

---

## Implementation Tasks

| # | Task | File | Status |
|---|------|------|--------|
| 1.1 | Update RankProgress interface with hierarchy fields | `scout-rank-panel.tsx` | ✅ Done |
| 1.2 | Update formattedRequirements mapping | `scout-rank-panel.tsx` | ✅ Done |
| 1.3 | Update RankRequirementsData interface | `scout-rank-panel.tsx` | ✅ Done |
| 1.4 | Update scout-advancement-section RankProgress | `scout-advancement-section.tsx` | ✅ Done |
| 1.5 | Update scout-profile-tabs AdvancementData | `scout-profile-tabs.tsx` | ✅ Done |
| 1.6 | Update getRankRequirements query | `advancement.ts` | ✅ Done |
| 2.1 | Update rank queries to include hierarchy fields | `advancement/page.tsx` | Pending |
| 2.2 | Update scout profile rank queries | `scouts/[id]/page.tsx` | Pending |
| 3.1 | Refactor UnitRankPanel to use HierarchicalRequirementsList | `unit-rank-panel.tsx` | Pending |
| 4.1 | Test rank display on scout profile | Manual | Pending |
| 4.2 | Test rank display on advancement page | Manual | Pending |

---

## Risk Assessment

**Low Risk:**
- Changes are additive (adding missing fields)
- `HierarchicalRequirementsList` already handles both merit badges and ranks
- Database already has hierarchy fields populated

**Testing Required:**
- Verify rank requirements display correctly on scout profile
- Verify rank requirements display on advancement page
- Verify multi-select still works correctly
- Verify bulk sign-off still works

---

## Files to Modify

1. `src/components/advancement/scout-rank-panel.tsx` - Add hierarchy fields to mapping
2. `src/app/(dashboard)/advancement/page.tsx` - Update queries
3. `src/app/(dashboard)/scouts/[id]/page.tsx` - Update queries
4. `src/components/advancement/unit-rank-panel.tsx` - Consider refactor (Phase 2)

---

## Approval

- [ ] Root cause confirmed
- [ ] Fix approach approved
- [ ] Ready to implement
