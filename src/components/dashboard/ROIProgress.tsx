import { fmt } from '@/lib/format'

interface ROIProgressProps {
  investment: number
  recovered: number
}

export function ROIProgress({ investment, recovered }: ROIProgressProps) {
  const pct =
  investment > 0
    ? Math.min(100, Math.round((recovered / investment) * 100))
    : 0
  const remaining =
  investment > 0
    ? Math.max(0, investment - recovered)
    : 0

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
        <span>{fmt(recovered)}</span>
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