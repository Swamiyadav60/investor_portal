import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { DEMO_KIOSKS, makeDemoJob, PRINTER_COLORS } from '@/data/demo'
import { fmt, timeAgo } from '@/lib/format'
import type { PrintJob } from '@/types/database'

const PRINTER_NAMES: Record<string, string> = {
  p1: 'Kiosk 1 · Madhapur', p2: 'Kiosk 2 · Kukatpally', p3: 'Kiosk 3 · LB Nagar',
}

export function LiveActivityPage() {
  const [feed, setFeed] = useState<PrintJob[]>([])
  const [filter, setFilter] = useState('all')
  const [jobCount, setJobCount] = useState(0)
  const [revToday, setRevToday] = useState(0)

  const seedFeed = useCallback(() => {
    const jobs: PrintJob[] = []
    let count = 0, rev = 0
    for (let i = 0; i < 18; i++) {
      const kioskIds = ['p1', 'p2', 'p3']
      const kid = kioskIds[Math.floor(Math.random() * 3)]
      const j = makeDemoJob(kid)
      j.created_at = new Date(Date.now() - (18 - i) * 55000).toISOString()
      jobs.unshift(j)
      count++; rev += j.amount
    }
    setFeed(jobs)
    setJobCount(count)
    setRevToday(rev)
  }, [])

  useEffect(() => { seedFeed() }, [seedFeed])

  useEffect(() => {
    const interval = setInterval(() => {
      const kioskIds = ['p1', 'p2', 'p3']
      const kid = kioskIds[Math.floor(Math.random() * 3)]
      const j = makeDemoJob(kid)
      setFeed((prev) => [j, ...prev].slice(0, 60))
      setJobCount((c) => c + 1)
      setRevToday((r) => r + j.amount)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'all' ? feed : feed.filter((j) => j.kiosk_id === filter)
  const totals = { p1: 0, p2: 0, p3: 0 }
  feed.forEach((j) => { totals[j.kiosk_id as keyof typeof totals] += j.amount })
  const grandTotal = totals.p1 + totals.p2 + totals.p3 || 1
  const activeKiosks = DEMO_KIOSKS.filter((k) => k.status === 'active')

  return (
    <>
      <Topbar title="Live Activity" />
      <div className="page-view content">
        <div className="live-stats-row">
          <div className="live-stat">
            <div className="live-pulse-wrap"><span className="live-pulse" /></div>
            <div><div className="live-stat-val">{jobCount}</div><div className="live-stat-lbl">Jobs today</div></div>
          </div>
          <div className="live-stat">
            <div className="live-stat-val" style={{ color: 'var(--green)' }}>{fmt(revToday)}</div>
            <div className="live-stat-lbl">Revenue today</div>
          </div>
          <div className="live-stat">
            <div className="live-stat-val">{activeKiosks.filter((k) => k.is_online).length} / {activeKiosks.length}</div>
            <div className="live-stat-lbl">Kiosks online</div>
          </div>
          <div className="live-stat">
            <div className="live-stat-val">42s</div>
            <div className="live-stat-lbl">Avg job time today</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
          <div className="live-feed-card" style={{ flex: 1 }}>
            <div className="live-feed-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-pulse" style={{ position: 'static' }} />
                <span className="rpt-card-title">Live feed</span>
              </div>
              <ToggleGroup
                options={[
                  { key: 'all', label: 'All' },
                  { key: 'p1', label: 'P1' },
                  { key: 'p2', label: 'P2' },
                  { key: 'p3', label: 'P3' },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </div>
            <div className="live-feed-list">
              {filtered.slice(0, 30).map((j) => (
                <div key={j.id} className="live-item">
                  <div className="live-dot" style={{ background: PRINTER_COLORS[j.kiosk_id] }} />
                  <div className="live-item-main">
                    <div className="live-item-title">{j.doc_type} · {j.pages} page{j.pages > 1 ? 's' : ''}</div>
                    <div className="live-item-meta">{PRINTER_NAMES[j.kiosk_id]}</div>
                  </div>
                  <div className="live-item-amt">{fmt(j.amount)}</div>
                  <div className="live-item-time">{timeAgo(j.created_at)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="rpt-card" style={{ padding: '1rem' }}>
              <div className="rpt-card-title" style={{ marginBottom: '.875rem' }}>Kiosk status</div>
              {['p1', 'p2', 'p3'].map((p) => (
                <div key={p} className="live-status-item">
                  <div className="live-status-dot" style={{ background: PRINTER_COLORS[p] }} />
                  <span className="live-status-name">{PRINTER_NAMES[p]}</span>
                  <span className="live-status-badge online">Online</span>
                </div>
              ))}
            </div>
            <div className="rpt-card" style={{ padding: '1rem' }}>
              <div className="rpt-card-title" style={{ marginBottom: '.75rem' }}>Today&apos;s split</div>
              {(['p1', 'p2', 'p3'] as const).map((p) => (
                <div key={p} className="live-bar-item">
                  <div className="live-bar-label">
                    <span style={{ color: PRINTER_COLORS[p], fontWeight: 500 }}>{PRINTER_NAMES[p].split('·')[0].trim()}</span>
                    <span>{fmt(totals[p])}</span>
                  </div>
                  <div className="live-bar-track">
                    <div className="live-bar-fill" style={{ width: `${Math.round(totals[p] / grandTotal * 100)}%`, background: PRINTER_COLORS[p] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
