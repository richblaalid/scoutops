# Multi-Version Merit Badge Requirements & Scoutbook Sync

## Overview

Enable storing multiple versions of merit badge requirements to support importing historical Scoutbook data and prepare for bidirectional sync with Scoutbook.

## Problem Statement

1. **Import Version Mismatch**: Scoutbook CSV exports include version info (e.g., "(2025 Version)") but our DB may only have 2026 requirements. Requirements that changed between versions can't be matched.

2. **Requirement Number Format**: Scoutbook uses parenthetical format (`6A(a)(1)`) while our DB uses concatenated format (`6A1a`). This causes matching failures during import.

3. **No Historical Data**: We only have current (2026) requirements. Scouts working on older versions can't import their progress.

## Requirements

### From User

1. **Scrape Scoutbook** for historical requirement data using semi-automated browser approach
2. **Version Depth**: Current + up to 2 previous versions per badge (not yearly - each badge has its own version history)
3. **Version Switching**: Leader reviews & approves requirement mapping when scout moves to newer version
4. **Scoutbook Focus**: Only Scoutbook integration, no other systems

### Technical Requirements

1. Use Scoutbook's parenthetical format (`6A(a)(1)`) as canonical
2. Track which version a scout's progress is based on
3. Support import from any stored version
4. Enable future Scoutbook export/sync

## Research Findings

### Scoutbook Data Access
- No official API or bulk export
- Version dropdown available when viewing in-progress merit badges
- Only current + 1 previous version editable in Scoutbook
- Requires authenticated navigation to access requirements

### Existing Infrastructure (Leverage)
- **Playwright** (`^1.57.0`) - Already used for image scraping
- **Chrome extension** - Targets `*.scouting.org/*` with content scripts
- **AI parsing** - Claude Sonnet for HTML extraction
- **Staging pipeline** - Review before import pattern

### Data Sources
- [Scouting Forums Discussion](https://discussions.scouting.org/t/instructions-needed-on-finding-previous-versions-of-merit-badge-requirements/468980)
- [2025 Requirement Updates PDF](https://www.scouting.org/wp-content/uploads/2024/12/Merit-Badge-Requirement-Updates-Effective-January-1-2025-Updated-12-12-24.pdf)
- USScouts.org archives (HTML format)

## Design Decisions

### D1: Use Scoutbook Format as Canonical

**Decision**: Store `requirement_number` in Scoutbook's parenthetical format.

| Current DB Format | Scoutbook Format | Description |
|-------------------|------------------|-------------|
| `6A1a` | `6A(a)(1)` | Option A, sub-req a, detail 1 |
| `6A1b` | `6A(a)(2)` | Option A, sub-req a, detail 2 |
| `9b2` | `9b(2)` | Simpler nested format |

### D2: Semi-Automated Scraping via Extension

**Decision**: Extend existing Chrome extension to capture merit badge requirements.

**Flow**:
1. User navigates to first merit badge in Scoutbook
2. Extension detects merit badge page
3. User clicks "Capture Requirements"
4. Extension extracts all versions, navigates to next badge
5. Data sent to Chuckbox API for staging
6. User reviews and confirms import

### D3: Leader-Approved Version Mapping

**Decision**: When a scout switches versions, show leader a mapping UI.

**UI Flow**:
1. Leader initiates version switch for scout
2. System shows side-by-side comparison: old requirements → new requirements
3. For each completed old requirement, suggest matching new requirement
4. Leader confirms/adjusts mappings
5. System creates progress records for mapped requirements

## Database Changes

### Phase 0: Schema Updates

#### 0.1.1 Add `requirement_version_year` to scout progress

```sql
-- Track which version each scout is working on
ALTER TABLE scout_merit_badge_progress
ADD COLUMN requirement_version_year INTEGER;

-- Backfill from badge's current version
UPDATE scout_merit_badge_progress smbp
SET requirement_version_year = mb.requirement_version_year
FROM bsa_merit_badges mb
WHERE smbp.merit_badge_id = mb.id
AND smbp.requirement_version_year IS NULL;
```

#### 0.1.2 Add Scoutbook format columns

```sql
-- Store canonical Scoutbook format
ALTER TABLE bsa_merit_badge_requirements
ADD COLUMN scoutbook_requirement_number TEXT;

-- Index for import lookups
CREATE INDEX idx_mb_req_scoutbook_num
ON bsa_merit_badge_requirements(merit_badge_id, version_year, scoutbook_requirement_number);
```

#### 0.1.3 Add version history tracking

```sql
-- Track available versions per badge
CREATE TABLE bsa_merit_badge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_badge_id UUID NOT NULL REFERENCES bsa_merit_badges(id),
  version_year INTEGER NOT NULL,
  effective_date DATE,
  scraped_at TIMESTAMPTZ,
  source TEXT, -- 'scoutbook', 'usscouts', 'manual'
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(merit_badge_id, version_year)
);
```

## Implementation Phases

### Phase 0: Foundation

#### 0.1 Schema Updates
- [x] **0.1.1** Add `requirement_version_year` to `scout_merit_badge_progress`
- [x] **0.1.2** Add `scoutbook_requirement_number` column to requirements
- [x] **0.1.3** Create `bsa_merit_badge_versions` tracking table
- [x] **0.1.4** Create migration and run on dev

#### 0.2 Format Conversion
- [x] **0.2.1** Create bidirectional format conversion functions
- [x] **0.2.2** Migrate existing requirements to populate `scoutbook_requirement_number`
- [x] **0.2.3** Update import logic to use Scoutbook format for matching

### Phase 1: Scoutbook Scraper Extension

#### 1.1 Extension Updates
- [ ] **1.1.1** Add merit badge page detection to content script
- [ ] **1.1.2** Create requirement extraction logic for Scoutbook DOM
- [ ] **1.1.3** Add version dropdown detection and iteration
- [ ] **1.1.4** Create "Capture Requirements" UI in extension popup

#### 1.2 Scraping Automation
- [ ] **1.2.1** Implement auto-navigation to next merit badge
- [ ] **1.2.2** Add progress indicator and pause/resume controls
- [ ] **1.2.3** Handle rate limiting and error recovery
- [ ] **1.2.4** Store scraped data locally before sync

#### 1.3 API Endpoint
- [ ] **1.3.1** Create `/api/scoutbook/requirements-sync` endpoint
- [ ] **1.3.2** Add staging table for scraped requirements
- [ ] **1.3.3** Implement review UI for staged requirements
- [ ] **1.3.4** Create confirmation/import action

### Phase 2: Import Improvements

#### 2.1 Version-Aware Import
- [ ] **2.1.1** Update Scoutbook CSV import to extract version year
- [ ] **2.1.2** Match requirements against correct version
- [ ] **2.1.3** Fall back to current version with warning if historical not found
- [ ] **2.1.4** Store version on `scout_merit_badge_progress` creation

#### 2.2 Import Feedback
- [ ] **2.2.1** Surface unmatched requirements to user
- [ ] **2.2.2** Show version mismatch warnings
- [ ] **2.2.3** Allow manual requirement mapping for edge cases

### Phase 3: Version Switching

#### 3.1 Version Switch UI
- [ ] **3.1.1** Add "Switch Version" action to merit badge detail view
- [ ] **3.1.2** Create side-by-side requirement comparison component
- [ ] **3.1.3** Implement requirement mapping suggestions (fuzzy match)
- [ ] **3.1.4** Build leader confirmation workflow

#### 3.2 Backend Logic
- [ ] **3.2.1** Create version switch action with mapping
- [ ] **3.2.2** Preserve old progress as historical record
- [ ] **3.2.3** Create new progress records for mapped requirements
- [ ] **3.2.4** Handle unmapped requirements (mark as needing re-completion)

### Phase 4: Query & Display Updates

#### 4.1 Query Updates
- [ ] **4.1.1** Update requirement fetching to use `progress.requirement_version_year`
- [ ] **4.1.2** Add version info to all requirement queries
- [ ] **4.1.3** Update bulk approval to handle version context

#### 4.2 UI Updates
- [ ] **4.2.1** Display version info on merit badge detail view
- [ ] **4.2.2** Show "older version" indicator when not on current
- [ ] **4.2.3** Add version selector for leaders viewing badge info

## File Changes

### New Files
- `supabase/migrations/YYYYMMDD_multi_version_requirements.sql`
- `src/lib/format/requirement-number.ts` - Format conversion functions
- `src/app/api/scoutbook/requirements-sync/route.ts` - Scraper API
- `src/components/advancement/version-switch-dialog.tsx` - Version switch UI
- `src/components/advancement/requirement-mapping.tsx` - Mapping UI
- `chuckbox-extension/src/lib/mb-extractor.ts` - Merit badge extraction

### Modified Files
- `chuckbox-extension/src/content/content-script.ts` - Add MB page detection
- `chuckbox-extension/src/popup/popup.tsx` - Add capture UI
- `src/app/actions/scoutbook-import.ts` - Version-aware import
- `src/app/actions/advancement.ts` - Version switch actions
- `src/components/advancement/scout-merit-badge-panel.tsx` - Version display

## Scraper Technical Details

### Scoutbook Merit Badge Page Structure

Based on Scoutbook's Ant Design components:

```
URL Pattern: https://advancements.scouting.org/[unit-type]/[unit-id]/scouts/[bsa-id]/merit-badges/[badge-id]

DOM Structure (expected):
- Version dropdown: .ant-select or similar
- Requirements list: .ant-table or .ant-list
- Each requirement row:
  - Requirement number (e.g., "6A(a)(1)")
  - Description text
  - Completion status checkbox
  - Completion date (if completed)
```

### Extraction Strategy

```typescript
interface ScrapedRequirement {
  badgeName: string
  badgeId: string // Scoutbook internal ID
  versionYear: number
  requirementNumber: string // Scoutbook format: "6A(a)(1)"
  description: string
  parentRequirementNumber: string | null
  isAlternative: boolean
  alternativesGroup: string | null
}

interface ScrapedBadgeVersion {
  badgeName: string
  versionYear: number
  requirements: ScrapedRequirement[]
  scrapedAt: string
}
```

### Navigation Flow

```
1. Start at: /merit-badges (list view)
2. For each badge:
   a. Click badge to open detail
   b. Find version dropdown
   c. For each version (max 3):
      - Select version
      - Wait for content update
      - Extract requirements
   d. Navigate to next badge
3. Send batch to API every 10 badges
```

## Testing Strategy

### Unit Tests
- Format conversion functions (both directions)
- Version matching logic
- Requirement mapping suggestions

### Integration Tests
- Import with matching version
- Import with missing version (fallback)
- Version switch with mapping
- Scraper API endpoint

### Manual Testing
- Full scrape of 5-10 merit badges
- Import Ben's CSV with correct version matching
- Version switch workflow end-to-end

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scoutbook DOM changes | Medium | High | Use AI parsing as fallback, maintain selectors in config |
| Rate limiting by Scoutbook | Medium | Medium | Add delays, batch requests, respect robots.txt |
| Incomplete version data | Medium | Medium | Start with badges that have known issues, expand gradually |
| Complex mapping scenarios | Low | Medium | Allow manual override, preserve unmapped as notes |

## Success Metrics

1. **Scrape Coverage**: 100+ merit badges with version history captured
2. **Import Success Rate**: 95%+ of Scoutbook CSV requirements match
3. **Version Tracking**: 100% of progress records have version_year
4. **User Satisfaction**: Leaders can switch versions with confidence

## Task Log

| Date | Task | Commit |
|------|------|--------|
| 2026-01-23 | 0.1.1-0.1.4: Schema updates migration | pending |
| 2026-01-23 | 0.2.1: Format conversion functions | pending |
| 2026-01-23 | 0.2.2: Import script for scraped data | pending |
| 2026-01-23 | 0.2.3: Updated import logic for Scoutbook format | pending |

## Open Questions

1. **Scoutbook DOM Structure**: Need to inspect actual page structure during scraping development
2. **Version Dropdown Behavior**: Does selecting a version reload page or update in-place?
3. **Badge ID Mapping**: How do Scoutbook badge IDs map to our internal IDs?

## Appendix: Scoutbook Requirement Format Reference

### From CSV Export
```
"Partial Merit Badges","Start Date"
"Cycling #","03/17/2025"
"Completed Requirements: 1a, 1b, 1c, 2, 3, 4a, 4b, 4c, 4d, 4e, 4f, 5, 6A(a)(1), 6A(a)(2), 6A(a)(3), 6A(a)(4), 6A(a)(5)(2025 Version)"
```

### Requirement Number Patterns
- Simple: `1`, `2`, `3`
- With letter: `1a`, `1b`, `4f`
- With parenthetical: `9b(2)`
- Option A/B with nesting: `6A(a)(1)`, `6B(b)(3)`

### Version Format
- In CSV: `(YYYY Version)` at end of requirements line
- In Scoutbook UI: Dropdown with year options
