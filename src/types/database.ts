export type UserRole = 'investor' | 'branch_ambassador' | 'admin'
export type KioskStatus = 'active' | 'pending' | 'pending_installation' | 'offline' | 'maintenance' | 'suspended'
export type ExpenseType = 'variable' | 'fixed'
/**
 * Expense approval workflow statuses.
 *   pending  – submitted by Branch Ambassador, awaiting admin review.
 *   approved – admin has approved; counts in investor P&L reports.
 *   rejected – admin has rejected; does NOT count in reports.
 */
export type ExpenseStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled'
export type PaymentType = 'payout' | 'withdrawal' | 'investment'
export type KycStatus = 'pending' | 'verified' | 'rejected' | 'unverified'
export type WaitlistStatus = 'pending' | 'approved' | 'rejected' | 'converted'

export interface AdminKpis {
  total_colleges: number
  available_slots: number
  free_waitlists: number
  priority_waitlists: number
  priority_waitlist_revenue: number
}


export interface NotificationPrefs {
  job_alerts: boolean
  daily_summary: boolean
  monthly_payout: boolean
  maintenance_alerts: boolean
  new_slots: boolean
}

export interface Investor {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  city: string | null
  pan: string | null
  gst: string | null
  role: UserRole
  assigned_college_id: string | null
  profit_share: number
  kyc_status: KycStatus
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  bank_account_type: string | null
  upi_id: string | null
  avatar_initials: string | null
  notification_prefs: NotificationPrefs
  created_at: string
  updated_at: string
  // KYC and Bank columns (from migration 012)
  mobile_number: string | null
  pan_number: string | null
  aadhaar_number: string | null
  bank_account_holder: string | null
  bank_account_number: string | null
  ifsc_code: string | null
  kyc_submitted_at: string | null
  // Profile completion columns (from migration 013)
  dob: string | null
  address: string | null
  state: string | null
  pincode: string | null
  kyc_completed: boolean
  bank_completed: boolean
  profile_completed: boolean
}

// --- Signup Flow Interfaces ---

export interface SignupFormData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export interface KycFormData {
  panNumber: string
  aadhaarNumber: string
  dob: string
  address: string
  city: string
  state: string
  pincode: string
}

export interface BankFormData {
  accountHolderName: string
  bankName: string
  accountNumber: string
  confirmAccountNumber: string
  ifscCode: string
  upiId: string
}

export interface OnboardingFormData {
  fullName: string
  email: string
  phone: string
  kyc: KycFormData
  bank: BankFormData
}

// --- Existing Interfaces (unchanged) ---

export interface College {
  id: string
  name: string
  location: string
  city: string
  type: string
  slots_total: number
  slots_taken: number
  investment_amount: number
  avg_monthly_earnings: number
  tag: string
  tag_label: string
  is_active: boolean
  created_at: string
  updated_at: string
  image_url: string | null
}

export interface Kiosk {
  id: string
  college_id: string | null
  name: string
  location: string
  status: KioskStatus
  investment_amount: number
  recovered_amount: number
  monthly_earnings: number
  total_earned: number
  jobs_this_month: number
  occupancy_rate: number
  install_steps: InstallStep[]
  install_eta: string | null
  installed_at: string | null
  is_online: boolean
  branch_ambassador_id?: string | null
  installation_date?: string | null
  installed_by?: string | null
  printer_serial?: string | null
  created_at: string
  updated_at: string
  college?: College
}

export interface InstallStep {
  label: string
  done: boolean
  active?: boolean
}

export interface InvestorKiosk {
  id: string
  investor_id: string
  kiosk_id: string
  assigned_at: string
  status: string
  kiosk?: Kiosk
  investor?: Investor
}

export interface Revenue {
  id: string
  kiosk_id: string
  amount: number
  print_jobs: number
  period_start: string
  period_end: string
  period_type: string
  notes: string | null
  created_by: string | null
  created_at: string
  kiosk?: Kiosk
}

export interface Expense {
  id: string
  kiosk_id: string
  amount: number
  category: string
  expense_type: ExpenseType
  period_start: string
  period_end: string
  period_type: string
  notes: string | null

  // ── Approval workflow ─────────────────────────────────────────
  /** pending | approved | rejected. Default: 'pending' */
  status: ExpenseStatus
  /** The investor (branch ambassador or admin) who submitted this expense */
  submitted_by: string | null
  /** Admin who approved or rejected */
  approved_by: string | null
  approved_at: string | null
  /** Set when admin rejects */
  rejected_at: string | null
  /** Human-readable reason shown to the ambassador */
  rejection_reason: string | null
  /** Old field: same as rejection_reason, kept for backward compat */
  admin_remarks: string | null
  /** URL to uploaded bill/receipt image in Supabase Storage */
  bill_url: string | null

  // ── Audit ─────────────────────────────────────────────────────
  /** The investor id who inserted the row (may differ from submitted_by for admin-created rows) */
  created_by: string | null
  created_at: string

  // ── Relations (joined) ────────────────────────────────────────
  kiosk?: Kiosk
  /** Joined from investors table via submitted_by FK */
  submitted_by_investor?: Pick<Investor, 'id' | 'full_name' | 'email'>
}

export interface Payment {
  id: string
  investor_id: string
  amount: number
  status: PaymentStatus
  payment_type: PaymentType
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  bank_account: string | null
  period_month: string | null
  kiosk_breakdown: Record<string, number> | null
  processed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  investor?: Investor
}

export interface Waitlist {
  id: string
  investor_id: string
  college_id: string
  status: WaitlistStatus
  waitlist_type: 'free' | 'priority'
  queue_position: number | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  college?: College
  investor?: Investor
}

export interface KycDocument {
  id: string
  investor_id: string
  doc_type: string
  doc_name: string
  file_url: string | null
  status: string
  created_at: string
}

export interface PrintJob {
  id: string
  kiosk_id: string
  doc_type: string
  pages: number
  amount: number
  status: string
  created_at: string
  kiosk?: Kiosk
}

export interface DashboardStats {
  revenue: number
  expenses: number
  variableExpenses: number
  fixedExpenses: number
  netProfit: number
  investorProfit: number
  revenueDelta: number
  profitDelta: number
  avg3Profit: number
  avg3Delta: number
  jobs: number
  jobsPrev: number
  occupancy: number
  investment: number
  recovered: number
}

export interface ExpenseBreakdown {
  name: string
  color: string
  pct: number
}
