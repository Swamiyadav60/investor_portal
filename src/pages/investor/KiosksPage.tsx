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

  // Branches this investor owns, enriched with this-month / lifetime stats
  // computed from branch_daily_revenue (branches itself has no earnings columns).
  const { data: activeKiosks = [] } = useQuery({
    queryKey: ['my-kiosks', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('owner_id', investor!.id)

      if (error) throw error
      if (!branches?.length) return []

      const branchIds = branches.map(b => b.id)

      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const [{ data: monthRevenue }, { data: allRevenue }] = await Promise.all([
        supabase
          .from('branch_daily_revenue')
          .select('branch_id, upi_revenue, wallet_amount, upi_jobs, wallet_jobs')
          .in('branch_id', branchIds)
          .gte('revenue_date', monthStart)
          .lte('revenue_date', monthEnd),
        supabase
          .from('branch_daily_revenue')
          .select('branch_id, upi_revenue, wallet_amount')
          .in('branch_id', branchIds),
      ])

      const PROFIT_SHARE = Number(investor?.profit_share ?? 70) / 100

      return branches.map(b => {
        const thisMonth = (monthRevenue || []).filter(r => r.branch_id === b.id)
        const lifetime = (allRevenue || []).filter(r => r.branch_id === b.id)

        const monthRevenueTotal = thisMonth.reduce((s, r) => s + Number(r.upi_revenue || 0) + Number(r.wallet_amount || 0), 0)
        const jobsThisMonth = thisMonth.reduce((s, r) => s + Number(r.upi_jobs || 0) + Number(r.wallet_jobs || 0), 0)
        const lifetimeRevenueTotal = lifetime.reduce((s, r) => s + Number(r.upi_revenue || 0) + Number(r.wallet_amount || 0), 0)
        const occupancy = jobsThisMonth > 0 ? Math.min(Math.round((jobsThisMonth / 1000) * 100), 100) : 0

        return {
          ...b,
          monthly_earnings: monthRevenueTotal * PROFIT_SHARE,
          total_earned: lifetimeRevenueTotal * PROFIT_SHARE,
          jobs_this_month: jobsThisMonth,
          occupancy_rate: occupancy,
          installed_at: b.created_at,
        }
      })
    }
  })
  const { toast } = useToast()

  // "Available to invest" listing — branches without an owner yet
  const { data: colleges = [] } = useQuery({
    queryKey: ['branches-available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .is('owner_id', null)

      if (error) throw error

      return data || []
    }
  })

  const { data: myWaitlists = [] } = useQuery({
    queryKey: ['branch-waitlist', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_waitlist')
        .select('branch_id')
        .eq('user_id', investor!.id)
        .neq('status', 'rejected')

      if (error) throw error
      return data || []
    }
  })

  const filtered =
    (slotFilter === 'all'
      ? colleges
      : colleges.filter((c: any) => c.type === slotFilter)
    )
      .filter((c: any) => Number(c.slots_taken) < Number(c.slots_total))

  const handleInvest = (college: any) => {
    const alreadyReserved = myWaitlists.some((w: any) => w.branch_id === college.id)
    if (alreadyReserved) {
      toast('You are already on the waitlist for this location', 'info')
      return
    }
    setSelectedCollege(college)
    setShowWaitlistModal(true)
  }

  const handleReserveSuccess = () => {
    setShowWaitlistModal(false)
    toast("You've been added to the waitlist!", 'success')
    queryClient.invalidateQueries({
      queryKey: ['branch-waitlist', investor?.id],
    })
    queryClient.invalidateQueries({
      queryKey: ['branches-available'],
    })
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
                    {fmt(monthlyShare)}
                  </div>
                  <div className="pc-stat-lbl">Your share / mo</div>
                </div>
                <div className="pc-stat">
                  <div className="pc-stat-val">{k.jobs_this_month.toLocaleString('en-IN')}</div>
                  <div className="pc-stat-lbl">Jobs this month</div>
                </div>
                <div className="pc-stat">
                  <div className="pc-stat-val">{fmt(totalEarned)}</div>
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
          {filtered.map((s: any) => {
            const pct = s.slots_total > 0 ? Math.round((Number(s.slots_taken) / Number(s.slots_total)) * 100) : 0
            const left = Number(s.slots_total || 0) - Number(s.slots_taken || 0)
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
          branch={selectedCollege}
          isOpen={showWaitlistModal}
          onClose={() => setShowWaitlistModal(false)}
          onSuccess={handleReserveSuccess}
        />
      )}
    </>
  )
}