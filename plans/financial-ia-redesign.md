# Plan: Financial IA Redesign

## Overview

Simplify ChuckBox's financial navigation by consolidating 4 separate nav items (Accounts, Billing, Payments, Reports) into a single "Finances" section with unified subnavigation. This reduces cognitive load, eliminates context switching, and provides clear pathways between scout info and financial data.

## Problem Statement

**Current State:**
- 4 separate nav items: Accounts, Billing, Payments, Reports
- Users must context-switch between pages to complete workflows
- Unclear naming (Accounts vs Billing confusion)
- Overlapping data (Reports and Accounts show similar balance info)
- Roster shows balance but links to scout profile, not financial detail

**User Pain Points:**
- "Too many separate pages"
- "Have to jump between pages to complete one task"
- "Hard to know which page has what I need"

## Proposed Solution

### New Navigation Structure

**Before:**
```
Sidebar:
├── Dashboard
├── Roster
├── Scouts (hidden, accessed via roster)
├── Accounts ← Financial
├── Billing ← Financial
├── Payments ← Financial
├── Reports ← Financial
├── Advancement
└── Settings
```

**After:**
```
Sidebar:
├── Dashboard
├── Roster
├── Scouts (hidden, accessed via roster)
├── Finances ← Single entry point
│   ├── /finances (Overview - dashboard)
│   ├── /finances/accounts (Scout balances)
│   ├── /finances/billing (Create charges)
│   └── /finances/payments (Record money)
├── Advancement
└── Settings
```

### Page Structure

#### 1. Finances Overview (`/finances`)
The hub page showing:
- **Summary Cards**: Total Owed, Overdue (31+ days), Scout Funds Held, This Month's Collections
- **Quick Actions**: "Record Payment", "Create Billing" buttons
- **Who Owes Money**: Top 10 scouts with outstanding balances (expandable)
- **Recent Activity**: Last 10 transactions across billing/payments
- **Subnavigation**: Persistent tabs/links to Accounts, Billing, Payments

This replaces the separate Reports page by surfacing key metrics upfront.

#### 2. Accounts (`/finances/accounts`)
Largely unchanged, but:
- Add persistent subnav showing Overview | **Accounts** | Billing | Payments
- Keep patrol filtering, search
- Click scout → account detail (`/finances/accounts/[id]`)
- Add "Back to Finances" breadcrumb

#### 3. Account Detail (`/finances/accounts/[id]`)
Largely unchanged, but:
- Add link back to scout profile
- Add persistent subnav
- Show scout name prominently with link to `/scouts/[id]`

#### 4. Billing (`/finances/billing`)
Largely unchanged, but:
- Add persistent subnav showing Overview | Accounts | **Billing** | Payments
- Keep billing form and billing records list
- Scout names in billing records link to account detail

#### 5. Payments (`/finances/payments`)
Largely unchanged, but:
- Add persistent subnav
- Combine "Record Payments" and "Add Funds" into single page (keep tabs internally)
- Scout names link to account detail

### Integration Points

#### Roster → Finances
- Balance column remains on Roster
- Clicking balance amount → `/finances/accounts/[id]` (account detail)
- Small "View Finances" link/icon next to balance

#### Scout Profile → Finances
- "Financial Summary" card on scout profile showing:
  - Current balance (billing + funds)
  - Link to full account: "View Account Details →"
- Recent transactions (5 max) with "View All →" link

#### Finances → Scout Profile
- Every scout name in financial pages is a link
- Account detail page has prominent "View Scout Profile" button
- Billing/payment records show scout name as link to profile

### Reports Consolidation

**Current Reports page content:**
1. Summary cards (Owed, Overdue, Funds, Collections) → Move to Overview
2. Aging Report → Move to Accounts page as expandable section or filter
3. Collection Summary → Move to Overview as "This Month" section
4. Balance by Patrol → Move to Accounts as grouping option
5. Scouts Owing → This IS the Accounts list with balance filter
6. Transaction History → Keep in Account Detail page

**Result:** Reports page eliminated. Key insights surfaced in Overview.

## URL Structure

| Old URL | New URL | Notes |
|---------|---------|-------|
| `/accounts` | `/finances/accounts` | Redirect old URL |
| `/accounts/[id]` | `/finances/accounts/[id]` | Redirect old URL |
| `/billing` | `/finances/billing` | Redirect old URL |
| `/payments` | `/finances/payments` | Redirect old URL |
| `/reports` | `/finances` | Redirect to overview |

## Role-Based Access

| Page | Admin | Treasurer | Leader | Parent | Scout |
|------|-------|-----------|--------|--------|-------|
| /finances (overview) | ✓ | ✓ | ✓ (limited) | ✗ | ✗ |
| /finances/accounts | ✓ | ✓ | ✓ | Own only | Own only |
| /finances/accounts/[id] | ✓ | ✓ | ✓ | Own only | Own only |
| /finances/billing | ✓ | ✓ | ✗ | ✗ | ✗ |
| /finances/payments | ✓ | ✓ | ✗ | ✗ | ✗ |

**Parent/Scout Access:**
- Navigate directly to `/finances/accounts` → See only their linked scouts
- Or access via roster → their scout → account link

## UI Components

### Finance Subnav Component
```tsx
<FinanceSubnav activeTab="accounts" />
// Renders: Overview | Accounts | Billing | Payments
// Highlights active tab
// Only shows tabs user has access to
```

### Quick Stats Bar (for Overview)
```tsx
<FinanceStats
  totalOwed={1234.56}
  overdueAmount={456.78}
  scoutFunds={789.00}
  monthlyCollections={2000.00}
/>
```

### Scout Link Component (for consistency)
```tsx
<ScoutFinanceLink scoutId={id} scoutName={name} />
// Renders scout name as link to /finances/accounts/[id]
// Used in billing records, payment lists, etc.
```

## Implementation Phases

### Phase 0: Foundation
- [x] 0.1.1 Create `/finances` route structure
- [x] 0.1.2 Create FinanceSubnav component
- [x] 0.1.3 Set up URL redirects from old routes

### Phase 1: Overview Page
- 1.1.1 Create Finances Overview page layout
- 1.1.2 Add summary stats cards (from Reports)
- 1.1.3 Add "Who Owes Money" section
- 1.1.4 Add "Recent Activity" section
- 1.1.5 Add quick action buttons

### Phase 2: Migrate Existing Pages
- 2.1.1 Move Accounts to /finances/accounts
- 2.1.2 Move Account Detail to /finances/accounts/[id]
- 2.1.3 Move Billing to /finances/billing
- 2.1.4 Move Payments to /finances/payments
- 2.2.1 Add FinanceSubnav to all pages
- 2.2.2 Update internal links to new URLs

### Phase 3: Integration & Links
- 3.1.1 Update Roster balance column to link to account detail
- 3.1.2 Add Financial Summary card to Scout Profile
- 3.1.3 Make all scout names in finance pages link to account detail
- 3.1.4 Add "View Scout Profile" to Account Detail page

### Phase 4: Navigation & Cleanup
- 4.1.1 Update sidebar: Remove Accounts, Billing, Payments, Reports
- 4.1.2 Add single "Finances" nav item
- 4.1.3 Update role definitions in roles.ts
- 4.2.1 Delete old Reports page (content now in Overview)
- 4.2.2 Test all redirects
- 4.2.3 Update any remaining hardcoded links

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/finances/page.tsx` | Overview/dashboard |
| `src/app/(dashboard)/finances/accounts/page.tsx` | Account list (moved) |
| `src/app/(dashboard)/finances/accounts/[id]/page.tsx` | Account detail (moved) |
| `src/app/(dashboard)/finances/billing/page.tsx` | Billing (moved) |
| `src/app/(dashboard)/finances/payments/page.tsx` | Payments (moved) |
| `src/components/finances/finance-subnav.tsx` | Shared subnav |
| `src/components/finances/finance-stats.tsx` | Stats cards |
| `src/components/finances/who-owes-list.tsx` | Quick list of owing scouts |
| `src/components/finances/recent-activity.tsx` | Recent transactions |
| `src/components/scouts/financial-summary-card.tsx` | For scout profile |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/roles.ts` | Update nav items, add /finances |
| `src/components/dashboard/sidebar.tsx` | Update to show Finances |
| `src/app/(dashboard)/roster/page.tsx` | Update balance links |
| `src/app/(dashboard)/scouts/[id]/page.tsx` | Add financial summary |

## Files to Delete (after migration)

| File | Reason |
|------|--------|
| `src/app/(dashboard)/accounts/page.tsx` | Moved to /finances/accounts |
| `src/app/(dashboard)/accounts/[id]/page.tsx` | Moved |
| `src/app/(dashboard)/billing/page.tsx` | Moved to /finances/billing |
| `src/app/(dashboard)/payments/page.tsx` | Moved to /finances/payments |
| `src/app/(dashboard)/reports/page.tsx` | Content merged into Overview |

## Verification Checklist

- [ ] Single "Finances" nav item visible to admin/treasurer
- [ ] Overview page shows key metrics and quick actions
- [ ] All existing financial functionality preserved
- [ ] Old URLs redirect to new locations
- [ ] Roster balance links to account detail
- [ ] Scout profile shows financial summary
- [ ] All scout names in finance pages are clickable
- [ ] Parent/scout can still access their own account
- [ ] Leader can view accounts (read-only)
- [ ] Build passes, tests pass

## Decisions Made

1. **Leader access**: Leaders see full Overview (read-only) - can view all metrics but cannot take actions
2. **Mobile navigation**: Horizontal scroll for subnav tabs
3. **URL migration**: Old URLs redirect permanently (no deprecation notice)

## Task Log

| Task | Date | Commit |
|------|------|--------|
| 0.1.1 | 2026-01-20 | (pending) |
| 0.1.2 | 2026-01-20 | (pending) |
| 0.1.3 | 2026-01-20 | (pending) |

