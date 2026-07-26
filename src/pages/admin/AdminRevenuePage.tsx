import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'

export function AdminRevenuePage() {
  // ── Filters & Sort States ──────────────────────────────────────────────────
  const [searchInvestor, setSearchInvestor] = useState('')
  const [searchPrinterCode, setSearchPrinterCode] = useState('')
  const [searchCollege, setSearchCollege] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [revenueStatus, setRevenueStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')

  // ── Fetch Kiosks (for Active Printers KPI and mapping status) ──────────────
  const { data: kiosks = [], isLoading: loadingKiosks } = useQuery({
    queryKey: ['admin-analytics-kiosks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id,name,location,is_active,owner_id")
      if (error) throw error
      return data || []
    },
  })

  // ── Fetch Revenues with Kiosk + College + Investor relations ───────────────
  const { data: revenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ['admin-analytics-revenues'],
    queryFn: async () => {
      const { data: revenues, error } = await supabase
        .from("branch_daily_revenue")
        .select("*")
        .order("revenue_date", { ascending: false })

      if (error) throw error
      return revenues || []  
    },
  })

  const { data: userRoles = [] } = useQuery({
  queryKey: ["admin-user-roles"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        users (
          full_name,
          profit_share
        )
      `)

    if (error) throw error

    return data ?? []
  },
})

  // ── Fetch Approved Expenses ────────────────────────────────────────────────
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['admin-analytics-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_expenses")
        .select("branch_id,amount,period_start,status")
        .eq("status","approved")
        
      if (error) throw error
      return data || []
    },
  })
  const branchMap = useMemo(() => {
  return new Map(
    kiosks.map((b: any) => [b.id, b])
  )
}, [kiosks])

const userMap = useMemo(() => {
  return new Map(
    userRoles.map((u: any) => [
      u.user_id,
      {
        full_name: u.users?.full_name,
        profit_share: u.users?.profit_share,
      },
    ])
  )
}, [userRoles])

  const isLoading =
  loadingRevenues ||
  loadingExpenses ||
  loadingKiosks 

  // ── Compute Raw Metrics Per Revenue Row (Pre-filtering) ────────────────────
  const computedAllRows = useMemo(() => {
  return revenues.map((r: any) => {

    const branch = branchMap.get(r.branch_id)

    const owner =
      branch?.owner_id
        ? userMap.get(branch.owner_id)
        : null
    console.log("Branch Owner ID:", branch?.owner_id)
console.log("User Map Size:", userMap.size)
console.log("Owner Found:", owner)
    const revenueVal =
      Number(r.upi_revenue || 0)

    const matchedExpenses =
      expenses.filter(
        (e: any) =>
          e.branch_id === r.branch_id &&
          e.period_start === r.revenue_date
      )

    const approvedExpensesVal =
      matchedExpenses.reduce(
        (sum: number, e: any) =>
          sum + Number(e.amount),
        0
      )

    const netProfitVal =
      revenueVal - approvedExpensesVal

    const investorPercentage =
      Number(owner?.profit_share || 0)

    const investorShareVal =
      (netProfitVal * investorPercentage) / 100

    const platformShareVal =
      netProfitVal - investorShareVal

    return {

      ...r,

      investorName:
        owner?.full_name ?? "Unknown",

      collegeName:
        branch?.name ?? "-",

      printerCode:
        r.branch_name ?? branch?.name ?? "-",

      revenueVal,

      approvedExpensesVal,

      netProfitVal,

      investorShareVal,

      platformShareVal,

      kioskStatus:
        branch?.is_active
          ? "active"
          : "inactive",

      lastUpdated:
        r.created_at,
    }

  })

}, [
  revenues,
  expenses,
  branchMap,
  userMap
])

  // ── Filter & Sort Logic ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = [...computedAllRows]

    if (searchInvestor) {
      result = result.filter(r => 
        r.investorName.toLowerCase().includes(searchInvestor.toLowerCase())
      )
    }

    if (searchPrinterCode) {
      result = result.filter(r => 
        r.printerCode.toLowerCase().includes(searchPrinterCode.toLowerCase())
      )
    }

    if (searchCollege) {
      result = result.filter(r => 
        r.collegeName.toLowerCase().includes(searchCollege.toLowerCase())
      )
    }

    if (dateFrom) {
      result = result.filter(r => r.revenue_date >= dateFrom)
    }

    if (dateTo) {
      result = result.filter(r => r.revenue_date <= dateTo)
    }

    if (revenueStatus === "active") {
    result = result.filter(r => r.kioskStatus === "active")
    }

    if (revenueStatus === "inactive") {
      result = result.filter(r => r.kioskStatus === "inactive")
    }

    if (sortBy === 'highest_revenue') {
      result.sort((a, b) => b.revenueVal - a.revenueVal)
    } else if (sortBy === 'lowest_revenue') {
      result.sort((a, b) => a.revenueVal - b.revenueVal)
    } else {
      // Default: date_desc (period_start desc)
      result.sort((a, b) => new Date(b.revenue_date).getTime() - new Date(a.revenue_date).getTime())
    }

    return result
  }, [computedAllRows, searchInvestor, searchPrinterCode, searchCollege, dateFrom, dateTo, revenueStatus, sortBy])
  const collegeSummary = useMemo(() => {
  const summary: Record<string, any> = {};

  filteredRows.forEach((row: any) => {
    const college = row.collegeName || "Unknown";

    if (!summary[college]) {
      summary[college] = {
        college,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        investorShare: 0,
        platformShare: 0,
      };
    }

    summary[college].revenue += row.revenueVal;
    summary[college].expenses += row.approvedExpensesVal;
    summary[college].netProfit += row.netProfitVal;
    summary[college].investorShare += row.investorShareVal;
    summary[college].platformShare += row.platformShareVal;
  });

  return Object.values(summary);
}, [filteredRows]);

  // ── KPI Calculations ───────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = filteredRows.reduce((sum, r) => sum + r.revenueVal, 0)
    const totalExpenses = filteredRows.reduce((sum, r) => sum + r.approvedExpensesVal, 0)
    const netProfit = totalRevenue - totalExpenses
    const investorProfitShare = filteredRows.reduce((sum, r) => sum + r.investorShareVal, 0)
    const platformProfit = filteredRows.reduce((sum, r) => sum + r.platformShareVal, 0)
    const activePrinters = kiosks.filter((k: any) => k.is_active).length

    // Revenue logged in the current calendar month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const revenueThisMonth = revenues
      .filter((r: any) => {
        const d = new Date(r.revenue_date)
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      })
      .reduce((sum: number, r: any) => sum + Number(r.upi_revenue), 0)

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      investorProfitShare,
      platformProfit,
      activePrinters,
      revenueThisMonth,
    }
  }, [filteredRows, kiosks, revenues])

  // ── Clear Filters ──────────────────────────────────────────────────────────
  const hasActiveFilters = searchInvestor || searchPrinterCode || searchCollege || dateFrom || dateTo || revenueStatus !== 'all' || sortBy !== 'date_desc'
  const clearFilters = () => {
    setSearchInvestor('')
    setSearchPrinterCode('')
    setSearchCollege('')
    setDateFrom('')
    setDateTo('')
    setRevenueStatus('all')
    setSortBy('date_desc')
  }

  return (
    <>
      <Topbar title="Revenue Analytics" />
      <div className="page-view content">
        {/* Platform Overview KPI Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(kpis.totalRevenue)}</div>
            <div className="rpt-kpi-lbl">Total Revenue</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(kpis.totalExpenses)}</div>
            <div className="rpt-kpi-lbl">Total Expenses</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{fmt(kpis.netProfit)}</div>
            <div className="rpt-kpi-lbl">Net Profit</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green-d)' }}>{fmt(kpis.investorProfitShare)}</div>
            <div className="rpt-kpi-lbl">Investor Profit Share</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>{fmt(kpis.platformProfit)}</div>
            <div className="rpt-kpi-lbl">Platform Profit</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{kpis.activePrinters}</div>
            <div className="rpt-kpi-lbl">Active Printers</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(kpis.revenueThisMonth)}</div>
            <div className="rpt-kpi-lbl">Revenue This Month</div>
          </div>
        </div>
        
        {/* Filters Card */}
        <div className="rpt-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}>
            {/* Search Investor */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search Investor</label>
              <input
                className="admin-form-input"
                placeholder="Investor name..."
                value={searchInvestor}
                onChange={e => setSearchInvestor(e.target.value)}
              />
            </div>

            {/* Search Printer Code */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search Printer Code</label>
              <input
                className="admin-form-input"
                placeholder="Printer code..."
                value={searchPrinterCode}
                onChange={e => setSearchPrinterCode(e.target.value)}
              />
            </div>

            {/* Search College */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search College</label>
              <input
                className="admin-form-input"
                placeholder="College name..."
                value={searchCollege}
                onChange={e => setSearchCollege(e.target.value)}
              />
            </div>

            {/* Date From */}
            <div className="admin-form-group">
              <label className="admin-form-label">Date From</label>
              <input
                className="admin-form-input"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="admin-form-group">
              <label className="admin-form-label">Date To</label>
              <input
                className="admin-form-input"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>

            {/* Revenue / Kiosk Status */}
            <div className="admin-form-group">
              <label className="admin-form-label">Revenue Status</label>
              <select
                className="admin-form-input"
                value={revenueStatus}
                onChange={e => setRevenueStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort options */}
            <div className="admin-form-group">
              <label className="admin-form-label">Sort By</label>
              <select
                className="admin-form-input"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="date_desc">Recent Period</option>
                <option value="highest_revenue">Highest Revenue</option>
                <option value="lowest_revenue">Lowest Revenue</option>
              </select>
            </div>

            {/* Clear Button */}
            {hasActiveFilters && (
              <div className="admin-form-group">
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={clearFilters}
                  style={{ height: 38, width: '100%' }}
                >
                  ✕ Clear Filters
                </button>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--gray)' }}>
              Showing {filteredRows.length} of {computedAllRows.length} records
            </div>
          )}
        </div>
        <div className="rpt-card" style={{ marginBottom: "20px" }}>
  <div className="rpt-card-header">
    <div>
      <div className="rpt-card-title">
        College-wise Summary
      </div>

      <div className="rpt-card-sub">
        {dateFrom || "Beginning"} → {dateTo || "Today"}
      </div>
    </div>
  </div>

  <div className="rpt-table-wrap">
    <table className="admin-table">
      <thead>
        <tr>
          <th>College</th>
          <th>Revenue</th>
          <th>Expenses</th>
          <th>Net Profit</th>
          <th>Investor Share</th>
          <th>Platform Share</th>
        </tr>
      </thead>

      <tbody>
        {collegeSummary.map((row: any) => (
          <tr key={row.college}>
            <td>{row.college}</td>
            <td>{fmt(row.revenue)}</td>
            <td>{fmt(row.expenses)}</td>
            <td>{fmt(row.netProfit)}</td>
            <td>{fmt(row.investorShare)}</td>
            <td>{fmt(row.platformShare)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
        {/* Platform Revenue Analytics Table */}
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Revenue Analytics</div>
              <div className="rpt-card-sub">Platform-wide detailed billing and profit distributions</div>
            </div>
          </div>

          <div className="rpt-table-wrap">
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray)' }}>
                Loading analytics data...
              </div>
            ) : filteredRows.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray)' }}>
                No records found matching the active filters.
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Investor Name</th>
                    <th>College</th>
                    <th>Printer Code</th>
                    <th>Revenue</th>
                    <th>Approved Expenses</th>
                    <th>Net Profit</th>
                    <th>Investor Share</th>
                    <th>Platform Share</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row: any) => {
                    const statusClass =
                    row.kioskStatus === "active"
                      ? "admin-badge-active"
                      : "admin-badge-offline"

                    return (
                      <tr key={`${row.branch_id}-${row.revenue_date}`}>
                        <td style={{ fontWeight: 500 }}>{row.investorName}</td>
                        <td>{row.collegeName}</td>
                        <td style={{ fontWeight: 500, color: 'var(--gray)' }}>{row.printerCode}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(row.revenueVal)}</td>
                        <td style={{ color: 'var(--red)' }}>{fmt(row.approvedExpensesVal)}</td>
                        <td style={{ fontWeight: 600, color: row.netProfitVal >= 0 ? 'var(--green-d)' : 'var(--red)' }}>
                          {fmt(row.netProfitVal)}
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--green)' }}>{fmt(row.investorShareVal)}</td>
                        <td style={{ fontWeight: 500, color: 'var(--amber)' }}>{fmt(row.platformShareVal)}</td>
                        <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                          {new Date(row.lastUpdated).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <span className={`admin-badge ${statusClass}`}>
                            {row.kioskStatus}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}