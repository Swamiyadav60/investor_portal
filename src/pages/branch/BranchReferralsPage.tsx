import { Topbar } from '@/components/layout/Topbar'

export function BranchReferralsPage() {
  return (
    <div className="page-view">
      <Topbar title="Referrals" />
      <div className="content">
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Recent Referrals</div>
              <div className="rpt-card-sub">Track investors you have brought onto the platform.</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Investor Name</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)' }}>
                    No referrals yet. Share your referral link to get started.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
