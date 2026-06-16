import { Topbar } from '@/components/layout/Topbar'
import { ExportButton } from '@/components/ui/ExportButton'
import { fmt, exportToCSV} from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function ReportsPage() {
 
  const { investor } = useAuth()

const { data } = useQuery({
  queryKey: ['reports', investor?.id],
  enabled: !!investor?.id,
  queryFn: async () => {
    const { data: kiosks } = await supabase
  .from('investor_kiosks')
  .select(`
    kiosk_id,
    kiosks (
      recovered_amount
    )
  `)
  .eq('investor_id', investor!.id)
  .eq('status', 'active')

    const kioskIds =
      kiosks?.map(k => k.kiosk_id) || []

    if (!kioskIds.length) {
  return {
    reportData: [],
    recoveredTotal: 0
  }
}

    const [
      { data: revenues },
      { data: expenses }
    ] = await Promise.all([
      supabase
        .from('revenues')
        .select('*')
        .in('kiosk_id', kioskIds),

      supabase
        .from('expenses')
        .select('*')
        .in('kiosk_id', kioskIds)
        .eq('status', 'approved')
    ])
    

    const reportData = (revenues || []).map(r => {
      const monthExpenses =
        (expenses || [])
          .filter(
            e =>
              e.kiosk_id === r.kiosk_id &&
              e.period_start === r.period_start
          )

      const variable =
        monthExpenses
          .filter(e => e.expense_type === 'variable')
          .reduce((s, e) => s + Number(e.amount), 0)

      const fixed =
        monthExpenses
          .filter(e => e.expense_type === 'fixed')
          .reduce((s, e) => s + Number(e.amount), 0)

      
      

      return {
  month: new Date(r.period_start)
    .toLocaleString('en-US', {
      month: 'short',
      year: 'numeric'
    }),

  rev: Number(r.amount),
  var_: variable,
  fix_: fixed,
  jobs: Number((r as any).print_jobs || 0)
}
    })
    const recoveredTotal =
  kiosks?.reduce(
    (sum, k: any) =>
      sum + Number(k.kiosks?.recovered_amount || 0),
    0
  ) || 0

return {
  reportData,
  recoveredTotal
}
    
  }
})
const reportMonths = data?.reportData || []

const recoveredTotal =
  data?.recoveredTotal || 0


  const totalRev = reportMonths.reduce(
  (sum, r) => sum + r.rev,
  0
)

const totalVar = reportMonths.reduce(
  (sum, r) => sum + r.var_,
  0
)

const totalFix = reportMonths.reduce(
  (sum, r) => sum + r.fix_,
  0
)

const totalProfit = totalRev - totalVar - totalFix

const totalShare = totalProfit * 0.7
const totalJobs =
  reportMonths.reduce(
    (sum, r) => sum + Number(r.jobs || 0),0
  )

  const handleExport = () => {
    exportToCSV(
      reportMonths.map((r) => {
        const profit = r.rev - r.var_ - r.fix_
        return {
          Month: `${r.month} `,
          Revenue: r.rev,
          'Variable Expenses': r.var_,
          'Fixed Expenses': r.fix_,
          'Net Profit': profit,
          'Your Share (70%)': profit * 0.7,
        }
      }),
      'Smart_Printer-monthly-pl.csv'
    )
  }

  return (
    <>
      <Topbar title="Reports" />
      <div className="page-view content">

        {/* KPI row — 2×2 on mobile */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(totalRev)}</div>
            <div className="rpt-kpi-lbl">Total revenue (YTD)</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{fmt(totalProfit)}</div>
            <div className="rpt-kpi-lbl">Your profit (YTD)</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(recoveredTotal)}</div>
            <div className="rpt-kpi-lbl">Total invested recovered</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{totalJobs.toLocaleString('en-IN')}</div>
            <div className="rpt-kpi-lbl">Total print jobs (YTD)</div>
          </div>
        </div>

        {/* P&L table */}
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Monthly P&L statement</div>
              <div className="rpt-card-sub">Active investor kiosks · Live data</div>
            </div>
            <ExportButton onClick={handleExport} label="Export CSV" />
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Month</th><th>Revenue</th><th>Var. Expenses</th>
                  <th>Fixed Expenses</th><th>Net Profit</th><th>Your Share (70%)</th>
                </tr>
              </thead>
              <tbody>
                {reportMonths.map((r) => {
                  const profit = r.rev - r.var_ - r.fix_
                  const share = profit * 0.7
                
                  return (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td>{fmt(r.rev)}</td>
                      <td style={{ color: 'var(--red)' }}>{fmt(r.var_)}</td>
                      <td style={{ color: 'var(--amber)' }}>{fmt(r.fix_)}</td>
                      <td className="profit-cell">{fmt(profit)}</td>
                      <td className="profit-cell">{fmt(share)}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td>Total</td>
                  <td>{fmt(totalRev)}</td>
                  <td style={{ color: 'var(--red)' }}>{fmt(totalVar)}</td>
                  <td style={{ color: 'var(--amber)' }}>{fmt(totalFix)}</td>
                  <td className="profit-cell">{fmt(totalProfit)}</td>
                  <td className="profit-cell">{fmt(totalShare)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ Use className instead of inline style so CSS can control it on mobile */}
        <div className="reports-bottom-grid">

          {/* Tax summary */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '.75rem' }}>
              <div className="rpt-card-title">Tax summary FY 2025–26</div>
            </div>
            <div className="rpt-tax-row">
              <span>Gross revenue received</span>
              <span>{fmt(totalRev)}</span>
            </div>
            <div className="rpt-tax-row">
              <span>Expenses deducted by Smart Printer</span>
              <span style={{ color: 'var(--red)' }}>{fmt(totalVar + totalFix)}</span>
            </div>
            <div className="rpt-tax-row rpt-tax-total">
              <span>Net taxable income (est.)</span>
              <span style={{ color: 'var(--green)' }}>{fmt(totalProfit)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem', lineHeight: 1.5 }}>
              Consult your CA for exact TDS/IT filing guidance. This is an estimate only.
            </div>
          </div>

          {/* Download statements */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '.75rem' }}>
              <div className="rpt-card-title">Download statements</div>
            </div>
            {reportMonths.map((r) => (
              <div key={r.month} className="rpt-dl-item">
                <div>
                  <div className="rpt-dl-name">{r.month} — P&L Statement</div>
                  <div className="rpt-dl-meta">PDF · All  kiosks</div>
                </div>
                <button className="rpt-dl-btn" onClick={handleExport}>↓ CSV</button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}