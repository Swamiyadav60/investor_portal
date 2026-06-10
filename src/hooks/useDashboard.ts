import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { PRINTER_DATA } from '@/data/demo'
import type { DashboardStats } from '@/types/database'

export function useDashboardData(kioskId: string, period: 'monthly' | 'weekly') {
  const demoQuery = useQuery({
    queryKey: ['dashboard', kioskId, period, 'demo'],
    queryFn: () => computeDemoStats(kioskId, period),
    enabled: !isSupabaseConfigured,
  })

  const liveQuery = useQuery({
    queryKey: ['dashboard', kioskId, period, 'live'],
    queryFn: () => fetchLiveStats(kioskId, period),
    enabled: isSupabaseConfigured,
    refetchInterval: 30000,
  })

  return isSupabaseConfigured ? liveQuery : demoQuery
}

function computeDemoStats(kioskId: string, period: 'monthly' | 'weekly'): DashboardStats {
  const d = PRINTER_DATA[kioskId] || PRINTER_DATA.all
  const series = period === 'monthly' ? d.monthly : d.weekly
  const len = series.revenue.length
  const cur = len - 1
  const prev = len - 2
  const rev = series.revenue[cur]
  const var_ = series.varExp[cur]
  const fix_ = series.fixExp[cur]
  const exp = var_ + fix_
  const profit = rev - exp
  const prevProfit = series.revenue[prev] - series.varExp[prev] - series.fixExp[prev]
  const revDelta = ((rev - series.revenue[prev]) / series.revenue[prev]) * 100
  const profitDelta = ((profit - prevProfit) / Math.abs(prevProfit)) * 100
  const last3 = [len - 1, len - 2, len - 3].map((i) => series.revenue[i] - series.varExp[i] - series.fixExp[i])
  const avg3 = last3.reduce((a, b) => a + b, 0) / 3
  const prev3avg = [len - 2, len - 3, len - 4].map((i) => series.revenue[i] - series.varExp[i] - series.fixExp[i]).reduce((a, b) => a + b, 0) / 3
  const avg3Delta = ((avg3 - prev3avg) / Math.abs(prev3avg)) * 100

  return {
    revenue: rev, expenses: exp, variableExpenses: var_, fixedExpenses: fix_,
    netProfit: profit, investorProfit: profit * 0.7,
    revenueDelta: revDelta, profitDelta, avg3Profit: avg3, avg3Delta,
    jobs: series.jobs[cur], jobsPrev: series.jobs[prev],
    occupancy: parseFloat(d.occ), investment: d.investment, recovered: d.recovered,
  }
}

async function fetchLiveStats(kioskId: string, period: string): Promise<DashboardStats> {
  const now = new Date()
  const start = period === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    : new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]

  let kioskFilter = kioskId !== 'all' ? kioskId : undefined

  let revQuery = supabase.from('revenues').select('amount, print_jobs').gte('period_start', start)
  let expQuery = supabase.from('expenses').select('amount, expense_type').gte('period_start', start)

  if (kioskFilter) {
    revQuery = revQuery.eq('kiosk_id', kioskFilter)
    expQuery = expQuery.eq('kiosk_id', kioskFilter)
  }

  const [{ data: revenues }, { data: expenses }] = await Promise.all([revQuery, expQuery])

  const revenue = revenues?.reduce((s, r) => s + Number(r.amount), 0) || 0
  const variableExpenses = expenses?.filter((e) => e.expense_type === 'variable').reduce((s, e) => s + Number(e.amount), 0) || 0
  const fixedExpenses = expenses?.filter((e) => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0) || 0
  const jobs = revenues?.reduce((s, r) => s + (r.print_jobs || 0), 0) || 0
  const netProfit = revenue - variableExpenses - fixedExpenses

  return {
    revenue, expenses: variableExpenses + fixedExpenses, variableExpenses, fixedExpenses,
    netProfit, investorProfit: netProfit * 0.7,
    revenueDelta: 0, profitDelta: 0, avg3Profit: netProfit, avg3Delta: 0,
    jobs, jobsPrev: 0, occupancy: 75, investment: 75000, recovered: 41800,
  }
}

export function useChartData(kioskId: string, interval: 'monthly' | 'weekly', metric: 'revenue' | 'profit') {
  return useMemo(() => {
    const d = PRINTER_DATA[kioskId] || PRINTER_DATA.all
    const series = interval === 'monthly' ? d.monthly : d.weekly
    const values = metric === 'revenue'
      ? series.revenue
      : series.revenue.map((r, i) => r - series.varExp[i] - series.fixExp[i])
    return { values, label: d.label }
  }, [kioskId, interval, metric])
}
