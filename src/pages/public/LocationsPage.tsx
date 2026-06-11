import { useState, useEffect } from 'react'

import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { ToggleGroup } from '@/components/ui/ToggleGroup'
import { AuthModal } from '@/components/auth/AuthModal'
import { InvestorWaitlistModal } from '@/components/investor/InvestorWaitlistModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { College } from '@/types/database'

export function LocationsPage() {
  const { investor } = useAuth()
  const [colleges, setColleges] = useState<College[]>([])
  const [slotFilter, setSlotFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)

  useEffect(() => {
    async function fetchColleges() {
      const { data, error } = await supabase.from('colleges').select('*')
      if (error) {
        console.error('Error fetching colleges:', error)
        return
      }
      setColleges(data as College[])
    }
    fetchColleges()
  }, [])
  
  const filtered = colleges.filter((s) => {
    const matchesType = slotFilter === 'all' || s.type === slotFilter
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.location.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleReserveClick = (college: College) => { // <--- Corrected type for college parameter
    setSelectedCollege(college)
    if (!investor) { // <--- Added conditional logic
      setShowAuthModal(true)
    } else {
      setShowReserveModal(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    setShowReserveModal(true) // <--- Open reservation modal after successful auth
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
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="printer-dropdown"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--gray-light)' }}
            />
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
      {selectedCollege && (
        <InvestorWaitlistModal
          college={selectedCollege}
          isOpen={showReserveModal}
          onClose={() => setShowReserveModal(false)}
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

