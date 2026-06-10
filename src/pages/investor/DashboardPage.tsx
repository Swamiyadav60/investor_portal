import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KPICards } from '@/components/dashboard/KPICards'
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown'
import { ROIProgress } from '@/components/dashboard/ROIProgress'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { useDashboardData, useChartData } from '@/hooks/useDashboard'
import { PRINTER_DATA } from '@/data/demo'
import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const [kioskId, setKioskId] = useState('all')
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [graphMetric, setGraphMetric] = useState<'revenue' | 'profit'>('revenue')
  const [graphInterval, setGraphInterval] = useState<'monthly' | 'weekly'>('monthly')
  const { investor } = useAuth()

  const { data: stats } = useDashboardData(kioskId, period)
  const { values, label } = useChartData(kioskId, graphInterval, graphMetric)
  const printerData = PRINTER_DATA[kioskId] || PRINTER_DATA.all
  const series = period === 'monthly' ? printerData.monthly : printerData.weekly
  const jobs = series.jobs
  const maxJobs = Math.max(...jobs)

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
        <KPICards stats={stats} period={period} profitShare={investor?.profit_share} />

        <div style={{ display: 'flex', gap: '1rem' }}>
          <ExpenseBreakdown
            variableTotal={stats.variableExpenses}
            fixedTotal={stats.fixedExpenses}
            varBreakdown={printerData.varBreakdown}
            fixBreakdown={printerData.fixBreakdown}
          />
          <ROIProgress investment={stats.investment} recovered={stats.recovered} />
        </div>

        <PerformanceChart
          values={values}
          label={label}
          metric={graphMetric}
          interval={graphInterval}
          onMetricChange={setGraphMetric}
          onIntervalChange={setGraphInterval}
        />

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
            <div className="stat-value">{printerData.occ}</div>
            <div className="stat-sub">Avg daily active hours vs max</div>
          </div>
        </div>
      </div>
    </>
  )
}
