import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DashboardStats } from '@/types/database'

const PROFIT_SHARE = 70 // Fixed platform-wide profit share (no per-investor column in new schema)

export function useDashboardData(
  investorId: string | undefined,
  kioskId: string,
  period: 'monthly' | 'weekly'
) {
  return useQuery({
    queryKey: ['dashboard', investorId, kioskId, period],
    queryFn: () => fetchLiveStats(investorId, kioskId, period),
    enabled: !!investorId,
    refetchInterval: 30000,
  })
}

// ─── Period helpers ────────────────────────────────────────────────────────────

function getPeriodBounds(period: 'monthly' | 'weekly') {
  const now = new Date()

  if (period === 'monthly') {
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const currStart = `${year}-${String(month).padStart(2, '0')}-01`

    const lastDay = new Date(year, month, 0).getDate()
    const currEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`

    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()
    const prevEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`

    return {
      currStart,
      currEnd,
      prevStart,
      prevEnd,
    }
  } else {
    // Current week: last 7 days
    const currStart = new Date(now.getTime() - 7 * 86400000)
    const currEnd = now

    // Previous week: 8–14 days ago
    const prevStart = new Date(now.getTime() - 14 * 86400000)
    const prevEnd = new Date(now.getTime() - 7 * 86400000)

    return {
      currStart: currStart.toISOString().split('T')[0],
      currEnd: currEnd.toISOString().split('T')[0],
      prevStart: prevStart.toISOString().split('T')[0],
      prevEnd: prevEnd.toISOString().split('T')[0],
    }
  }
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return 0
  return ((curr - prev) / Math.abs(prev)) * 100
}

// ─── Empty stats ───────────────────────────────────────────────────────────────

const EMPTY_STATS: DashboardStats = {
  revenue: 0,
  expenses: 0,
  variableExpenses: 0,
  fixedExpenses: 0,
  netProfit: 0,
  investorProfit: 0,
  revenueDelta: 0,
  profitDelta: 0,
  avg3Profit: 0,
  avg3Delta: 0,
  jobs: 0,
  jobsPrev: 0,
  occupancy: 0,
  investment: 0,
  recovered: 0,
}

// ─── Main fetch ────────────────────────────────────────────────────────────────

async function fetchLiveStats(
  investorId: string | undefined,
  branchId: string,
  period: 'monthly' | 'weekly'
): Promise<DashboardStats> {

  // 1. Resolve which branches this investor owns
  const { data: ownedBranches } = await supabase
    .from('branches')
    .select('id')
    .eq('owner_id', investorId)

  const branchIds = ownedBranches?.map(b => b.id) || []
  if (!branchIds.length) return EMPTY_STATS

  const branchFilter = branchId !== 'all' ? branchId : undefined
  const { currStart, currEnd, prevStart, prevEnd } = getPeriodBounds(period)

  // 2. Build current + previous period queries
  let currRevQ = supabase
    .from('branch_daily_revenue')
    .select('upi_revenue, wallet_amount, upi_jobs, wallet_jobs, branch_id')
    .gte('revenue_date', currStart)
    .lte('revenue_date', currEnd)
    .in('branch_id', branchIds)

  let currExpQ = supabase
    .from('branch_expenses')
    .select('amount, expense_type')
    .gte('period_start', currStart)
    .lte('period_start', currEnd)
    .eq('status', 'approved')
    .in('branch_id', branchIds)

  let prevRevQ = supabase
    .from('branch_daily_revenue')
    .select('upi_revenue, wallet_amount')
    .gte('revenue_date', prevStart)
    .lte('revenue_date', prevEnd)
    .in('branch_id', branchIds)

  let prevExpQ = supabase
    .from('branch_expenses')
    .select('amount, expense_type')
    .gte('period_start', prevStart)
    .lte('period_start', prevEnd)
    .eq('status', 'approved')
    .in('branch_id', branchIds)

  if (branchFilter) {
    currRevQ = currRevQ.eq('branch_id', branchFilter)
    currExpQ = currExpQ.eq('branch_id', branchFilter)
    prevRevQ = prevRevQ.eq('branch_id', branchFilter)
    prevExpQ = prevExpQ.eq('branch_id', branchFilter)
  }

  // 3. Investment + payouts (not period-scoped)
  let branchesQ = supabase
    .from('branches')
    .select('investment_amount')
    .in('id', branchIds)

  if (branchFilter) {
    branchesQ = branchesQ.eq('id', branchFilter)
  }

  const allRevenueQ = supabase
    .from('branch_daily_revenue')
    .select('upi_revenue, wallet_amount')
    .in('branch_id', branchFilter ? [branchFilter] : branchIds)

  const allExpenseQ = supabase
    .from('branch_expenses')
    .select('amount')
    .eq('status', 'approved')
    .in('branch_id', branchFilter ? [branchFilter] : branchIds)

  // 4. Fire all queries in parallel
  const [
    { data: currRevenues },
    { data: currExpenses },
    { data: prevRevenues },
    { data: prevExpenses },
    { data: branches },
    { data: allRevenues },
    { data: allExpenses },
  ] = await Promise.all([
    currRevQ,
    currExpQ,
    prevRevQ,
    prevExpQ,
    branchesQ,
    allRevenueQ,
    allExpenseQ,
  ])

  const revenueOf = (r: { upi_revenue: number | null; wallet_amount: number | null }) =>
    Number(r.upi_revenue || 0) + Number(r.wallet_amount || 0)
  const jobsOf = (r: { upi_jobs: number | null; wallet_jobs: number | null }) =>
    Number(r.upi_jobs || 0) + Number(r.wallet_jobs || 0)

  // 5. Current period totals
  const revenue = currRevenues?.reduce((s, r) => s + revenueOf(r), 0) || 0
  const variableExpenses = currExpenses?.filter(e => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const fixedExpenses = currExpenses?.filter(e => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  const netProfit = revenue - variableExpenses - fixedExpenses
  const profitShare = PROFIT_SHARE
  const investorProfit = netProfit * (profitShare / 100)

  // 6. Previous period totals
  const prevRevenue = prevRevenues?.reduce((s, r) => s + revenueOf(r), 0) || 0
  const prevVarExp = prevExpenses?.filter(e => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const prevFixExp = prevExpenses?.filter(e => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  const prevNetProfit = prevRevenue - prevVarExp - prevFixExp

  // 7. Investment recovery
  const investment = branches?.reduce(
    (s, b) => s + Number(b.investment_amount || 0),
    0
  ) || 0

  const lifetimeRevenue = allRevenues?.reduce((sum, r) => sum + revenueOf(r), 0) || 0
  const lifetimeExpenses = allExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const lifetimeNetProfit = lifetimeRevenue - lifetimeExpenses
  const recovered = lifetimeNetProfit * (profitShare / 100)

  // 8. Jobs + occupancy
  const jobs = currRevenues?.reduce((s, r) => s + jobsOf(r), 0) || 0
  const occupancy = jobs > 0 ? Math.min(Math.round((jobs / 1000) * 100), 100) : 0

  return {
    revenue,
    expenses: variableExpenses + fixedExpenses,
    variableExpenses,
    fixedExpenses,
    netProfit,
    investorProfit,
    revenueDelta: pctDelta(revenue, prevRevenue),
    profitDelta: pctDelta(netProfit, prevNetProfit),
    avg3Profit: netProfit, // extend with real 3-month avg query if needed
    avg3Delta: 0,
    jobs,
    jobsPrev: 0,
    occupancy,
    investment,
    recovered,
  }
}

// ─── Chart data ────────────────────────────────────────────────────────────────

export function useChartData(
  investorId: string | undefined,
  kioskId: string,
  interval: 'monthly' | 'weekly',
  metric: 'revenue' | 'profit'
) {
  return useQuery({
    queryKey: ['chart-data', kioskId, interval, metric],
    queryFn: async () => {
      const { data: ownedBranches } = await supabase
        .from('branches')
        .select('id')
        .eq('owner_id', investorId)

      const branchIds = ownedBranches?.map(b => b.id) || []

      if (!branchIds.length) {
        return {
          values: [],
          labels: [],
          label: metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      }

      let revenueQuery = supabase
        .from('branch_daily_revenue')
        .select('upi_revenue, wallet_amount, revenue_date, branch_id')
        .order('revenue_date')

      let expenseQuery = supabase
        .from('branch_expenses')
        .select('amount, expense_type, period_start, branch_id')
        .eq('status', 'approved')

      revenueQuery = revenueQuery.in('branch_id', branchIds)
      expenseQuery = expenseQuery.in('branch_id', branchIds)

      if (kioskId !== 'all') {
        revenueQuery = revenueQuery.eq('branch_id', kioskId)
        expenseQuery = expenseQuery.eq('branch_id', kioskId)
      }

      const [{ data: revenues }, { data: expenses }] = await Promise.all([
        revenueQuery,
        expenseQuery,
      ])

      const revenueOf = (r: { upi_revenue: number | null; wallet_amount: number | null }) =>
        Number(r.upi_revenue || 0) + Number(r.wallet_amount || 0)

      if (interval === 'monthly') {
        // ── Monthly view: group by calendar month ──────────────────────────
        const monthValues = new Array(12).fill(0)

        ;(revenues || []).forEach(r => {
          const idx = new Date(r.revenue_date).getMonth()
          if (metric === 'revenue') {
            monthValues[idx] += revenueOf(r)
          } else {
            const expTotal = expenses
              ?.filter(e => e.period_start === r.revenue_date)
              .reduce((s, e) => s + Number(e.amount), 0) || 0
            monthValues[idx] += revenueOf(r) - expTotal
          }
        })

        return {
          values: monthValues,
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          label: metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      } else {
        // ── Weekly view: group by day-of-week for the last 7 days ──────────
        const now = new Date()
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now.getTime() - (6 - i) * 86400000)
          return d.toISOString().split('T')[0]
        })
        const dayLabels = days.map(d =>
          new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })
        )
        const dayValues = new Array(7).fill(0)

        ;(revenues || []).forEach(r => {
          const idx = days.indexOf(r.revenue_date)
          if (idx === -1) return
          if (metric === 'revenue') {
            dayValues[idx] += revenueOf(r)
          } else {
            const expTotal = expenses
              ?.filter(e => e.period_start === r.revenue_date)
              .reduce((s, e) => s + Number(e.amount), 0) || 0
            dayValues[idx] += revenueOf(r) - expTotal
          }
        })

        return {
          values: dayValues,
          labels: dayLabels,
          label: metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      }
    },
  })
}