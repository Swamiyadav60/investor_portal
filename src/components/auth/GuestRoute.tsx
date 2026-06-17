import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, investor, loading, isAmbassador } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray)' }}>
        Loading...
      </div>
    )
  }

  const isAuthenticated = !!user && !!investor

  if (isAuthenticated) {
    if (isAmbassador) return <Navigate to="/ambassador/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
