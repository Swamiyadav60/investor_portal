-- VPrint Investor Portal - Initial Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('investor', 'admin');
CREATE TYPE kiosk_status AS ENUM ('active', 'pending', 'offline', 'maintenance');
CREATE TYPE expense_type AS ENUM ('variable', 'fixed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE payment_type AS ENUM ('payout', 'withdrawal', 'investment');
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE waitlist_status AS ENUM ('pending', 'approved', 'rejected', 'converted');

-- Investors table (linked to auth.users)
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  pan TEXT,
  gst TEXT,
  role user_role NOT NULL DEFAULT 'investor',
  profit_share DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_account_type TEXT DEFAULT 'Savings',
  upi_id TEXT,
  avatar_initials TEXT,
  notification_prefs JSONB DEFAULT '{"job_alerts":false,"daily_summary":true,"monthly_payout":true,"maintenance_alerts":true,"new_slots":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colleges / locations
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  type TEXT NOT NULL DEFAULT 'college', -- college, transit, commercial
  slots_total INTEGER NOT NULL DEFAULT 1,
  slots_taken INTEGER NOT NULL DEFAULT 0,
  investment_amount DECIMAL(12,2) NOT NULL DEFAULT 25000,
  avg_monthly_earnings DECIMAL(12,2) NOT NULL DEFAULT 5000,
  tag TEXT DEFAULT 'new', -- hot, new, limited
  tag_label TEXT DEFAULT 'New',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kiosks (printers)
CREATE TABLE kiosks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status kiosk_status NOT NULL DEFAULT 'pending',
  investment_amount DECIMAL(12,2) NOT NULL DEFAULT 25000,
  recovered_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  jobs_this_month INTEGER NOT NULL DEFAULT 0,
  occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  install_steps JSONB DEFAULT '[]'::jsonb,
  install_eta TEXT,
  installed_at TIMESTAMPTZ,
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Investor-Kiosk assignments
CREATE TABLE investor_kiosks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(investor_id, kiosk_id)
);

-- Revenue records
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  print_jobs INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, weekly, daily
  notes TEXT,
  created_by UUID REFERENCES investors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense records
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL, -- Paper, Toner/Ink, Drum, Rent, Power bill, Maintenance
  expense_type expense_type NOT NULL DEFAULT 'variable',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  notes TEXT,
  created_by UUID REFERENCES investors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (payouts, withdrawals, investments)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type payment_type NOT NULL DEFAULT 'payout',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  bank_account TEXT,
  period_month TEXT,
  kiosk_breakdown JSONB,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlists for investment slots
CREATE TABLE waitlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  status waitlist_status NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KYC documents
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Live print jobs (for realtime feed)
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_id UUID NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_investors_user_id ON investors(user_id);
CREATE INDEX idx_investor_kiosks_investor ON investor_kiosks(investor_id);
CREATE INDEX idx_investor_kiosks_kiosk ON investor_kiosks(kiosk_id);
CREATE INDEX idx_revenues_kiosk ON revenues(kiosk_id);
CREATE INDEX idx_revenues_period ON revenues(period_start, period_end);
CREATE INDEX idx_expenses_kiosk ON expenses(kiosk_id);
CREATE INDEX idx_expenses_period ON expenses(period_start, period_end);
CREATE INDEX idx_payments_investor ON payments(investor_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_waitlists_investor ON waitlists(investor_id);
CREATE INDEX idx_print_jobs_kiosk ON print_jobs(kiosk_id);
CREATE INDEX idx_print_jobs_created ON print_jobs(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investors_updated_at BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER colleges_updated_at BEFORE UPDATE ON colleges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER kiosks_updated_at BEFORE UPDATE ON kiosks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER waitlists_updated_at BEFORE UPDATE ON waitlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create investor profile on signup (see 004_fix_signup_trigger.sql for grants/policies)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.investors (user_id, full_name, email, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
