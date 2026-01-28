---
name: fix-mb-requirements
description: Fix merit badge requirement hierarchy issues. Use when fixing BSA canonical data structure problems.
---

# /fix-mb-requirements - Merit Badge Requirement Fixer

Fix hierarchy issues in merit badge canonical data by matching user-provided markdown structure with Scoutbook canonical IDs.

## Usage

```
/fix-mb-requirements [Badge Name] [Version Year]
```

Example:
```
/fix-mb-requirements Nature 2025
/fix-mb-requirements Radio 2017
```

## Workflow

### Step 1: Gather Information

When invoked, immediately:

1. **Extract canonical IDs from CSV** - Search the troop advancement CSV for the badge and version:
   ```bash
   grep "[Badge Name] Merit Badge Requirements" ./docs/troop_advancement/Troop9297B_Advancement_20260124.csv | grep "\"[Version]\"" | cut -d',' -f7 | sort -u
   ```

2. **Show current data structure** - Display the current hierarchy from `data/bsa-data-canonical.json`:
   ```typescript
   // Show badge version structure with:
   // - [H] marker for headers
   // - Child count
   // - First 60 chars of description
   ```

3. **Report findings** - Present:
   - List of canonical IDs from CSV (these CANNOT be changed)
   - Current structure with any issues highlighted
   - Ask user to provide the markdown structure

### Step 2: User Provides Markdown

Wait for user to paste the official requirement markdown. This should include:
- Full requirement text
- Proper nesting structure
- All sub-requirements and options

### Step 3: Analyze and Match

Compare the markdown structure against canonical IDs:

1. **Match completable requirements** - Map each CSV ID to its description from markdown
2. **Identify headers needed** - Determine which headers must exist for proper nesting
3. **Flag issues**:
   - IDs in CSV but missing from current data
   - IDs in current data but not in CSV (scraped artifacts to remove)
   - Headers with wrong descriptions
   - Requirements at wrong nesting level

### Step 4: Propose Changes

Present a clear summary:

```
## Proposed Changes for [Badge] v[Year]

### Keep (correct structure)
- ID: "description preview..." ✓

### Fix Descriptions
- ID: Current: "wrong..." → New: "correct..."

### Create New Headers
- ID: "[Header description]" (will contain: child1, child2, ...)

### Move Requirements
- ID: Move from [current location] to [new parent]

### Remove (scraped artifacts)
- ID: "not in CSV, removing..."

### Add Missing Requirements
- ID: "description..." (from CSV, missing in current data)
```

### Step 5: Get Approval

Ask: "Shall I proceed with these changes?"

Wait for explicit "yes" before modifying any files.

### Step 6: Execute Fix

Only after approval:

1. Create a fix script in `/tmp/fix-[badge]-v[year].ts`
2. Run the script to update `data/bsa-data-canonical.json`
3. Verify the fix by showing the new structure
4. Run empty header check to confirm no issues remain

## Rules

### Canonical ID Rules
- **NEVER change canonical IDs** from the CSV - these are synced with Scoutbook
- **Scraped header IDs** (like `_header_5`, `9B(c)`) CAN be corrected or removed
- When creating new headers, use logical IDs that match the pattern (e.g., `4a`, `9C`)

### Structure Rules
- Headers have `is_header: true` and `children: []` array
- Completable requirements have `is_header: false` and no children
- Requirements must be nested under their parent header
- Maintain proper `requirement_number` and `scoutbook_id` (usually same value)

### Description Rules
- Match descriptions exactly from the official markdown
- Header descriptions should be the intro text (e.g., "Do the following:", "(a) Birds")
- Remove any scraped artifacts like "Resources:" links

## Data Files

- **Source of truth for IDs**: `docs/troop_advancement/Troop9297B_Advancement_*.csv`
- **Canonical data file**: `data/bsa-data-canonical.json`
- **Fix scripts**: `/tmp/fix-[badge]-v[year].ts`

## Example Session

```
User: /fix-mb-requirements Nature 2025

Claude: ## Nature v2025 Analysis

### Canonical IDs from CSV
1, 2, 3, 4a[1], 4a[2], 4b[1], 4b[2], 4c[1], 4c[2], 4c[3], 4d[1], 4d[2],
4e[1], 4e[2], 4f[1], 4f[2], 4g[1], 4g[2]a, 4g[2]b, 4h[1], 4h[2], 5, 6a, 6b, 7., 7a, 7b

### Current Structure Issues
- Header 4 has all requirements as flat children (should be nested under 4a-4h)
- 4g[2]a and 4g[2]b are at top level (should be under 4g > 4g[2])
- Duplicate headers: 7 and 7. (keep 7. as canonical)

Please provide the official markdown structure for Nature v2025.

---

User: [pastes markdown]

---

Claude: ## Proposed Changes for Nature v2025

### Create New Headers
- 4: "Do all requirements in FIVE of the following fields:" (contains 4a-4h)
- 4a: "(a) Birds" (contains 4a[1], 4a[2])
- 4b: "(b) Mammals" (contains 4b[1], 4b[2])
- ... etc

### Move Requirements
- 4a[1]: Move from 4.children to 4a.children
- 4g[2]a: Move from top level to 4g > 4g[2].children

### Remove
- 7: Duplicate header (keeping canonical 7.)

Shall I proceed with these changes?

---

User: yes

---

Claude: [Creates and runs fix script, shows updated structure, confirms 0 empty headers]
```

## Verification Commands

After fixing, run these to verify:

```bash
# Check for empty headers
npx tsx /tmp/check-empty-headers.ts

# Show specific badge structure
npx tsx /tmp/show-[badge]-v[year].ts

# Count total requirements
npx tsx -e "
const data = require('./data/bsa-data-canonical.json')
const badge = data.merit_badges.find(b => b.name === '[Badge]')
const v = badge.versions.find(v => v.version_year === [Year])
console.log('Requirements:', JSON.stringify(v.requirements, null, 2).match(/scoutbook_id/g)?.length)
"
```
