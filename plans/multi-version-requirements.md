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

### Phase 0: Foundation ✅ COMPLETE

#### 0.1 Schema Updates
- [x] **0.1.1** Add `requirement_version_year` to `scout_merit_badge_progress`
- [x] **0.1.2** Add `scoutbook_requirement_number` column to requirements
- [x] **0.1.3** Create `bsa_merit_badge_versions` tracking table
- [x] **0.1.4** Create migration and run on dev

#### 0.2 Format Conversion
- [x] **0.2.1** Create bidirectional format conversion functions
- [x] **0.2.2** Migrate existing requirements to populate `scoutbook_requirement_number`
- [x] **0.2.3** Update import logic to use Scoutbook format for matching

#### 0.3 Performant Seeding (Added)
- [x] **0.3.1** Create Playwright-based Scoutbook scraper
- [x] **0.3.2** Scrape all 141 badges with 358 versions (11,289 requirements)
- [x] **0.3.3** Create bulk import function (~14s vs ~30min)
- [x] **0.3.4** Add `seed:mb-versions` command to db.ts
- [x] **0.3.5** Integrate into `db:fresh` workflow

### Phase 1: Scoutbook Scraper ✅ COMPLETE (via Playwright)

> **Note**: Instead of Chrome extension approach, we used Playwright for scraping.
> This was faster to implement and captured all required data.

#### 1.1 Scraper Implementation
- [x] **1.1.1** Create Playwright scraper (`scripts/scrape-all-merit-badges.ts`)
- [x] **1.1.2** Extract requirements from Scoutbook DOM
- [x] **1.1.3** Iterate through all version dropdowns
- [x] **1.1.4** Save to JSON source of truth file

#### 1.2 Data Storage
- [x] **1.2.1** Store scraped data in `data/merit-badge-requirements-scraped.json`
- [x] **1.2.2** Track version metadata (year, is_current, source)
- [x] **1.2.3** Preserve parent/child relationships via parentNumber

#### 1.3 Seeding Infrastructure
- [x] **1.3.1** Bulk import with level-by-level processing
- [x] **1.3.2** Badge slug normalization for mismatched codes
- [x] **1.3.3** Integrated into `npm run db:fresh`

### Phase 2: Import Improvements ✅ COMPLETE

#### 2.1 Version-Aware Import
- [x] **2.1.1** Update Scoutbook CSV import to extract version year
- [x] **2.1.2** Match requirements against correct version using `scoutbook_requirement_number`
- [x] **2.1.3** Fall back to current version with warning if historical not found
- [x] **2.1.4** Store version on `scout_merit_badge_progress` creation

#### 2.2 Import Feedback
- [x] **2.2.1** Surface unmatched requirements to user
- [x] **2.2.2** Show version mismatch warnings
- [x] **2.2.3** Allow manual requirement mapping for edge cases (grouped warning display with guidance)

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

### Created Files (Phase 0-1)
- `supabase/migrations/20260123000000_multi_version_requirements.sql` - Schema changes
- `src/lib/format/requirement-number.ts` - Format conversion functions
- `tests/unit/requirement-number.test.ts` - Unit tests for format conversion
- `scripts/scrape-all-merit-badges.ts` - Playwright-based Scoutbook scraper
- `scripts/import-scraped-requirements.ts` - Original import script (slower)
- `data/merit-badge-requirements-scraped.json` - **Source of truth** (11,289 requirements)

### Modified Files (Phase 0-1)
- `scripts/bsa-reference-data.ts` - Added `importVersionedMeritBadgeRequirements()` bulk import
- `scripts/db.ts` - Added `seed:mb-versions` command, integrated into `seed:all`
- `src/app/actions/scoutbook-import.ts` - Version-aware import with `scoutbook_requirement_number` matching

### Future Files (Phase 2-4)
- `src/app/api/scoutbook/requirements-sync/route.ts` - Scraper API (if needed)
- `src/components/advancement/version-switch-dialog.tsx` - Version switch UI
- `src/components/advancement/requirement-mapping.tsx` - Mapping UI

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

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Scrape Coverage | 100+ badges | **141 badges, 358 versions** | ✅ |
| Requirements Captured | - | **11,289 requirements** | ✅ |
| Seed Performance | < 60s | **~14 seconds** | ✅ |
| Import Success Rate | 95%+ match | TBD (needs CSV testing) | ⏳ |
| Version Tracking | 100% progress w/ version | TBD (Phase 2) | ⏳ |

## Task Log

| Date | Task | Commit |
|------|------|--------|
| 2026-01-23 | Phase 0: Schema updates, format conversion, import logic | `b098f7d` |
| 2026-01-23 | Phase 1: Playwright scraper, 11,289 requirements scraped | `b098f7d` |
| 2026-01-23 | Performant seeding (~14s), db:fresh integration | `b098f7d` |
| 2026-01-23 | Fix badge slug normalization (AI, Fish & Wildlife) | `9d1269c` |
| 2026-01-23 | Fix badge version year to match active version from scraped data | `af78c62` |
| 2026-01-23 | Phase 2: Version fallback, warnings UI, unmatched requirements display | `af78c62` |

## Resolved Questions

1. **Scoutbook DOM Structure**: ✅ Ant Design components with `.ant-table` for requirements
2. **Version Dropdown Behavior**: ✅ Updates in-place without page reload
3. **Badge ID Mapping**: ✅ Use badge slug/code with normalization map for mismatches

## Open Questions

1. **Version switching UI**: How should leaders map old requirements to new when switching versions?
2. **Progress migration**: Should existing progress records be backfilled with version_year?

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
