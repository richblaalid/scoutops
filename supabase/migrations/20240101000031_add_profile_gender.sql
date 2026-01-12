-- Add gender field to profiles table
-- Used for auto-assigning leaders to sections in coed troops

ALTER TABLE profiles
ADD COLUMN gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.gender IS 'Used for auto-assigning members to boys/girls sections in coed troops';
