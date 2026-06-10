import { Topbar } from '@/components/layout/Topbar'
import { DEMO_INVESTOR } from '@/data/demo'

const DEMO_INVESTORS = [
  { ...DEMO_INVESTOR, kyc_status: 'verified', slots: 3 },
  { id: 'inv-2', full_name: 'Priya Reddy', email: 'priya.reddy@gmail.com', kyc_status: 'verified', slots: 2, city: 'Hyderabad' },
  { id: 'inv-3', full_name: 'Amit Patel', email: 'amit.patel@gmail.com', kyc_status: 'pending', slots: 1, city: 'Secunderabad' },
  { id: 'inv-4', full_name: 'Sneha Gupta', email: 'sneha.gupta@gmail.com', kyc_status: 'verified', slots: 4, city: 'Hyderabad' },
]

export function AdminInvestorsPage() {
  return (
    <>
      <Topbar title="Investors" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage investors</div>
            <div className="section-heading-sub">{DEMO_INVESTORS.length} registered investors</div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>City</th><th>KYC</th><th>Slots</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {DEMO_INVESTORS.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 500 }}>{inv.full_name}</td>
                    <td>{inv.email}</td>
                    <td>{inv.city}</td>
                    <td>
                      <span className={`admin-badge ${inv.kyc_status === 'verified' ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                        {inv.kyc_status}
                      </span>
                    </td>
                    <td>{inv.slots}</td>
                    <td>
                      <button className="admin-btn admin-btn-secondary">View</button>
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
