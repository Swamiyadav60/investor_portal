import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DashboardStats } from '@/types/database'

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
    const currStart = new Date(now.getTime() - 7  * 86400000)
    const currEnd   = now

    // Previous week: 8–14 days ago
    const prevStart = new Date(now.getTime() - 14 * 86400000)
    const prevEnd   = new Date(now.getTime() - 7  * 86400000)

    return {
      currStart: currStart.toISOString().split('T')[0],
      currEnd:   currEnd.toISOString().split('T')[0],
      prevStart: prevStart.toISOString().split('T')[0],
      prevEnd:   prevEnd.toISOString().split('T')[0],
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
  kioskId: string,
  period: 'monthly' | 'weekly'
): Promise<DashboardStats> {

  // 1. Resolve which kiosks this investor owns
  const { data: assignments } = await supabase
    .from('investor_kiosks')
    .select('kiosk_id')
    .eq('investor_id', investorId)
    .eq('status', 'active')

  const kioskIds = assignments?.map(a => a.kiosk_id) || []
  if (!kioskIds.length) return EMPTY_STATS

  const kioskFilter = kioskId !== 'all' ? kioskId : undefined
  const { currStart, currEnd, prevStart, prevEnd } = getPeriodBounds(period)

  // 2. Build current + previous period queries
  let currRevQ = supabase
    .from('revenues')
    .select('amount, print_jobs')
    .gte('period_start', currStart)
    .lte('period_start', currEnd)
    .in('kiosk_id', kioskIds)

  let currExpQ = supabase
    .from('expenses')
    .select('amount, expense_type')
    .gte('period_start', currStart)
    .lte('period_start', currEnd)
    .eq('status', 'approved')
    .in('kiosk_id', kioskIds)

  let prevRevQ = supabase
    .from('revenues')
    .select('amount')
    .gte('period_start', prevStart)
    .lte('period_start', prevEnd)
    .in('kiosk_id', kioskIds)

  let prevExpQ = supabase
    .from('expenses')
    .select('amount, expense_type')
    .gte('period_start', prevStart)
    .lte('period_start', prevEnd)
    .eq('status', 'approved')
    .in('kiosk_id', kioskIds)

  if (kioskFilter) {
    currRevQ = currRevQ.eq('kiosk_id', kioskFilter)
    currExpQ = currExpQ.eq('kiosk_id', kioskFilter)
    prevRevQ = prevRevQ.eq('kiosk_id', kioskFilter)
    prevExpQ = prevExpQ.eq('kiosk_id', kioskFilter)
  }

  // 3. Investment + payouts (not period-scoped)
  let kiosksQ = supabase
  .from('kiosks')
  .select('investment_amount')
  .in('id', kioskIds)

  if (kioskFilter) {
    kiosksQ = kiosksQ.eq('id', kioskFilter)
  }
  const allRevenueQ = supabase
  .from('revenues')
  .select('amount')
  .in('kiosk_id', kioskFilter ? [kioskFilter] : kioskIds)
  const investorQ = supabase
  .from('investors')
  .select('profit_share')
  .eq('id', investorId)
  .single()

  // 4. Fire all queries in parallel
  const [
  { data: currRevenues },
  { data: currExpenses },
  { data: prevRevenues },
  { data: prevExpenses },
  { data: kiosks },
  { data: investor },
  { data: allRevenues },
] = await Promise.all([
  currRevQ,
  currExpQ,
  prevRevQ,
  prevExpQ,
  kiosksQ,
  investorQ,
  allRevenueQ,
])

  // 5. Current period totals
  const revenue         = currRevenues?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const variableExpenses = currExpenses?.filter(e => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const fixedExpenses    = currExpenses?.filter(e => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  const netProfit        = revenue - variableExpenses - fixedExpenses
  const profitShare = Number(investor?.profit_share ?? 70)
  const investorProfit = netProfit * (profitShare / 100)

  // 6. Previous period totals
  const prevRevenue    = prevRevenues?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const prevVarExp     = prevExpenses?.filter(e => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const prevFixExp     = prevExpenses?.filter(e => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  const prevNetProfit  = prevRevenue - prevVarExp - prevFixExp
  

  // 7. Investment recovery
const investment = kiosks?.reduce(
  (s, k) => s + Number(k.investment_amount || 0),
  0
) || 0


const totalRevenueEarned =
  allRevenues?.reduce((s, r) => s + Number(r.amount), 0) || 0


const recovered = totalRevenueEarned * (profitShare / 100)
  // 8. Jobs + occupancy
  const jobs      = currRevenues?.reduce((s, r) => s + Number(r.print_jobs || 0), 0) || 0
  const occupancy = jobs > 0 ? Math.min(Math.round((jobs / 1000) * 100), 100) : 0

  return {
    revenue,
    expenses: variableExpenses + fixedExpenses,
    variableExpenses,
    fixedExpenses,
    netProfit,
    investorProfit,
    revenueDelta: pctDelta(revenue, prevRevenue),
    profitDelta:  pctDelta(netProfit, prevNetProfit),
    avg3Profit:   netProfit,  // extend with real 3-month avg query if needed
    avg3Delta:    0,
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
      const { data: assignments } = await supabase
        .from('investor_kiosks')
        .select('kiosk_id')
        .eq('investor_id', investorId)
        .eq('status', 'active')

      const kioskIds = assignments?.map(a => a.kiosk_id) || []

      if (!kioskIds.length) {
        return {
          values: [],
          labels: [],
          label: metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      }
      let revenueQuery = supabase
        .from('revenues')
        .select('amount, period_start, kiosk_id')
        .order('period_start')

      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_type, period_start, kiosk_id')
        .eq('status', 'approved')
      revenueQuery = revenueQuery.in('kiosk_id', kioskIds)
      expenseQuery = expenseQuery.in('kiosk_id', kioskIds)
      
      if (kioskId !== 'all') {
        revenueQuery = revenueQuery.eq('kiosk_id', kioskId)
        expenseQuery = expenseQuery.eq('kiosk_id', kioskId)
      }

      const [{ data: revenues }, { data: expenses }] = await Promise.all([
        revenueQuery,
        expenseQuery,
      ])

      if (interval === 'monthly') {
        // ── Monthly view: group by calendar month ──────────────────────────
        const monthValues = new Array(12).fill(0)

        ;(revenues || []).forEach(r => {
          const idx = new Date(r.period_start).getMonth()
          if (metric === 'revenue') {
            monthValues[idx] += Number(r.amount)
          } else {
            const expTotal = expenses
              ?.filter(e => e.period_start === r.period_start)
              .reduce((s, e) => s + Number(e.amount), 0) || 0
            monthValues[idx] += Number(r.amount) - expTotal
          }
        })

        return {
          values: monthValues,
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          label:  metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      } else {
        // ── Weekly view: group by day-of-week for the last 7 days ──────────
        const now   = new Date()
        const days  = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now.getTime() - (6 - i) * 86400000)
          return d.toISOString().split('T')[0]
        })
        const dayLabels = days.map(d =>
          new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })
        )
        const dayValues = new Array(7).fill(0)

        ;(revenues || []).forEach(r => {
          const idx = days.indexOf(r.period_start)
          if (idx === -1) return
          if (metric === 'revenue') {
            dayValues[idx] += Number(r.amount)
          } else {
            const expTotal = expenses
              ?.filter(e => e.period_start === r.period_start)
              .reduce((s, e) => s + Number(e.amount), 0) || 0
            dayValues[idx] += Number(r.amount) - expTotal
          }
        })

        return {
          values: dayValues,
          labels: dayLabels,
          label:  metric === 'revenue' ? 'Revenue' : 'Profit',
        }
      }
    },
  })
}
