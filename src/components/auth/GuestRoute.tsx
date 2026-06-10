import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, investor, loading, isDemo } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray)' }}>
        Loading...
      </div>
    )
  }

  const isAuthenticated = (isSupabaseConfigured && user) || isDemo || investor

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
