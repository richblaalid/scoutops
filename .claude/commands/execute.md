---
description: Execute tasks from an approved plan with safeguards
argument-hint: "", "phase", "to 1.2.3", or specific task "1.2.3"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite, AskUserQuestion, mcp__plugin_context7_context7__*, Skill
---

# /execute - Controlled Task Execution

Execute tasks from an approved plan with built-in safeguards to prevent runaway implementation.

## Modes

- `/execute` - Execute the next single pending task
- `/execute phase` - Execute all tasks in the current phase (max 5)
- `/execute to 1.2.3` - Execute tasks up to and including task 1.2.3
- `/execute 1.2.3` - Execute only the specific task 1.2.3

## Instructions

### Before Starting

1. Read the plan file in `/plans/` to find pending tasks
2. Identify which task(s) to execute based on the mode
3. State which task you're about to work on
4. Wait for user confirmation if executing multiple tasks

### During Execution

For EACH task:

1. **Announce**: State the task number and description
2. **Research**: Use Context7 if the task involves library APIs
3. **Implement**: Write the code changes
4. **Verify**: Run `npm run build` and `npm test`
5. **Mark Complete**: Update the plan file checkbox
6. **Log**: Add entry to Task Log with date
7. **Commit**: Create a descriptive commit

### Safeguards

**CRITICAL - These rules are non-negotiable:**

1. **Stop on Failure**: If `npm run build` or `npm test` fails, STOP immediately. Do not proceed to the next task. Report the failure and wait for user input.

2. **Max 5 Tasks**: When using `/execute phase`, execute at most 5 tasks before stopping and reporting progress.

3. **Phase Checkpoints**: At the end of each phase, STOP and get user approval before continuing to the next phase.

4. **Single Task Focus**: Work on exactly ONE task at a time. Complete it fully before starting the next.

5. **Auto-Commit**: After each successful task, create a commit with message format:
   ```
   [Phase.Section.Task] Brief description

   - Detail 1
   - Detail 2
   ```

6. **UI Tasks**: For any UI work, use the `frontend-design` skill.

### Failure Recovery

If a task fails:
1. Report what failed (test output, build error)
2. Do NOT attempt to fix without user approval
3. Ask if user wants to:
   - Fix the issue (describe the fix first)
   - Skip the task
   - Stop execution entirely

### Task Log Update

After completing each task, update the Task Log in the plan file:

```markdown
| Task | Date | Commit | Notes |
|------|------|--------|-------|
| 1.2.3 | 2024-01-19 | abc1234 | Completed successfully |
```

## Quality Gates (per task)

- [ ] Task understood and announced
- [ ] Library docs researched (if applicable)
- [ ] Implementation complete
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Task marked complete in plan
- [ ] Task Log updated
- [ ] Commit created

## Example Usage

```
/execute           # Do the next pending task
/execute phase     # Do up to 5 tasks in current phase
/execute to 1.2.3  # Do all tasks up to 1.2.3
/execute 1.2.3     # Do only task 1.2.3
```

## Example Session

```
User: /execute phase

Claude: I'll read the plan file to find pending tasks.

Reading plans/user-auth.md...

Current phase: Phase 1 - Core Authentication
Pending tasks in this phase:
- [1.1.1] Create auth schema migration
- [1.1.2] Generate TypeScript types
- [1.2.1] Create login server action
- [1.2.2] Create logout server action
- [1.3.1] Create login page component

I'll execute these 5 tasks. Starting with 1.1.1...

---

**Task 1.1.1: Create auth schema migration**

[Implementation...]

✓ npm run build passed
✓ npm test passed
✓ Task marked complete
✓ Commit: [1.1.1] Create auth schema migration

Moving to 1.1.2...

[...continues until phase complete or failure...]

---

**Phase 1 Complete**

Completed 5 tasks:
- 1.1.1 ✓
- 1.1.2 ✓
- 1.2.1 ✓
- 1.2.2 ✓
- 1.3.1 ✓

Ready for Phase 2? Reply '/execute phase' to continue or specify individual tasks.
```
