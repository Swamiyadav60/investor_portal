import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_PAYOUTS } from '@/data/demo'
import { fmt } from '@/lib/format'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const approveMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!isSupabaseConfigured) {
        toast('Payout approved (demo)', 'success')
        return
      }
      const { error } = await supabase.from('payments').update({
        status: 'paid',
        processed_at: new Date().toISOString(),
      }).eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      toast('Payout approved and processed.', 'success')
    },
  })

  return (
    <>
      <Topbar title="Payments" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi"><div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>₹12,565</div><div className="rpt-kpi-lbl">Pending payouts</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">₹56,840</div><div className="rpt-kpi-lbl">Total paid out</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">12</div><div className="rpt-kpi-lbl">Transactions (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">3</div><div className="rpt-kpi-lbl">Pending approvals</div></div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Payout approvals</div>
              <div className="rpt-card-sub">Review and approve investor payout requests</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Investor</th><th>Period</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {DEMO_PAYOUTS.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>Rahul Sharma</td>
                    <td>{p.period_month}</td>
                    <td>{fmt(p.amount)}</td>
                    <td>
                      <span className={`admin-badge ${p.status === 'paid' ? 'admin-badge-paid' : 'admin-badge-pending'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'pending' && (
                        <button className="admin-btn admin-btn-primary" onClick={() => approveMutation.mutate(p.id)}>
                          Approve Payout
                        </button>
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
