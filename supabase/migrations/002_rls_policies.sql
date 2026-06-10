-- Row Level Security Policies

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Helper: get current investor id
CREATE OR REPLACE FUNCTION get_my_investor_id()
RETURNS UUID AS $$
  SELECT id FROM investors WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM investors WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get investor's kiosk ids
CREATE OR REPLACE FUNCTION get_my_kiosk_ids()
RETURNS SETOF UUID AS $$
  SELECT kiosk_id FROM investor_kiosks
  WHERE investor_id = get_my_investor_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- INVESTORS policies
CREATE POLICY "Users can view own profile"
  ON investors FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON investors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own investor profile"
  ON investors FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all investors"
  ON investors FOR ALL
  USING (is_admin());

-- COLLEGES policies
CREATE POLICY "Anyone authenticated can view active colleges"
  ON colleges FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active = true OR is_admin()));

CREATE POLICY "Admins can manage colleges"
  ON colleges FOR ALL
  USING (is_admin());

-- KIOSKS policies
CREATE POLICY "Investors can view assigned kiosks"
  ON kiosks FOR SELECT
  USING (
    is_admin() OR
    id IN (SELECT get_my_kiosk_ids()) OR
    status = 'pending'
  );

CREATE POLICY "Admins can manage kiosks"
  ON kiosks FOR ALL
  USING (is_admin());

-- INVESTOR_KIOSKS policies
CREATE POLICY "Investors can view own assignments"
  ON investor_kiosks FOR SELECT
  USING (investor_id = get_my_investor_id() OR is_admin());

CREATE POLICY "Admins can manage assignments"
  ON investor_kiosks FOR ALL
  USING (is_admin());

-- REVENUES policies
CREATE POLICY "Investors can view revenue for their kiosks"
  ON revenues FOR SELECT
  USING (kiosk_id IN (SELECT get_my_kiosk_ids()) OR is_admin());

CREATE POLICY "Admins can manage revenues"
  ON revenues FOR ALL
  USING (is_admin());

-- EXPENSES policies
CREATE POLICY "Investors can view expenses for their kiosks"
  ON expenses FOR SELECT
  USING (kiosk_id IN (SELECT get_my_kiosk_ids()) OR is_admin());

CREATE POLICY "Admins can manage expenses"
  ON expenses FOR ALL
  USING (is_admin());

-- PAYMENTS policies
CREATE POLICY "Investors can view own payments"
  ON payments FOR SELECT
  USING (investor_id = get_my_investor_id() OR is_admin());

CREATE POLICY "Investors can request withdrawals"
  ON payments FOR INSERT
  WITH CHECK (
    investor_id = get_my_investor_id() AND
    payment_type IN ('withdrawal', 'investment')
  );

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_admin());

-- WAITLISTS policies
CREATE POLICY "Investors can view own waitlists"
  ON waitlists FOR SELECT
  USING (investor_id = get_my_investor_id() OR is_admin());

CREATE POLICY "Investors can join waitlists"
  ON waitlists FOR INSERT
  WITH CHECK (investor_id = get_my_investor_id());

CREATE POLICY "Admins can manage waitlists"
  ON waitlists FOR ALL
  USING (is_admin());

-- KYC DOCUMENTS policies
CREATE POLICY "Investors can view own KYC docs"
  ON kyc_documents FOR SELECT
  USING (investor_id = get_my_investor_id() OR is_admin());

CREATE POLICY "Investors can upload KYC docs"
  ON kyc_documents FOR INSERT
  WITH CHECK (investor_id = get_my_investor_id());

CREATE POLICY "Admins can manage KYC docs"
  ON kyc_documents FOR ALL
  USING (is_admin());

-- PRINT JOBS policies
CREATE POLICY "Investors can view jobs for their kiosks"
  ON print_jobs FOR SELECT
  USING (kiosk_id IN (SELECT get_my_kiosk_ids()) OR is_admin());

CREATE POLICY "Admins can manage print jobs"
  ON print_jobs FOR ALL
  USING (is_admin());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE revenues;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE kiosks;
