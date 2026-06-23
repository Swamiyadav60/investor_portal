-- Migration 013: Add profile completion flags and address fields
-- Run this in Supabase SQL Editor

-- 1. Add new columns to investors table (skip if already exists)
ALTER TABLE investors ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS kyc_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS bank_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

-- 2. Recreate the decrypted_investors view to include the new columns
CREATE OR REPLACE VIEW decrypted_investors WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  full_name,
  email,
  phone,
  city,
  pan,
  gst,
  role,
  profit_share,
  kyc_status,
  bank_name,
  bank_account,
  bank_ifsc,
  bank_account_type,
  upi_id,
  avatar_initials,
  notification_prefs,
  created_at,
  updated_at,
  mobile_number,
  decrypt_kyc_data(pan_number) AS pan_number,
  decrypt_kyc_data(aadhaar_number) AS aadhaar_number,
  bank_account_holder,
  bank_account_number,
  ifsc_code,
  kyc_submitted_at,
  dob,
  address,
  state,
  pincode,
  kyc_completed,
  bank_completed,
  profile_completed
FROM investors;

-- 3. Re-grant permissions on the view
GRANT SELECT ON decrypted_investors TO authenticated;
