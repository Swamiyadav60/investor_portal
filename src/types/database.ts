export type UserRole = 'investor' | 'admin'
export type KioskStatus = 'active' | 'pending' | 'offline' | 'maintenance'
export type ExpenseType = 'variable' | 'fixed'
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled'
export type PaymentType = 'payout' | 'withdrawal' | 'investment'
export type KycStatus = 'pending' | 'verified' | 'rejected'
export type WaitlistStatus = 'pending' | 'approved' | 'rejected' | 'converted'

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
}

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
  created_by: string | null
  created_at: string
  kiosk?: Kiosk
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
