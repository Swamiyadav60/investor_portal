import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function PublicNavbar() {
  const { investor } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="public-nav">
      <div className="public-nav-container">
        <Link to="/" className="public-nav-logo">
          <div className="sidebar-logo-dot" />
          <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
        </Link>

        <div className="public-nav-links">
          <Link to="/" className="public-nav-link">Home</Link>
          <Link to="/locations" className="public-nav-link">Available Locations</Link>
          <Link to="/#how-it-works" className="public-nav-link">How It Works</Link>
          <Link to="/#benefits" className="public-nav-link">Investor Benefits</Link>
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
