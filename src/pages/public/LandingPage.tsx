import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { AuthModal } from '@/components/auth/AuthModal'
import { ReservationModal } from '@/components/ui/ReservationModal'
import { DEMO_COLLEGES } from '@/data/demo'
import { fmt } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import type { College } from '@/types/database'

export function LandingPage() {
  const { investor } = useAuth()
  const { hash } = useLocation()
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        // Add a slight delay to ensure content is loaded
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }, [hash])

  const handleReserveClick = (college: College) => {
    setSelectedCollege(college)
    if (!investor) {
      setShowAuthModal(true)
    } else {
      setShowReserveModal(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    setShowReserveModal(true)
  }
  const stats = [
    { label: 'Colleges Available', value: '150+' },
    { label: 'Student Reach', value: '1.2M+' },
    { label: 'Active Investors', value: '450+' },
    { label: 'Monthly Revenue', value: '₹45L+' },
  ]

  const steps = [
    { title: 'Pick a Location', desc: 'Browse premium high-traffic college campuses and transit hubs.' },
    { title: 'Reserve a Slot', desc: 'Pay a small reservation fee to hold your preferred printer slot.' },
    { title: 'Launch & Earn', desc: 'We handle setup, maintenance, and ink. You earn a share of every page printed.' },
  ]

  return (
    <div className="public-root">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-badge">Now Open: Phase 4 Expansion</span>
            <h1 className="hero-title">Smart Campus Printing Infrastructure</h1>
            <p className="hero-subtitle">Invest in the future of education services. Reserve premium college locations and start earning passive income through automated smart kiosks.</p>
            <div className="hero-btns">
              <Link to="/locations" className="hero-btn-primary">View Available Slots</Link>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hero-btn-secondary">Learn More</button>
            </div>
          </div>
          <div className="hero-image-wrap">
             <div className="hero-image-gradient" />
             <img src="/src/assets/hero.png" alt="VPrint Kiosk" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="public-container">
          <div className="stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat-item">
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locations Preview */}
      <section className="locations-preview">
        <div className="public-container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Premium Locations</h2>
              <p className="section-subtitle">High-traffic zones with guaranteed student footfall</p>
            </div>
            <Link to="/locations" className="view-all-link">View all 150+ locations →</Link>
          </div>
          
          <div className="available-grid">
            {DEMO_COLLEGES.slice(0, 3).map((s) => {
              const left = s.slots_total - s.slots_taken
              return (
                <div key={s.id} className="av-card">
                  <div className="av-img-wrap">
                    <div className="av-img-placeholder">{s.name[0]}</div>
                    <span className={`av-badge ${s.tag}`}>{s.tag_label}</span>
                  </div>
                  <div className="av-card-content" style={{ padding: '1.25rem' }}>
                    <div className="av-name">{s.name}</div>
                    <div className="av-meta" style={{ marginBottom: '1rem' }}>{s.location}</div>
                    
                    <div className="av-stats-mini">
                      <div className="av-mini-stat">
                        <div className="av-mini-val">4.5k+</div>
                        <div className="av-mini-lbl">Students</div>
                      </div>
                      <div className="av-mini-stat">
                        <div className="av-mini-val">{left}</div>
                        <div className="av-mini-lbl">Slots left</div>
                      </div>
                    </div>

                    <div className="av-earn" style={{ margin: '1rem 0' }}>
                      <div>
                        <div className="av-earn-val">{fmt(s.avg_monthly_earnings)}</div>
                        <div className="av-earn-lbl">Avg earnings /mo</div>
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
      </section>

      {/* How it works */}
      <section id="how-it-works" className="how-it-works">
        <div className="public-container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>How It Works</h2>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={step.title} className="step-card">
                <div className="step-num">{i + 1}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="benefits-section">
        <div className="public-container">
          <div className="benefits-card">
            <div className="benefits-content">
              <h2 className="section-title" style={{ color: 'var(--white)' }}>Investor Benefits</h2>
              <ul className="benefits-list">
                <li><strong>Passive Income:</strong> Earn while you sleep as students print 24/7.</li>
                <li><strong>Zero Maintenance:</strong> We handle all hardware repairs and paper/ink refills.</li>
                <li><strong>Realtime Tracking:</strong> Monitor every single print job from your phone.</li>
                <li><strong>High ROI:</strong> Most investors recover their capital within 12-14 months.</li>
              </ul>
              <Link to="/login" className="hero-btn-primary" style={{ marginTop: '2rem' }}>Get Started Today</Link>
            </div>
            <div className="benefits-visual">
              <div className="benefits-circle" />
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
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
          <div className="footer-top">
            <div className="footer-brand">
              <div className="public-nav-logo">
                <div className="sidebar-logo-dot" />
                <div className="sidebar-logo-text" style={{ color: '#fff' }}>Smart Printer</div>
              </div>
              <p className="footer-tagline">Building India's largest smart printing network.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 VPrint Systems Pvt Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
