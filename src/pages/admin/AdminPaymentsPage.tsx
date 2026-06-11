import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_PAYOUTS } from '@/data/demo'
import { fmt } from '@/lib/format'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Payment } from '@/types/database'

export function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_PAYOUTS as Payment[]
      const { data, error } = await supabase
        .from('payments')
        .select('*, investor:investors(full_name, email)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Payment[]
    },
  })

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'paid' | 'failed' | 'cancelled' }) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase.from('payments').update({
        status,
        processed_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] }) // Invalidate KPIs for revenue update
      toast('Payment status updated.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error updating payment status.', 'error')
    }
  })

  const pendingPayouts = payments.filter(p => p.payment_type === 'payout' && p.status === 'pending')
  const totalPaidOut = payments.filter(p => p.status === 'paid' && p.payment_type === 'payout').reduce((sum, p) => sum + p.amount, 0)
  const totalInvestments = payments.filter(p => p.payment_type === 'investment' && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)

  return (
    <>
      <Topbar title="Payments" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi"><div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>{fmt(pendingPayouts.reduce((sum, p) => sum + p.amount, 0))}</div><div className="rpt-kpi-lbl">Pending payouts</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">{fmt(totalPaidOut)}</div><div className="rpt-kpi-lbl">Total paid out</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">{fmt(totalInvestments)}</div><div className="rpt-kpi-lbl">Total investments</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">{payments.length}</div><div className="rpt-kpi-lbl">Total transactions</div></div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">All Transactions</div>
              <div className="rpt-card-sub">Review and manage all financial transactions</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading payments...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No transactions found.</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.investor?.full_name || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{p.investor?.email || 'N/A'}</div>
                      </td>
                      <td>{p.payment_type}</td>
                      <td>{fmt(p.amount)}</td>
                      <td>
                        <span className={`admin-badge ${
                          p.status === 'paid' ? 'admin-badge-active' :
                          p.status === 'pending' ? 'admin-badge-pending' :
                          'admin-badge-failed'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.payment_type === 'payout' && `Account: ${p.bank_account || 'N/A'}`}
                        {p.payment_type === 'investment' && `Razorpay ID: ${p.razorpay_payment_id?.slice(0, 8) || 'N/A'}`}
                        {p.notes && ` (${p.notes})`}
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {p.status === 'pending' && p.payment_type === 'payout' && (
                          <button className="admin-btn admin-btn-primary" onClick={() => updatePaymentStatusMutation.mutate({ id: p.id, status: 'paid' })}>Approve</button>
                        )}
                        {p.status === 'pending' && p.payment_type !== 'payout' && ( // Allow cancelling non-payout pending
                          <button className="admin-btn admin-btn-danger" onClick={() => updatePaymentStatusMutation.mutate({ id: p.id, status: 'cancelled' })}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
