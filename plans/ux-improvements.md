# UX Improvements Implementation Plan

> **Status:** In Review
> **Created:** 2026-01-25
> **Author:** Claude Code (based on UX Audit)
> **Audit Reference:** `/reports/ux-audit-2026-01-25.md`

---

## 1. Requirements

### 1.1 Problem Statement

The UX audit identified 10 issues across brand compliance, mobile responsiveness, React performance, and accessibility. These issues affect brand consistency, user experience on mobile devices, page load performance, and accessibility compliance.

**Key Problems:**
1. Typography uses different fonts than brand guidelines
2. Data fetching waterfall slows scout detail page
3. Some interactive elements have insufficient touch targets
4. Missing loading states create perception of slow pages
5. Color contrast issues affect accessibility

### 1.2 User Stories

- [x] As a **scout leader**, I want pages to load quickly so that I can check information during busy meetings
- [x] As a **mobile user**, I want buttons and links to be easy to tap so that I don't mis-tap on small targets
- [x] As a **user with visual impairments**, I want sufficient color contrast so that I can read all interface text
- [x] As a **brand manager**, I want consistent typography so that the app matches our brand identity

### 1.3 Acceptance Criteria

- [ ] All text uses Nunito font family (per brand guidelines)
- [ ] Scout detail page loads with parallel data fetching (no waterfalls)
- [ ] All interactive elements meet 44x44px minimum touch target
- [ ] All text meets WCAG AA contrast ratio (4.5:1 for normal text)
- [ ] All dashboard pages have loading skeletons
- [ ] Forest colors match exact Pine palette values
- [ ] Focus indicators are clearly visible

### 1.4 Out of Scope

- Complete redesign of any pages
- New features or functionality
- Dark mode improvements (separate effort)
- Backend/API changes beyond data fetching optimization

### 1.5 Open Questions

| Question | Answer | Decided By |
|----------|--------|------------|
| Use Google Fonts Nunito or self-host? | Google Fonts (via next/font) | Standard practice |
| Should we add Nunito Sans as fallback? | Yes, for better consistency | Designer recommendation |

---

## 2. Technical Design

### 2.1 Approach

**Strategy:** Address issues in priority order, grouping related changes to minimize file touches.

1. **Typography (High):** Swap font family in layout.tsx and tailwind.config.ts
2. **Performance (High):** Refactor scout detail page with Promise.all()
3. **Colors (Medium):** Update forest color palette to exact Pine values
4. **Loading States (Medium):** Add loading.tsx skeletons to missing pages
5. **Accessibility (Medium):** Fix contrast and focus indicators
6. **Mobile Polish (Low):** Improve Quick Actions and billing layouts

### 2.2 Design Specifications

#### Typography Specifications

| Element | Current | New (Nunito) |
|---------|---------|--------------|
| Page titles | Bricolage 30px/700 | Nunito 30px/800 |
| Section titles | Bricolage 20px/600 | Nunito 20px/700 |
| Body text | DM Sans 14px/400 | Nunito 14px/400 |
| Labels | DM Sans 14px/500 | Nunito 14px/600 |
| Buttons | DM Sans 14px/600 | Nunito 14px/700 |

**Font Import Configuration:**
```tsx
// Nunito with all needed weights
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})
```

#### Button & Link Specifications

| Element | Size | Touch Target | Padding |
|---------|------|--------------|---------|
| Primary Button | h-11 (44px) | 44x44px min | px-6 py-2.5 |
| Secondary Button | h-10 (40px) | 44x40px | px-5 py-2 |
| Small Button | h-9 (36px) | 44x36px | px-4 py-1.5 |
| Icon Button | w-11 h-11 (44px) | 44x44px | p-2.5 |
| Text Link | auto | 44px height zone | py-2 inline-block |
| Table Action Links | auto | 44px touch zone | py-2 px-2 |

**Touch Target Implementation:**
```css
/* Ensure 44px minimum clickable area even for small visual elements */
.touch-target-44 {
  position: relative;
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* For text links, add invisible touch padding */
.link-touch-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}
```

#### Color Specifications

| Token | Current | New (Pine Palette) |
|-------|---------|-------------------|
| forest-800 | #166534 | #234D3E (Pine 800) |
| forest-900 | #14532d | #1B3D30 (Pine 900) |
| forest-700 | #15803d | #2D6A4F (Pine 700) |
| forest-600 | #16a34a | #3D8B6A (Pine 600) |
| forest-500 | #22c55e | #52A07E (Pine 500) |

#### Focus Indicator Specifications

```css
/* Enhanced focus ring for better visibility */
.focus-visible-enhanced {
  @apply focus-visible:ring-2
         focus-visible:ring-forest-600
         focus-visible:ring-offset-2
         focus-visible:ring-offset-background;
}

/* High contrast focus for dark backgrounds */
.focus-visible-light {
  @apply focus-visible:ring-2
         focus-visible:ring-white
         focus-visible:ring-offset-2
         focus-visible:ring-offset-forest-800;
}
```

#### Contrast Fixes

| Element | Current | Issue | Fix |
|---------|---------|-------|-----|
| "Coming soon" labels | tan-500 on cream | ~3.2:1 ratio | Use tan-700 (#b45309) for 4.5:1+ |
| Muted text | stone-400 | ~3.8:1 ratio | Use stone-500 for body, stone-600 for important |

### 2.3 Loading Skeleton Specifications

**Skeleton Component Pattern:**
```tsx
// Consistent skeleton with pulse animation
<div className="animate-pulse space-y-4">
  {/* Title skeleton */}
  <div className="h-8 w-48 bg-stone-200 rounded" />

  {/* Content skeleton */}
  <div className="space-y-2">
    <div className="h-4 w-full bg-stone-200 rounded" />
    <div className="h-4 w-3/4 bg-stone-200 rounded" />
  </div>

  {/* Card skeleton */}
  <div className="h-32 bg-stone-200 rounded-xl" />
</div>
```

**Loading.tsx Requirements:**
- Match page layout structure
- Use consistent skeleton colors (stone-200)
- Include card outlines for visual structure
- Pulse animation (Tailwind's animate-pulse)

---

## 3. Implementation Tasks

**Task Numbering:** `{Phase}.{Section}.{Task}`
- Phase 0 = Foundation (font setup, color updates)
- Phase 1 = High Priority (typography, performance)
- Phase 2 = Medium Priority (loading states, accessibility)
- Phase 3 = Low Priority (mobile polish)

### Phase 0: Foundation

#### 0.1 Font Configuration
- [x] **0.1.1** Update font imports in layout.tsx to use Nunito
  - Files: `src/app/layout.tsx`
  - Changes: Replace Bricolage_Grotesque and DM_Sans with Nunito
  - Test: Page renders with Nunito font family

- [x] **0.1.2** Update tailwind.config.ts font-family definitions
  - Files: `tailwind.config.ts`
  - Changes: Update fontFamily.display and fontFamily.sans to use Nunito
  - Test: Tailwind classes apply Nunito correctly

#### 0.2 Color Configuration
- [x] **0.2.1** Update forest color palette to Pine values
  - Files: `tailwind.config.ts`
  - Changes: Update forest-500 through forest-900 to Pine palette
  - Test: Visual inspection shows correct Pine greens

- [x] **0.2.2** Update CSS variables for primary colors
  - Files: `src/app/globals.css`
  - Changes: Update HSL values for --primary to match new Pine colors
  - Test: Primary buttons and accents use correct green

---

### Phase 1: High Priority Fixes

#### 1.1 Typography Implementation
- [x] **1.1.1** Audit and adjust font weights for Nunito
  - Files: `src/app/globals.css` (typography utilities)
  - Changes: Adjust font-weight values for Nunito's weight scale
  - Test: Headings, body, labels have appropriate visual weight

- [x] **1.1.2** Update Button component typography
  - Files: `src/components/ui/button.tsx`
  - Changes: Adjust font-semibold to font-bold for Nunito
  - Test: Buttons have correct visual weight

- [x] **1.1.3** Visual regression check on all major pages
  - Files: N/A (testing task)
  - Test: Screenshots at all breakpoints, compare with audit baseline

#### 1.2 Performance - Scout Detail Page
- [x] **1.2.1** Identify parallelizable queries in scout detail page
  - Files: `src/app/(dashboard)/scouts/[id]/page.tsx`
  - Changes: Map query dependencies, identify parallel groups
  - Test: Document shows query groups
  - **Analysis:**
    - Group 1 (after auth): Scout details + Profile query
    - Group 2 (after scout+profile): Transactions + Guardians + Membership
    - Group 3 (after membership): Unit members + Advancement
    - Group 4 (after unit members): Available profiles

- [x] **1.2.2** Refactor data fetching with Promise.all()
  - Files: `src/app/(dashboard)/scouts/[id]/page.tsx`
  - Changes: Group independent queries into Promise.all() calls
  - Test: Network tab shows parallel requests

- [x] **1.2.3** Add loading.tsx skeleton for scout detail
  - Files: `src/app/(dashboard)/scouts/[id]/loading.tsx`
  - Changes: Create skeleton matching page layout
  - Test: Skeleton appears during page load

---

### Phase 2: Medium Priority Fixes

#### 2.1 Loading States
- [x] **2.1.1** Create loading.tsx for roster page
  - Files: `src/app/(dashboard)/roster/loading.tsx`
  - Changes: Add skeleton with table structure
  - Test: Skeleton visible on navigation to roster

- [x] **2.1.2** Create loading.tsx for settings page
  - Files: `src/app/(dashboard)/settings/loading.tsx`
  - Changes: Add skeleton with form structure
  - Test: Skeleton visible on navigation to settings

- [x] **2.1.3** Create loading.tsx for accounts page
  - Files: `src/app/(dashboard)/accounts/loading.tsx`
  - Changes: Add skeleton with table structure
  - Test: Skeleton visible on navigation to accounts

#### 2.2 Accessibility - Contrast
- [x] **2.2.1** Fix "Coming soon" label contrast
  - Files: `src/app/(dashboard)/dashboard/page.tsx` (or component)
  - Changes: Change tan-500 to tan-700 for labels
  - Test: Contrast checker shows 4.5:1+ ratio
  - Note: Already uses amber-700/800 which meets 4.5:1 ratio

- [x] **2.2.2** Audit and fix muted text contrast
  - Files: `src/app/globals.css`
  - Changes: Updated --muted-foreground from stone-500 to stone-600
  - Test: All muted text meets 4.5:1 ratio

#### 2.3 Accessibility - Focus Indicators
- [ ] **2.3.1** Enhance focus ring visibility in button component
  - Files: `src/components/ui/button.tsx`
  - Changes: Add ring-offset-background for better visibility
  - Test: Tab through buttons, focus ring clearly visible

- [ ] **2.3.2** Add focus styles to table action links
  - Files: Components with table action links
  - Changes: Add focus-visible ring classes
  - Test: Tab through table rows, links show focus

#### 2.4 Touch Targets
- [ ] **2.4.1** Update button sizes for touch targets
  - Files: `src/components/ui/button.tsx`
  - Changes: Increase default to h-11 (44px), icon to w-11 h-11
  - Test: Measure button heights, verify 44px minimum

- [ ] **2.4.2** Add touch-target utility class to globals.css
  - Files: `src/app/globals.css`
  - Changes: Add .touch-target-44 and .link-touch-target classes
  - Test: Classes available and working

- [ ] **2.4.3** Apply touch targets to table action links
  - Files: Scout list, account list components
  - Changes: Apply touch-target classes to View/Edit/Account links
  - Test: Links have adequate touch area on mobile

---

<!-- MVP BOUNDARY - Everything above is required for MVP -->

### Phase 3: Low Priority (Polish)

#### 3.1 Mobile Layout Polish
- [ ] **3.1.1** Improve Quick Actions mobile layout
  - Files: Dashboard Quick Actions component
  - Changes: Use flex-col w-full on mobile breakpoint
  - Test: Quick Actions stack vertically on mobile

- [ ] **3.1.2** Improve billing record display on mobile
  - Files: Billing records component
  - Changes: Truncate long names, add ellipsis, consider expandable rows
  - Test: Long billing names don't break layout on mobile

#### 3.2 Additional Polish
- [ ] **3.2.1** Add hover lift to more interactive cards
  - Files: Various card components
  - Changes: Add hover:-translate-y-0.5 transition
  - Test: Cards lift slightly on hover

- [ ] **3.2.2** Standardize shadow usage across cards
  - Files: Card components throughout app
  - Changes: Ensure consistent shadow-sm → hover:shadow-lg pattern
  - Test: All cards have consistent shadow behavior

---

## 4. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/scouts/[id]/loading.tsx` | Scout detail loading skeleton |
| `src/app/(dashboard)/roster/loading.tsx` | Roster loading skeleton |
| `src/app/(dashboard)/settings/loading.tsx` | Settings loading skeleton |
| `src/app/(dashboard)/accounts/loading.tsx` | Accounts loading skeleton |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Replace fonts with Nunito |
| `tailwind.config.ts` | Update forest colors, font-family |
| `src/app/globals.css` | Update CSS variables, add touch-target utilities |
| `src/components/ui/button.tsx` | Increase sizes, adjust typography |
| `src/app/(dashboard)/scouts/[id]/page.tsx` | Parallel data fetching |
| `src/app/(dashboard)/dashboard/page.tsx` | Fix contrast on labels |

---

## 5. Testing Strategy

### Visual Regression Tests
- [ ] Capture screenshots at all three breakpoints before changes
- [ ] Compare after each phase to verify no unintended regressions
- [ ] Pay special attention to button/link spacing changes

### Accessibility Tests
- [ ] Run axe-core or similar on all modified pages
- [ ] Tab through all pages to verify focus indicators
- [ ] Test with browser zoom at 200%

### Performance Tests
- [ ] Measure scout detail page load time before/after
- [ ] Verify parallel network requests in DevTools
- [ ] Test loading skeletons appear correctly

### Manual Testing
- [ ] Test all pages on iPhone (Safari)
- [ ] Test all pages on Android (Chrome)
- [ ] Test touch targets feel comfortable to tap
- [ ] Verify font rendering looks good at all sizes

---

## 6. Rollout Plan

### Dependencies
- None - all changes are frontend-only

### Migration Steps
1. Phase 0: Foundation changes (fonts, colors)
2. Phase 1: High priority fixes
3. Phase 2: Medium priority fixes
4. Phase 3: Polish items (if time permits)

### Verification
- Visual comparison with audit screenshots
- Lighthouse accessibility score improvement
- User feedback on mobile experience

---

## 7. Progress Summary

| Phase | Total | Complete | Status |
|-------|-------|----------|--------|
| Phase 0 | 4 | 4 | ✅ Complete |
| Phase 1 | 6 | 6 | ✅ Complete |
| Phase 2 | 10 | 5 | 🔄 In Progress |
| Phase 3 | 4 | 0 | ⬜ Not Started |
| **Total** | **24** | **15** | 🔄 In Progress |

---

## 8. Task Log

| Task | Date | Commit | Notes |
|------|------|--------|-------|
| 0.1.1 | 2026-01-25 | beaabf9 | Replaced Bricolage/DM Sans with Nunito |
| 0.1.2 | 2026-01-25 | beaabf9 | Updated Tailwind font-family to Nunito |
| 0.2.1 | 2026-01-25 | beaabf9 | Updated forest colors to Pine palette |
| 0.2.2 | 2026-01-25 | beaabf9 | Updated CSS variables for Pine colors |
| 1.1.1 | 2026-01-25 | 0594a90 | Adjusted typography weights for Nunito |
| 1.1.2 | 2026-01-25 | 2e83a4e | Button font-semibold → font-bold |
| 1.1.3 | 2026-01-25 | dfec9fb | Visual regression check verified |
| 1.2.1 | 2026-01-25 | 336d58a | Analyzed query dependencies |
| 1.2.2 | 2026-01-25 | 277b3e5 | Parallel data fetching with Promise.all |
| 1.2.3 | 2026-01-25 | f6b913e | Added scout detail loading skeleton |

---

## Approval

- [ ] Requirements reviewed by: _____
- [ ] Technical design reviewed by: _____
- [ ] Ready for implementation
