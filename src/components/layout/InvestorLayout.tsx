import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useRealtimeSubscription } from '@/hooks/useRealtime'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingModal } from '@/components/auth/OnboardingModal'

export function InvestorLayout() {
  useRealtimeSubscription()
  const { investor, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div className="animate-pulse-subtle" style={{ color: 'var(--ink)', fontSize: '1.25rem', fontFamily: 'Space Grotesk, sans-serif' }}>
          Loading profile...
        </div>
      </div>
    )
  }

  // Enforce onboarding modal if profile is incomplete
  if (
    investor &&
    investor.role === 'branch_owner' &&
    !investor.profile_completed
  ) {
  return (
    <OnboardingModal
      prefillName={investor.full_name || undefined}
    />
  )
}

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  )
}
