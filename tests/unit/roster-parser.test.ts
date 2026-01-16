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
    it('extracts a single position with number prefix', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Senior Patrol Leader Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Senior Patrol Leader');
      expect(members[0].position2).toBeNull();
    });

    it('extracts two numbered positions', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Senior Patrol Leader 2Den Chief Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Senior Patrol Leader');
      expect(members[0].position2).toBe('Den Chief');
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

    it('handles only position 2 (slot 1 empty)', () => {
      // This is the actual format from Scoutbook when someone only has a second position
      const snapshot = createSnapshot(
        'Ben Blaalid 141419860 YOUTH 11 Tenderfoot Blazing Bulls 2Den Chief Current 11/30/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      // When only slot 2 has a position, it becomes the primary position
      expect(members[0].position).toBe('Den Chief');
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

    it('handles Patrol Leader distinct from Senior Patrol Leader with numbers', () => {
      const snapshot = createSnapshot(
        'John Doe 123456789 YOUTH 14 Life Scout Flaring Phoenix 1Patrol Leader 2Den Chief Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Patrol Leader');
      expect(members[0].position2).toBe('Den Chief');
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

    it('handles both Assistant Scoutmaster and Committee Member', () => {
      const snapshot = createSnapshot(
        'Jane Smith 987654321 LEADER (21+) Eagle Scout unassigned 1Assistant Scoutmaster 2Committee Member Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Assistant Scoutmaster');
      expect(members[0].position2).toBe('Committee Member');
    });

    it('extracts positions for youth with Troop Guide and Instructor', () => {
      const snapshot = createSnapshot(
        'Ben Blaalid 111222333 YOUTH 16 Star Scout Blazing Bulls 1Troop Guide 2Instructor Current 8/31/2026'
      );
      const members = parseRosterPage(snapshot);

      expect(members).toHaveLength(1);
      expect(members[0].position).toBe('Troop Guide');
      expect(members[0].position2).toBe('Instructor');
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
