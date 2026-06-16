import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function BranchAmbassadorLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Outlet />
      </div>
    </div>
  )
}
