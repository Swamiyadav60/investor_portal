import type { College, ExpenseBreakdown, Kiosk, Payment, PrintJob } from '@/types/database'

export const DEMO_INVESTOR = {
  id: 'demo-investor',
  full_name: 'Rahul Sharma',
  email: 'rahul.sharma@gmail.com',
  phone: '+91 98765 43210',
  city: 'Hyderabad',
  pan: 'ABCDE1234F',
  gst: 'Not added',
  role: 'investor' as const,
  profit_share: 70,
  kyc_status: 'verified' as const,
  bank_name: 'HDFC Bank',
  bank_account: '•••• •••• 4821',
  bank_ifsc: 'HDFC0001234',
  bank_account_type: 'Savings',
  upi_id: 'rahul@hdfcbank',
  avatar_initials: 'RS',
  created_at: '2025-02-01',
}

export const DEMO_KIOSKS: Kiosk[] = [
  {
    id: 'p1', college_id: null, name: 'Printer 1', location: 'Madhapur IT Park',
    status: 'active', investment_amount: 25000, recovered_amount: 17200,
    monthly_earnings: 5145, total_earned: 17200, jobs_this_month: 1140,
    occupancy_rate: 84, install_steps: [], install_eta: null,
    installed_at: '2025-02-01', is_online: true, created_at: '2025-02-01', updated_at: '2025-06-01',
  },
  {
    id: 'p2', college_id: null, name: 'Printer 2', location: 'Kukatpally HB',
    status: 'active', investment_amount: 25000, recovered_amount: 14800,
    monthly_earnings: 4130, total_earned: 14800, jobs_this_month: 990,
    occupancy_rate: 72, install_steps: [], install_eta: null,
    installed_at: '2025-03-01', is_online: true, created_at: '2025-03-01', updated_at: '2025-06-01',
  },
  {
    id: 'p3', college_id: null, name: 'Printer 3', location: 'LB Nagar Junction',
    status: 'active', investment_amount: 25000, recovered_amount: 9800,
    monthly_earnings: 3290, total_earned: 9800, jobs_this_month: 940,
    occupancy_rate: 68, install_steps: [], install_eta: null,
    installed_at: '2025-05-01', is_online: true, created_at: '2025-05-01', updated_at: '2025-06-01',
  },
  {
    id: 'p4', college_id: null, name: 'Printer 4', location: 'Ameerpet Metro Station',
    status: 'pending', investment_amount: 25000, recovered_amount: 0,
    monthly_earnings: 0, total_earned: 0, jobs_this_month: 0,
    occupancy_rate: 0, install_eta: 'Est. Jul 18',
    install_steps: [
      { label: 'Slot purchased & payment confirmed', done: true },
      { label: 'Location survey completed', done: true },
      { label: 'Hardware shipped to site', done: false, active: true },
      { label: 'IoT setup & QR activation', done: false },
    ],
    installed_at: null, is_online: false, created_at: '2025-06-01', updated_at: '2025-06-01',
  },
]

export const DEMO_COLLEGES: College[] = [
  { id: 'c1', name: 'Secunderabad Station', location: "High-footfall transit hub · Sec'bad", city: 'Hyderabad', type: 'transit', slots_total: 4, slots_taken: 3, investment_amount: 25000, avg_monthly_earnings: 5600, tag: 'hot', tag_label: '🔥 Hot', is_active: true, created_at: '', updated_at: '' },
  { id: 'c2', name: 'JNTU College Gate', location: 'Engineering college cluster · Kukatpally', city: 'Hyderabad', type: 'college', slots_total: 3, slots_taken: 0, investment_amount: 22000, avg_monthly_earnings: 4800, tag: 'new', tag_label: 'New', is_active: true, created_at: '', updated_at: '' },
  { id: 'c3', name: 'Dilsukhnagar Market', location: 'Retail-dense commercial belt', city: 'Hyderabad', type: 'commercial', slots_total: 2, slots_taken: 1, investment_amount: 23000, avg_monthly_earnings: 4200, tag: 'limited', tag_label: '1 left', is_active: true, created_at: '', updated_at: '' },
  { id: 'c4', name: 'HITEC City Signal', location: 'Tech-worker commuter hotspot · Madhapur', city: 'Hyderabad', type: 'transit', slots_total: 3, slots_taken: 2, investment_amount: 26000, avg_monthly_earnings: 6100, tag: 'hot', tag_label: '🔥 Hot', is_active: true, created_at: '', updated_at: '' },
  { id: 'c5', name: 'Osmania University', location: 'Large campus, heavy print demand', city: 'Hyderabad', type: 'college', slots_total: 4, slots_taken: 1, investment_amount: 21000, avg_monthly_earnings: 5100, tag: 'new', tag_label: 'New', is_active: true, created_at: '', updated_at: '' },
  { id: 'c6', name: 'Mehdipatnam Bus Stand', location: 'High-density commuter stop · SW Hyd', city: 'Hyderabad', type: 'transit', slots_total: 3, slots_taken: 1, investment_amount: 22000, avg_monthly_earnings: 4500, tag: 'limited', tag_label: '2 left', is_active: true, created_at: '', updated_at: '' },
]

export const PRINTER_DATA: Record<string, {
  label: string
  investment: number
  recovered: number
  occ: string
  monthly: { revenue: number[]; varExp: number[]; fixExp: number[]; jobs: number[] }
  weekly: { revenue: number[]; varExp: number[]; fixExp: number[]; jobs: number[] }
  varBreakdown: ExpenseBreakdown[]
  fixBreakdown: ExpenseBreakdown[]
}> = {
  all: {
    label: 'All Printers',
    investment: 75000, recovered: 41800, occ: '78%',
    monthly: {
      revenue: [21000,22500,24000,23500,25000,26500,25800,27000,28500,27200,29000,31000],
      varExp: [4200,4500,4800,4700,5000,5300,5160,5400,5700,5440,5800,6200],
      fixExp: [6500,6500,6500,6500,6500,6500,6500,6500,6500,6500,6500,6500],
      jobs: [2100,2200,2350,2280,2480,2600,2540,2650,2800,2680,2850,3050],
    },
    weekly: {
      revenue: [6200,6800,7100,6900,7400,7800,7600,8100],
      varExp: [1240,1360,1420,1380,1480,1560,1520,1620],
      fixExp: [1625,1625,1625,1625,1625,1625,1625,1625],
      jobs: [620,670,700,685,735,775,755,800],
    },
    varBreakdown: [{ name: 'Paper', color: '#1A9B6C', pct: 55 }, { name: 'Toner / Ink', color: '#127A54', pct: 28 }, { name: 'Drum', color: '#0A5238', pct: 17 }],
    fixBreakdown: [{ name: 'Rent', color: '#E8891A', pct: 60 }, { name: 'Power bill', color: '#C87215', pct: 25 }, { name: 'Maintenance', color: '#A05C10', pct: 15 }],
  },
  p1: {
    label: 'Printer 1 — Madhapur IT Park', investment: 25000, recovered: 17200, occ: '84%',
    monthly: { revenue: [8200,8700,9100,8900,9500,9800,9600,10100,10500,10200,10800,11500], varExp: [1640,1740,1820,1780,1900,1960,1920,2020,2100,2040,2160,2300], fixExp: [2200,2200,2200,2200,2200,2200,2200,2200,2200,2200,2200,2200], jobs: [820,860,900,880,940,970,955,1000,1040,1010,1070,1140] },
    weekly: { revenue: [2400,2600,2700,2650,2800,2900,2850,3050], varExp: [480,520,540,530,560,580,570,610], fixExp: [550,550,550,550,550,550,550,550], jobs: [240,258,268,263,278,288,283,302] },
    varBreakdown: [{ name: 'Paper', color: '#1A9B6C', pct: 53 }, { name: 'Toner / Ink', color: '#127A54', pct: 30 }, { name: 'Drum', color: '#0A5238', pct: 17 }],
    fixBreakdown: [{ name: 'Rent', color: '#E8891A', pct: 62 }, { name: 'Power bill', color: '#C87215', pct: 23 }, { name: 'Maintenance', color: '#A05C10', pct: 15 }],
  },
  p2: {
    label: 'Printer 2 — Kukatpally HB', investment: 25000, recovered: 14800, occ: '72%',
    monthly: { revenue: [7100,7500,7900,7800,8200,8800,8500,8900,9200,8900,9400,10000], varExp: [1420,1500,1580,1560,1640,1760,1700,1780,1840,1780,1880,2000], fixExp: [2100,2100,2100,2100,2100,2100,2100,2100,2100,2100,2100,2100], jobs: [710,745,780,770,815,870,845,885,915,885,935,990] },
    weekly: { revenue: [2100,2300,2400,2350,2550,2700,2650,2800], varExp: [420,460,480,470,510,540,530,560], fixExp: [525,525,525,525,525,525,525,525], jobs: [210,228,238,233,253,268,263,278] },
    varBreakdown: [{ name: 'Paper', color: '#1A9B6C', pct: 57 }, { name: 'Toner / Ink', color: '#127A54', pct: 26 }, { name: 'Drum', color: '#0A5238', pct: 17 }],
    fixBreakdown: [{ name: 'Rent', color: '#E8891A', pct: 58 }, { name: 'Power bill', color: '#C87215', pct: 27 }, { name: 'Maintenance', color: '#A05C10', pct: 15 }],
  },
  p3: {
    label: 'Printer 3 — LB Nagar Junction', investment: 25000, recovered: 9800, occ: '68%',
    monthly: { revenue: [5700,6300,6900,6800,7300,7900,7700,8000,8800,8100,8800,9500], varExp: [1140,1260,1380,1360,1460,1580,1540,1600,1760,1620,1760,1900], fixExp: [2200,2200,2200,2200,2200,2200,2200,2200,2200,2200,2200,2200], jobs: [570,623,680,670,720,780,760,790,870,800,870,940] },
    weekly: { revenue: [1700,1900,2000,1900,2050,2200,2100,2250], varExp: [340,380,400,380,410,440,420,450], fixExp: [550,550,550,550,550,550,550,550], jobs: [170,188,198,188,203,218,208,223] },
    varBreakdown: [{ name: 'Paper', color: '#1A9B6C', pct: 54 }, { name: 'Toner / Ink', color: '#127A54', pct: 29 }, { name: 'Drum', color: '#0A5238', pct: 17 }],
    fixBreakdown: [{ name: 'Rent', color: '#E8891A', pct: 61 }, { name: 'Power bill', color: '#C87215', pct: 24 }, { name: 'Maintenance', color: '#A05C10', pct: 15 }],
  },
}

export const DEMO_PAYOUTS: Payment[] = [
  { id: '1', investor_id: 'demo', amount: 12565, status: 'pending', payment_type: 'payout', razorpay_order_id: null, razorpay_payment_id: null, razorpay_signature: null, bank_account: 'HDFC ••••4821', period_month: 'Jun 2026', kiosk_breakdown: { p1: 5145, p2: 4130, p3: 3290 }, processed_at: null, notes: null, created_at: '2026-06-01', updated_at: '2026-06-01' },
  { id: '2', investor_id: 'demo', amount: 11956, status: 'paid', payment_type: 'payout', razorpay_order_id: null, razorpay_payment_id: null, razorpay_signature: null, bank_account: 'HDFC ••••4821', period_month: 'May 2026', kiosk_breakdown: { p1: 4914, p2: 3920, p3: 3122 }, processed_at: '2026-06-01', notes: null, created_at: '2026-05-01', updated_at: '2026-06-01' },
  { id: '3', investor_id: 'demo', amount: 11522, status: 'paid', payment_type: 'payout', razorpay_order_id: null, razorpay_payment_id: null, razorpay_signature: null, bank_account: 'HDFC ••••4821', period_month: 'Apr 2026', kiosk_breakdown: { p1: 4788, p2: 3864, p3: 2870 }, processed_at: '2026-05-01', notes: null, created_at: '2026-04-01', updated_at: '2026-05-01' },
]

export const DOC_TYPES = ['B.Tech Exam Notes', 'Aadhar Copy', 'Resume (2pg)', 'Railway Ticket', 'Mark Sheet', 'Project Report', 'CV (1pg)', 'Legal Notice', 'Prescription', 'Assignment']

export const PRINTER_COLORS: Record<string, string> = { p1: '#1A9B6C', p2: '#E8891A', p3: '#4A80E8' }

export function makeDemoJob(kioskId: string): PrintJob {
  const pages = Math.ceil(Math.random() * 6)
  return {
    id: crypto.randomUUID(),
    kiosk_id: kioskId,
    doc_type: DOC_TYPES[Math.floor(Math.random() * DOC_TYPES.length)],
    pages,
    amount: pages * (Math.random() < 0.5 ? 5 : 6),
    status: 'completed',
    created_at: new Date().toISOString(),
  }
}
