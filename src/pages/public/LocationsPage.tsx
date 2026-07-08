import { useState, useEffect } from 'react'

import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { AuthModal } from '@/components/auth/AuthModal'
import { InvestorWaitlistModal } from '@/components/investor/InvestorWaitlistModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Branch } from '@/types/database'

export function LocationsPage() {
  const { user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [reservedBranchIds, setReservedBranchIds] = useState<Set<string>>(new Set())
  const [slotFilter, setSlotFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

  useEffect(() => {
    // Fetch branches
    async function fetchBranches() {
      const { data, error } = await supabase.from('branches').select('*')
      if (error) { console.error('Error fetching branches:', error); return }
      setBranches(data as Branch[])
    }
    fetchBranches()

    // Real-time: slot count updates instantly for ALL users
    const channel = supabase
      .channel('branches-slots')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'branches' },
        (payload) => {
          setBranches(prev =>
            prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } as Branch : b    )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Fetch which colleges THIS investor has already reserved
  useEffect(() => {
    if (!user) {
      setReservedBranchIds(new Set())
      return
    }
    async function fetchMyWaitlists() {
  const { data, error } = await supabase
    .from("branch_waitlist")
    .select("branch_id")
    .eq("user_id", user!.id)
    .neq("status", "rejected")

  if (error) {
    console.error("Error fetching waitlists:", error)
    return
  }

  setReservedBranchIds(
    new Set((data ?? []).map((w: any) => w.branch_id))
  )
}
    fetchMyWaitlists()
  }, [user])

  const filtered = branches.filter((s) => {
    const matchesType = slotFilter === 'all' || s.type === slotFilter
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleReserveClick = (branch: Branch) => {
    const isFull = branch.slots_total - branch.slots_taken <= 0
    const alreadyReserved = reservedBranchIds.has(branch .id)
    if (isFull || alreadyReserved) return

    setSelectedBranch(branch)
    if (!user) {
      setShowAuthModal(true)
    } else {
      setShowReserveModal(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    setShowReserveModal(true)
  }

  // Called after successful reservation — update local state immediately
  const handleReserveSuccess = (branchId: string) => {
    setBranches(prev =>
      prev.map(b =>
        b.id === branchId ? { ...b, slots_taken: b.slots_taken + 1 } : b
      )
    )
    setReservedBranchIds(prev => new Set([...prev, branchId]))
  }

  const renderContent = () => (
    <>
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="section-title" style={{ fontSize: '2rem' }}>Available Locations</h1>
          <p className="section-subtitle">Browse and reserve your preferred campus slots</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="printer-dropdown"
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--gray-light)', flex: '1 1 200px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--gray)', fontWeight: 500, whiteSpace: 'nowrap' }}>Filter by type:</span>
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
      </div>

      <div className="available-grid">
        {filtered.map((s) => {
          const left = s.slots_total - s.slots_taken
          const pct = Math.round((s.slots_taken / s.slots_total) * 100)
          const isFull = left <= 0
          const alreadyReserved = reservedBranchIds.has(s.id)
          const isBlocked = isFull || alreadyReserved

          return (
            <div key={s.id} className="av-card">
              <div
  className="av-img-wrap"
  style={{
    overflow: 'hidden',
    position: 'relative',
  }}
>
  {s.image_url ? (
    <img
  src={s.image_url}
  alt={s.name}
  style={{
    width: "100%",
    height: "240px",
    display: "block",
    objectFit: "cover",
    borderRadius: "8px 8px 0 0",
  }}
/>
  ) : (
    <div className="av-img-placeholder">
      {s.name[0]}
    </div>
  )}

  <span className={`av-badge ${s.tag}`}>
    {s.tag_label}
  </span>
                {/* Overlay badge for full or already reserved */}
                {isBlocked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px 8px 0 0',
                  }}>
                    <span style={{
                      background: alreadyReserved ? '#1A9B6C' : '#ef4444',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      padding: '4px 12px', borderRadius: 999, letterSpacing: '0.05em'
                    }}>
                      {alreadyReserved ? '✓ Already Reserved' : 'Fully Booked'}
                    </span>
                  </div>
                )}
              </div>

              <div className="av-card-content" style={{ padding: '1.25rem' }}>
                <div className="av-name" style={{ fontSize: '15px' }}>{s.name}</div>
                <div className="av-meta" style={{ marginBottom: '1.25rem' }}>{s.location}</div>

                <div className="av-stats-mini">
                  <div className="av-mini-stat">
                    <div className="av-mini-val">High</div>
                    <div className="av-mini-lbl">Footfall</div>
                  </div>
                  <div className="av-mini-stat">
                    <div className="av-mini-val">4k+</div>
                    <div className="av-mini-lbl">Students</div>
                  </div>
                  {/* ✅ Live slot count */}
                  <div className="av-mini-stat">
                    <div
                      className="av-mini-val"
                      style={{ color: isFull ? '#ef4444' : left === 1 ? '#f97316' : 'inherit' }}
                    >
                      {isFull ? '0' : left}
                    </div>
                    <div className="av-mini-lbl">Slots Left</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="av-slots-row" style={{ margin: '1rem 0 1.25rem' }}>
                  <div className="av-slots-bar-wrap">
                    <div
                      className="av-slots-bar"
                      style={{
                        width: `${pct}%`,
                        background: isFull ? '#ef4444' : undefined
                      }}
                    />
                  </div>
                  <span
                    className="av-slots-txt"
                    style={{ color: isFull ? '#ef4444' : left === 1 ? '#f97316' : undefined }}
                  >
                    {isFull ? 'Full' : `${left} left`}
                  </span>
                </div>

                {/* ✅ Block cursor when full or already reserved */}
                <button
                  onClick={() => handleReserveClick(s)}
                  className="av-invest-btn"
                  disabled={isBlocked}
                  style={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                    cursor: isBlocked ? 'not-allowed' : 'pointer',
                    opacity: isBlocked ? 0.55 : 1,
                    background: alreadyReserved ? '#1A9B6C' : isFull ? '#6b7280' : undefined,
                  }}
                >
                  {alreadyReserved ? '✓ Reserved' : isFull ? 'Fully Booked' : 'Reserve Now →'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  

  return (
    <div className="public-root">
      <PublicNavbar />

      <div className="public-container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        {renderContent()}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
      {selectedBranch && (
        <InvestorWaitlistModal
          branch={selectedBranch}
          isOpen={showReserveModal}
          onClose={() => setShowReserveModal(false)}
          onSuccess={handleReserveSuccess}
        />
      )}

      <footer className="public-footer">
        <div className="public-container">
          <div className="footer-bottom">
            <p>© 2026 Smart Printer Systems Pvt Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}