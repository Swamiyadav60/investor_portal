import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import type { UserRole } from '@/types/database'

export function LoginPage() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('investor')
  const [isSignUp, setIsSignUp] = useState(location.state?.isSignUp || false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, investor } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.isSignUp) {
      setIsSignUp(true)
      setSelectedRole('investor')
    }
  }, [location.state])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (isSignUp) {
        if (selectedRole !== 'investor') {
          throw new Error('Only Investors can register online.')
        }
        const result = await signUpWithEmail(email, password, fullName)
        if (result === 'session') {
          navigate('/dashboard')
        } else {
          setSuccess('Account created! Check your email to confirm, then sign in.')
        }
      } else {
        await signInWithEmail(email, password)
        // The AuthContext will set investor.role from the DB after sign-in.
        // We use a short setTimeout to allow the auth state listener to settle
        // and set the investor profile before we redirect.
        setTimeout(() => {
          const role = investor?.role
          if (role === 'branch_ambassador') {
            navigate('/branch/dashboard')
          } else if (role === 'admin') {
            navigate('/admin/colleges')
          } else {
            // default to investor — ProtectedRoute will correct if needed
            navigate('/dashboard')
          }
        }, 400)
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  const handleDemo = () => {
    if (selectedRole === 'branch_ambassador') {
      navigate('/branch/dashboard')
    } else if (selectedRole === 'admin') {
      navigate('/admin/colleges')
    } else {
      navigate('/dashboard')
    }
  }

  const roleConfig = {
    investor: {
      title: isSignUp ? 'Create account' : 'Welcome back',
      sub: isSignUp ? 'Start investing in smart printing kiosks' : 'Sign in to your investor dashboard',
    },
    branch_ambassador: {
      title: 'Welcome back',
      sub: 'Sign in to your branch ambassador portal',
    },
    admin: {
      title: 'Admin Sign In',
      sub: 'Access the system management dashboard',
    }
  }

  return (
    <>
      <style>{`
        .role-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }

        .role-card-item {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 6px;
          text-align: center;
          cursor: pointer;
          background: var(--white);
          transition: all 0.2s ease-in-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .role-card-item:hover {
          border-color: #A0A09A;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .role-card-item.active {
          border-color: var(--green);
          background: var(--green-l);
          box-shadow: 0 4px 16px rgba(26, 155, 108, 0.08);
        }

        .role-card-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--gray-l);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray);
          margin-bottom: 6px;
          transition: all 0.2s;
        }

        .role-card-item.active .role-card-icon-wrap {
          background: var(--green);
          color: var(--white);
        }

        .role-card-icon-wrap svg {
          width: 16px;
          height: 16px;
        }

        .role-card-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 11px;
          color: var(--ink);
          margin-bottom: 1px;
        }

        .role-card-item.active .role-card-name {
          color: var(--green-d);
        }

        .role-card-desc {
          font-size: 9px;
          color: var(--gray);
        }

        .role-card-item.active .role-card-desc {
          color: var(--green-d);
          opacity: 0.8;
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="sidebar-logo-dot" />
            <div>
              <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
              <div className="sidebar-logo-sub">Portal</div>
            </div>
          </div>

          {!isSignUp && (
            <div className="role-cards-grid">
              <div 
                className={`role-card-item ${selectedRole === 'investor' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('investor')
                  setIsSignUp(false)
                }}
              >
                <div className="role-card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
                  </svg>
                </div>
                <div className="role-card-name">Investor</div>
                <div className="role-card-desc">Partner</div>
              </div>

              <div 
                className={`role-card-item ${selectedRole === 'branch_ambassador' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('branch_ambassador')
                  setIsSignUp(false)
                }}
              >
                <div className="role-card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                </div>
                <div className="role-card-name">Ambassador</div>
                <div className="role-card-desc">Maintenance</div>
              </div>

              <div 
                className={`role-card-item ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRole('admin')
                  setIsSignUp(false)
                }}
              >
                <div className="role-card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div className="role-card-name">Admin</div>
                <div className="role-card-desc">Manager</div>
              </div>
            </div>
          )}

          <div className="auth-title">{roleConfig[selectedRole].title}</div>
          <div className="auth-sub">{roleConfig[selectedRole].sub}</div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-error" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>{success}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <input className="auth-input" placeholder="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input className="auth-input" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="auth-input" type="password" placeholder="Password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {isSupabaseConfigured && selectedRole === 'investor' && (
            <>
              <div className="auth-divider">or</div>
              <button className="auth-btn-outline" onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Continue with Google
              </button>
            </>
          )}

          {!isSupabaseConfigured && (
            <>
              <div className="auth-divider">demo mode</div>
              <button className="auth-btn-outline" onClick={handleDemo}>
                Enter {selectedRole === 'admin' ? 'Admin' : selectedRole === 'branch_ambassador' ? 'Ambassador' : ''} Demo Dashboard →
              </button>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem', textAlign: 'center' }}>
                Supabase not configured. Using mock data.
              </div>
            </>
          )}

          {selectedRole === 'investor' && (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <span className="auth-link" onClick={() => { setIsSignUp(!isSignUp); }}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
