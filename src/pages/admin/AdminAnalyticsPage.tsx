import { Topbar } from '@/components/layout/Topbar'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { KPICards } from '@/components/dashboard/KPICards'
import { useDashboardData, useChartData } from '@/hooks/useDashboard'
import { useState } from 'react'

export function AdminAnalyticsPage() {
  const [graphMetric, setGraphMetric] = useState<'revenue' | 'profit'>('revenue')
  const [graphInterval, setGraphInterval] = useState<'monthly' | 'weekly'>('monthly')
  const { data: stats } = useDashboardData('all', 'monthly')
  const { values, label } = useChartData('all', graphInterval, graphMetric)

  if (!stats) return null

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

        <KPICards stats={stats} period="monthly" />

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
            <div className="stat-label">Total investors</div>
            <div className="stat-value">24</div>
            <div className="stat-sub">+3 this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active kiosks</div>
            <div className="stat-value">18</div>
            <div className="stat-sub">3 pending installation</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Platform revenue</div>
            <div className="stat-value">₹3.2L</div>
            <div className="stat-sub">This month</div>
          </div>
        </div>
      </div>
    </>
  )
}
