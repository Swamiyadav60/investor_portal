import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useRealtimeSubscription } from '@/hooks/useRealtime'

export function AdminLayout() {
  useRealtimeSubscription()

  return (
    <div className="app-shell">
      <Sidebar admin />
      <div className="main">
        <Outlet />
      </div>
    </div>
  )
}
