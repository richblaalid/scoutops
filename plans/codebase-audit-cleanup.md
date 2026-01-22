# Codebase Audit & Cleanup Plan

> **Status:** Draft
> **Created:** 2026-01-21
> **Author:** Claude

---

## Executive Summary

This audit identified **6 ESLint errors**, **11 warnings**, unused dependencies, and structural issues. The codebase has excellent TypeScript hygiene (no `any` types) but needs attention in:

1. **ESLint Errors (6)** - React hooks violations causing cascading renders
2. **Unused Dependencies (6)** - Bloating bundle size
3. **Large Monolithic Files** - `advancement.ts` at 2310 LOC
4. **Type Duplication** - RankProgress/MeritBadgeProgress defined in 27+ files
5. **Missing Dependency** - `@radix-ui/react-visually-hidden`

---

## 1. Requirements

### 1.1 Problem Statement
Technical debt is accumulating: ESLint errors block CI, unused dependencies bloat the bundle, and duplicated types create maintenance burden.

### 1.2 Goals
- Zero ESLint errors
- Clean dependency tree
- Improved maintainability through type consolidation
- Better React patterns to prevent cascading renders

### 1.3 Out of Scope
- Test coverage expansion (separate initiative)
- Performance profiling
- Database index optimization
- Splitting large files (advancement.ts) - requires separate planning

---

## 2. Current Issues

### 2.1 ESLint Errors (BLOCKING - 6 errors)

| File | Line | Issue |
|------|------|-------|
| `src/components/advancement/bulk-entry-interface.tsx` | 263 | setState in useEffect |
| `src/components/advancement/hierarchical-requirements-list.tsx` | 468 | setState in useEffect |
| `src/components/advancement/scout-advancement-section.tsx` | 239 | setState in useEffect |
| `src/components/providers/sidebar-context.tsx` | 34 | setState in useEffect |
| `src/components/roster/adult-form.tsx` | 49 | setState in useEffect |
| `src/components/settings/theme-settings-card.tsx` | 39 | setState in useEffect |

**Pattern**: All 6 errors are `react-hooks/set-state-in-effect` - calling setState synchronously in useEffect.

### 2.2 ESLint Warnings (11 warnings)

| File | Issue |
|------|-------|
| `settings/import/advancement/page.tsx:70` | Missing useEffect dependency: `loadScouts` |
| `billing/send-charge-notification-dialog.tsx:60` | Missing useEffect dependency: `fetchGuardians` |
| `advancement/rank-icon.tsx:73` | Use `<Image />` instead of `<img>` |
| `advancement/rank-trail-visualization.tsx:394` | Use `<Image />` instead of `<img>` |
| `billing/billing-form.tsx:111` | Unused eslint-disable directive |
| `billing/edit-billing-dialog.tsx:53` | Unused eslint-disable directive |
| `billing/void-billing-dialog.tsx:57` | Unused eslint-disable directive |
| `lib/auth/extension-auth.ts:42` | Unused eslint-disable directive |
| `coverage/*.js` (3 files) | Unused eslint-disable directives (generated) |

### 2.3 Dependency Issues

**Unused Dependencies (6):**
```
@hookform/resolvers
@radix-ui/react-toast
@tanstack/react-query
@tanstack/react-table
date-fns
react-hook-form
```

**Missing Dependencies (1):**
```
@radix-ui/react-visually-hidden (used in mobile-nav.tsx)
```

**Unused DevDependencies (6):**
```
@eslint/eslintrc
@tailwindcss/postcss
@vitest/coverage-v8
autoprefixer
postcss
prettier
prettier-plugin-tailwindcss
```

### 2.4 Large Files (For Reference - Not In Scope)

| File | LOC | Note |
|------|-----|------|
| `src/app/actions/advancement.ts` | 2310 | Consider splitting in future |
| `src/components/settings/scoutbook-sync-card.tsx` | 1349 | Complex state logic |
| `src/components/advancement/bulk-entry-interface.tsx` | 1131 | Form complexity |

### 2.5 Dead Code

| File | Issue |
|------|-------|
| `src/lib/sync/scoutbook/ai-parser.ts` | 760 LOC - Disabled AI parsing |
| `src/components/advancement/merit-badge-detail-view.tsx` | Deleted (per git status) |
| `src/components/advancement/rank-requirements-list.tsx` | Deleted (per git status) |

---

## 3. Implementation Tasks

### Phase 0: Quick Wins (Fix Errors)

#### 0.1 Fix ESLint Errors - setState in useEffect

The React 19 lint rule `react-hooks/set-state-in-effect` flags synchronous setState calls in effects. Solutions:

**Pattern A: Initialize state correctly (no useEffect needed)**
```tsx
// Before
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

// After - use useLayoutEffect for mount detection or avoid if possible
const [mounted, setMounted] = useState(false)
useLayoutEffect(() => { setMounted(true) }, [])
```

**Pattern B: Use useSyncExternalStore for localStorage**
```tsx
// For sidebar-context.tsx - use useSyncExternalStore instead
```

**Pattern C: Compute derived state instead of syncing**
```tsx
// For bulk-entry-interface.tsx - use useMemo for default selection
const selectedRequirementId = useMemo(() =>
  filteredRequirements[0]?.id, [filteredRequirements])
```

- [x] **0.1.1** Fix `sidebar-context.tsx:34` - Use useSyncExternalStore for localStorage
  - Files: `src/components/providers/sidebar-context.tsx`
  - Test: `npm run lint` passes, sidebar still works

- [x] **0.1.2** Fix `adult-form.tsx:49` - Use useIsMounted hook with useSyncExternalStore
  - Files: `src/components/roster/adult-form.tsx`
  - Test: `npm run lint` passes, form renders correctly

- [x] **0.1.3** Fix `theme-settings-card.tsx:39` - Use useIsMounted hook
  - Files: `src/components/settings/theme-settings-card.tsx`
  - Test: `npm run lint` passes, theme toggle works

- [x] **0.1.4** Fix `bulk-entry-interface.tsx:263` - Derive selectedRequirementId with useMemo
  - Files: `src/components/advancement/bulk-entry-interface.tsx`
  - Test: `npm run lint` passes, bulk entry works

- [x] **0.1.5** Fix `hierarchical-requirements-list.tsx:468` - Use key-based state pattern
  - Files: `src/components/advancement/hierarchical-requirements-list.tsx`
  - Test: `npm run lint` passes, requirements list works

- [x] **0.1.6** Fix `scout-advancement-section.tsx:239` - Use useTransition for data fetching
  - Files: `src/components/advancement/scout-advancement-section.tsx`
  - Test: `npm run lint` passes, advancement section loads requirements

#### 0.2 Fix ESLint Warnings

- [x] **0.2.1** Fix missing dependencies in useEffect hooks
  - Files: `src/app/(dashboard)/settings/import/advancement/page.tsx`, `src/components/billing/send-charge-notification-dialog.tsx`
  - Test: `npm run lint` shows 0 dependency warnings

- [x] **0.2.2** Replace `<img>` with Next.js `<Image>`
  - Files: `src/components/advancement/rank-icon.tsx`, `src/components/advancement/rank-trail-visualization.tsx`
  - Test: `npm run lint` shows 0 img warnings, images display correctly

- [x] **0.2.3** Remove unused eslint-disable directives
  - Files: `src/components/billing/billing-form.tsx`, `src/components/billing/edit-billing-dialog.tsx`, `src/components/billing/void-billing-dialog.tsx`, `src/lib/auth/extension-auth.ts`
  - Test: `npm run lint` shows 0 unused directive warnings

---

### Phase 1: Dependency Cleanup

#### 1.1 Add Missing Dependencies

- [x] **1.1.1** Install `@radix-ui/react-visually-hidden`
  - Command: `npm install @radix-ui/react-visually-hidden`
  - Test: `npm run build` passes

#### 1.2 Remove Unused Dependencies

- [x] **1.2.1** Remove unused production dependencies
  - Command: `npm uninstall @hookform/resolvers @radix-ui/react-toast @tanstack/react-query @tanstack/react-table date-fns react-hook-form`
  - Test: `npm run build` passes, app works
  - Result: Removed 10 packages total

- [x] **1.2.2** Evaluate devDependencies before removal
  - Note: DevDependencies like postcss, autoprefixer are used by Tailwind build tooling
  - Action: Kept Tailwind tooling deps, they're actually used
  - Test: `npm run build` and `npm run lint` pass

---

### Phase 2: Code Quality (Optional)

#### 2.1 Type Consolidation

- [ ] **2.1.1** Audit type duplication in advancement components
  - Research: Count files with local RankProgress/MeritBadgeProgress definitions
  - Decision: Create shared types in `src/types/advancement.ts`

- [ ] **2.1.2** Replace local type definitions with imports
  - Files: Multiple advancement components
  - Test: TypeScript compiles, tests pass

#### 2.2 Dead Code Removal

- [ ] **2.2.1** Evaluate and remove ai-parser.ts if confirmed unused
  - Files: `src/lib/sync/scoutbook/ai-parser.ts`
  - Decision: Confirm with user before deletion

---

## 4. Testing Strategy

### Verification Steps (After Each Phase)
```bash
npm run lint          # Zero errors, minimal warnings
npm run build         # Successful build
npm test              # All 449 tests pass
```

### Manual Testing
- [ ] Sidebar collapse/expand works
- [ ] Theme toggle works
- [ ] Advancement bulk entry works
- [ ] Rank requirements list works
- [ ] Scout advancement section loads requirements

---

## 5. Progress Summary

| Phase | Total | Complete | Status |
|-------|-------|----------|--------|
| Phase 0 | 9 | 9 | ✅ Complete |
| Phase 1 | 3 | 3 | ✅ Complete |
| Phase 2 | 3 | 0 | ⬜ Not Started |

---

## 6. Task Log

| Task | Date | Commit | Notes |
|------|------|--------|-------|
| 0.1.1 | 2026-01-21 | pending | Fixed sidebar-context.tsx with useSyncExternalStore |
| 0.1.2 | 2026-01-21 | pending | Fixed adult-form.tsx with useIsMounted hook |
| 0.1.3 | 2026-01-21 | pending | Fixed theme-settings-card.tsx with useIsMounted hook |
| 0.1.4 | 2026-01-21 | pending | Fixed bulk-entry-interface.tsx with derived state pattern |
| 0.1.5 | 2026-01-21 | pending | Fixed hierarchical-requirements-list.tsx with key-based state |
| 0.1.6 | 2026-01-21 | pending | Fixed scout-advancement-section.tsx with useTransition |
| 0.2.1 | 2026-01-21 | pending | Fixed useEffect deps in advancement/page.tsx |
| 0.2.2 | 2026-01-21 | pending | Fixed useEffect deps in send-charge-notification-dialog.tsx |
| 0.2.3 | 2026-01-21 | pending | Replaced <img> with <Image> in rank-icon.tsx |
| 0.2.4 | 2026-01-21 | pending | Replaced <img> with <Image> in rank-trail-visualization.tsx |
| 0.2.5 | 2026-01-21 | pending | Removed unused eslint-disable directives via --fix |
| 1.1.1 | 2026-01-21 | pending | Installed @radix-ui/react-visually-hidden |
| 1.2.1 | 2026-01-21 | pending | Removed 6 unused deps, 10 packages total |

---

## 7. Positive Findings

The codebase demonstrates strong foundations:

- **TypeScript Hygiene**: No `any` types, no `@ts-ignore` comments
- **Build Health**: Clean build with no TypeScript errors
- **Test Suite**: 449 tests, all passing
- **Component Structure**: Well-organized with clear separation
- **Security**: RLS policies implemented, proper auth patterns

---

## Open Questions

| Question | Answer | Decided By |
|----------|--------|------------|
| Should we remove `ai-parser.ts` or keep it disabled? | | User |
| Keep postcss/autoprefixer devDeps (used by Tailwind)? | | User |
| Prioritize type consolidation in this sprint? | | User |

---

## Approval

- [ ] Requirements reviewed by: _____
- [ ] Ready for implementation
