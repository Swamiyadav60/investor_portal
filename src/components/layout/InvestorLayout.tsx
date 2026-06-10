import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useRealtimeSubscription } from '@/hooks/useRealtime'

export function InvestorLayout() {
  useRealtimeSubscription()

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  )
}
