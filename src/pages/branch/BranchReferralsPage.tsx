import { Topbar } from '@/components/layout/Topbar'

export function BranchReferralsPage() {
  return (
    <div className="page-view">
      <Topbar title="Referrals" />
      <div className="content">
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Referral Dashboard</div>
              <div className="rpt-card-sub">Track users who joined using your referral code.</div>
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
                    No referrals found yet. Share your referral code to start earning referral rewards.
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
