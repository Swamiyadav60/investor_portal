import { Topbar } from '@/components/layout/Topbar'
import { ExportButton } from '@/components/ui/ExportButton'
import { PRINTER_DATA } from '@/data/demo'
import { fmt, exportToCSV } from '@/lib/format'

const reportMonths = PRINTER_DATA.all.monthly.revenue.map((rev, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i] + ' 2025',
  revenue: rev,
  varExp: PRINTER_DATA.all.monthly.varExp[i],
  fixExp: PRINTER_DATA.all.monthly.fixExp[i],
}))

export function EarningsPage() {
  const handleExport = () => {
    exportToCSV(
      reportMonths.map((r) => ({
        Month: r.month,
        Revenue: r.revenue,
        'Variable Expenses': r.varExp,
        'Fixed Expenses': r.fixExp,
        'Net Profit': r.revenue - r.varExp - r.fixExp,
        'Your Share (70%)': (r.revenue - r.varExp - r.fixExp) * 0.7,
      })),
      'smartprinter-earnings.csv'
    )
  }

  let totalRev = 0, totalVar = 0, totalFix = 0, totalProfit = 0, totalShare = 0

  return (
    <>
      <Topbar title="Earnings" />
      <div className="page-view content">
        <div className="rpt-kpi-row">
          <div className="rpt-kpi"><div className="rpt-kpi-val">₹1,24,560</div><div className="rpt-kpi-lbl">Total revenue (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>₹56,840</div><div className="rpt-kpi-lbl">Your profit (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">₹67,720</div><div className="rpt-kpi-lbl">Total expenses (YTD)</div></div>
          <div className="rpt-kpi"><div className="rpt-kpi-val">45.6%</div><div className="rpt-kpi-lbl">Profit margin</div></div>
        </div>

        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Revenue history</div>
              <div className="rpt-card-sub">Monthly gross revenue · All kiosks combined</div>
            </div>
            <ExportButton onClick={handleExport} label="Export CSV" />
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead><tr><th>Month</th><th>Revenue</th><th>Var. Expenses</th><th>Fixed Expenses</th><th>Net Profit</th><th>Your Share (70%)</th></tr></thead>
              <tbody>
                {reportMonths.map((r) => {
                  const profit = r.revenue - r.varExp - r.fixExp
                  const share = profit * 0.7
                  totalRev += r.revenue; totalVar += r.varExp; totalFix += r.fixExp
                  totalProfit += profit; totalShare += share
                  return (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td>{fmt(r.revenue)}</td>
                      <td style={{ color: 'var(--red)' }}>{fmt(r.varExp)}</td>
                      <td style={{ color: 'var(--amber)' }}>{fmt(r.fixExp)}</td>
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
              <div className="rpt-card-title">Expense breakdown</div>
            </div>
            {PRINTER_DATA.all.varBreakdown.concat(PRINTER_DATA.all.fixBreakdown).map((e) => (
              <div key={e.name} className="rpt-tax-row">
                <span>{e.name}</span>
                <span>{e.pct}%</span>
              </div>
            ))}
          </div>
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '.75rem' }}>
              <div className="rpt-card-title">Profit breakdown by kiosk</div>
            </div>
            {['p1', 'p2', 'p3'].map((id) => {
              const d = PRINTER_DATA[id]
              const rev = d.monthly.revenue[11]
              const exp = d.monthly.varExp[11] + d.monthly.fixExp[11]
              const profit = (rev - exp) * 0.7
              return (
                <div key={id} className="rpt-tax-row">
                  <span>{d.label.split('—')[0].trim()}</span>
                  <span className="profit-cell">{fmt(profit)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
