import { Topbar } from '@/components/layout/Topbar'
import { ExportButton } from '@/components/ui/ExportButton'
import { PRINTER_DATA } from '@/data/demo'
import { fmt, exportToCSV, MONTHS } from '@/lib/format'

const reportMonths = PRINTER_DATA.all.monthly.revenue.map((rev, i) => ({
  month: MONTHS[i],
  rev, var_: PRINTER_DATA.all.monthly.varExp[i], fix_: PRINTER_DATA.all.monthly.fixExp[i],
}))

export function ReportsPage() {
  let totalRev = 0, totalVar = 0, totalFix = 0, totalProfit = 0, totalShare = 0

  const handleExport = () => {
    exportToCSV(
      reportMonths.map((r) => {
        const profit = r.rev - r.var_ - r.fix_
        return {
          Month: `${r.month} 2025`,
          Revenue: r.rev,
          'Variable Expenses': r.var_,
          'Fixed Expenses': r.fix_,
          'Net Profit': profit,
          'Your Share (70%)': profit * 0.7,
        }
      }),
      'vprint-monthly-pl.csv'
    )
  }

  return (
    <>
      <Topbar title="Reports" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi"><div className="rpt-kpi-val">₹1,24,560</div><div className="rpt-kpi-lbl">Total revenue (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>₹56,840</div><div className="rpt-kpi-lbl">Your profit (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">₹41,800</div><div className="rpt-kpi-lbl">Total invested recovered</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">18,420</div><div className="rpt-kpi-lbl">Total print jobs (YTD)</div></div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Monthly P&L statement</div>
              <div className="rpt-card-sub">All 3 kiosks combined · Jan – Dec 2025</div>
            </div>
            <ExportButton onClick={handleExport} label="Export CSV" />
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Month</th><th>Revenue</th><th>Var. Expenses</th><th>Fixed Expenses</th><th>Net Profit</th><th>Your Share (70%)</th></tr></thead>
              <tbody>
                {reportMonths.map((r) => {
                  const profit = r.rev - r.var_ - r.fix_
                  const share = profit * 0.7
                  totalRev += r.rev; totalVar += r.var_; totalFix += r.fix_
                  totalProfit += profit; totalShare += share
                  return (
                    <tr key={r.month}>
                      <td>{r.month} 2025</td>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '.75rem' }}>
              <div className="rpt-card-title">Tax summary FY 2025–26</div>
            </div>
            <div className="rpt-tax-row"><span>Gross revenue received</span><span>₹1,24,560</span></div>
            <div className="rpt-tax-row"><span>Expenses deducted by Smart Printer</span><span style={{ color: 'var(--red)' }}>− ₹67,720</span></div>
            <div className="rpt-tax-row" style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 10, fontWeight: 600 }}>
              <span>Net taxable income (est.)</span><span style={{ color: 'var(--green)' }}>₹56,840</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem' }}>Consult your CA for exact TDS/IT filing guidance. This is an estimate only.</div>
          </div>
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '.75rem' }}>
              <div className="rpt-card-title">Download statements</div>
            </div>
            {MONTHS.map((m) => (
              <div key={m} className="rpt-dl-item">
                <div>
                  <div className="rpt-dl-name">{m} 2025 — P&L Statement</div>
                  <div className="rpt-dl-meta">PDF · All 3 kiosks</div>
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
