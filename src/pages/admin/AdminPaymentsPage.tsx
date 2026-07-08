import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { fmt, maskBankAccount } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

// Unified row shape merging `withdrawals` (payouts) and `transactions`
// (everything else — investments, etc.) since the new schema splits what
// used to be a single `payments` table into two.
interface UnifiedPayment {
  id: string
  _source: 'withdrawal' | 'transaction'
  user: { full_name: string; email: string } | null
  payment_type: string
  amount: number
  status: string
  account: string | null
  razorpay_payment_id: string | null
  notes: string | null
  created_at: string
}

export function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    data: payments = [],
    isLoading,
    error,
  } = useQuery<UnifiedPayment[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const [{ data: withdrawals, error: wErr }, { data: transactions, error: tErr }] = await Promise.all([
        supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      ])

      if (wErr) throw wErr
      if (tErr) throw tErr

      const userIds = Array.from(new Set([
        ...(withdrawals || []).map(w => w.user_id),
        ...(transactions || []).map(t => t.user_id),
      ].filter(Boolean)))

      const { data: users } = userIds.length
        ? await supabase.from('users').select('id, full_name, email').in('id', userIds)
        : { data: [] as { id: string; full_name: string; email: string }[] }

      const userMap = new Map((users || []).map(u => [u.id, u]))

      const withdrawalRows: UnifiedPayment[] = (withdrawals || []).map(w => ({
        id: w.id,
        _source: 'withdrawal',
        user: userMap.get(w.user_id) || null,
        payment_type: 'payout',
        amount: Number(w.amount),
        status: w.status === 'approved' ? 'paid' : w.status, // 'pending' | 'paid' | 'rejected'
        account: w.upi_id,
        razorpay_payment_id: null,
        notes: w.note,
        created_at: w.created_at,
      }))

      const transactionRows: UnifiedPayment[] = (transactions || []).map(t => ({
        id: t.id,
        _source: 'transaction',
        user: userMap.get(t.user_id) || null,
        payment_type: t.type || 'investment',
        amount: Number(t.amount),
        status: t.status || 'pending',
        account: null,
        razorpay_payment_id: null,
        notes: null,
        created_at: t.created_at,
      }))

      return [...withdrawalRows, ...transactionRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
  })

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ row, status }: { row: UnifiedPayment; status: 'paid' | 'failed' | 'cancelled' }) => {
      if (row._source === 'withdrawal') {
        // withdrawal_status_enum only has: pending | approved | rejected
        const dbStatus = status === 'paid' ? 'approved' : 'rejected'
        const { error } = await supabase
          .from('withdrawals')
          .update({ status: dbStatus })
          .eq('id', row.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('transactions')
          .update({ status })
          .eq('id', row.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] }) // Invalidate KPIs for revenue update
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
      })

      queryClient.invalidateQueries({
        queryKey: ['payouts'],
      })
      toast('Payment status updated.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error updating payment status.', 'error')
    }
  })

  const pendingPayouts = payments.filter(p => p.payment_type === 'payout' && p.status === 'pending')
  const totalPaidOut = payments.filter(p => p.status === 'paid' && p.payment_type === 'payout').reduce((sum, p) => sum + p.amount, 0)
  const totalInvestments = payments.filter(p => p.payment_type === 'investment' && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  if (error) {
  return (
    <>
      <Topbar title="Payments" />
      <div className="page-view content">
        Error loading transactions.
      </div>
    </>
  )
}

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
              <div className="rpt-card-title">Transactions & Payouts</div>
              <div className="rpt-card-sub">Review and manage all financial transactions</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Branch Owner</th>
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
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading transactions...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No transactions found.</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={`${p._source}-${p.id}`}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.user?.full_name || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{p.user?.email || 'N/A'}</div>
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
                        {p.payment_type === 'payout' && `UPI: ${p.account ? maskBankAccount(p.account) : 'N/A'}`}
                        {p.payment_type === 'investment' && `Razorpay ID: ${p.razorpay_payment_id?.slice(0, 8) || 'N/A'}`}
                        {p.notes && ` (${p.notes})`}
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {p.status === 'pending' && p.payment_type === 'payout' && (
                          <button className="admin-btn admin-btn-primary" onClick={() => updatePaymentStatusMutation.mutate({ row: p, status: 'paid' })}>Approve</button>
                        )}
                        {p.status === 'pending' && p.payment_type !== 'payout' && ( // Allow cancelling non-payout pending
                          <button className="admin-btn admin-btn-danger" onClick={() => updatePaymentStatusMutation.mutate({ row: p, status: 'cancelled' })}>Cancel</button>
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