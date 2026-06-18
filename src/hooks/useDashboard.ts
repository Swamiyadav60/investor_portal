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
queryFn: () =>
  fetchLiveStats(investorId, kioskId, period),
enabled: !!investorId,
  refetchInterval: 30000,
})
}

async function fetchLiveStats(
  investorId: string | undefined,
  kioskId: string,
  period: string
): Promise<DashboardStats> {
  const now = new Date()
  const start = period === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    : new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const { data: assignments } = await supabase
  .from('investor_kiosks')
  .select('kiosk_id')
  .eq('investor_id', investorId)
  .eq('status', 'active')

const kioskIds = assignments?.map(a => a.kiosk_id) || []


  if (!kioskIds.length) {
  return {
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
}

  let kioskFilter = kioskId !== 'all' ? kioskId : undefined

  let revQuery = supabase
  .from('revenues')
  .select('amount, print_jobs')
  .in('kiosk_id', kioskIds)

let expQuery = supabase
  .from('expenses')
  .select('amount, expense_type')
  .gte('period_start', start)
  .eq('status', 'approved')

revQuery = revQuery.in('kiosk_id', kioskIds)
expQuery = expQuery.in('kiosk_id', kioskIds)

  if (kioskFilter) {
    revQuery = revQuery.eq('kiosk_id', kioskFilter)
    expQuery = expQuery.eq('kiosk_id', kioskFilter)
  }

  const [{ data: revenues }, { data: expenses }] = await Promise.all([revQuery, expQuery])
  const revenue = revenues?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const variableExpenses = expenses?.filter((e) => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const fixedExpenses = expenses?.filter((e) => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  
  const netProfit = revenue - variableExpenses - fixedExpenses
  const investorProfit = netProfit * 0.7
 const { data: kiosks } = await supabase
  .from('kiosks')
  .select('investment_amount')
  .in('id', kioskIds)

const { data: payouts } = await supabase
  .from('payments')
  .select('amount,status')
  .eq('investor_id', investorId)

const investment =
  kiosks?.reduce(
    (sum, k) => sum + Number(k.investment_amount || 0),
    0
  ) || 0



const totalPaidOut =
  payouts?.reduce(
    (sum, p) =>
      p.status === 'success'
        ? sum + Number(p.amount)
        : sum,
    0
  ) || 0
const recovered = totalPaidOut
const jobs =
  revenues?.reduce(
    (sum, r) => sum + Number(r.print_jobs || 0),
    0
  ) || 0

const occupancy =
  jobs > 0
    ? Math.min(Math.round((jobs / 1000) * 100), 100)
    : 0
  return {
    revenue, expenses: variableExpenses + fixedExpenses, variableExpenses, fixedExpenses,
    netProfit, investorProfit,
    revenueDelta: 0, profitDelta: 0, avg3Profit: netProfit, avg3Delta: 0,
    jobs: jobs, jobsPrev: 0, occupancy, investment, recovered,
  }
}


export function useChartData(
  kioskId: string,
  interval: 'monthly' | 'weekly',
  metric: 'revenue' | 'profit'
) {
  return useQuery({
    queryKey: ['chart-data', kioskId, interval, metric],
    queryFn: async () => {

      let revenueQuery = supabase
        .from('revenues')
        .select('amount, period_start, kiosk_id')
        .order('period_start')

      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_type, period_start, kiosk_id')
        .eq('status', 'approved')

      if (kioskId !== 'all') {
        revenueQuery = revenueQuery.eq('kiosk_id', kioskId)
        expenseQuery = expenseQuery.eq('kiosk_id', kioskId)
      }

      const [
        { data: revenues },
        { data: expenses }
      ] = await Promise.all([
        revenueQuery,
        expenseQuery
      ])

      const monthValues = new Array(12).fill(0)

;(revenues || []).forEach((r) => {
  const monthIndex = new Date(r.period_start).getMonth()

  if (metric === 'revenue') {
    monthValues[monthIndex] = Number(r.amount)
  } else {
    const matchingExpenses =
      expenses?.filter(
        e => e.period_start === r.period_start
      ) || []

    const expenseTotal =
      matchingExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      )

    monthValues[monthIndex] =
      Number(r.amount) - expenseTotal
  }
})

const values = monthValues
            const labels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

      return {
        values,
        labels,
        label:
          metric === 'revenue'
            ? 'Revenue'
            : 'Profit'
      }
    }
  })
}
