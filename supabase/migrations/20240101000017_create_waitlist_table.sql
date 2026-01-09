-- Waitlist / Early Access Request Table
-- Stores market research data from potential users

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Contact info
  email TEXT NOT NULL,
  name TEXT,

  -- Unit info
  unit_type TEXT, -- 'troop', 'pack', 'crew', 'ship', 'post', 'other'
  unit_size TEXT, -- '1-20', '21-50', '51-100', '100+'

  -- Current tools
  current_software TEXT, -- What they currently use for unit management
  current_payment_platform TEXT, -- What they use for payments

  -- Research
  biggest_pain_point TEXT,
  additional_info TEXT,

  -- Tracking
  referral_source TEXT, -- How they heard about us
  ip_address TEXT,
  user_agent TEXT
);

-- Create index on email for duplicate checking
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Create index on created_at for sorting
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- RLS: Allow public inserts (no auth required for waitlist)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Allow public waitlist submissions" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated admins can view (you'll query via Supabase dashboard or service role)
-- No SELECT policy for anon = they can't read back the data
