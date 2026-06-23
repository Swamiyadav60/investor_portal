import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

interface EmailVerificationModalProps {
  email: string
  onVerified: () => void
}

export function EmailVerificationModal({ email, onVerified }: EmailVerificationModalProps) {
  const { checkEmailVerified } = useAuth()
  const { toast } = useToast()
  
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Cooldown timer for resend link
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleVerify = async () => {
    setError('')
    setChecking(true)
    try {
      const isVerified = await checkEmailVerified()
      if (isVerified) {
        setSuccess(true)
        toast('Email verified successfully!', 'success')
        // Show success animation checkmark briefly before advancing
        setTimeout(() => {
          onVerified()
        }, 1500)
      } else {
        setError('Email is not verified yet. Please check your inbox and click the verification link, then click this button.')
        toast('Verification pending. Please check your email.', 'error')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification check.')
      toast('Verification check failed.', 'error')
    } finally {
      setChecking(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError('')
    setResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin + '/signup'
        }
      })
      if (resendError) throw resendError
      
      toast('Verification email resent successfully!', 'success')
      setCooldown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.')
      toast('Failed to resend email.', 'error')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="verification-card">
      <div className="auth-logo">
        <div className="sidebar-logo-dot" />
        <div>
          <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
          <div className="sidebar-logo-sub">Portal</div>
        </div>
      </div>

      <div className="verification-icon-wrap">
        {success ? (
          <div className="success-checkmark-circle">
            <svg className="checkmark-svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        ) : (
          <div className="mail-icon-circle animate-pulse-subtle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mail-svg">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="auth-title">Verify your email</div>
      <p className="verification-text">
        We have sent a verification link to <strong className="verification-email">{email}</strong>. 
        Please click the link in the email to verify your account, and then click the button below.
      </p>

      {error && <div className="auth-error text-sm font-normal mt-4 mb-2">{error}</div>}

      <div className="verification-actions">
        <button
          className="auth-btn btn-primary w-full"
          onClick={handleVerify}
          disabled={checking || success}
        >
          {checking ? 'Checking verification...' : success ? 'Verified!' : 'I have verified my email'}
        </button>

        <button
          className="auth-btn-outline w-full mt-3"
          onClick={handleResend}
          disabled={resending || cooldown > 0 || success}
        >
          {resending ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
        </button>
      </div>
    </div>
  )
}
