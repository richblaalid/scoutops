# Fix Merit Badge Requirements Skill

A Claude Code skill for fixing hierarchy issues in BSA merit badge canonical data.

## Purpose

This skill streamlines the process of fixing requirement structure issues in `data/bsa-data-canonical.json` by:

1. Extracting canonical IDs from Scoutbook CSV exports
2. Comparing current data structure against expected hierarchy
3. Matching user-provided markdown to canonical IDs
4. Proposing and executing fixes with approval

## Usage

```
/fix-mb-requirements [Badge Name] [Version Year]
```

Examples:
```
/fix-mb-requirements Nature 2025
/fix-mb-requirements Radio 2017
/fix-mb-requirements Plant Science 2023
```

## When to Use

Use this skill when you identify:

- **Empty header issues**: Headers with `is_header: true` but no children
- **Misplaced requirements**: Requirements at wrong nesting level
- **Scraped artifacts**: Invalid IDs like `_header_5` or `9B(c)`
- **Missing requirements**: IDs in CSV but not in data file
- **Wrong descriptions**: Descriptions that don't match official requirements

## Key Principles

1. **Canonical IDs are immutable** - Never change IDs that come from Scoutbook CSV
2. **Headers can be created** - Create intermediate headers as needed for proper nesting
3. **Approval required** - Always get explicit approval before modifying data
4. **Verify after fix** - Run empty header check to confirm no issues remain

## Related Files

- `data/bsa-data-canonical.json` - Main data file
- `docs/troop_advancement/*.csv` - Source of canonical IDs
- `/tmp/fix-*.ts` - Generated fix scripts
- `/tmp/show-*.ts` - Generated display scripts
- `/tmp/check-empty-headers.ts` - Verification script
