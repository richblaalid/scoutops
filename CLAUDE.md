# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chuckbox is a financial management application for Scout units (troops, packs, crews). It handles scout accounts, billing, payments, and financial reporting with double-entry accounting.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (flat config, ESLint 9)
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI
vitest run tests/unit/utils.test.ts  # Run single test file
```

### Database Dev Tools

```bash
npm run db:reset       # Clear all data from database
npm run db:seed:base   # Seed unit with admin user ready to login
npm run db:seed:test   # Add test scouts, parents, and users for each role
npm run db:seed:all    # Run base + test seeds
npm run db:fresh       # Reset + seed all (fresh start)
npm run db:dump        # Export current database to JSON (supabase/seeds/)
npm run db:dump -- name  # Export with custom name
npm run db:restore -- supabase/seeds/file.json  # Restore from dump
npm run db:list        # List available dump files
```

**Test User Credentials** (password: `testpassword123`):
| Role | Email |
|------|-------|
| admin | richard.blaalid+admin@withcaldera.com |
| treasurer | richard.blaalid+treasurer@withcaldera.com |
| leader | richard.blaalid+leader@withcaldera.com |
| parent | richard.blaalid+parent@withcaldera.com |
| scout | richard.blaalid+scout@withcaldera.com |

**Workflow example:**
```bash
npm run db:dump -- before-testing  # Save current state
# ... do destructive testing ...
npm run db:restore -- supabase/seeds/before-testing.json  # Restore
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS 4, shadcn/ui components (Radix primitives)
- **Forms**: react-hook-form + zod validation
- **Testing**: Vitest 4 + React Testing Library

### Route Structure
Routes use Next.js App Router with route groups:
- `src/app/(auth)/` - Public auth pages (login, logout, callback)
- `src/app/(dashboard)/` - Protected pages requiring authentication

The `(dashboard)/layout.tsx` handles auth validation and redirects unauthenticated users to `/login`.

### Supabase Integration
Two client patterns exist:
- `src/lib/supabase/server.ts` - Server Components (uses `cookies()`)
- `src/lib/supabase/client.ts` - Client Components (browser client)

Always use the appropriate client based on component type. The middleware (`src/middleware.ts`) handles session refresh.

### Database Types
`src/types/database.ts` contains auto-generated Supabase types. Key tables:
- `units` - Scout units (troops, packs)
- `profiles` - User profiles linked to Supabase Auth
- `unit_memberships` - Links users to units with roles
- `scouts` - Scout members within units
- `scout_accounts` - Financial accounts per scout (dual-balance: `billing_balance` for charges owed, `funds_balance` for scout savings)
- `journal_entries` / `journal_lines` - Double-entry accounting
- `billing_records` / `billing_charges` - Fair share billing
- `payments` - Payment records

### Supabase Environments

**CRITICAL: This project has separate dev and prod databases. Always verify the target before running migrations.**

| Environment | Project Ref | Purpose |
|-------------|-------------|---------|
| **Development** | `feownmcpkfugkcivdoal` | Local development, testing |
| **Production** | `jtzidlmxrorbjnygfvvp` | Live production data - DO NOT modify without explicit approval |

### Supabase Migration Safety Rules

**BEFORE running any `supabase db push` or migration command:**

1. **Always check which project is currently linked:**
   ```bash
   supabase projects list
   ```

2. **Link to the correct project (DEV by default):**
   ```bash
   supabase link --project-ref feownmcpkfugkcivdoal  # DEV
   ```

3. **Never push to production without explicit user approval.** If the user asks for a migration, assume DEV unless they specifically say "production" or "prod".

4. **After pushing migrations, remind user to reload schema cache** in Supabase Dashboard → Settings → API → "Reload schema cache"

### Supabase Migrations
Migrations are in `supabase/migrations/`.

**For development (default):**
```bash
supabase link --project-ref feownmcpkfugkcivdoal  # Ensure linked to DEV
supabase db push                                   # Push to DEV
```

**For production (requires explicit approval):**
```bash
supabase link --project-ref jtzidlmxrorbjnygfvvp  # Link to PROD
supabase db push                                   # Push to PROD
```

### Component Patterns
- UI primitives in `src/components/ui/` (shadcn/ui style)
- Feature components in `src/components/{feature}/`
- Use `cn()` from `src/lib/utils.ts` for class merging

### Important Notes
- Supabase queries return single objects (not arrays) for one-to-one relations like `scout_accounts`
- Protected routes check `unit_memberships` for role-based access (admin, treasurer, leader, parent, scout)
- The middleware deprecation warning about "proxy" is expected - Next.js 16 is transitioning middleware conventions
- Scout accounts use a dual-balance model:
  - `billing_balance`: Charges owed to unit (negative = owes money)
  - `funds_balance`: Scout savings from fundraising/overpayments (always >= 0)
- Avoid reading localStorage in initial state - defer to useEffect to prevent hydration mismatches
- Nested interactive elements (button inside button) cause React hydration issues - use `<div role="button">` with keyboard handlers instead
