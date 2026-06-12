import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function PublicNavbar() {
  const { investor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname, location.hash])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Ensure we didn't click the hamburger button itself
        const hamburgerBtn = document.querySelector('.public-nav-hamburger')
        if (hamburgerBtn && hamburgerBtn.contains(event.target as Node)) {
          return
        }
        setIsMobileMenuOpen(false)
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <nav className="public-nav">
      <div className="public-nav-container">
        <Link to="/" className="public-nav-logo">
          <div className="sidebar-logo-dot" />
          <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
        </Link>

        {/* Desktop Links */}
        <div className="public-nav-links">
          <Link to="/" className="public-nav-link">Home</Link>
          <Link to="/locations" className="public-nav-link">Available Locations</Link>
          <Link to="/#how-it-works" className="public-nav-link">How It Works</Link>
          <Link to="/#benefits" className="public-nav-link">Investor Benefits</Link>
        </div>

        {/* Desktop Actions */}
        <div className="public-nav-actions">
          {investor ? (
            <button className="public-nav-btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          ) : (
            <>
              <Link to="/login" className="public-nav-btn-outline">Login</Link>
              <Link to="/login" className="public-nav-btn-primary" state={{ isSignUp: true }}>Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className={`public-nav-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Mobile Menu Popup */}
        <div 
          ref={menuRef}
          className={`public-nav-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}
        >
          <div className="mobile-menu-content">
            <Link to="/" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link to="/locations" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Available Locations</Link>
            <Link to="/#how-it-works" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>How It Works</Link>
            <Link to="/#benefits" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Investor Benefits</Link>
            
            <div className="mobile-menu-divider" />
            
            <div className="mobile-menu-actions">
              {investor ? (
                <button className="public-nav-btn-primary mobile-full-width" onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}>Go to Dashboard</button>
              ) : (
                <>
                  <Link to="/login" className="public-nav-btn-outline mobile-full-width text-center" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                  <Link to="/login" className="public-nav-btn-primary mobile-full-width text-center" state={{ isSignUp: true }} onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
