import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { AuthModal } from '@/components/auth/AuthModal'
import { InvestorWaitlistModal } from '@/components/investor/InvestorWaitlistModal'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import type { College } from '@/types/database'
import heroImage from '@/assets/hero.png'

export function LandingPage() {
  const { investor } = useAuth()
  const { hash } = useLocation()
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [colleges, setColleges] = useState<College[]>([])
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [reservedCollegeIds, setReservedCollegeIds] = useState<Set<string>>(new Set())

  // Fetch colleges + real-time subscription
  useEffect(() => {
    async function fetchColleges() {
      const { data, error } = await supabase.from('colleges').select('*').limit(3)
      if (error) { console.error('Error fetching colleges:', error); return }
      setColleges(data as College[])
    }
    fetchColleges()

    // Real-time: slot count updates instantly for ALL users
    const channel = supabase
      .channel('landing-colleges-slots')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'colleges' },
        (payload) => {
          setColleges(prev =>
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } as College : c)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Fetch which colleges THIS investor already reserved
  useEffect(() => {
    if (!investor) { setReservedCollegeIds(new Set()); return }
    async function fetchMyWaitlists() {
      const { data, error } = await supabase
        .from('waitlists')
        .select('college_id')
        .eq('investor_id', investor!.id)
        .neq('status', 'rejected')
      if (error) { console.error('Error fetching waitlists:', error); return }
      setReservedCollegeIds(new Set(data.map((w: any) => w.college_id)))
    }
    fetchMyWaitlists()
  }, [investor])

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        setTimeout(() => { element.scrollIntoView({ behavior: 'smooth' }) }, 100)
      }
    }
  }, [hash])

  const handleReserveClick = (college: College) => {
    const isFull = college.slots_total - college.slots_taken <= 0
    const alreadyReserved = reservedCollegeIds.has(college.id)
    if (isFull || alreadyReserved) return

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

  // Update slot count + mark as reserved immediately after success
  const handleReserveSuccess = (collegeId: string) => {
    setColleges(prev =>
      prev.map(c =>
        c.id === collegeId ? { ...c, slots_taken: c.slots_taken + 1 } : c
      )
    )
    setReservedCollegeIds(prev => new Set([...prev, collegeId]))
  }

  const steps = [
    { title: 'Pick a Location', desc: 'Browse premium high-traffic college campuses and transit hubs.' },
    { title: 'Reserve a Slot', desc: 'Pay a small reservation fee to hold your preferred printer slot.' },
    { title: 'Launch & Earn', desc: 'We handle setup, maintenance, and ink. You earn a share of every page printed.' },
  ]

  return (
    <div className="public-root">
      <PublicNavbar />

      {/* Premium Hero Section */}
      <section className="hero-section premium-hero">
        <div className="hero-mesh" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid-lines" />
        </div>

        <div className="hero-container">
          <div className="hero-content fade-up" style={{ animationDelay: '0s' }}>
            <div className="hero-badge-premium fade-up" style={{ animationDelay: '0.1s' }}>
              <span className="live-dot" />
              <span>Now Open — Phase 2 Expansion</span>
            </div>

            <h1 className="hero-title fade-up" style={{ animationDelay: '0.2s' }}>
              India's Smartest<br />
              <span className="text-gradient">Campus Printing</span><br />
              <span className="hero-title-sub">Investment Platform</span>
            </h1>

            <p className="hero-subtitle fade-up" style={{ animationDelay: '0.3s' }}>
              Invest in automated Smart Printer kiosks across premium college campuses.
              <strong> ₹40,000 one-time</strong>, earn passive income — fully managed by us.
            </p>

            <div className="hero-btns fade-up" style={{ animationDelay: '0.4s' }}>
              <Link to="/locations" className="hero-btn-primary">
                View Available Slots
                <svg className="btn-arrow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="hero-btn-secondary"
              >
                <span className="play-icon">▶</span> How it Works
              </button>
            </div>

            <div className="hero-trust fade-up" style={{ animationDelay: '0.5s' }}>
              <div className="hero-trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Zero maintenance
              </div>
              <div className="hero-trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                8-month payback
              </div>
              <div className="hero-trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                20+ active printers
              </div>
            </div>

            <div className="hero-social-proof fade-up" style={{ animationDelay: '0.6s' }}>
              <div className="avatar-group">
                <img src="https://i.pravatar.cc/100?img=11" alt="Investor" className="avatar" />
                <img src="https://i.pravatar.cc/100?img=32" alt="Investor" className="avatar" />
                <img src="https://i.pravatar.cc/100?img=12" alt="Investor" className="avatar" />
                <img src="https://i.pravatar.cc/100?img=48" alt="Investor" className="avatar" />
                <div className="avatar-more">+</div>
              </div>
              <div className="social-text">
                <strong>15+ investors</strong> already earning passive income
              </div>
            </div>
          </div>

          <div className="hero-image-wrap fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="hero-image-bg" />
            <div className="hero-image-gradient" />
            <div className="hero-floating-card card-1 float-anim">
              <div className="fc-icon">⚡</div>
              <div className="fc-text">
                <div className="fc-val">₹40,000</div>
                <div className="fc-lbl">per kiosk</div>
              </div>
            </div>
            <div className="hero-floating-card card-2 float-anim-delayed">
              <div className="fc-icon">📈</div>
              <div className="fc-text">
                <div className="fc-val">100%</div>
                <div className="fc-lbl">Passive — We Handle All</div>
              </div>
            </div>
            <div className="hero-floating-card card-3 float-anim">
              <div className="fc-icon">🏆</div>
              <div className="fc-text">
                <div className="fc-val">8 months</div>
                <div className="fc-lbl">Avg. Payback Period</div>
              </div>
            </div>
            <img src={heroImage} alt="Smart Printer Smart Kiosk" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Numbers Section */}
      <section className="numbers-section">
        <div className="public-container">
          <div className="numbers-header">
            <span className="numbers-label">BY THE NUMBERS</span>
          </div>
          <div className="numbers-grid">
            <div className="num-item">
              <div className="num-val">₹30,000</div>
              <div className="num-desc">One-time slot investment.<br />Hardware & setup included.</div>
            </div>
            <div className="num-item">
              <div className="num-val">₹3,500<span className="num-plus">+</span></div>
              <div className="num-desc">Average monthly passive<br />income per printer slot</div>
            </div>
            <div className="num-item">
              <div className="num-val">8 <span className="num-mo">months</span></div>
              <div className="num-desc">Typical full payback period.<br />Profitable from month 9 onward.</div>
            </div>
            <div className="num-item">
              <div className="num-val">20<span className="num-plus">+</span></div>
              <div className="num-desc">Printers already active across<br />Hyderabad</div>
            </div>
          </div>
          <div className="numbers-divider"></div>
          <div className="numbers-actions">
            <button
              onClick={() => document.getElementById('locations-preview')?.scrollIntoView({ behavior: 'smooth' })}
              className="num-btn num-btn-dark"
            >
              <span className="num-btn-dot"></span>
              Join waitlist →
            </button>
            <button
              onClick={() => document.getElementById('locations-preview')?.scrollIntoView({ behavior: 'smooth' })}
              className="num-btn num-btn-gold"
            >
              <svg className="num-btn-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Join priority waitlist <span className="num-btn-price">₹499</span>
            </button>
          </div>
        </div>
      </section>

      {/* Locations Preview */}
      <section id="locations-preview" className="locations-preview">
        <div className="public-container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Premium Locations</h2>
              <p className="section-subtitle">High-traffic zones with guaranteed student footfall</p>
            </div>
            <Link to="/locations" className="view-all-link">View all 15+ locations →</Link>
          </div>

          <div className="available-grid">
            {colleges.map((s) => {
              const left = s.slots_total - s.slots_taken
              const pct = Math.round((s.slots_taken / s.slots_total) * 100)
              const isFull = left <= 0
              const alreadyReserved = reservedCollegeIds.has(s.id)
              const isBlocked = isFull || alreadyReserved

              return (
                <div key={s.id} className="av-card">
                  <div className="av-img-wrap" style={{ position: 'relative' }}>
                    <div className="av-img-placeholder">{s.name[0]}</div>
                    <span className={`av-badge ${s.tag}`}>{s.tag_label}</span>

                    {/* Overlay for full or already reserved */}
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
                    <div className="av-name">{s.name}</div>
                    <div className="av-meta" style={{ marginBottom: '1rem' }}>{s.location}</div>

                    <div className="av-stats-mini">
                      <div className="av-mini-stat">
                        <div className="av-mini-val">4.5k+</div>
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
                        <div className="av-mini-lbl">Slots left</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ margin: '0.75rem 0' }}>
                      <div className="av-slots-bar-wrap">
                        <div
                          className="av-slots-bar"
                          style={{
                            width: `${pct}%`,
                            background: isFull ? '#ef4444' : undefined
                          }}
                        />
                      </div>
                    </div>

                    <div className="av-earn" style={{ margin: '1rem 0' }}>
                      <div>
                        <div className="av-earn-val">{fmt(s.avg_monthly_earnings)}</div>
                        <div className="av-earn-lbl">Avg earnings /mo</div>
                      </div>
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
              <Link to="/login" className="hero-btn-primary" style={{ marginTop: '2rem', backgroundColor: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--border)' }}>Get Started Today</Link>
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
      {selectedCollege && (
        <InvestorWaitlistModal
          college={selectedCollege}
          isOpen={showReserveModal}
          onClose={() => setShowReserveModal(false)}
          onSuccess={handleReserveSuccess}
        />
      )}

      <footer className="site-footer">
        <div className="public-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-logo">
                <div className="sidebar-logo-dot" style={{ backgroundColor: 'var(--green)' }} />
                <div className="sidebar-logo-text">Smart Printer</div>
              </div>
              <p className="footer-desc">
                Building India's largest smart printing network. Passive income for investors, convenience for customers.
              </p>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">COMPANY</h4>
              <ul className="footer-list">
                <li><Link to="#">About Us</Link></li>
                <li><Link to="#">How It Works</Link></li>
                <li>
                  <Link to="#" className="footer-link-badge">
                    Careers <span className="hiring-badge">Hiring</span>
                  </Link>
                </li>
                <li><Link to="#">Press & Media</Link></li>
                <li><Link to="#">Blog</Link></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">INVESTORS</h4>
              <ul className="footer-list">
                <li><Link to="#">Investor Portal</Link></li>
                <li><Link to="/locations">Available Locations</Link></li>
                <li><Link to="#">ROI Calculator</Link></li>
                <li><Link to="#">Testimonials</Link></li>
                <li><Link to="#">FAQs</Link></li>
              </ul>
            </div>

            <div className="footer-contact-col">
              <h4 className="footer-heading">CONTACT</h4>
              <ul className="footer-contact-list">
                <li>
                  <span className="contact-icon">✉</span>
                  <a href="mailto:zayvionprivatelimited@gmail.com">zayvionprivatelimited@gmail.com</a>
                </li>
                <li>
                  <span className="contact-icon">☎</span>
                  <a href="tel:+918143632036">+91 8143632036</a>
                </li>
                <li>
                  <span className="contact-icon">📍</span>
                  <span>Hyderabad, India</span>
                </li>
              </ul>
              <div className="support-hours">
                <div className="support-lbl">Support hours</div>
                <div className="support-val">Mon–Sat, 9am – 7pm IST</div>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-copyright">
              © 2026 Zayvion Pvt Ltd. All rights reserved.
            </div>
            <div className="footer-legal-links">
              <Link to="#">Privacy Policy</Link>
              <Link to="#">Terms of Service</Link>
              <Link to="#">Cookie Policy</Link>
              <Link to="#">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}