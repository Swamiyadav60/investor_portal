import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@/lib/auth-errors'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  const { signInWithEmail, signInWithGoogle } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      onSuccess()
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
        
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to reserve your slot</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="auth-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : 'Sign in'}
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
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <span 
            className="auth-link" 
            onClick={() => {
              onClose()
              navigate('/signup')
            }}
          >
            Don't have an account? Sign up
          </span>
        </div>
      </div>
    </div>
  )
}
