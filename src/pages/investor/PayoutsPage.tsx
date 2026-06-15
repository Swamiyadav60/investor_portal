import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { ExportButton } from '@/components/ui/ExportButton'
import { fmt, exportToCSV } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'



export function PayoutsPage() {
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const { investor } = useAuth()
  const { data: payouts = [] } = useQuery({
  queryKey: ['payouts', investor?.id],
  enabled: !!investor?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('investor_id', investor!.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }
})
const availableBalance =
  payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const { toast } = useToast()

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmt)
    if (!amt || amt <= 0) { toast('Please enter a valid amount.', 'error'); return }
    if (amt > availableBalance) { toast(`Amount exceeds available balance of ${fmt(availableBalance)}.`, 'error'); return }

    if (isSupabaseConfigured && investor) {
      const { error } = await supabase.from('payments').insert({
        investor_id: investor.id,
        amount: amt,
        status: 'pending',
        payment_type: 'withdrawal',
        bank_account: investor.bank_account,
      })
      if (error) { toast(error.message, 'error'); return }
    }

    toast(`Withdrawal of ${fmt(amt)} requested. Funds will reach ${investor?.bank_name || 'HDFC'} ${investor?.bank_account || '••••4821'} within 2 business days.`, 'success')
    setWithdrawAmt('')
  }

  const handleExport = () => {
    exportToCSV(
      payouts.map((p) => ({
  Amount: p.amount,
  Status: p.status,
  Date: p.created_at,
})),
      'smartprinter-payouts.csv'
    )
  }

  return (
    <>
      <Topbar title="Payouts" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi" style={{ borderColor: '#B6E0CE' }}>
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{fmt(availableBalance)}</div>
            <div className="rpt-kpi-lbl">Available to withdraw</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(
  payouts.reduce(
    (sum, p) =>
      p.status === 'success'
        ? sum + Number(p.amount)
        : sum,
    0
  )
)}</div>
            <div className="rpt-kpi-lbl">Total paid out (all time)</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">Jul 1, 2026</div>
            <div className="rpt-kpi-lbl">Next scheduled payout</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{investor?.bank_name || '-'} {investor?.bank_account || '-'}</div>
            <div className="rpt-kpi-lbl">Linked account</div>
          </div>
        </div>

        <div className="rpt-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div className="rpt-card-title">Withdraw balance</div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 3 }}>
              {fmt(availableBalance)} available · Processed within 2 business days
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <input
              type="number"
              placeholder="Enter amount"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
              style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, width: 150, outline: 'none', color: 'var(--ink)' }}
            />
            <button
              style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
              onClick={handleWithdraw}
            >
              Withdraw →
            </button>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Payout history</div>
              <div className="rpt-card-sub">All transactions · Showing 12 months</div>
            </div>
            <ExportButton onClick={handleExport} />
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
  <tr>
    <th>Date</th>
    <th>Amount</th>
    <th>Status</th>
    <th>Processed</th>
  </tr>
</thead>
              <tbody>
  {payouts
    .filter((p) => p.payment_type === 'withdrawal')
    .map((p) => (
      <tr key={p.id}>
        <td>
          {new Date(p.created_at).toLocaleDateString('en-IN')}
        </td>

        <td style={{ fontWeight: 600 }}>
          {fmt(Number(p.amount))}
        </td>

        <td>
          {p.status === 'pending' ? (
            <span
              style={{
                background: 'var(--amber-l)',
                color: '#A05C10',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999
              }}
            >
              Pending
            </span>
          ) : p.status === 'success' ? (
            <span
              style={{
                background: 'var(--green-l)',
                color: 'var(--green-d)',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999
              }}
            >
              Success
            </span>
          ) : (
            <span
              style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999
              }}
            >
              Cancelled
            </span>
          )}
        </td>

        <td>
          {p.processed_at
            ? new Date(p.processed_at).toLocaleDateString('en-IN')
            : '-'}
        </td>
      </tr>
    ))}
</tbody>
            </table>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
            <div className="rpt-card-title">Payout bank details</div>
          </div>
          {[
            { l: 'Bank name', v: investor?.bank_name || '-' },
            { l: 'Account no.', v: investor?.bank_account || '-' },
            { l: 'IFSC code', v: investor?.bank_ifsc || '-' },
            { l: 'Account type', v: investor?.bank_account_type || '-' },
            { l: 'UPI ID', v: investor?.upi_id || '-' },
          ].map((r) => (
            <div key={r.l} className="bank-row">
              <span className="bank-row-lbl">{r.l}</span>
              <span className="bank-row-val">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
