---
description: Generate technical implementation plan for a feature
argument-hint: "[feature description]" or "refresh" to update existing plan
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(ls:*), AskUserQuestion, mcp__plugin_context7_context7__*
---

# /plan - Spec-Driven Feature Planning

Before implementing any feature, use this command to gather requirements and create a comprehensive plan.

## Arguments

- `/plan [feature description]` - Start planning a new feature
- `/plan refresh` - Re-read and update the current plan based on new information

## Instructions

You are starting a spec-driven development workflow. Your goal is to understand the feature completely before writing any code.

### Step 1: Requirements Gathering

Ask the user clarifying questions to understand the feature. Use the AskUserQuestion tool to ask 3-5 questions covering:

1. **User Value**: Who is this for and what problem does it solve?
2. **Scope**: What's included? What's explicitly out of scope?
3. **Technical Constraints**: Any specific libraries, patterns, or approaches required?
4. **Success Criteria**: How will we know when this is done?
5. **Edge Cases**: What happens in error scenarios or unusual situations?

**Important**: Don't ask obvious questions. Ask questions that reveal hidden assumptions and prevent wasted implementation effort.

### Step 2: Research Library Documentation

Before exploring the codebase, use Context7 to research any libraries relevant to the feature:

```
mcp__plugin_context7_context7__resolve-library-id → mcp__plugin_context7_context7__query-docs
```

This ensures you're using up-to-date patterns and APIs.

### Step 3: Explore the Codebase

Use the Explore agent to understand:
- Existing patterns that should be followed
- Related code that will be affected
- Database schema if relevant
- Component patterns if building UI

### Step 4: Create the Plan

Create a plan document in `/plans/[feature-name].md` using the PLAN-TEMPLATE.md format. Include:

1. **Requirements Section**: Populated from your questions
2. **Technical Design**: Based on codebase exploration
3. **Implementation Tasks**: Use numbered format `{Phase}.{Section}.{Task}` (e.g., 0.1.1, 1.2.3)
4. **Files to Create/Modify**: Specific paths
5. **Testing Strategy**: How to verify it works
6. **Task Log**: Empty table ready for tracking

**Task Numbering Format:**
- Phase 0: Foundation (setup, migrations, types)
- Phase 1+: Feature phases
- Tasks numbered: `{Phase}.{Section}.{Task}`
- Example: `1.2.3` = Phase 1, Section 2, Task 3

### Step 5: Review with User

Present the plan summary and ask for approval before implementation:
- Highlight any assumptions you made
- Call out technical decisions that could go different ways
- Confirm the scope matches expectations
- Identify MVP boundary if applicable

### Step 6: Implementation (after approval)

Only after plan approval, begin implementation:
- Use `/execute` command to run tasks systematically
- Or work through tasks manually with TodoWrite tracking
- Run tests after each significant change
- Use `frontend-design` skill for any UI work
- Use Context7 for library documentation during implementation

## Quality Gates

Before starting:
- [ ] Requirements gathered via questions
- [ ] Library documentation researched (Context7)
- [ ] Codebase explored for patterns
- [ ] Plan document created in /plans/
- [ ] Tasks numbered with `{Phase}.{Section}.{Task}` format
- [ ] User approved the plan

## Example Usage

```
/plan Add user authentication with magic links
/plan Implement CSV export for advancement data
/plan refresh
```
