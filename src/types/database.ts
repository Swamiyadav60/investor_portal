// ==============================
// ENUMS
// ==============================

export type UserRole =
  | "admin"
  | "branch"
  | "branch_owner"

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"

export type PaymentType =
  | "investment"
  | "payout"
  | "withdrawal"

export type ExpenseStatus =
  | "pending"
  | "approved"
  | "rejected"

export type ExpenseType =
  | "fixed"
  | "variable"

export type WaitlistStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "converted"

export type KycStatus =
  | "pending"
  | "verified"
  | "rejected"

export type BranchStatus =
  | "active"
  | "inactive"

export interface User {
  id: string

  email: string | null
  full_name: string | null
  phone: string | null

  upi_id: string | null

  wallet: number

  referral_code: string | null
  referral_code_input: string | null

  referred_by: string | null

  role?: UserRole
  branch_id?: string | null

  mobile_number: string | null

  pan_number: string | null

  aadhaar_number: string | null

  bank_account_holder: string | null

  bank_account_number: string | null

  bank_name: string | null

  ifsc_code: string | null

  // Added
  bank_account_type: string | null

  dob: string | null

  address: string | null

  state: string | null

  pincode: string | null

  kyc_status: KycStatus | null

  kyc_completed: boolean

  bank_completed: boolean

  profile_completed: boolean

  kyc_submitted_at: string | null

  created_at: string

  updated_at: string | null

  // Runtime-only fields (not database columns)
  city?: string | null
  gst?: string | null
  avatar_initials?: string | null

  notification_prefs?: NotificationPrefs | null

  user_role?: UserRoleRow | null
  user_kyc?: UserKyc | null
  profit_share: number | null
}
export interface UserRoleRow {
  id: string

  user_id: string

  role: UserRole

  branch_id: string | null
}
export interface UserKyc {
  id: string

  user_id: string

  mobile_number: string | null

  pan_number: string | null

  aadhaar_number: string | null

  dob: string | null

  address: string | null

  city: string | null

  state: string |null

  pincode: string | null

  bank_account_holder: string | null

  bank_account_number: string | null

  ifsc_code: string | null

  bank_name: string | null

  bank_account_type: string | null

  kyc_status: KycStatus

  kyc_submitted_at: string | null

  created_at: string

  updated_at: string
}
export interface NotificationPrefs {
  job_alerts: boolean
  daily_summary: boolean
  monthly_payout: boolean
  maintenance_alerts: boolean
  new_slots: boolean
}
// ==============================
// BRANCH
// ==============================

export interface Branch {
  id: string

  name: string

  location: string

  owner_id: string | null

  manager_id: string | null

  created_at: string

  price_per_page: number

  price_color: number

  is_active: boolean

  phone: string | null

  email: string | null

  address: string | null

  telegram_alerts_enabled: boolean

  telegram_chat_id: string | null

  in_charge_name: string | null

  primary_phone: string | null

  secondary_phone: string | null

  investment_amount: number

  type: string

  slots_total: number

  slots_taken: number

  avg_monthly_earnings: number

  tag: string | null

  tag_label: string | null

  image_url: string | null

  owner?: User

  manager?: User
  
}
export interface BranchDailyRevenue {
  total_jobs?: number

  total_revenue?: number
  branch_id: string

  branch_name: string | null

  revenue_date: string

  upi_jobs: number

  upi_revenue: number

  wallet_jobs: number

  wallet_amount: number

  created_at: string

  branch?: Branch
}
export interface BranchExpense {

  id: string

  branch_id: string

  expense_catalog_id: string | null

  expense_name: string | null

  category: string

  expense_type: ExpenseType

  amount: number

  period_start: string

  period_end: string

  period_type: string

  notes: string | null

  status: ExpenseStatus

  admin_remarks: string | null

  bill_url: string | null

  submitted_by: string | null

  approved_by: string | null

  approved_at: string | null

  rejected_at: string | null

  rejection_reason: string | null

  created_at: string

  branch?: Branch

  submitter?: User

  approver?: User
}
export interface ExpenseBreakdown {

  name: string

  color: string

  pct: number

}
export interface ExpenseCatalogItem {

  id: string

  name: string

  category: string

  default_amount: number

  expense_mode: "fixed" | "custom"

  description: string | null

  is_active: boolean

  created_at: string

}
// ==============================
// PAYMENT
// ==============================

export interface Payment {
  id: string

  user_id: string

  branch_id: string | null

  payment_type: PaymentType

  amount: number

  status: PaymentStatus

  razorpay_order_id: string | null

  razorpay_payment_id: string | null

  bank_account_number: string | null

  ifsc_code: string |null

  notes: string | null

  processed_at: string | null

  created_at: string

  updated_at: string

  user?: User

  branch?: Branch
}
// ==============================
// WAITLIST
// ==============================

export interface Waitlist {

  id: string

  user_id: string

  branch_id: string

  status: WaitlistStatus

  waitlist_type: "free" | "priority"

  queue_position: number | null

  razorpay_order_id: string | null

  razorpay_payment_id: string | null

  notes: string | null

  created_at: string

  updated_at: string

  user?: User

  branch?: Branch

}
// ==============================
// PRINTER
// ==============================

export interface Printer {

  id: string

  branch_id: string

  name: string

  model: string | null

  serial_number: string | null

  status: string

  last_seen: string | null

  created_at: string

  updated_at: string

  branch?: Branch

}
// ==============================
// PRINT JOB
// ==============================

export interface PrintJob {

  id: string

  printer_id: string

  branch_id: string

  user_id: string | null

  pages: number

  amount: number

  status: string

  created_at: string

  printer?: Printer

  branch?: Branch

  user?: User

}
// ==============================
// KYC DOCUMENT
// ==============================

export interface KycDocument {

  id: string

  user_id: string

  doc_type: string

  doc_name: string

  file_url: string | null

  status: string

  created_at: string

}
// =====================================
// DASHBOARD
// =====================================

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
// =====================================
// ADMIN KPI
// =====================================

export interface AdminKpis {

  total_branches: number

  available_slots: number

  free_waitlists: number

  priority_waitlists: number

  priority_waitlist_revenue: number

}
// =====================================
// BRANCH DASHBOARD
// =====================================

export interface BranchDashboardStats {

  revenue: number

  expenses: number

  jobs: number

  customers: number

  profit: number

}
// =====================================
// PERFORMANCE CHART
// =====================================

export interface PerformanceChartData {

  values: number[]

  labels: string[]

  label: string

}
// =====================================
// SIGNUP
// =====================================

export interface SignupFormData {

  fullName: string

  email: string

  phone: string

  password: string

  confirmPassword: string

}
// =====================================
// KYC
// =====================================

export interface KycFormData {

  panNumber: string

  aadhaarNumber: string

  dob: string

  address: string

  city: string

  state: string

  pincode: string

}
// =====================================
// BANK
// =====================================

export interface BankFormData {

  accountHolderName: string

  bankName: string

  accountNumber: string

  confirmAccountNumber: string

  ifscCode: string

  upiId: string

}
// =====================================
// ONBOARDING
// =====================================

export interface OnboardingFormData {

  fullName: string

  email: string

  phone: string

  kyc: KycFormData

  bank: BankFormData

}
export interface Withdrawal {

  id: string

  user_id: string

  amount: number

  status: "pending" | "approved" | "rejected"

  notes: string | null

  created_at: string

  updated_at: string

  user?: User

}