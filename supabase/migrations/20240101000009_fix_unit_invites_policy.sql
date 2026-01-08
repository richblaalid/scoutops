-- Fix the "Users can view own pending invites" policy
-- The previous policy tried to access auth.users which is not allowed

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view own pending invites" ON unit_invites;

-- Create a new policy that uses the profiles table instead
CREATE POLICY "Users can view own pending invites"
  ON unit_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    AND status = 'pending'
  );
