import { Topbar } from '@/components/layout/Topbar'
import { useToast } from '@/components/ui/Toast'

const WAITLISTS = [
  { id: '1', investor: 'Rahul Sharma', college: 'JNTU College Gate', status: 'pending', date: 'Jun 8, 2026' },
  { id: '2', investor: 'Priya Reddy', college: 'HITEC City Signal', status: 'approved', date: 'Jun 5, 2026' },
  { id: '3', investor: 'Amit Patel', college: 'Osmania University', status: 'pending', date: 'Jun 3, 2026' },
]

export function AdminWaitlistsPage() {
  const { toast } = useToast()

  return (
    <>
      <Topbar title="Waitlists" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Investment waitlists</div>
            <div className="section-heading-sub">{WAITLISTS.length} pending requests</div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Investor</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {WAITLISTS.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>{w.investor}</td>
                    <td>{w.college}</td>
                    <td>
                      <span className={`admin-badge ${w.status === 'approved' ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                        {w.status}
                      </span>
                    </td>
                    <td>{w.date}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      {w.status === 'pending' && (
                        <>
                          <button className="admin-btn admin-btn-primary" onClick={() => toast('Waitlist approved', 'success')}>Approve</button>
                          <button className="admin-btn admin-btn-danger" onClick={() => toast('Waitlist rejected', 'info')}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
