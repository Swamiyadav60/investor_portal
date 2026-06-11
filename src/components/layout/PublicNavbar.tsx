import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function PublicNavbar() {
  const { investor } = useAuth()
  const navigate = useNavigate()

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="public-nav">
      <div className="public-nav-container">
        <Link to="/" className="public-nav-logo">
          <div className="sidebar-logo-dot" />
          <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
        </Link>

        <div className="public-nav-links">
          <Link to="/locations" className="public-nav-link">Available Locations</Link>
          <button onClick={() => scrollToSection('how-it-works')} className="public-nav-link-btn">How It Works</button>
          <button onClick={() => scrollToSection('benefits')} className="public-nav-link-btn">Investor Benefits</button>
        </div>

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
      </div>
    </nav>
  )
}
