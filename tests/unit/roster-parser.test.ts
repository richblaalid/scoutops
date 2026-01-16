import { describe, it, expect } from 'vitest';

// Import the parser - we need to test the parseRosterRow function indirectly
// through parseRosterPage since parseRosterRow is not exported
import { parseRosterPage } from '@/lib/sync/scoutbook/parsers/roster';
import { AgentBrowserSnapshot } from '@/lib/sync/scoutbook/types';

function createSnapshot(rowContent: string): AgentBrowserSnapshot {
  return {
    success: true,
    data: {
      refs: {},
      snapshot: `row "${rowContent}"`,
    },
    error: null,
  };
}

describe('roster parser', () => {
  describe('position extraction', () => {
    // Note: Scoutbook roster view only shows ONE position per member.
    // The number prefix indicates how many positions they have total.
    // e.g., "2Den Chief" means 2 positions, with Den Chief being the visible one.
    // The second position is only visible on hover, which we can't capture.

    it('extracts position with count prefix of 1', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Senior Patrol Leader Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Senior Patrol Leader');
      expect(members[0].position2).toBeNull(); // Roster only shows one position
    });

    it('extracts position with count prefix of 2 (has hidden second position)', () => {
      // "2Den Chief" means scout has 2 positions, Den Chief is the one displayed
      const snapshot = createSnapshot(
        'Ben Blaalid 141419860 YOUTH 11 Tenderfoot Blazing Bulls 2Den Chief Current 11/30/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Den Chief');
      expect(members[0].position2).toBeNull(); // Second position only visible on hover
    });

    it('handles position without number prefix', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix Senior Patrol Leader Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Senior Patrol Leader');
      expect(members[0].position2).toBeNull();
    });

    it('does not match Patrol Leader as substring of Senior Patrol Leader', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Senior Patrol Leader Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Senior Patrol Leader');
      expect(members[0].position2).toBeNull();
    });

    it('handles Patrol Leader correctly', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Patrol Leader Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Patrol Leader');
      expect(members[0].position2).toBeNull();
    });

    it('handles Assistant Scoutmaster without matching Scoutmaster', () => {
      const snapshot = createSnapshot(
        'Jane Smith 987654321 LEADER (21+) Eagle Scout unassigned 1Assistant Scoutmaster Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Assistant Scoutmaster');
      expect(members[0].position2).toBeNull();
    });

    it('handles no position', () => {
      const snapshot = createSnapshot(
        'Jane Smith 987654321 LEADER (21+) Eagle Scout unassigned Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBeNull();
      expect(members[0].position2).toBeNull();
    });
  });

  describe('basic field extraction', () => {
    it('extracts name correctly', () => {
      const snapshot = createSnapshot(
        'John Michael Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].name).toBe('John Michael Doe');
    });

    it('extracts BSA member ID', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members[0].bsaMemberId).toBe('123456789');
    });

    it('extracts member type YOUTH', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members[0].type).toBe('YOUTH');
    });

    it('extracts member type LEADER', () => {
      const snapshot = createSnapshot(
        'Jane Doe 123456789 LEADER (21+) Eagle Scout Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members[0].type).toBe('LEADER');
    });

    it('extracts rank', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members[0].lastRankApproved).toBe('Life Scout');
    });

    it('extracts expiration date', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members[0].expirationDate).toBe('8/31/2026');
    });
  });
});
