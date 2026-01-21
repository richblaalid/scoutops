# Bulk Requirement Sign-Off Feature

> **Status:** In Progress
> **Created:** 2026-01-21
> **Author:** Claude

---

## 1. Overview

### Problem Statement
Currently, leaders can sign off on requirements one at a time, which is time-consuming when a scout completes multiple requirements at an event or meeting. While bulk approval exists for rank requirements, there's no similar feature for merit badges, and the toggle to enter "multi-select mode" isn't consistently available across views.

### Solution
Create a **unified bulk approval experience** that works identically for both rank and merit badge requirements. Refactor the existing `BulkApprovalSheet` to be generic, and add consistent "Select Multiple" toggle UI to all requirement views.

### User Value
- **Who:** Scout leaders (Scoutmasters, ASMs, Advancement Chairs)
- **Problem:** Signing off 10+ requirements one-by-one is tedious and slow
- **Value:** Bulk sign-off saves time, especially at campouts and merit badge events

### Design Principle
**Single consistent UI experience** - the same component and interaction pattern should work for both rank and merit badge requirements across all views.

---

## 2. Requirements

### 2.1 Functional Requirements

**Toggle Mode UI (consistent across all views):**
- Add "Select Multiple" button that toggles checkbox visibility
- When active, show checkboxes next to each incomplete requirement
- Show floating action bar at bottom with selection count and "Sign Off" button
- "Cancel" exits multi-select mode and clears selection

**Selection Behavior:**
- Only incomplete requirements are selectable
- Completed/approved requirements show disabled checkboxes
- "Select All Incomplete" option in the action bar
- Selection persists while scrolling within the current badge/rank

**Sign-Off Dialog (unified component):**
- Shared completion date (defaults to today, supports backdating)
- Shared notes field (optional)
- Shows list of selected requirements for confirmation
- Uses same date for all requirements (per user preference)
- Works for both rank and merit badge requirements via props

**Scope:**
- Merit badge requirements: Selection within single badge only
- Rank requirements: Selection within single rank only
- Works in both `/scouts/[id]` profile view and `/advancement` browser
- **Same UI component** used everywhere

### 2.2 Out of Scope
- Cross-badge/cross-rank requirement selection
- Per-requirement date selection
- Bulk undo

### 2.3 Success Criteria
- Leader can select 5+ requirements and sign off in <10 seconds
- Toggle mode is discoverable but not intrusive
- Works on mobile (touch-friendly checkboxes)
- **Identical experience** between merit badges and ranks
- Single `BulkApprovalSheet` component handles both types

---

## 3. Technical Design

### 3.1 Unified Component Architecture

**Goal:** Single `BulkApprovalSheet` component that handles both rank and merit badge requirements via a `type` prop.

**Existing `BulkApprovalSheet` (to refactor):**
```typescript
// Current: rank-specific
interface BulkApprovalSheetProps {
  rankProgressId: string
  requirements: RequirementWithProgress[]
  // ...
}

// Refactored: unified
interface BulkApprovalSheetProps {
  type: 'rank' | 'merit-badge'
  progressId: string  // rankProgressId OR meritBadgeProgressId
  requirements: RequirementWithProgress[]
  initData?: RankInitData | MeritBadgeInitData  // type-specific init
  // ...
}
```

### 3.2 Component Changes

**Components to Modify:**

1. **`bulk-approval-sheet.tsx`** (REFACTOR)
   - Add `type: 'rank' | 'merit-badge'` prop
   - Rename `rankProgressId` → `progressId`
   - Conditionally call correct action based on type
   - Support both `initData` (rank) and `meritBadgeInitData` (badge)

2. **`single-merit-badge-requirements.tsx`** (ADD MULTI-SELECT)
   - Add "Select Multiple" toggle button (same pattern as ranks)
   - Add state: `isMultiSelectMode`, `selectedIds`
   - Integrate `BulkApprovalSheet` with `type="merit-badge"`
   - Add floating action bar

3. **`single-rank-requirements.tsx`** (VERIFY/ALIGN)
   - Ensure "Select Multiple" toggle exists (or add if missing)
   - Verify same UI pattern as merit badge view
   - Update to use refactored `BulkApprovalSheet` if needed

4. **`hierarchical-requirements-list.tsx`** (PASS THROUGH)
   - Add `isMultiSelectMode` prop
   - Add `selectedIds` and `onSelectionChange` props
   - Pass through to `RequirementApprovalRow`

5. **`requirement-approval-row.tsx`** (CONDITIONAL CHECKBOX)
   - Show selection checkbox only when `isMultiSelectMode=true`
   - Disable individual sign-off click in multi-select mode
   - Already has `isSelected`/`onSelectionChange` props

### 3.3 Shared Action Pattern

**Existing Actions (both already exist):**
```typescript
// For ranks
bulkApproveRequirements(ids, unitId, date?, notes?)
bulkApproveRequirementsWithInit(initData, ids, unitId, date?, notes?)

// For merit badges
bulkApproveMeritBadgeRequirements(ids, unitId, date?, notes?)
// May need: bulkApproveMeritBadgeRequirementsWithInit()
```

**Component calls correct action based on `type` prop:**
```typescript
const handleApprove = async () => {
  if (type === 'rank') {
    if (initData) {
      await bulkApproveRequirementsWithInit(initData, selectedIds, ...)
    } else {
      await bulkApproveRequirements(selectedIds, ...)
    }
  } else {
    if (meritBadgeInitData) {
      await bulkApproveMeritBadgeRequirementsWithInit(meritBadgeInitData, selectedIds, ...)
    } else {
      await bulkApproveMeritBadgeRequirements(selectedIds, ...)
    }
  }
}
```

### 3.4 Data Flow (Unified)

```
User clicks "Select Multiple" (rank OR badge view)
  → isMultiSelectMode = true
  → Checkboxes appear on incomplete requirements

User selects requirements
  → selectedIds.add(requirementId)
  → Floating action bar updates count

User clicks "Sign Off Selected"
  → BulkApprovalSheet opens (same component)
  → Shows selected requirements list
  → User sets date + notes
  → Correct action called based on type prop
  → Success feedback
  → Exit multi-select mode
  → Page revalidates
```

### 3.5 UI Design (Consistent)

**Toggle Button Location (same in both views):**
```
┌─────────────────────────────────────────────────────┐
│ [Badge/Rank Name]                   [Select Multiple] │
│ Progress: ████████░░ 8/10                           │
├─────────────────────────────────────────────────────┤
│ ☐ 1. First requirement description...              │
│ ☐ 1a. Sub-requirement...                           │
│ ✓ 1b. (completed - disabled checkbox)              │
│ ...                                                │
└─────────────────────────────────────────────────────┘
```

**Floating Action Bar (identical in both views):**
```
┌─────────────────────────────────────────────────────┐
│  3 selected    [Select All]  [Clear]  [Sign Off ▶] │
└─────────────────────────────────────────────────────┘
```

---

## 4. Implementation Tasks

### Phase 0: Foundation & Refactoring
- [x] **0.1.1** Audit existing `BulkApprovalSheet` - understand current props and actions
- [x] **0.1.2** Verify `bulkApproveMeritBadgeRequirements` action exists and handles notes
- [x] **0.1.3** Check if "with init" variant needed for unstarted badges (not needed - badges auto-create progress)
- [x] **0.2.1** Refactor `BulkApprovalSheet` to accept `type: 'rank' | 'merit-badge'` prop
- [x] **0.2.2** Rename `rankName` → `itemName` for generic use
- [x] **0.2.3** Add conditional action dispatch based on type
- [x] **0.2.4** Update existing rank usages to pass `type="rank"`

### Phase 1: Unified Multi-Select Infrastructure
- [x] **1.1.1** Update `hierarchical-requirements-list.tsx` with selection props
- [x] **1.1.2** Update `requirement-approval-row.tsx` for conditional checkbox display
- [x] **1.1.3** Create shared `MultiSelectActionBar` component

### Phase 2: Merit Badge Multi-Select (Scout Profile)
- [ ] **2.1.1** Add multi-select state to `single-merit-badge-requirements.tsx`
- [ ] **2.1.2** Add "Select Multiple" toggle button matching rank view
- [ ] **2.1.3** Integrate `BulkApprovalSheet` with `type="merit-badge"`
- [ ] **2.1.4** Add floating action bar when selections exist
- [ ] **2.1.5** Wire up selection → approval flow

### Phase 3: Rank Multi-Select Alignment
- [ ] **3.1.1** Verify `single-rank-requirements.tsx` has same toggle pattern
- [ ] **3.1.2** Align UI if any inconsistencies found
- [ ] **3.1.3** Update to use refactored `BulkApprovalSheet` with `type="rank"`

### Phase 4: /advancement Browser Views
- [ ] **4.1.1** Add multi-select to merit badge browser view
- [ ] **4.1.2** Add multi-select to rank browser view (if not present)
- [ ] **4.1.3** Ensure consistent behavior with scout profile views

### Phase 5: Testing & Polish
- [ ] **5.1.1** Test bulk sign-off with 1, 5, 10+ requirements (both types)
- [ ] **5.1.2** Test edge cases (all selected, none selected, mixed states)
- [ ] **5.1.3** Verify mobile responsiveness
- [ ] **5.1.4** Run build and lint
- [ ] **5.1.5** Cross-browser testing

---

## 5. Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/advancement/bulk-approval-sheet.tsx` | REFACTOR | Add type prop, support both rank and merit badge |
| `src/components/advancement/single-merit-badge-requirements.tsx` | MODIFY | Add multi-select mode and toggle |
| `src/components/advancement/single-rank-requirements.tsx` | MODIFY | Align UI pattern, use refactored sheet |
| `src/components/advancement/hierarchical-requirements-list.tsx` | MODIFY | Pass selection props through |
| `src/components/advancement/requirement-approval-row.tsx` | MODIFY | Conditional checkbox in multi-select mode |
| `src/app/actions/advancement.ts` | MODIFY | Add `bulkApproveMeritBadgeRequirementsWithInit` if needed |

---

## 6. Open Questions

1. **Action bar position:** Fixed at bottom of viewport or bottom of the requirements card?
   - Recommendation: Fixed to viewport for visibility while scrolling

2. **Keyboard shortcuts:** Support Shift+Click for range selection?
   - Recommendation: Skip for MVP, add later if requested

---

## 7. Task Log

| Date | Task | Commit |
|------|------|--------|
| 2026-01-21 | Phase 0: Refactored BulkApprovalSheet for unified rank/badge use | pending |
