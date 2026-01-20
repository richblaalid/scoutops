-- Add image_url column to bsa_ranks table
ALTER TABLE bsa_ranks ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN bsa_ranks.image_url IS 'URL to rank badge image';
