import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, investor, loading, isDemo } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray)' }}>
        Loading...
      </div>
    )
  }

  if (!isSupabaseConfigured && !isDemo && !investor) {
    return <Navigate to="/login" replace />
  }

  if (isSupabaseConfigured && !user && !isDemo) {
    return <Navigate to="/login" replace />
  }

  if (isSupabaseConfigured && user && !investor && !isDemo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray)' }}>
        Loading profile...
      </div>
    )
  }

  if (adminOnly && investor?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
