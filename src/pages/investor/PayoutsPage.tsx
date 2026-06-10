import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { ExportButton } from '@/components/ui/ExportButton'
import { DEMO_PAYOUTS } from '@/data/demo'
import { fmt, exportToCSV } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AVAILABLE_BALANCE = 12565

export function PayoutsPage() {
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const { investor } = useAuth()
  const { toast } = useToast()

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmt)
    if (!amt || amt <= 0) { toast('Please enter a valid amount.', 'error'); return }
    if (amt > AVAILABLE_BALANCE) { toast(`Amount exceeds available balance of ${fmt(AVAILABLE_BALANCE)}.`, 'error'); return }

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
      DEMO_PAYOUTS.map((p) => ({
        Month: p.period_month,
        Amount: p.amount,
        Status: p.status,
        Processed: p.processed_at || '',
      })),
      'vprint-payouts.csv'
    )
  }

  return (
    <>
      <Topbar title="Payouts" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi" style={{ borderColor: '#B6E0CE' }}>
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{fmt(AVAILABLE_BALANCE)}</div>
            <div className="rpt-kpi-lbl">Available to withdraw</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">₹56,840</div>
            <div className="rpt-kpi-lbl">Total paid out (all time)</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">Jul 1, 2026</div>
            <div className="rpt-kpi-lbl">Next scheduled payout</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{investor?.bank_name || 'HDFC'} {investor?.bank_account || '••••4821'}</div>
            <div className="rpt-kpi-lbl">Linked account</div>
          </div>
        </div>

        <div className="rpt-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div className="rpt-card-title">Withdraw balance</div>
            <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 3 }}>
              {fmt(AVAILABLE_BALANCE)} available · Processed within 2 business days
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
                  <th>Month</th><th>P1 — Madhapur</th><th>P2 — Kukatpally</th><th>P3 — LB Nagar</th><th>Total paid out</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_PAYOUTS.map((p) => {
                  const bd = p.kiosk_breakdown || {}
                  const badge = p.status === 'pending'
                    ? <span style={{ background: 'var(--amber-l)', color: '#A05C10', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>Pending · Jul 1</span>
                    : <span style={{ background: 'var(--green-l)', color: 'var(--green-d)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>Paid {p.processed_at ? new Date(p.processed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}</span>
                  return (
                    <tr key={p.id}>
                      <td>{p.period_month}</td>
                      <td>{fmt(bd.p1 || 0)}</td>
                      <td>{fmt(bd.p2 || 0)}</td>
                      <td>{fmt(bd.p3 || 0)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td>{badge}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
            <div className="rpt-card-title">Payout bank details</div>
          </div>
          {[
            { l: 'Bank name', v: investor?.bank_name || 'HDFC Bank' },
            { l: 'Account no.', v: investor?.bank_account || '•••• •••• 4821' },
            { l: 'IFSC code', v: investor?.bank_ifsc || 'HDFC0001234' },
            { l: 'Account type', v: investor?.bank_account_type || 'Savings' },
            { l: 'UPI ID', v: investor?.upi_id || 'rahul@hdfcbank' },
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
