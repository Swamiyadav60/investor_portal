import { fmt, profitClass } from '@/lib/format'
import type { DashboardStats } from '@/types/database'

interface KPICardsProps {
  stats: DashboardStats
  period: 'monthly' | 'weekly'
  profitShare?: number
}

export function KPICards({ stats, period, profitShare = 70 }: KPICardsProps) {
  const periodLabel = period === 'monthly' ? 'vs last month' : 'vs last week'
  const margin = stats.revenue > 0 ? (stats.netProfit / stats.revenue) * 100 : 0
  const pClass = profitClass(margin)
  const healthColor = pClass === 'profit-good' ? '#1A9B6C' : pClass === 'profit-warn' ? '#E8891A' : '#D94040'

  return (
    <div className="kpi-grid">
      <div className="kpi-card revenue">
        <div className="kpi-accent" />
        <div className="kpi-label">
          <svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
          Revenue
        </div>
        <div className="kpi-value">{fmt(stats.revenue)}</div>
        <div className={`kpi-delta ${stats.revenueDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
          {stats.revenueDelta >= 0 ? '▲' : '▼'} {Math.abs(stats.revenueDelta).toFixed(1)}% <span style={{ color: 'var(--gray)' }}>{periodLabel}</span>
        </div>
      </div>

      <div className="kpi-card expense">
        <div className="kpi-accent" />
        <div className="kpi-label">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Total expenses
        </div>
        <div className="kpi-value">{fmt(stats.expenses)}</div>
        <div className="kpi-delta delta-neutral">
          Variable {fmt(stats.variableExpenses)} · Fixed {fmt(stats.fixedExpenses)}
        </div>
      </div>

      <div className={`kpi-card ${pClass}`}>
        <div className="kpi-accent" />
        <div className="kpi-label">
          <span className="health-dot" style={{ background: healthColor }} />
          Net profit
        </div>
        <div className="kpi-value" style={{ color: healthColor }}>{fmt(stats.netProfit)}</div>
        <div className={`kpi-delta ${stats.profitDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
          {stats.profitDelta >= 0 ? '▲' : '▼'} {Math.abs(stats.profitDelta).toFixed(1)}% <span style={{ color: 'var(--gray)' }}>{periodLabel}</span>
        </div>
        <div className="avg-strip">
          <span className="avg-label">3-mo avg:</span>
          <span className="avg-value">&nbsp;{fmt(stats.avg3Profit)}</span>
          <span className={`avg-trend ${stats.avg3Delta >= 0 ? 'delta-up' : 'delta-down'}`}>
            &nbsp;{stats.avg3Delta >= 0 ? '▲' : '▼'}{Math.abs(stats.avg3Delta).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="kpi-card" style={{ borderColor: '#B6E0CE' }}>
        <div className="kpi-accent" style={{ background: 'var(--green)' }} />
        <div className="kpi-label" style={{ color: 'var(--green-d)' }}>
          <svg viewBox="0 0 24 24" style={{ stroke: 'var(--green)' }}><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
          Your profit <span style={{ background: 'var(--green-l)', color: 'var(--green-d)', fontSize: 10, padding: '1px 6px', borderRadius: 999, marginLeft: 4, fontWeight: 600, letterSpacing: '.04em' }}>{profitShare}%</span>
        </div>
        <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(stats.investorProfit)}</div>
        <div className={`kpi-delta ${stats.profitDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
          {stats.profitDelta >= 0 ? '▲' : '▼'} {Math.abs(stats.profitDelta).toFixed(1)}% <span style={{ color: 'var(--gray)' }}>{periodLabel}</span>
        </div>
        <div className="avg-strip">
          <span className="avg-label">3-mo avg:</span>
          <span className="avg-value">&nbsp;{fmt(stats.avg3Profit * (profitShare / 100))}</span>
        </div>
      </div>
    </div>
  )
}
