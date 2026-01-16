/**
 * Youth Profile Parser
 *
 * Extracts scout profile data from Scoutbook Plus accessibility snapshots.
 * Parses the /youthProfile/{id} page.
 */

import {
  AgentBrowserSnapshot,
  ScoutProfile,
  ScoutRelationship,
  LeadershipPosition,
  RankProgress,
} from '../types';

/**
 * Parse scout profile from a snapshot
 */
export function parseYouthProfile(
  snapshot: AgentBrowserSnapshot
): ScoutProfile | null {
  const snapshotText = snapshot.data?.snapshot || '';
  const refs = snapshot.data?.refs || {};

  // Extract basic info from snapshot text
  const name = extractName(snapshotText);
  if (!name) {
    return null;
  }

  const bsaMemberId = extractBsaId(snapshotText);
  const status = extractStatus(snapshotText);
  const unit = extractUnit(snapshotText);
  const patrol = extractPatrol(snapshotText);
  const dateJoined = extractDateJoined(snapshotText);
  const lastRankScoutsBSA = extractLastRank(snapshotText, 'Scouts BSA');
  const lastRankCubScout = extractLastRank(snapshotText, 'Cub Scout');

  const relationships = extractRelationships(snapshotText);
  const leadershipPositions = extractLeadershipPositions(snapshotText);
  const rankProgress = extractRankProgress(snapshotText);
  const meritBadges = extractMeritBadgeCounts(snapshotText);
  const activityLogs = extractActivityLogs(snapshotText);

  return {
    name,
    bsaMemberId: bsaMemberId || '',
    status,
    unit,
    patrol,
    dateJoined,
    lastRankScoutsBSA,
    lastRankCubScout,
    relationships,
    leadershipPositions,
    rankProgress,
    meritBadges,
    activityLogs,
  };
}

/**
 * Extract scout name from profile
 */
function extractName(text: string): string | null {
  // Pattern: "text: Ben Blaalid Current" or similar after profile header
  const match = text.match(/text:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s+Current/);
  if (match) {
    return match[1];
  }

  // Alternative: Look for name before "Current" status
  const altMatch = text.match(/img\n\s*-\s*text:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  if (altMatch) {
    return altMatch[1];
  }

  return null;
}

/**
 * Extract BSA Member ID
 */
function extractBsaId(text: string): string | null {
  // Pattern: "ID 141419860" or "Member ID 141419860"
  const match = text.match(/ID\s+(\d{9})/);
  return match ? match[1] : null;
}

/**
 * Extract membership status
 */
function extractStatus(text: string): string {
  if (text.includes('Eligible to Renew')) {
    return 'Eligible to Renew';
  }
  if (text.includes('Expired')) {
    return 'Expired';
  }
  return 'Current';
}

/**
 * Extract unit name
 */
function extractUnit(text: string): string {
  // Pattern: "Unit Troop 9297"
  const match = text.match(/Unit\s+(Troop|Pack|Crew)\s+(\d+)/);
  return match ? `${match[1]} ${match[2]}` : '';
}

/**
 * Extract patrol name
 */
function extractPatrol(text: string): string | null {
  // Pattern: "Sub unit Blazing Bulls" or "Patrol Blazing Bulls"
  const match = text.match(/(?:Sub unit|Patrol)\s+([A-Za-z\s]+?)(?:\s+Date|\s+\[|\n)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract date joined
 */
function extractDateJoined(text: string): string | null {
  // Pattern: "Date Joined Scouts BSA [03/17/2025]"
  const match = text.match(/Date Joined[^[]*\[(\d{2}\/\d{2}\/\d{4})\]/);
  return match ? match[1] : null;
}

/**
 * Extract last rank for a program
 */
function extractLastRank(text: string, program: string): string | null {
  // Pattern: "Last Rank Scouts BSA - Tenderfoot" or "Last Rank Cub Scout - Arrow of Light"
  const pattern = new RegExp(`Last Rank ${program}\\s*-?\\s*([A-Za-z\\s]+?)(?:\\s+Last|\\s+ID|\\n)`);
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract relationships (parents/guardians)
 */
function extractRelationships(text: string): ScoutRelationship[] {
  const relationships: ScoutRelationship[] = [];

  // Pattern: "Richard Blaalid - 141419859 Ben Blaalid is Son of Richard Blaalid"
  const relationshipSection = text.match(/Relationships[\s\S]*?(?=Program Leadership|$)/);
  if (!relationshipSection) {
    return relationships;
  }

  // Look for parent/guardian patterns
  const parentMatch = relationshipSection[0].match(
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*-\s*(\d{9})\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+is\s+(Son|Daughter|Child)\s+of/
  );

  if (parentMatch) {
    relationships.push({
      name: parentMatch[1],
      bsaMemberId: parentMatch[2],
      relationship: 'Parent',
    });
  }

  return relationships;
}

/**
 * Extract leadership positions
 */
function extractLeadershipPositions(text: string): LeadershipPosition[] {
  const positions: LeadershipPosition[] = [];

  // Pattern examples:
  // "Den Chief 130 days Troop 9297"
  // "Patrol Leader 130 days Troop 9297"
  // "Assistant Patrol Leader 175 days Troop 9297"

  const positionPatterns = [
    'Den Chief',
    'Senior Patrol Leader',
    'Assistant Senior Patrol Leader',
    'Patrol Leader',
    'Assistant Patrol Leader',
    'Troop Guide',
    'Scribe',
    'Quartermaster',
    'Historian',
    'Librarian',
    'Chaplain Aide',
    'Instructor',
    'Webmaster',
    'Outdoor Ethics Guide',
  ];

  for (const posName of positionPatterns) {
    const pattern = new RegExp(
      `${posName}\\s+(\\d+)\\s+days\\s+(Troop|Pack|Crew)\\s+(\\d+)`,
      'gi'
    );
    let match;

    while ((match = pattern.exec(text)) !== null) {
      positions.push({
        position: posName,
        days: parseInt(match[1], 10),
        current: text.includes(`Current Youth Positions`) &&
          text.indexOf(match[0]) < text.indexOf('Past Youth Positions'),
        unit: `${match[2]} ${match[3]}`,
        dateRange: '', // Would need more parsing to extract
      });
    }
  }

  return positions;
}

/**
 * Extract rank progress
 */
function extractRankProgress(text: string): RankProgress[] {
  const ranks: RankProgress[] = [];

  // Rank patterns in the snapshot:
  // "Scout AWARDED Completed 04-14-2025 100%"
  // "Tenderfoot APPROVED Completed 12-01-2025 100%"
  // "Second Class 27%"

  const rankNames = [
    'Scout',
    'Tenderfoot',
    'Second Class',
    'First Class',
    'Star Scout',
    'Life Scout',
    'Eagle Scout',
  ];

  for (const rankName of rankNames) {
    // Check for AWARDED status
    const awardedPattern = new RegExp(
      `${rankName}[\\s\\S]*?AWARDED[\\s\\S]*?Completed\\s+(\\d{2}-\\d{2}-\\d{4})\\s+(\\d+)%`
    );
    const awardedMatch = text.match(awardedPattern);

    if (awardedMatch) {
      ranks.push({
        rankName,
        status: 'AWARDED',
        completedDate: awardedMatch[1].replace(/-/g, '/'),
        percentComplete: parseInt(awardedMatch[2], 10),
      });
      continue;
    }

    // Check for APPROVED status
    const approvedPattern = new RegExp(
      `${rankName}[\\s\\S]*?APPROVED[\\s\\S]*?Completed\\s+(\\d{2}-\\d{2}-\\d{4})\\s+(\\d+)%`
    );
    const approvedMatch = text.match(approvedPattern);

    if (approvedMatch) {
      ranks.push({
        rankName,
        status: 'APPROVED',
        completedDate: approvedMatch[1].replace(/-/g, '/'),
        percentComplete: parseInt(approvedMatch[2], 10),
      });
      continue;
    }

    // Check for in-progress (just percentage)
    const progressPattern = new RegExp(`${rankName}\\s+(\\d+)%`);
    const progressMatch = text.match(progressPattern);

    if (progressMatch) {
      const percent = parseInt(progressMatch[1], 10);
      ranks.push({
        rankName,
        status: percent > 0 ? 'STARTED' : 'NOT_STARTED',
        completedDate: null,
        percentComplete: percent,
      });
    }
  }

  return ranks;
}

/**
 * Extract merit badge counts
 */
function extractMeritBadgeCounts(text: string): { pending: number; approved: number } {
  // Pattern: "3 Pending 3 Approved"
  const pendingMatch = text.match(/(\d+)\s+Pending/);
  const approvedMatch = text.match(/(\d+)\s+Approved/);

  return {
    pending: pendingMatch ? parseInt(pendingMatch[1], 10) : 0,
    approved: approvedMatch ? parseInt(approvedMatch[1], 10) : 0,
  };
}

/**
 * Extract activity logs
 */
function extractActivityLogs(
  text: string
): { campingNights: number; hikingMiles: number; serviceHours: number } {
  // Patterns:
  // "Camping 2 NIGHTS"
  // "Hiking 0 MILES"
  // "Service Hours 2.5 HOURS"

  const campingMatch = text.match(/Camping[\s\S]*?(\d+)\s*NIGHTS/i);
  const hikingMatch = text.match(/Hiking[\s\S]*?(\d+(?:\.\d+)?)\s*MILES/i);
  const serviceMatch = text.match(/Service Hours[\s\S]*?(\d+(?:\.\d+)?)\s*HOURS/i);

  return {
    campingNights: campingMatch ? parseInt(campingMatch[1], 10) : 0,
    hikingMiles: hikingMatch ? parseFloat(hikingMatch[1]) : 0,
    serviceHours: serviceMatch ? parseFloat(serviceMatch[1]) : 0,
  };
}

/**
 * Find "View More" buttons for ranks to expand them
 */
export function findRankViewMoreButtons(
  snapshot: AgentBrowserSnapshot
): Map<string, string> {
  const refs = snapshot.data?.refs || {};
  const buttons = new Map<string, string>();

  // Look for "View More" buttons
  for (const [key, ref] of Object.entries(refs)) {
    if (ref.name === 'View More' && ref.role === 'button') {
      buttons.set(key, `@${key}`);
    }
  }

  return buttons;
}

/**
 * Check if we're on a youth profile page
 */
export function isYouthProfilePage(snapshot: AgentBrowserSnapshot): boolean {
  const snapshotText = snapshot.data?.snapshot || '';
  return (
    snapshotText.includes('Youth Profile') ||
    snapshotText.includes('youthProfile')
  );
}
