import { fmt } from '@/lib/format'

interface ROIProgressProps {
  investment: number
  recovered: number
}

export function ROIProgress({ investment, recovered }: ROIProgressProps) {
  const pct = Math.min(100, Math.round(recovered / investment * 100))
  const remaining = Math.max(0, investment - recovered)

  return (
    <div className="progress-card">
      <div className="progress-header">
        <div>
          <div className="progress-title">ROI progress</div>
          <div className="progress-sub">Recovered {fmt(recovered)}</div>
        </div>
        <div className="progress-pct">{pct}%</div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-labels">
        <span>₹0</span>
        <span>{fmt(investment)}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray)' }}>
        {pct >= 100
          ? '🎉 Fully recovered — pure profit now!'
          : `${fmt(remaining)} remaining to full ROI`}
      </div>
    </div>
  )
}