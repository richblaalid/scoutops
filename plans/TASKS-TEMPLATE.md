# [Feature Name] Tasks

> **Plan:** [link to full plan document]
> **Status:** In Progress | Blocked | Completed
> **Last Updated:** YYYY-MM-DD

---

## Task Numbering Convention

Format: `{Phase}.{Section}.{Task}`

- **Phase 0**: Foundation (migrations, types, setup)
- **Phase 1+**: Feature phases
- Example: `1.2.3` = Phase 1, Section 2, Task 3

---

## Phase 0: Foundation

### 0.1 Database Setup

- [ ] **0.1.1** Create database migration
  - Files: `supabase/migrations/YYYYMMDD_*.sql`
  - Test: `supabase db push` succeeds

- [ ] **0.1.2** Generate TypeScript types
  - Files: `src/types/database.ts`
  - Test: `npm run build` passes

### 0.2 Core Types

- [ ] **0.2.1** Create feature types/interfaces
  - Files: `src/types/*.ts`
  - Test: Types compile

**⏸️ CHECKPOINT: Get approval before Phase 1**

---

## Phase 1: Core Features

### 1.1 Section Name

- [ ] **1.1.1** Task description
  - Files: `path/to/file.ts`
  - Test: Description

- [ ] **1.1.2** Another task
  - Files: `path/to/file.ts`
  - Test: Description

### 1.2 Another Section

- [ ] **1.2.1** Task description
  - Files: `path/to/file.ts`
  - Test: Description

**⏸️ CHECKPOINT: Get approval before Phase 2**

---

<!-- ═══════════════════════════════════════════════════ -->
<!-- MVP BOUNDARY - Everything above is required for MVP -->
<!-- ═══════════════════════════════════════════════════ -->

---

## Phase 2: Enhancements (Post-MVP)

### 2.1 Section Name

- [ ] **2.1.1** Enhancement task
  - Files: `path/to/file.ts`
  - Test: Description

---

## Progress Summary

| Phase | Total | Complete | Status |
|-------|-------|----------|--------|
| Phase 0 | 3 | 0 | ⬜ Not Started |
| Phase 1 | 3 | 0 | ⬜ Not Started |
| Phase 2 | 1 | 0 | ⬜ Not Started |

**Legend:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
- ⛔ Blocked

---

## Task Log

| Task | Date | Commit | Notes |
|------|------|--------|-------|
| | | | |

---

## Execution Commands

```bash
# Execute next pending task
/execute

# Execute entire phase (max 5 tasks)
/execute phase

# Execute up to specific task
/execute to 1.2.1

# Execute single specific task
/execute 1.2.3
```

---

## Notes

_Add implementation notes, decisions, or issues here._
