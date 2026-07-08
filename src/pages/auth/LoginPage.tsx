import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { useToast } from '@/components/ui/Toast'
import type { UserRole } from '@/types/database'

export function LoginPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  
  // Basic states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('branch_owner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { signInWithEmail, loginAsDemo } = useAuth()

  const validateForm = () => {
    const errs: Record<string, string> = {}
    
    // Core credentials validations
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Invalid email address.'
    }

    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      toast('Please correct the validation errors in the form.', 'error')
      return
    }

    setLoading(true)
    try {
      const profile = await signInWithEmail(email, password, selectedRole)
      toast('Logged in successfully.', 'success')

      const role = profile?.role
      if (role === 'branch') {
        navigate('/branch/dashboard')
      } else if (role === 'admin') {
        navigate('/admin/colleges')
      } else {
        navigate('/dashboard')
      }
      setLoading(false)
    } catch (err: any) {
      const roleLabel = selectedRole === 'branch'? 'Branch': 'Branch Owner'
      const errMsg = err?.code === 'ROLE_MISMATCH'
        ? `This account is not registered as ${roleLabel}. Please select the correct role and try again.`
        : getAuthErrorMessage(err)
      setError(errMsg)
      toast(errMsg, 'error')
      setLoading(false)
    }
  }


  const handleDemo = () => {
    loginAsDemo(selectedRole)
    if (selectedRole === 'branch'){
      navigate('/branch/dashboard')
    } else {
      navigate('/dashboard')
    }
  }

  const roleConfig = {
    branch_owner: {
      title: 'Welcome back',
      sub: 'Sign in to your investor dashboard',
    },
    branch: {
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
          grid-template-columns: repeat(2, 1fr);
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

        .auth-field-group {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          margin-bottom: 1rem;
        }

        .auth-field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--gray);
          margin-bottom: 6px;
          text-align: left;
        }

        .field-error-msg {
          font-size: 10px;
          color: var(--red);
          margin-top: 4px;
          font-weight: 500;
          text-align: left;
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="auth-logo">
            <div className="sidebar-logo-dot" />
            <div>
              <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
              <div className="sidebar-logo-sub">Portal</div>
            </div>
          </div>

          <div className="role-cards-grid">
            <div 
              className={`role-card-item ${selectedRole === 'branch_owner' ? 'active' : ''}`}
              onClick={() => setSelectedRole('branch_owner')}
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
              className={`role-card-item ${selectedRole === 'branch' ? 'active' : ''}`}
              onClick={() => setSelectedRole('branch')}
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

          </div>
          <div className="auth-title">{roleConfig[selectedRole].title}</div>
          <div className="auth-sub">{roleConfig[selectedRole].sub}</div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
            <div className="auth-field-group">
              <span className="auth-field-label">Email Address</span>
              <input 
                className={`auth-input ${errors.email ? 'input-error' : ''}`}
                type="email" 
                placeholder="Email address" 
                autoComplete="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
              {errors.email && <span className="field-error-msg">{errors.email}</span>}
            </div>

            <div className="auth-field-group">
              <span className="auth-field-label">Password</span>
              <input 
                className={`auth-input ${errors.password ? 'input-error' : ''}`}
                type="password" 
                placeholder="Password" 
                autoComplete="current-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6} 
              />
              {errors.password && <span className="field-error-msg">{errors.password}</span>}
            </div>

            <button className="auth-btn" type="submit" disabled={loading} style={{ marginTop: '1.25rem' }}>
              {loading ? 'Please wait...' : 'Sign in'}
            </button>
          </form>

          
          {!isSupabaseConfigured && (
            <>
              <div className="auth-divider">demo mode</div>
              <button className="auth-btn-outline" onClick={handleDemo}>
                Enter {selectedRole === 'admin' ? 'Admin' : selectedRole === 'branch' ? 'Branch' : selectedRole === 'branch_owner' ? 'Branch Owner' : ''} Demo Dashboard →
              </button>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem', textAlign: 'center' }}>
                Supabase not configured. Using mock data.
              </div>
            </>
          )}

          {selectedRole === 'branch_owner' && (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <span className="auth-link" onClick={() => navigate('/signup')}>
                Don't have an account? Sign up
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}