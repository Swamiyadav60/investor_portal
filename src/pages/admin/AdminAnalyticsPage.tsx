import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { KPICards } from '@/components/dashboard/KPICards'
import { useDashboardData, useChartData } from '@/hooks/useDashboard'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { AdminKpis } from '@/types/database'
import { fmt } from '@/lib/format'

export function AdminAnalyticsPage() {
  const [graphMetric, setGraphMetric] = useState<'revenue' | 'profit'>('revenue')
  const [graphInterval, setGraphInterval] = useState<'monthly' | 'weekly'>('monthly')
  const { data: stats } = useDashboardData('all', 'monthly')
  const { data: chartData } = useChartData('all', graphInterval, graphMetric)

  const { data: adminKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null
      const { data, error } = await supabase.rpc('get_admin_kpis').single()
      if (error) throw error
      return data as AdminKpis
    },
  })

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
          values={chartData?.values || []}
          labels={chartData?.labels || []}
          label={chartData?.label || ''}
          metric={graphMetric}
          interval={graphInterval}
          onMetricChange={setGraphMetric}
          onIntervalChange={setGraphInterval}
        />

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Colleges</div>
            <div className="stat-value">{isLoadingKpis ? '...' : adminKpis?.total_colleges || 0}</div>
            <div className="stat-sub">Locations registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Available Slots</div>
            <div className="stat-value">{isLoadingKpis ? '...' : adminKpis?.available_slots || 0}</div>
            <div className="stat-sub">Ready for investment</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Free Waitlists</div>
            <div className="stat-value">{isLoadingKpis ? '...' : adminKpis?.free_waitlists || 0}</div>
            <div className="stat-sub">Pending applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Priority Waitlists</div>
            <div className="stat-value">{isLoadingKpis ? '...' : adminKpis?.priority_waitlists || 0}</div>
            <div className="stat-sub">Paid reservations</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Priority Revenue</div>
            <div className="stat-value">{isLoadingKpis ? '...' : fmt(adminKpis?.priority_waitlist_revenue || 0)}</div>
            <div className="stat-sub">From reservations</div>
          </div>
        </div>
      </div>
    </>
  )
}
