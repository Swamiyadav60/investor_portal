import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KPICards } from '@/components/dashboard/KPICards'
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown'
import { ROIProgress } from '@/components/dashboard/ROIProgress'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { useDashboardData, useChartData } from '@/hooks/useDashboard'
import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const [kioskId, setKioskId] = useState('all')
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [graphMetric, setGraphMetric] = useState<'revenue' | 'profit'>('revenue')
  const [graphInterval, setGraphInterval] = useState<'monthly' | 'weekly'>('monthly')
  const { investor } = useAuth()

  const { data: stats } = useDashboardData(
  investor?.id,
  kioskId,
  period
)
  const {
  data: chartData
} = useChartData(
  investor?.id,
  kioskId,
  graphInterval,
  graphMetric
)


  const jobs: number[] = []
  const maxJobs = 1
  

  if (!stats) return null

  return (
    <>
      <Topbar
        title="Dashboard"
        showFilters
        kioskId={kioskId}
        onKioskChange={setKioskId}
        period={period}
        onPeriodChange={setPeriod}
      />
      <div className="page-view content">
        {/* KPI Cards */}
        <KPICards stats={stats} period={period} profitShare={investor?.profit_share} />

        {/* Expense + ROI row */}
        <div className="dash-middle-row">
          <ExpenseBreakdown
            variableTotal={stats.variableExpenses}
            fixedTotal={stats.fixedExpenses}
            varBreakdown={[]}
            fixBreakdown={[]}
          />
          <ROIProgress
            investment={stats.investment}
            totalShareEarned={stats.recovered}
          />
        </div>

        {/* Performance Chart */}
        <PerformanceChart
          values={chartData?.values || []}
          labels={chartData?.labels || []}
          label={chartData?.label || ''}
          metric={graphMetric}
          interval={graphInterval}
          onMetricChange={setGraphMetric}
          onIntervalChange={setGraphInterval}
        />

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total print jobs</div>
            <div className="stat-value">{stats.jobs.toLocaleString('en-IN')}</div>
            <div className="stat-sub">
              {stats.jobs >= stats.jobsPrev ? '▲' : '▼'} {Math.abs(stats.jobs - stats.jobsPrev)} vs previous period
            </div>
            <div className="volume-row">
              {jobs.map((j, i) => (
                <div key={i} className="vol-bar" title={`${j} jobs`} style={{ height: Math.round(j / maxJobs * 44) }} />
              ))}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Per-print profit</div>
            <div className="stat-value">₹{stats.jobs > 0 ? (stats.netProfit / stats.jobs).toFixed(2) : '0.00'}</div>
            <div className="stat-sub">After all expenses, this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Occupancy rate</div>
            <div className="stat-value">{stats.occupancy}%</div>
            <div className="stat-sub">Avg daily active hours vs max</div>
          </div>
        </div>
      </div>
    </>
  )
}