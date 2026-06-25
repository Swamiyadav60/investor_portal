-- ============================================================
-- 016 – Pending Installation Workflow
-- Adds new kiosk_status enum values and installation tracking
-- ============================================================

-- 1. Extend kiosk_status enum with new values
ALTER TYPE kiosk_status ADD VALUE IF NOT EXISTS 'pending_installation';
ALTER TYPE kiosk_status ADD VALUE IF NOT EXISTS 'suspended';

-- 2. Add installation tracking columns to kiosks
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS installed_by UUID REFERENCES investors(id);
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS printer_serial TEXT;

-- 3. Migrate existing 'pending' kiosks that have install_steps to 'pending_installation'
--    (Only safe to run AFTER the enum value exists — Postgres commits ADD VALUE immediately)
UPDATE kiosks
  SET status = 'pending_installation'
  WHERE status = 'pending'
    AND install_steps IS NOT NULL
    AND jsonb_array_length(install_steps) > 0;

-- 4. Create a convenience function: admin marks installation as complete
--    Transitions kiosk from pending_installation → active
CREATE OR REPLACE FUNCTION complete_installation(
  p_kiosk_id UUID,
  p_admin_id UUID,
  p_printer_serial TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE kiosks
  SET status         = 'active',
      installed_at   = NOW(),
      installed_by   = p_admin_id,
      printer_serial = COALESCE(p_printer_serial, printer_serial),
      is_online      = true,
      install_steps  = (
        SELECT jsonb_agg(
          jsonb_set(
            jsonb_set(elem, '{done}', 'true'::jsonb),
            '{active}', 'false'::jsonb
          )
        )
        FROM jsonb_array_elements(install_steps) AS elem
      )
  WHERE id     = p_kiosk_id
    AND status = 'pending_installation';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kiosk not found or not in pending_installation status';
  END IF;
END;
$$;
