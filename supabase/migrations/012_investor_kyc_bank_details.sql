-- Migration 012: Add Investor KYC and Bank Details with Encryption & RLS
-- Enable pgcrypto for symmetric encryption/decryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Update the investors table with new columns if they do not exist
ALTER TABLE investors ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
-- Note: bank_name is already present in investors from 001_initial_schema.sql.
-- Let's make sure it is TEXT.
ALTER TABLE investors ALTER COLUMN bank_name TYPE TEXT;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create Encryption/Decryption utility functions
-- We use pgp_sym_encrypt and pgp_sym_decrypt with a secure key.
-- Using SECURITY DEFINER so that these functions execute with schema owner privileges.
CREATE OR REPLACE FUNCTION encrypt_kyc_data(plaintext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plaintext, 'vprint_kyc_secret_key_2026'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_kyc_data(ciphertext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(ciphertext, 'hex'), 'vprint_kyc_secret_key_2026');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger to automatically encrypt sensitive columns before insert/update
CREATE OR REPLACE FUNCTION encrypt_investor_kyc_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Encrypt PAN if it's updated or inserted and is not null
  IF (TG_OP = 'INSERT' AND NEW.pan_number IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.pan_number IS DISTINCT FROM OLD.pan_number) THEN
    NEW.pan_number = encrypt_kyc_data(NEW.pan_number);
  END IF;

  -- Encrypt Aadhaar if it's updated or inserted and is not null
  IF (TG_OP = 'INSERT' AND NEW.aadhaar_number IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.aadhaar_number IS DISTINCT FROM OLD.aadhaar_number) THEN
    NEW.aadhaar_number = encrypt_kyc_data(NEW.aadhaar_number);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER encrypt_investor_kyc_before_save
  BEFORE INSERT OR UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION encrypt_investor_kyc_trigger();

-- 4. Trigger to prevent updates to KYC/bank details after submission (non-admins)
CREATE OR REPLACE FUNCTION check_investor_kyc_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins can view and manage all investor records (allowed to update)
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- If KYC was already submitted (OLD.kyc_submitted_at is NOT NULL)
  -- prevent any updates to the sensitive columns
  IF OLD.kyc_submitted_at IS NOT NULL THEN
    IF NEW.mobile_number IS DISTINCT FROM OLD.mobile_number OR
       NEW.pan_number IS DISTINCT FROM OLD.pan_number OR
       NEW.aadhaar_number IS DISTINCT FROM OLD.aadhaar_number OR
       NEW.bank_account_holder IS DISTINCT FROM OLD.bank_account_holder OR
       NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number OR
       NEW.ifsc_code IS DISTINCT FROM OLD.ifsc_code OR
       NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN
      RAISE EXCEPTION 'KYC and bank details cannot be updated after submission. Please contact support.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_investor_kyc_immutability
  BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION check_investor_kyc_immutable();

-- 5. Create a secure view that decrypts sensitive data
-- Defined with security_invoker = true so that RLS policies are applied when querying this view
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
  kyc_submitted_at
FROM investors;

-- 6. Permissions for decrypted_investors view
GRANT SELECT ON decrypted_investors TO authenticated;
