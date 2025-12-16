-- ============================================================
-- ADD VERIFICATION FIELDS TO DEMO_REQUESTS TABLE  
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- Add verification_token column
ALTER TABLE demo_requests 
ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Add verification_expires column  
ALTER TABLE demo_requests 
ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_demo_requests_verification_token 
ON demo_requests(verification_token);

-- Add new status option (if using enum)
-- Note: This might require manual update in Supabase UI if enum is strict