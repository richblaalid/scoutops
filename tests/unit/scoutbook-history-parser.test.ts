import { describe, it, expect } from 'vitest'
import {
  parseScoutbookHistory,
  validateScoutbookHistory,
  getScoutbookHistorySummary,
  type ParsedScoutbookHistory,
} from '@/lib/import/scoutbook-history-parser'

// Sample CSV content based on actual ScoutBook export format
const SAMPLE_CSV = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"Ben Blaalid Troop 9297 BOYS"
"Birthdate:","05/04/2014","Date Joined Scouts BSA:","03/17/2025","Rank:","Tenderfoot(12/01/2025)",
"BSA ID:","141419860","Position:","Patrol Leader09/08/2025 Den Chief09/08/2025 ",

Scout,,"04/14/2025"
"1a","Scout Oath & Law","03/18/2025"
"1b","Scout Spirit","03/18/2025"
"1c","Salute & Sign","03/18/2025"
"7","Scoutmaster conference","04/14/2025"



Tenderfoot,,"12/01/2025"
"1a","Prepare to camp","04/26/2025"
"1b","Sleep in tent","04/26/2025"
"3a","Square knot","03/22/2025"
"10","Scoutmaster conference","12/01/2025"
"11","Board of review","12/01/2025"



Second Class,,""
"1a","Participation","__________"
"1b","Leave No Trace Seven Principles","__________"
"5a","Know safe swim","03/24/2025"
"5b","Beginner swim test","03/24/2025"



First Class,,""
"1a","Participate in 10 events","__________"
"3a","Know lashing uses","04/26/2025"



Star,,""
"1","Active 4 months","__________"
"3","Six Merit Badges","__________"
"","Enviro. Science #","07/04/2025"
"","__________","__________"
"","Fingerprinting","07/04/2025"
"","Nature","07/04/2025"



"Completed Merit Badges"
"Environmental Science #","07/04/2025"


"Completed Merit Badges"
"Fingerprinting","07/04/2025"


"Completed Merit Badges"
"Nature","07/04/2025"


"Leadership","Start Date","End Date"
"Assistant Patrol Leader (Blazing Bulls)","03/17/2025","09/07/2025"
"Den Chief","09/08/2025","__________"
"Patrol Leader (Blazing Bulls)","09/08/2025","__________"


"Order of the Arrow",,
"Member Number",""


"Activities"
"Total Service Hours","2.50"
"Total Hiking Miles","0"
"Total Camping Nights","2"


"Partial Merit Badges","Start Date"
"Camping #","10/11/2025"
"Completed Requirements: 9b(2)(2024 Version)"

"Cycling #","03/17/2025"
"Completed Requirements: 1a, 1b, 1c, 2, 3(2025 Version)"

"Geocaching","07/04/2025"
"Completed Requirements: 7, 9(2019 Version)"

`

describe('ScoutBook History Parser', () => {
  describe('parseScoutbookHistory', () => {
    it('should parse scout info from header', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.scout.fullName).toBe('Ben Blaalid')
      expect(result.scout.firstName).toBe('Ben')
      expect(result.scout.lastName).toBe('Blaalid')
      expect(result.scout.unit).toBe('Troop 9297 BOYS')
    })

    it('should parse birthdate and date joined', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.scout.birthdate).toBe('2014-05-04')
      expect(result.scout.dateJoined).toBe('2025-03-17')
    })

    it('should parse current rank and date', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.scout.currentRank).toBe('Tenderfoot')
      expect(result.scout.currentRankDate).toBe('2025-12-01')
    })

    it('should parse BSA ID', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.scout.bsaId).toBe('141419860')
    })

    it('should parse positions', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.scout.positions).toContain('Patrol Leader')
      expect(result.scout.positions).toContain('Den Chief')
    })

    it('should parse rank progress with completion dates', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      const scoutRank = result.rankProgress.find((r) => r.rankCode === 'scout')
      expect(scoutRank).toBeDefined()
      expect(scoutRank?.completedDate).toBe('2025-04-14')

      const tenderfootRank = result.rankProgress.find((r) => r.rankCode === 'tenderfoot')
      expect(tenderfootRank).toBeDefined()
      expect(tenderfootRank?.completedDate).toBe('2025-12-01')
    })

    it('should parse rank progress without completion dates', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      const secondClassRank = result.rankProgress.find((r) => r.rankCode === 'second_class')
      expect(secondClassRank).toBeDefined()
      expect(secondClassRank?.completedDate).toBeNull()
    })

    it('should parse rank requirements', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      const scoutRank = result.rankProgress.find((r) => r.rankCode === 'scout')
      expect(scoutRank?.requirements.length).toBeGreaterThan(0)

      const req1a = scoutRank?.requirements.find((r) => r.requirementNumber === '1a')
      expect(req1a).toBeDefined()
      expect(req1a?.description).toBe('Scout Oath & Law')
      expect(req1a?.completedDate).toBe('2025-03-18')
    })

    it('should parse incomplete requirements as null date', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      const secondClassRank = result.rankProgress.find((r) => r.rankCode === 'second_class')
      const req1a = secondClassRank?.requirements.find((r) => r.requirementNumber === '1a')
      expect(req1a).toBeDefined()
      expect(req1a?.completedDate).toBeNull()
    })

    it('should parse completed merit badges', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.completedMeritBadges).toHaveLength(3)

      const envScience = result.completedMeritBadges.find(
        (b) => b.normalizedName === 'environmental_science'
      )
      expect(envScience).toBeDefined()
      expect(envScience?.completedDate).toBe('2025-07-04')
      expect(envScience?.isComplete).toBe(true)
    })

    it('should parse partial merit badges', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.partialMeritBadges.length).toBeGreaterThan(0)

      const camping = result.partialMeritBadges.find((b) => b.normalizedName === 'camping')
      expect(camping).toBeDefined()
      expect(camping?.startDate).toBe('2025-10-11')
      expect(camping?.isComplete).toBe(false)
      expect(camping?.version).toBe('2024')
    })

    it('should parse partial merit badge completed requirements', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      const cycling = result.partialMeritBadges.find((b) => b.normalizedName === 'cycling')
      expect(cycling).toBeDefined()
      expect(cycling?.completedRequirements.length).toBeGreaterThan(0)
      expect(cycling?.completedRequirements).toContain('1a')
      expect(cycling?.completedRequirements).toContain('1b')
      // Verify the last requirement before version is captured (3 from "3(2025 Version)")
      expect(cycling?.completedRequirements).toContain('3')
    })

    it('should parse requirement followed directly by version year', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      // Geocaching has "7, 9(2019 Version)" - verify 9 is captured
      const geocaching = result.partialMeritBadges.find((b) => b.normalizedName === 'geocaching')
      expect(geocaching).toBeDefined()
      expect(geocaching?.completedRequirements).toContain('7')
      expect(geocaching?.completedRequirements).toContain('9')
      expect(geocaching?.version).toBe('2019')
    })

    it('should parse complex parenthetical requirements like 6A(a)(1)', () => {
      // Create CSV with complex parenthetical requirements (Scoutbook format)
      const complexCsv = `Generated: 01/21/2026 10:00:00
Scouts BSA History Report
"Test Scout Troop 1234 BOYS"
"Birthdate:","01/01/2010","Date Joined Scouts BSA:","01/01/2024","Rank:","Scout(01/15/2024)",
"BSA ID:","123456789","Position:","",

"Partial Merit Badges","Start Date"
"Cooking","01/15/2026"
"Completed Requirements: 1a, 1b, 6A(a)(1), 6A(a)(2), 6A(a)(3), 6A(a)(4), 6A(a)(5)(2025 Version)"

"Swimming","02/01/2026"
"Completed Requirements: 1, 2a, 2b(1), 2b(2), 3(2025 Version)"
`
      const result = parseScoutbookHistory(complexCsv)

      const cooking = result.partialMeritBadges.find((b) => b.normalizedName === 'cooking')
      expect(cooking).toBeDefined()
      // Verify simple requirements
      expect(cooking?.completedRequirements).toContain('1a')
      expect(cooking?.completedRequirements).toContain('1b')
      // Verify complex parenthetical requirements are preserved intact
      expect(cooking?.completedRequirements).toContain('6A(a)(1)')
      expect(cooking?.completedRequirements).toContain('6A(a)(2)')
      expect(cooking?.completedRequirements).toContain('6A(a)(3)')
      expect(cooking?.completedRequirements).toContain('6A(a)(4)')
      expect(cooking?.completedRequirements).toContain('6A(a)(5)')
      expect(cooking?.version).toBe('2025')

      const swimming = result.partialMeritBadges.find((b) => b.normalizedName === 'swimming')
      expect(swimming).toBeDefined()
      // Verify mixed format requirements
      expect(swimming?.completedRequirements).toContain('1')
      expect(swimming?.completedRequirements).toContain('2a')
      expect(swimming?.completedRequirements).toContain('2b(1)')
      expect(swimming?.completedRequirements).toContain('2b(2)')
      expect(swimming?.completedRequirements).toContain('3')
    })

    it('should not break simple requirements when parsing complex ones', () => {
      // Ensure the new regex doesn't break simple requirement parsing
      const simpleCsv = `Generated: 01/21/2026 10:00:00
Scouts BSA History Report
"Test Scout Troop 1234 BOYS"
"Birthdate:","01/01/2010","Date Joined Scouts BSA:","01/01/2024","Rank:","Scout(01/15/2024)",
"BSA ID:","123456789","Position:","",

"Partial Merit Badges","Start Date"
"First Aid","01/15/2026"
"Completed Requirements: 1, 2a, 2b, 2c, 3, 4a, 4b, 5(2025 Version)"
`
      const result = parseScoutbookHistory(simpleCsv)

      const firstAid = result.partialMeritBadges.find((b) => b.normalizedName === 'first_aid')
      expect(firstAid).toBeDefined()
      expect(firstAid?.completedRequirements).toEqual(['1', '2a', '2b', '2c', '3', '4a', '4b', '5'])
    })

    it('should parse leadership history', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.leadershipHistory.length).toBe(3)

      const apl = result.leadershipHistory.find((l) => l.name === 'Assistant Patrol Leader')
      expect(apl).toBeDefined()
      expect(apl?.patrol).toBe('Blazing Bulls')
      expect(apl?.startDate).toBe('2025-03-17')
      expect(apl?.endDate).toBe('2025-09-07')

      const denChief = result.leadershipHistory.find((l) => l.name === 'Den Chief')
      expect(denChief).toBeDefined()
      expect(denChief?.endDate).toBeNull()
    })

    it('should parse activities', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      expect(result.activities.serviceHours).toBe(2.5)
      expect(result.activities.hikingMiles).toBe(0)
      expect(result.activities.campingNights).toBe(2)
    })

    it('should handle empty content', () => {
      const result = parseScoutbookHistory('')

      expect(result.scout.fullName).toBe('')
      expect(result.rankProgress).toHaveLength(0)
      expect(result.completedMeritBadges).toHaveLength(0)
    })

    it('should normalize badge names with abbreviations', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)

      // "Enviro. Science #" should normalize to "environmental_science"
      const envScience = result.completedMeritBadges.find(
        (b) => b.normalizedName === 'environmental_science'
      )
      expect(envScience).toBeDefined()
      expect(envScience?.name).toBe('Environmental Science #')
    })
  })

  describe('validateScoutbookHistory', () => {
    it('should return no errors for valid data', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)
      const errors = validateScoutbookHistory(result)

      // Should have no validation errors (parsing errors may exist)
      expect(errors.filter((e) => !e.includes('Error parsing'))).toHaveLength(0)
    })

    it('should report missing scout name', () => {
      const data: ParsedScoutbookHistory = {
        scout: {
          fullName: '',
          firstName: '',
          lastName: '',
          unit: '',
          birthdate: null,
          dateJoined: null,
          currentRank: null,
          currentRankDate: null,
          bsaId: null,
          positions: [],
        },
        rankProgress: [],
        completedMeritBadges: [],
        partialMeritBadges: [],
        leadershipHistory: [],
        activities: { serviceHours: 0, hikingMiles: 0, campingNights: 0 },
        errors: [],
      }

      const errors = validateScoutbookHistory(data)
      expect(errors).toContain('Scout name not found')
    })

    it('should report no advancement data found', () => {
      const data: ParsedScoutbookHistory = {
        scout: {
          fullName: 'Test Scout',
          firstName: 'Test',
          lastName: 'Scout',
          unit: 'Troop 123',
          birthdate: null,
          dateJoined: null,
          currentRank: null,
          currentRankDate: null,
          bsaId: null,
          positions: [],
        },
        rankProgress: [],
        completedMeritBadges: [],
        partialMeritBadges: [],
        leadershipHistory: [],
        activities: { serviceHours: 0, hikingMiles: 0, campingNights: 0 },
        errors: [],
      }

      const errors = validateScoutbookHistory(data)
      expect(errors).toContain('No advancement data found in file')
    })

    it('should not report error if only leadership data present', () => {
      const data: ParsedScoutbookHistory = {
        scout: {
          fullName: 'Test Scout',
          firstName: 'Test',
          lastName: 'Scout',
          unit: 'Troop 123',
          birthdate: null,
          dateJoined: null,
          currentRank: null,
          currentRankDate: null,
          bsaId: null,
          positions: [],
        },
        rankProgress: [],
        completedMeritBadges: [],
        partialMeritBadges: [],
        leadershipHistory: [
          {
            name: 'Patrol Leader',
            patrol: null,
            startDate: '2024-01-01',
            endDate: null,
          },
        ],
        activities: { serviceHours: 0, hikingMiles: 0, campingNights: 0 },
        errors: [],
      }

      const errors = validateScoutbookHistory(data)
      expect(errors).not.toContain('No advancement data found in file')
    })
  })

  describe('getScoutbookHistorySummary', () => {
    it('should return correct summary', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)
      const summary = getScoutbookHistorySummary(result)

      expect(summary.scoutName).toBe('Ben Blaalid')
      expect(summary.currentRank).toBe('Tenderfoot')
      expect(summary.completedBadges).toBe(3)
      expect(summary.inProgressBadges).toBe(3)
      expect(summary.leadershipPositions).toBe(3)
      expect(summary.activities.campingNights).toBe(2)
      expect(summary.activities.serviceHours).toBe(2.5)
    })

    it('should count completed ranks correctly', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)
      const summary = getScoutbookHistorySummary(result)

      // Scout and Tenderfoot should be completed
      expect(summary.completedRanks).toBe(2)
    })

    it('should count in-progress ranks correctly', () => {
      const result = parseScoutbookHistory(SAMPLE_CSV)
      const summary = getScoutbookHistorySummary(result)

      // Second Class, First Class, Star have some requirements done
      expect(summary.inProgressRanks).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle CSV with only header', () => {
      const csv = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"John Doe Troop 123"
"Birthdate:","01/01/2010","Date Joined Scouts BSA:","03/01/2024","Rank:","Scout(03/15/2024)",
"BSA ID:","123456789","Position:","",
`
      const result = parseScoutbookHistory(csv)

      expect(result.scout.fullName).toBe('John Doe')
      expect(result.scout.bsaId).toBe('123456789')
    })

    it('should handle date with leading zeros', () => {
      const csv = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"Test Scout Troop 1"
"Birthdate:","01/05/2010","Date Joined Scouts BSA:","","Rank:","",
"BSA ID:","","Position:","",

Scout,,"01/01/2024"
`
      const result = parseScoutbookHistory(csv)

      expect(result.scout.birthdate).toBe('2010-01-05')
      const scoutRank = result.rankProgress.find((r) => r.rankCode === 'scout')
      expect(scoutRank?.completedDate).toBe('2024-01-01')
    })

    it('should handle merit badge names with # symbol', () => {
      const csv = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"Test Scout Troop 1"
"Birthdate:","","Date Joined Scouts BSA:","","Rank:","",
"BSA ID:","","Position:","",


"Completed Merit Badges"
"First Aid #","07/04/2025"
`
      const result = parseScoutbookHistory(csv)

      expect(result.completedMeritBadges).toHaveLength(1)
      expect(result.completedMeritBadges[0].normalizedName).toBe('first_aid')
    })

    it('should skip blank merit badge slots in Star/Life/Eagle', () => {
      const csv = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"Test Scout Troop 1"
"Birthdate:","","Date Joined Scouts BSA:","","Rank:","",
"BSA ID:","","Position:","",

Star,,""
"3","Six Merit Badges","__________"
"","Camping","07/04/2025"
"","__________","__________"
"","__________","__________"
`
      const result = parseScoutbookHistory(csv)

      const starRank = result.rankProgress.find((r) => r.rankCode === 'star')
      // Should not include the blank "__________" entries
      const blankReqs = starRank?.requirements.filter((r) => r.description === '__________')
      expect(blankReqs?.length).toBe(0)
    })

    it('should handle leadership without patrol info', () => {
      const csv = `Generated: 01/20/2026 14:18:12
Scouts BSA History Report
"Test Scout Troop 1"
"Birthdate:","","Date Joined Scouts BSA:","","Rank:","",
"BSA ID:","","Position:","",


"Leadership","Start Date","End Date"
"Den Chief","09/08/2025","__________"
`
      const result = parseScoutbookHistory(csv)

      expect(result.leadershipHistory).toHaveLength(1)
      expect(result.leadershipHistory[0].name).toBe('Den Chief')
      expect(result.leadershipHistory[0].patrol).toBeNull()
      expect(result.leadershipHistory[0].endDate).toBeNull()
    })
  })
})
