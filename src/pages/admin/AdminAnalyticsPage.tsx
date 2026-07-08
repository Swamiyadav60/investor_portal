import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import type { AdminKpis } from '@/types/database'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function AdminAnalyticsPage() {
  const [graphMetric, setGraphMetric]     = useState<'revenue' | 'profit'>('revenue')
  const [graphInterval, setGraphInterval] = useState<'monthly' | 'weekly'>('monthly')

  // ── All revenues ─────────────────────────────────────────────
  const { data: revenues = [] } = useQuery({
    queryKey: ['admin-all-revenues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .order('revenue_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // ── All expenses (approved only — matches investor reports) ─────
  const { data: expenses = [] } = useQuery({
    queryKey: ['admin-all-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'approved')
      if (error) throw error
      return data || []
    },
  })

  // ── Admin KPIs via RPC ────────────────────────────────────────
  const { data: adminKpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_kpis').single()

if (error) {
  const [branches, waitlists] = await Promise.all([
    supabase
      .from('branches')
      .select('slots_total, slots_taken'),

    supabase
      .from('branch_waitlist')
      .select('waitlist_type, razorpay_payment_id'),
  ])

  const branchData = branches.data || []
  const wlData = waitlists.data || []

  return {
  total_branches: branchData.length,

  available_slots: branchData.reduce(
    (s: number, c: any) =>
      s + (Number(c.slots_total ?? 0) - Number(c.slots_taken ?? 0)),
    0
  ),

  free_waitlists: wlData.filter(
    (w: any) => w.waitlist_type === 'free'
  ).length,

  priority_waitlists: wlData.filter(
    (w: any) => w.waitlist_type === 'priority'
  ).length,

  priority_waitlist_revenue:
    wlData.filter(
      (w: any) =>
        w.waitlist_type === 'priority' &&
        w.razorpay_payment_id
    ).length * 499,
} as AdminKpis
}

return data as AdminKpis
    },
  })

  // ── Platform totals ───────────────────────────────────────────
  const totalRevenue = revenues.reduce((s: number, r: any) => s + Number(r.upi_revenue ?? 0)+Number(r.wallet_amount ?? 0), 0)
  const totalExp     = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalProfit  = totalRevenue - totalExp
  const totalJobs    = revenues.reduce((s: number, r: any) => s + Number(r.upi_jobs ?? 0)+Number(r.wallet_jobs ?? 0), 0)

  // ── Chart data ────────────────────────────────────────────────
  const chartLabels = MONTHS_SHORT
  const chartValues = chartLabels.map((_, idx) => {
    const monthRevs = revenues.filter((r: any) => new Date(r.revenue_date).getMonth() === idx)
    const monthExps = expenses.filter((e: any) => new Date(e.expense_date).getMonth() === idx)
    const rev = monthRevs.reduce((s: number, r: any) => s + Number(r.upi_revenue ?? 0)+Number(r.wallet_amount ?? 0), 0)
    const exp = monthExps.reduce((s: number, e: any) => s + Number(e.amount), 0)
    return graphMetric === 'revenue' ? rev : rev - exp
  })

  return (
    <>
      <Topbar title="Analytics" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Platform analytics</div>
            <div className="section-heading-sub">Aggregate performance across all kiosks and investors</div>
          </div>
        </div>

        {/* Platform revenue KPIs */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(totalRevenue)}</div>
            <div className="rpt-kpi-lbl">Total platform revenue</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{fmt(totalProfit)}</div>
            <div className="rpt-kpi-lbl">Net platform profit</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(totalExp)}</div>
            <div className="rpt-kpi-lbl">Total expenses</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{totalJobs.toLocaleString('en-IN')}</div>
            <div className="rpt-kpi-lbl">Total print jobs</div>
          </div>
        </div>

        {/* Performance chart */}
        <PerformanceChart
          values={chartValues}
          labels={chartLabels}
          label="All kiosks · Platform"
          metric={graphMetric}
          interval={graphInterval}
          onMetricChange={setGraphMetric}
          onIntervalChange={setGraphInterval}
        />

        {/* Admin KPI stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Branches</div>
            <div className="stat-value">{loadingKpis ? '...' : adminKpis?.total_branches ?? '—'}</div>
            <div className="stat-sub">Locations registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Available Slots</div>
            <div className="stat-value">{loadingKpis ? '...' : adminKpis?.available_slots ?? '—'}</div>
            <div className="stat-sub">Ready for investment</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Free Waitlists</div>
            <div className="stat-value">{loadingKpis ? '...' : adminKpis?.free_waitlists ?? '—'}</div>
            <div className="stat-sub">Pending applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Priority Waitlists</div>
            <div className="stat-value">{loadingKpis ? '...' : adminKpis?.priority_waitlists ?? '—'}</div>
            <div className="stat-sub">Paid reservations</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Priority Revenue</div>
            <div className="stat-value">{loadingKpis ? '...' : fmt(adminKpis?.priority_waitlist_revenue ?? 0)}</div>
            <div className="stat-sub">From ₹499 reservations</div>
          </div>
        </div>
      </div>
    </>
  )
}