import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { AuthModal } from '@/components/auth/AuthModal'
import { ReservationModal } from '@/components/ui/ReservationModal'
import { DEMO_COLLEGES } from '@/data/demo'
import { fmt } from '@/lib/format'

export function LocationsPage() {
  const [slotFilter, setSlotFilter] = useState('all')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCollege, setSelectedCollege] = useState(null)
  const filtered = slotFilter === 'all' ? DEMO_COLLEGES : DEMO_COLLEGES.filter((s) => s.type === slotFilter)

  const handleReserveClick = (college: any) => {
    setSelectedCollege(college)
    setShowReserveModal(true)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
  }

  return (
    <div className="public-root">
      <PublicNavbar />
      
      <div className="public-container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '2rem' }}>Available Locations</h1>
            <p className="section-subtitle">Browse and reserve your preferred campus slots</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--gray)', fontWeight: 500 }}>Filter by type:</span>
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
                <div className="av-img-wrap">
                  <div className="av-img-placeholder">{s.name[0]}</div>
                  <span className={`av-badge ${s.tag}`}>{s.tag_label}</span>
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
                  </div>

                  <div className="av-slots-row" style={{ margin: '1.25rem 0' }}>
                    <div className="av-slots-bar-wrap"><div className="av-slots-bar" style={{ width: `${pct}%` }} /></div>
                    <span className="av-slots-txt">{left} slot{left !== 1 ? 's' : ''} left</span>
                  </div>

                  <div className="av-earn" style={{ margin: '1.25rem 0' }}>
                    <div>
                      <div className="av-earn-val">{fmt(s.avg_monthly_earnings)}</div>
                      <div className="av-earn-lbl">Avg earnings /mo</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmt(s.investment_amount)}</div>
                      <div className="av-earn-lbl">Investment</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReserveClick(s)} 
                    className="av-invest-btn" 
                    style={{ width: '100%', display: 'block', textAlign: 'center' }}
                  >
                    Reserve Now →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={handleAuthSuccess} 
      />
      <ReservationModal 
        college={selectedCollege} 
        isOpen={showReserveModal} 
        onClose={() => setShowReserveModal(false)} 
      />


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
