# Brand Color Consolidation & Platform Implementation

## Overview

Consolidate brand colors to match the landing page (authoritative source) and implement consistently across the ChuckBox platform. The landing page and `docs/brand-guide.html` represent the correct brand colors.

## Current State Analysis

### Brand Guide Colors (Source of Truth - docs/brand-guide.html)
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Deep Pine | green-900 | `#14532d` | Logo body, dark sections |
| Primary Action | green-800 | `#166534` | CTAs, buttons, links |
| Accent | amber-700 | `#b45309` | Headline highlights, "Box" text |
| Dark Mode Accent | amber-600 | `#d97706` | Dark theme accents |
| Warm White | - | `#FEFCF8` | Marketing backgrounds |
| Cream | - | `#FAF3EB` | App backgrounds |

### Actual Problems Found

#### 1. tailwind.config.ts - Forest palette misaligned
Current `forest-800: #234D3E` (custom Pine) differs from brand guide `#166534` (Tailwind green-800)

**However**: The brand guide uses `#14532d` (green-900) for logo body, which is close to the current approach. The plan originally wanted to change to Tailwind green palette, but our custom Pine palette (`#234D3E`) is intentionally different and used consistently.

**Decision needed**: Keep custom Pine (`#234D3E`) or switch to Tailwind green (`#166534`)?

#### 2. globals.css - Accent color outdated
```css
--accent: 24 97% 46%;  /* #E85D04 (campfire orange) */
```
Brand guide says accent should be `#b45309` (amber-700).

#### 3. Hardcoded `#E85D04` in component files (6 locations in src/)
| File | Usage |
|------|-------|
| `src/components/advancement/requirement-approval-row.tsx` | 5 instances - completed checkbox styling |
| `src/components/advancement/hierarchical-requirements-list.tsx` | 2 instances - completed badge styling |
| `src/components/advancement/unit-rank-panel.tsx` | 1 instance - count badge |
| `src/app/(dashboard)/not-found.tsx` | 3 instances - SVG icon colors |

#### 4. `tan-` token still used in codebase (15 locations in src/)
The `tan` palette exists in tailwind.config.ts but should be renamed to `amber` per the plan.

Files using `tan-`:
- `src/app/(marketing)/early-access/page.tsx` - required field asterisks
- `src/app/(marketing)/contact/page.tsx` - required field asterisks
- `src/components/onboarding/setup-wizard.tsx` - border/bg styling
- `src/components/onboarding/signup-wizard.tsx` - required field asterisks
- `src/components/ui/button.tsx` - accent button variant
- `src/components/ui/bento-grid.tsx` - card accents
- `src/components/ui/success-animation.tsx` - glow effects

#### 5. SVG assets use old colors
Icon files (`src/app/icon.svg`, `src/app/apple-icon.svg`) still use `#E85D04` and `#234D3E`

---

## Implementation Plan

### Phase 1: Design System Configuration

#### 1.1 Update tailwind.config.ts
**Option A (Conservative)**: Keep custom Pine palette, just rename `tan` to `amber`
- Preserves existing visual identity
- Less risk of unintended visual changes
- `forest-800` stays as `#234D3E`

**Option B (Full Alignment)**: Update forest to match Tailwind green palette
- Aligns with brand guide exactly
- Requires updating all SVG assets
- `forest-800` becomes `#166534`

**Recommendation**: Option A (Conservative) - rename `tan` → `amber` only

```typescript
// Rename tan to amber (no value changes needed - already uses amber values)
amber: {
  50: '#fffbeb',    // amber-50
  100: '#fef3c7',   // amber-100
  200: '#fde68a',   // amber-200
  300: '#fcd34d',   // amber-300
  400: '#fbbf24',   // amber-400
  500: '#f59e0b',   // amber-500
  600: '#d97706',   // amber-600 - UI Action color
  700: '#b45309',   // amber-700 - Primary accent
  800: '#92400e',   // amber-800
  900: '#78350f',   // amber-900
  DEFAULT: '#b45309',
}
```

#### 1.2 Update globals.css
Fix CSS variables to match brand:
```css
/* Accent - Amber 700 (was campfire #E85D04) */
--accent: 25 95% 37%;    /* #b45309 */

/* Update comments to remove "campfire" references */
```

---

### Phase 2: Replace Hardcoded Colors

#### 2.1 Migrate #E85D04 to amber-600
Replace all hardcoded `#E85D04` with `amber-600` or `tan-600` (becomes `amber-600` after rename):

| File | Current | Change To |
|------|---------|-----------|
| `requirement-approval-row.tsx` | `bg-[#E85D04]` | `bg-amber-600` |
| `hierarchical-requirements-list.tsx` | `bg-[#E85D04]` | `bg-amber-600` |
| `unit-rank-panel.tsx` | `bg-[#E85D04]` | `bg-amber-600` |
| `not-found.tsx` | `fill="#E85D04"` | Keep as-is (SVG) or use CSS var |

#### 2.2 Rename tan- to amber- in component files
Search/replace `tan-` with `amber-` in all component files:
- `button.tsx`
- `bento-grid.tsx`
- `success-animation.tsx`
- `setup-wizard.tsx`
- `signup-wizard.tsx`
- `early-access/page.tsx`
- `contact/page.tsx`

---

### Phase 3: SVG Asset Updates (Optional)

Update SVG files if doing full palette alignment:
- `src/app/icon.svg`
- `src/app/apple-icon.svg`
- `src/app/(dashboard)/not-found.tsx` (inline SVG)

**Note**: SVG assets using `#E85D04` for the work surface should update to `#b45309` (amber-700) or `#d97706` (amber-600) per brand guide.

---

### Phase 4: Documentation Update

#### 4.1 Update brand-guide.html
- Remove any references to "campfire"
- Document amber palette as unified accent color
- Ensure consistency with implementation

---

## Files to Modify

### Configuration (Required)
- `tailwind.config.ts` - Rename `tan` → `amber`
- `src/app/globals.css` - Fix accent CSS variable, update comments

### Components - Hardcoded #E85D04 (Required)
- `src/components/advancement/requirement-approval-row.tsx` (5 instances)
- `src/components/advancement/hierarchical-requirements-list.tsx` (2 instances)
- `src/components/advancement/unit-rank-panel.tsx` (1 instance)
- `src/app/(dashboard)/not-found.tsx` (3 instances)

### Components - tan- to amber- rename (Required)
- `src/app/(marketing)/early-access/page.tsx`
- `src/app/(marketing)/contact/page.tsx`
- `src/components/onboarding/setup-wizard.tsx`
- `src/components/onboarding/signup-wizard.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/bento-grid.tsx`
- `src/components/ui/success-animation.tsx`

### SVG Assets (Optional)
- `src/app/icon.svg`
- `src/app/apple-icon.svg`

### Documentation
- `docs/brand-guide.html` - Update to reflect unified amber palette

---

## Decisions (Resolved)

1. **Campfire (#E85D04) fate**: **Migrate to amber-600 (`#d97706`)**
   - All `#E85D04` instances will be replaced with `amber-600`
   - Creates consistent amber palette usage across the platform

2. **Token naming**: **Rename "tan" to "amber"**
   - Aligns with Tailwind standard naming
   - Clearer semantic meaning

3. **Forest palette**: **Keep as-is (conservative approach)**
   - `#234D3E` is intentionally different from Tailwind green
   - Changing would affect many SVG assets
   - Can revisit if brand guide explicitly requires `#166534`

---

## Verification

After implementation:
1. Build passes: `npm run build`
2. No hardcoded `#E85D04` in src/: `grep -r "#E85D04" src/` should only show comments
3. No `tan-` token usage: `grep -r "tan-" src/` should return nothing
4. Visual check on:
   - Landing page hero and CTAs
   - Requirement approval checkboxes
   - Scout profile advancement sections
   - Login/signup pages

---

## Task Log

| Task | Status | Date | Commit |
|------|--------|------|--------|
| 1.1 Rename tan to amber in tailwind.config.ts | ✅ Complete | 2026-01-28 | pending |
| 1.2 Update globals.css accent variable | ✅ Complete | 2026-01-28 | pending |
| 2.1 Replace #E85D04 in components | ✅ Complete | 2026-01-28 | pending |
| 2.2 Replace tan- with amber- in components | ✅ Complete | 2026-01-28 | pending |
| 3.1 Update SVG assets | ✅ Complete | 2026-01-28 | pending |
| 4.1 Update brand-guide.html | N/A (already correct) | 2026-01-28 | - |
| Verification | ✅ Complete | 2026-01-28 | pending |
