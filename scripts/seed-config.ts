/**
 * Centralized configuration for BSA reference data seeding.
 *
 * This file defines which data files and version years to use
 * when seeding BSA reference data (ranks, merit badges, positions).
 *
 * To update the data version:
 * 1. Add new JSON files to the data/ directory
 * 2. Update the paths and versionYear below
 * 3. Run: npm run db:seed:bsa
 */

export const BSA_SEED_CONFIG = {
  /**
   * The version year for all BSA reference data.
   * This is used as the `version_year` on requirements
   * and `requirement_version_year` on ranks/badges.
   */
  versionYear: 2025,

  /**
   * Data file paths (relative to project root data/ directory)
   */
  files: {
    ranks: 'ranks-2025.json',
    meritBadges: 'merit-badges-source-v2.json',
    leadershipPositions: 'leadership-positions-2025.json',
  },

  /**
   * Bulk insert batch size.
   * Supabase recommends batches of 1000 or fewer rows.
   */
  batchSize: 500,
}

export type BsaSeedConfig = typeof BSA_SEED_CONFIG
