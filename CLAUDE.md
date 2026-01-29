# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chuckbox is a management application for Scout units (troops, packs, crews). It handles:
- **Finances**: Scout accounts, billing, payments, and financial reporting with double-entry accounting
- **Advancement**: Rank and merit badge tracking with bulk sign-off capabilities
- **Roster**: Scout and adult member management with guardian associations

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

### Dev Server Restart (Port-Specific)

**IMPORTANT:** This project runs on port 3000. To restart the dev server without affecting other projects:

```bash
lsof -ti:3000 | xargs kill 2>/dev/null; npm run dev
```

Never use `pkill -f "next dev"` as it kills ALL Next.js dev servers on the machine.

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

### BSA Reference Data Seeding

The application seeds BSA official reference data (ranks, merit badges, leadership positions) from canonical data files. This data is critical for advancement tracking.

**Canonical data files** (source of truth in `data/`):
| File | Purpose |
|------|---------|
| `bsa-data-canonical.json` | Unified BSA data: merit badges, requirements, ranks (primary source) |
| `leadership-positions-2025.json` | Leadership positions (18 positions) |

**Rules for modifying seeders** (`scripts/bsa-reference-data.ts`, `scripts/db.ts`):
- NEVER reduce data quality when modifying seeders (e.g., removing fields like `image_url`, `category`)
- Always test with `npm run db:fresh` after any seeder changes
- The seed process validates expected counts - if validation fails, the seeder exits with error
- When adding new badge/requirement fields, update both the canonical data file AND the seeder

**Expected counts after seeding:**
- 141 merit badges (with images and categories)
- 7 ranks with 144+ requirements
- 11,000+ merit badge requirements (across all versions)
- 18 leadership positions

**Seed validation**: The seeder automatically validates data integrity. If critical fields are missing or counts are too low, the seed process will fail with an error message.

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

## Development Workflow

### Spec-Driven Development

**For new features**, use `/plan [feature description]`:
1. Gather requirements by asking clarifying questions
2. Explore codebase for existing patterns
3. Create plan document in `/plans/`
4. Get user approval before implementing
5. Implement with TodoWrite tracking

**For bug fixes**, use `/bugfix [bug description]`:
1. Understand and reproduce the bug
2. Investigate root cause (not just symptoms)
3. Document in `/plans/bugfix-[name].md`
4. Confirm approach before implementing
5. Write test, fix, verify

### Quality Gates

Before implementing any feature:
- [ ] Requirements gathered via questions (use AskUserQuestion)
- [ ] Codebase explored for patterns (use Task with Explore agent)
- [ ] Plan document created and approved

During implementation:
- [ ] Use TodoWrite to track progress
- [ ] Use `frontend-design` skill for all UI work
- [ ] Use `context7` MCP for library documentation
- [ ] Run `npm run build` after significant changes
- [ ] Run `npm test` for affected areas

### Plan Documents

Plans live in `/plans/` directory:
- `PLAN-TEMPLATE.md` - Template for new features
- `BUG-TEMPLATE.md` - Template for bug fixes
- Feature plans follow the template structure

### When to Use Plan Mode

Use Claude's built-in Plan Mode (`EnterPlanMode`) for:
- Multi-file changes
- Architectural decisions
- Features with multiple valid approaches
- Any change you're uncertain about

Skip planning for:
- Single-line fixes
- Obvious bugs with clear solutions
- Tasks with explicit, detailed instructions

### Important Notes
- Supabase queries return single objects (not arrays) for one-to-one relations like `scout_accounts`
- Protected routes check `unit_memberships` for role-based access (admin, treasurer, leader, parent, scout)
- User management (invite, roles, remove) is in **Settings > Users tab** (admin only)
- The middleware deprecation warning about "proxy" is expected - Next.js 16 is transitioning middleware conventions
- Scout accounts use a dual-balance model:
  - `billing_balance`: Charges owed to unit (negative = owes money)
  - `funds_balance`: Scout savings from fundraising/overpayments (always >= 0)
- Avoid reading localStorage in initial state - defer to useEffect to prevent hydration mismatches
- Nested interactive elements (button inside button) cause React hydration issues - use `<div role="button">` with keyboard handlers instead

---

## Session Protocol

### Starting a Session

1. Read this file (CLAUDE.md)
2. Read the relevant plan file in `/plans/` to find the next task
3. State which task you'll work on (use task number if available)
4. State your implementation approach briefly
5. Wait for approval before writing code

### During Implementation

1. Work on **ONE task at a time**
2. Use Context7 for library documentation before implementing
3. Run `npm run build` and `npm test` after changes
4. If tests fail, **STOP** and fix before continuing
5. Mark task complete **immediately** after finishing
6. Update Task Log with date and commit hash

### Completing a Task

1. Ensure all tests pass: `npm test`
2. Ensure build passes: `npm run build`
3. Mark task complete in plan/tasks file
4. Update Task Log with date and commit
5. Commit with descriptive message
6. Report what you completed

### Between Sessions

If continuing work from a previous session:
1. Read the plan file to see progress
2. Check the Task Log for what was last completed
3. Identify the next pending task
4. Resume from step 3 of "Starting a Session"

---

## Do NOT

**These rules are critical. Violating them wastes time and creates bugs.**

- ❌ Modify multiple tasks without approval
- ❌ Skip tests or type checking
- ❌ Proceed after test/build failures without fixing
- ❌ Make architectural changes without discussion
- ❌ Install new dependencies without discussing first
- ❌ Use `any` types in TypeScript
- ❌ Write code that doesn't match existing patterns
- ❌ Create new files when editing existing ones would work
- ❌ Add features beyond what was requested
- ❌ Push to production database without explicit approval
- ❌ Commit code that doesn't build or pass tests

---

## Custom Commands

### `/plan [feature description]`

Start spec-driven development for a new feature.

```
/plan Add CSV export for scout data
/plan refresh                        # Re-read and update existing plan
```

**Workflow:**
1. Ask clarifying questions (AskUserQuestion)
2. Research library docs (Context7)
3. Explore codebase (Explore agent)
4. Create plan in `/plans/[feature-name].md`
5. Get approval before implementing

### `/bugfix [bug description]`

Investigate and fix a bug systematically.

```
/bugfix Login redirect fails after session timeout
/bugfix Payment amounts showing negative
```

**Workflow:**
1. Ask clarifying questions
2. Investigate root cause (not symptoms)
3. Document in `/plans/bugfix-[name].md`
4. Confirm approach before implementing
5. Write test, fix, verify

### `/execute [mode]`

Execute tasks from an approved plan with safeguards.

```
/execute           # Execute next single pending task
/execute phase     # Execute all tasks in current phase (max 5)
/execute to 1.2.3  # Execute up to and including task 1.2.3
/execute 1.2.3     # Execute only task 1.2.3
```

**Safeguards:**
- Stops immediately on test/build failures
- Maximum 5 tasks per `/execute phase`
- Requires approval at phase checkpoints
- Auto-commits after each successful task

### Task Numbering

Tasks use format: `{Phase}.{Section}.{Task}`

- **Phase 0**: Foundation (migrations, types, setup)
- **Phase 1+**: Feature phases
- Example: `1.2.3` = Phase 1, Section 2, Task 3

See `plans/PLAN-TEMPLATE.md` and `plans/TASKS-TEMPLATE.md` for formats
