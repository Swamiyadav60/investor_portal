import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { DEMO_KIOSKS } from '@/data/demo'

interface TopbarProps {
  title: string
  showFilters?: boolean
  kioskId?: string
  onKioskChange?: (id: string) => void
  period?: 'monthly' | 'weekly'
  onPeriodChange?: (p: 'monthly' | 'weekly') => void
  nextPayout?: string
}

export function Topbar({
  title, showFilters, kioskId, onKioskChange, period, onPeriodChange, nextPayout = 'Jul 1',
}: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="page-title">{title}</div>
        {showFilters && (
          <div className="printer-dropdown-wrap">
            <select
              className="printer-dropdown"
              value={kioskId}
              onChange={(e) => onKioskChange?.(e.target.value)}
            >
              <option value="all">All kiosks</option>
              {DEMO_KIOSKS.filter((k) => k.status === 'active').map((k) => (
                <option key={k.id} value={k.id}>{k.name} — {k.location}</option>
              ))}
            </select>
            <svg className="dropdown-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
        )}
      </div>
      <div className="topbar-right">
        {showFilters && period && onPeriodChange && (
          <ToggleGroup
            options={[{ key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }]}
            value={period}
            onChange={(k) => onPeriodChange(k as 'monthly' | 'weekly')}
            className="period-toggle"
          />
        )}
        <div className="payout-badge">
          <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          Next payout: {nextPayout}
        </div>
      </div>
    </div>
  )
}
