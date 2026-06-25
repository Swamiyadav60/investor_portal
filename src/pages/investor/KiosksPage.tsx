import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { fmt } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { InvestorWaitlistModal } from '@/components/investor/InvestorWaitlistModal'

export function KiosksPage() {
  const [slotFilter, setSlotFilter] = useState('all')
  const [selectedCollege, setSelectedCollege] = useState<any>(null)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const navigate = useNavigate()
  const { investor } = useAuth()
  const queryClient = useQueryClient()
  const { data: activeKiosks = [] } = useQuery({
  queryKey: ['my-kiosks', investor?.id],
  enabled: !!investor?.id,
  queryFn: async () => {
    const { data: assignments, error } = await supabase
      .from('investor_kiosks')
      .select('kiosk_id')
      .eq('investor_id', investor!.id)
      .eq('status', 'active')

    if (error) throw error

    const kioskIds =
      assignments?.map(a => a.kiosk_id) || []

    if (!kioskIds.length) return []

    const { data: kiosks, error: kioskError } = await supabase
      .from('kiosks')
      .select('*')
      .in('id', kioskIds)

    if (kioskError) throw kioskError

    return kiosks || []
  }
})
  const { toast } = useToast()

  
  const { data: pendingKiosks = [] } = useQuery({
  queryKey: ['pending-kiosks', investor?.id],
  enabled: !!investor?.id,
  queryFn: async () => {
    const { data: assignments } = await supabase
      .from('investor_kiosks')
      .select('kiosk_id')
      .eq('investor_id', investor!.id)

    const kioskIds =
      assignments?.map(a => a.kiosk_id) || []

    if (!kioskIds.length) return []

    const { data } = await supabase
      .from('kiosks')
      .select('*')
      .in('id', kioskIds)
      .eq('status', 'pending_installation')

    return data || []
  }
})
const { data: colleges = [] } = useQuery({
  queryKey: ['colleges'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      

    if (error) throw error
    
    return data || []
  }
})

const { data: myWaitlists = [] } = useQuery({
  queryKey: ['waitlists', investor?.id],
  enabled: !!investor?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('waitlists')
      .select('college_id')
      .eq('investor_id', investor!.id)
      .neq('status', 'rejected')
    
    if (error) throw error
    return data || []
  }
})


 const filtered =
  (slotFilter === 'all'
    ? colleges
    : colleges.filter(c => c.type === slotFilter)
  )
  .filter(c => c.slots_taken < c.slots_total)
  const handleInvest = (college: any) => {
    const alreadyReserved = myWaitlists.some((w: any) => w.college_id === college.id)
    if (alreadyReserved) {
      toast('You are already on the waitlist for this college', 'info')
      return
    }
    setSelectedCollege(college)
    setShowWaitlistModal(true)
  }

  const handleReserveSuccess = () => {
    setShowWaitlistModal(false)
    toast("You've been added to the waitlist!", 'success')
    queryClient.invalidateQueries({ queryKey: ['waitlists'] })
    navigate('/waitlist')
  }
  

  return (
    <>
      <Topbar title="My Kiosks" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading-sub">
                 {activeKiosks.length} active slots
            </div>
          </div>
        </div>

        <div className="printer-cards">
          {activeKiosks.map((k) => {
            const monthlyShare = Number(k.monthly_earnings || 0)
            const totalEarned  = Number(k.total_earned || 0)

  return (
            <div key={k.id} className="pc">
              <div className="pc-accent" style={{ background: 'var(--green)' }} />
              <div className="pc-top">
                <div className="pc-icon">
                  <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </div>
                <span className="pc-status active">Active</span>
              </div>
              <div className="pc-name">{k.name}</div>
              <div className="pc-loc">
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {k.location}
              </div>
              <div className="pc-stats">
                <div className="pc-stat">
                  <div className="pc-stat-val" style={{ color: 'var(--green)' }}>
                    {fmt(monthlyShare)}          {/* ← was investorProfit */}
                  </div>
                  <div className="pc-stat-lbl">Your share / mo</div>
                </div>
                <div className="pc-stat">
                  <div className="pc-stat-val">{k.jobs_this_month.toLocaleString('en-IN')}</div>
                  <div className="pc-stat-lbl">Jobs this month</div>
                </div>
                <div className="pc-stat">
                  <div className="pc-stat-val">{fmt(totalEarned)}</div>   {/* ← was investorProfit */}
                  <div className="pc-stat-lbl">Total earned</div>
                </div>
                <div className="pc-stat">
                  <div className="pc-stat-val">{k.occupancy_rate}%</div>
                  <div className="pc-stat-lbl">Occupancy</div>
                </div>
              </div>
              <div className="pc-footer">
                <span className="pc-footer-note">Since {k.installed_at ? new Date(k.installed_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</span>
                <button className="pc-btn" onClick={() => navigate('/dashboard')}>View stats →</button>
              </div>
            </div>
            )
           })}
        </div>

        <div className="section-divider">
          <div className="section-divider-line" />
          <div className="section-divider-label">Available to invest</div>
          <div className="section-divider-line" />
        </div>

        <div className="section-header" style={{ marginBottom: '.75rem' }}>
          <div>
            <div className="section-heading" style={{ fontSize: 14 }}>Pending installation</div>
            <div className="section-heading-sub">Purchased slots awaiting hardware setup</div>
          </div>
        </div>

        <div className="printer-cards">
          {pendingKiosks.map((k) => {
  const currentStep =
    (k.install_steps as any[])?.filter((s: any) => s.done).length || 0

  return (
    <div key={k.id} className="pc pending-card">
              <div className="pc-accent" />
              <div className="pc-top">
                <div className="pc-icon" style={{ background: 'var(--amber-l)' }}>
                  <svg viewBox="0 0 24 24" style={{ stroke: 'var(--amber)' }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </div>
                <span className="pc-status pending-installation">Pending Installation</span>
              </div>
              <div className="pc-name">{k.name}</div>
              <div className="pc-loc">
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {k.location}
              </div>
              <div className="install-steps">
                {(k.install_steps as any[] || []).map((s: any, i: number) => (
                  <div key={i} className={`install-step ${s.done ? 'done' : s.active ? 'active' : 'waiting'}`}>
                    {s.done ? (
                      <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : s.active ? (
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
                    )}
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="pc-footer">
                <span className="pc-footer-note" style={{ color: 'var(--amber)' }}>{k.install_eta}</span>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>
                   Step {currentStep} of 4
                </span>
              </div>
            </div>
            )
          })}
        </div>

        <div className="section-header" style={{ marginTop: '1.5rem', marginBottom: '.75rem' }}>
          <div>
            <div className="section-heading" style={{ fontSize: 14 }}>Open slots near you</div>
            <div className="section-heading-sub">High-traffic locations with available investment slots</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>Filter:</span>
            <ToggleGroup
              options={[
                { key: 'all', label: 'All' },
                { key: 'college', label: 'College' },
                { key: 'transit', label: 'Transit' },
                { key: 'commercial', label: 'Commercial' },
              ]}
              value={slotFilter}
              onChange={setSlotFilter}
            />
          </div>
        </div>

        <div className="available-grid">
          {filtered.map((s) => {
            const pct = Math.round(s.slots_taken / s.slots_total * 100)
            const left = s.slots_total - s.slots_taken
            return (
              <div key={s.id} className="av-card">
                <div className="av-top">
                  <div className="av-icon">
                    <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span className={`av-badge ${s.tag}`}>{s.tag_label}</span>
                </div>
                <div className="av-name">{s.name}</div>
                <div className="av-meta">{s.location}</div>
                <div className="av-slots-row">
                  <div className="av-slots-bar-wrap"><div className="av-slots-bar" style={{ width: `${pct}%` }} /></div>
                  <span className="av-slots-txt">{left} slot{left !== 1 ? 's' : ''} left</span>
                </div>
                <div className="av-earn">
                  <div>
                    <div className="av-earn-val">{fmt(s.avg_monthly_earnings)}</div>
                    <div className="av-earn-lbl">Avg monthly earnings</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{fmt(s.investment_amount)}</div>
                    <div className="av-earn-lbl">One-time investment</div>
                  </div>
                </div>
                <button
                   className="av-invest-btn"
                   disabled={left <= 0}
                   onClick={() => handleInvest(s)}
                  >
                  {left <= 0 ? 'Fully Booked' : 'Invest in this slot →'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {selectedCollege && (
        <InvestorWaitlistModal
          college={selectedCollege}
          isOpen={showWaitlistModal}
          onClose={() => setShowWaitlistModal(false)}
          onSuccess={handleReserveSuccess}
        />
      )}
    </>
  )
}
