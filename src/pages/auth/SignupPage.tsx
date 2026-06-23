import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { useToast } from '@/components/ui/Toast'
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal'
import { OnboardingModal } from '@/components/auth/OnboardingModal'
import type { SignupFormData } from '@/types/database'

type SignupStep = 'form' | 'verify_email' | 'onboarding'

export function SignupPage() {
  const { toast } = useToast()
  const { signUpWithEmail } = useAuth()

  const [step, setStep] = useState<SignupStep>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<SignupFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const updateField = (field: keyof SignupFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  // Field-level validation
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {}

    if (!form.fullName.trim()) {
      errs.fullName = 'Full name is required.'
    }

    if (!form.email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.'
    }

    const phoneClean = form.phone.trim().replace(/\s+/g, '')
    if (!phoneClean) {
      errs.phone = 'Phone number is required.'
    } else if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number.'
    }

    if (!form.password) {
      errs.password = 'Password is required.'
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.'
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    return errs
  }, [form])

  const isFormValid = Object.keys(validationErrors).length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mark all fields as touched
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    })

    if (!isFormValid) {
      toast('Please fix the validation errors.', 'error')
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail(
        form.email.trim(),
        form.password,
        form.fullName.trim(),
        form.phone.trim().replace(/\s+/g, ''),
      )
      setStep('verify_email')
    } catch (err) {
      const errMsg = getAuthErrorMessage(err)
      setError(errMsg)
      toast(errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailVerified = () => {
    setStep('onboarding')
  }

  // If showing email verification or onboarding, render those modals over the signup page
  if (step === 'verify_email') {
    return (
      <div className="signup-page">
        <EmailVerificationModal
          email={form.email}
          onVerified={handleEmailVerified}
        />
      </div>
    )
  }

  if (step === 'onboarding') {
    return (
      <OnboardingModal
        prefillName={form.fullName.trim()}
      />
    )
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        {/* Header */}
        <div className="auth-logo">
          <div className="sidebar-logo-dot" />
          <div>
            <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
            <div className="sidebar-logo-sub">Portal</div>
          </div>
        </div>

        <div className="auth-title">Create your account</div>
        <div className="auth-sub">Start investing in smart printing kiosks</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="signup-form">
          {/* Full Name */}
          <div className="signup-field">
            <label className="signup-label" htmlFor="signup-fullname">
              Full Name <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <svg className="signup-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
              <input
                id="signup-fullname"
                className={`auth-input signup-input ${touched.fullName && validationErrors.fullName ? 'input-error' : ''}`}
                type="text"
                placeholder="e.g. Ramesh Kumar"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                onBlur={() => markTouched('fullName')}
              />
            </div>
            {touched.fullName && validationErrors.fullName && (
              <span className="signup-error-msg">{validationErrors.fullName}</span>
            )}
          </div>

          {/* Email */}
          <div className="signup-field">
            <label className="signup-label" htmlFor="signup-email">
              Email Address <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <svg className="signup-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                id="signup-email"
                className={`auth-input signup-input ${touched.email && validationErrors.email ? 'input-error' : ''}`}
                type="email"
                placeholder="e.g. ramesh@gmail.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => markTouched('email')}
              />
            </div>
            {touched.email && validationErrors.email && (
              <span className="signup-error-msg">{validationErrors.email}</span>
            )}
          </div>

          {/* Phone */}
          <div className="signup-field">
            <label className="signup-label" htmlFor="signup-phone">
              Phone Number <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <span className="signup-phone-prefix">+91</span>
              <input
                id="signup-phone"
                className={`auth-input signup-input signup-input-phone ${touched.phone && validationErrors.phone ? 'input-error' : ''}`}
                type="tel"
                placeholder="9876543210"
                autoComplete="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                  updateField('phone', val)
                }}
                onBlur={() => markTouched('phone')}
              />
            </div>
            {touched.phone && validationErrors.phone && (
              <span className="signup-error-msg">{validationErrors.phone}</span>
            )}
          </div>

          {/* Password fields grid */}
          <div className="signup-password-grid">
            <div className="signup-field">
              <label className="signup-label" htmlFor="signup-password">
                Create Password <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="signup-password"
                  className={`auth-input signup-input ${touched.password && validationErrors.password ? 'input-error' : ''}`}
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  onBlur={() => markTouched('password')}
                />
              </div>
              {touched.password && validationErrors.password && (
                <span className="signup-error-msg">{validationErrors.password}</span>
              )}
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="signup-confirm">
                Confirm Password <span className="signup-required">*</span>
              </label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <input
                  id="signup-confirm"
                  className={`auth-input signup-input ${touched.confirmPassword && validationErrors.confirmPassword ? 'input-error' : ''}`}
                  type="password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  onBlur={() => markTouched('confirmPassword')}
                />
              </div>
              {touched.confirmPassword && validationErrors.confirmPassword && (
                <span className="signup-error-msg">{validationErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            className="auth-btn signup-submit-btn"
            type="submit"
            disabled={loading || !isFormValid}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <span className="signup-loading">
                <span className="signup-spinner" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer link */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--gray)' }}>
            Already have an account?{' '}
            <Link to="/login" className="auth-link" style={{ fontSize: 13 }}>
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
