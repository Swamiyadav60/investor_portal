import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { useToast } from '@/components/ui/Toast'
import type { UserRole } from '@/types/database'

export function LoginPage() {
  const location = useLocation()
  const { toast } = useToast()
  
  // Basic states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('investor')
  const [isSignUp, setIsSignUp] = useState(location.state?.isSignUp || false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Extended KYC / Bank states
  const [mobileNumber, setMobileNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, investor } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.isSignUp) {
      setIsSignUp(true)
      setSelectedRole('investor')
    }
  }, [location.state])

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

    // KYC & Bank Details validations
    if (isSignUp) {
      if (!fullName.trim()) {
        errs.fullName = 'Full Name is required.'
      }
      
      const phoneClean = mobileNumber.trim()
      if (!phoneClean) {
        errs.mobileNumber = 'Mobile Number is required.'
      } else if (!/^[0-9]{10}$/.test(phoneClean)) {
        errs.mobileNumber = 'Mobile Number must be exactly 10 digits.'
      }

      const panClean = panNumber.trim().toUpperCase()
      if (!panClean) {
        errs.panNumber = 'PAN Number is required.'
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panClean)) {
        errs.panNumber = 'Invalid PAN format. Must be in ABCDE1234F format.'
      }

      const aadhaarClean = aadhaarNumber.trim().replace(/\s+/g, '')
      if (!aadhaarClean) {
        errs.aadhaarNumber = 'Aadhaar Number is required.'
      } else if (!/^[0-9]{12}$/.test(aadhaarClean)) {
        errs.aadhaarNumber = 'Aadhaar Number must be exactly 12 digits.'
      }

      if (!bankAccountHolder.trim()) {
        errs.bankAccountHolder = 'Account Holder Name is required.'
      }

      const bankAccClean = bankAccountNumber.trim()
      if (!bankAccClean) {
        errs.bankAccountNumber = 'Bank Account Number is required.'
      } else if (!/^[0-9]+$/.test(bankAccClean)) {
        errs.bankAccountNumber = 'Account Number must contain digits only.'
      }

      const ifscClean = ifscCode.trim().toUpperCase()
      if (!ifscClean) {
        errs.ifscCode = 'IFSC Code is required.'
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
        errs.ifscCode = 'Invalid IFSC format (e.g. HDFC0000123).'
      }

      if (!bankName.trim()) {
        errs.bankName = 'Bank Name is required.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    // Perform all validation checks
    if (!validateForm()) {
      toast('Please correct the validation errors in the form.', 'error')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        if (selectedRole !== 'investor') {
          throw new Error('Only Investors can register online.')
        }

        const kycDetails = {
          mobile_number: mobileNumber.trim(),
          pan_number: panNumber.trim().toUpperCase(),
          aadhaar_number: aadhaarNumber.trim().replace(/\s+/g, ''),
          bank_account_holder: bankAccountHolder.trim(),
          bank_account_number: bankAccountNumber.trim(),
          ifsc_code: ifscCode.trim().toUpperCase(),
          bank_name: bankName.trim(),
        }

        const result = await signUpWithEmail(email, password, fullName, kycDetails)
        
        if (result === 'session') {
          toast('Registration successful! Welcome aboard.', 'success')
          navigate('/dashboard')
        } else {
          setSuccess('Account created! Check your email to confirm, then sign in.')
          toast('Account created! Please check your email to confirm.', 'success')
        }
      } else {
        await signInWithEmail(email, password)
        toast('Logged in successfully.', 'success')
        
        setTimeout(() => {
          const role = investor?.role
          if (role === 'branch_ambassador') {
            navigate('/branch/dashboard')
          } else if (role === 'admin') {
            navigate('/admin/colleges')
          } else {
            navigate('/dashboard')
          }
        }, 400)
      }
    } catch (err) {
      const errMsg = getAuthErrorMessage(err)
      setError(errMsg)
      toast(errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(errMsg)
      toast(errMsg, 'error')
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

        .auth-section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 11px;
          color: var(--ink);
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .auth-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        @media (max-width: 600px) {
          .auth-form-grid {
            grid-template-columns: 1fr;
          }
        }

        .auth-field-group {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          margin-bottom: 0.5rem;
        }

        .auth-field-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--gray);
          margin-bottom: 4px;
          text-align: left;
        }

        .field-error-msg {
          font-size: 9px;
          color: var(--red);
          margin-top: 3px;
          font-weight: 500;
          text-align: left;
        }
      `}</style>

      <div className="auth-page">
        <div 
          className="auth-card" 
          style={{ 
            maxWidth: isSignUp ? '550px' : '400px', 
            transition: 'max-width 0.3s ease-in-out',
            width: '100%'
          }}
        >
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

          <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
            {isSignUp ? (
              <>
                {/* Account Credentials */}
                <div className="auth-section-title" style={{ marginTop: 0 }}>Account Credentials</div>
                
                <div className="auth-field-group">
                  <span className="auth-field-label">Full Name</span>
                  <input 
                    className="auth-input" 
                    placeholder="e.g. Ramesh Kumar" 
                    autoComplete="name" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                  />
                  {errors.fullName && <span className="field-error-msg">{errors.fullName}</span>}
                </div>

                <div className="auth-form-grid">
                  <div className="auth-field-group">
                    <span className="auth-field-label">Email Address</span>
                    <input 
                      className="auth-input" 
                      type="email" 
                      placeholder="e.g. ramesh@gmail.com" 
                      autoComplete="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                    {errors.email && <span className="field-error-msg">{errors.email}</span>}
                  </div>
                  <div className="auth-field-group">
                    <span className="auth-field-label">Password (min 6 chars)</span>
                    <input 
                      className="auth-input" 
                      type="password" 
                      placeholder="Password" 
                      autoComplete="new-password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                    {errors.password && <span className="field-error-msg">{errors.password}</span>}
                  </div>
                </div>

                {/* KYC & Bank Details */}
                <div className="auth-section-title">KYC & Bank Details</div>
                
                <div className="auth-form-grid">
                  <div className="auth-field-group">
                    <span className="auth-field-label">KYC Mobile Number</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="exactly 10 digits" 
                      value={mobileNumber} 
                      onChange={(e) => setMobileNumber(e.target.value)} 
                    />
                    {errors.mobileNumber && <span className="field-error-msg">{errors.mobileNumber}</span>}
                  </div>

                  <div className="auth-field-group">
                    <span className="auth-field-label">PAN Number</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="e.g. ABCDE1234F" 
                      value={panNumber} 
                      onChange={(e) => setPanNumber(e.target.value)} 
                    />
                    {errors.panNumber && <span className="field-error-msg">{errors.panNumber}</span>}
                  </div>

                  <div className="auth-field-group" style={{ gridColumn: 'span 2' }}>
                    <span className="auth-field-label">Aadhaar Card Number</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="exactly 12 digits" 
                      value={aadhaarNumber} 
                      onChange={(e) => setAadhaarNumber(e.target.value)} 
                    />
                    {errors.aadhaarNumber && <span className="field-error-msg">{errors.aadhaarNumber}</span>}
                  </div>

                  <div className="auth-field-group">
                    <span className="auth-field-label">Account Holder Name</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar" 
                      value={bankAccountHolder} 
                      onChange={(e) => setBankAccountHolder(e.target.value)} 
                    />
                    {errors.bankAccountHolder && <span className="field-error-msg">{errors.bankAccountHolder}</span>}
                  </div>

                  <div className="auth-field-group">
                    <span className="auth-field-label">Bank Name</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="e.g. HDFC Bank" 
                      value={bankName} 
                      onChange={(e) => setBankName(e.target.value)} 
                    />
                    {errors.bankName && <span className="field-error-msg">{errors.bankName}</span>}
                  </div>

                  <div className="auth-field-group">
                    <span className="auth-field-label">Account Number</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="digits only" 
                      value={bankAccountNumber} 
                      onChange={(e) => setBankAccountNumber(e.target.value)} 
                    />
                    {errors.bankAccountNumber && <span className="field-error-msg">{errors.bankAccountNumber}</span>}
                  </div>

                  <div className="auth-field-group">
                    <span className="auth-field-label">IFSC Code</span>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="e.g. HDFC0000123" 
                      value={ifscCode} 
                      onChange={(e) => setIfscCode(e.target.value)} 
                    />
                    {errors.ifscCode && <span className="field-error-msg">{errors.ifscCode}</span>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <input className="auth-input" type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className="auth-input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </>
            )}

            <button className="auth-btn" type="submit" disabled={loading} style={{ marginTop: '1.25rem' }}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {isSupabaseConfigured && selectedRole === 'investor' && !isSignUp && (
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
              <span className="auth-link" onClick={() => { setIsSignUp(!isSignUp); setErrors({}); setError(''); setSuccess(''); }}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
