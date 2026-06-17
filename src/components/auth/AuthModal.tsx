import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@/lib/auth-errors'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password, fullName)
        if (result === 'session') {
          onSuccess()
        } else {
          setError('Check your email to confirm, then sign in.')
        }
      } else {
        await signInWithEmail(email, password)
        onSuccess()
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()} style={{ margin: 0, width: '100%', maxWidth: 400 }}>
        <div className="auth-logo">
          <div className="sidebar-logo-dot" />
          <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
        </div>
        
        <div className="auth-title">{isSignUp ? 'Create account' : 'Welcome back'}</div>
        <div className="auth-sub">{isSignUp ? 'Join the investor queue' : 'Sign in to reserve your slot'}</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input className="auth-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          )}
          <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="auth-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <>
  <div className="auth-divider">or</div>
  <button
    className="auth-btn-outline"
    onClick={async () => {
      try {
        await signInWithGoogle()
        onSuccess()
      } catch (e: any) {
        setError(e.message)
      }
    }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
      ...
    </svg>
    Continue with Google
  </button>
</>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <span className="auth-link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </span>
        </div>
      </div>
    </div>
  )
}
