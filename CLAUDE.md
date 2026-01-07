# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScoutOps is a financial management application for Scout units (troops, packs, crews). It handles scout accounts, billing, payments, and financial reporting with double-entry accounting.

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
- `scout_accounts` - Financial accounts per scout
- `journal_entries` / `journal_lines` - Double-entry accounting
- `billing_records` / `billing_charges` - Fair share billing
- `payments` - Payment records

### Supabase Migrations
Migrations are in `supabase/migrations/`. Run locally with:
```bash
supabase db reset  # Reset and apply all migrations
```

### Component Patterns
- UI primitives in `src/components/ui/` (shadcn/ui style)
- Feature components in `src/components/{feature}/`
- Use `cn()` from `src/lib/utils.ts` for class merging

### Important Notes
- Supabase queries return single objects (not arrays) for one-to-one relations like `scout_accounts`
- Protected routes check `unit_memberships` for role-based access (admin, treasurer, leader, parent, scout)
- The middleware deprecation warning about "proxy" is expected - Next.js 16 is transitioning middleware conventions
