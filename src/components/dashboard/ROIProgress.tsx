import { fmt } from '@/lib/format'

interface ROIProgressProps {
  investment: number
  totalShareEarned: number
}

export function ROIProgress({
  investment,
  totalShareEarned,
}: ROIProgressProps) {
  const pct =
    investment > 0
      ? Math.min(100, Math.round((totalShareEarned / investment) * 100))
      : 0

  const remaining =
    investment > 0
      ? Math.max(0, investment - totalShareEarned)
      : 0

  const profitAfterROI = Math.max(0, totalShareEarned - investment)

  return (
    <div className="progress-card">
      <div className="progress-header">
        <div>
          <div className="progress-title">ROI Progress</div>
          <div className="progress-sub">
            Earned {fmt(totalShareEarned)}
          </div>
        </div>

        <div className="progress-pct">{pct}%</div>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="progress-labels">
        <span>{fmt(totalShareEarned)}</span>
        <span>{fmt(investment)}</span>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: 'var(--gray)',
        }}
      >
        {pct >= 100 ? (
          <>
            🎉 Fully recovered!
            <br />
            Profit earned after ROI: <strong>{fmt(profitAfterROI)}</strong>
          </>
        ) : (
          `${fmt(remaining)} remaining to full ROI`
        )}
      </div>
    </div>
  )
}