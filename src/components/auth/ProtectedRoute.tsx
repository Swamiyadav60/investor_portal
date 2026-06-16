import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export function ProtectedRoute({ 
  children, 
  adminOnly = false,
  allowedRoles
}: { 
  children: React.ReactNode; 
  adminOnly?: boolean;
  allowedRoles?: UserRole[]
}) {
  const { user, investor, loading, isDemo, isAdmin, isAmbassador, isInvestor } = useAuth()

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

  // Admin always has access to everything
  if (isAdmin) return <>{children}</>

  if (adminOnly && !isAdmin) {
    // If they were trying to access admin, send them to their dashboard
    if (isAmbassador) return <Navigate to="/branch/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  if (allowedRoles && investor && !allowedRoles.includes(investor.role)) {
    if (isAmbassador) return <Navigate to="/branch/dashboard" replace />
    if (isInvestor) return <Navigate to="/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
