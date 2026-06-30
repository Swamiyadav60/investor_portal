import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'

interface DashboardKpis {
  assignedPrintersCount: number
  totalExpensesAmount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

export function BranchDashboardPage() {
  const { investor } = useAuth()
  const navigate = useNavigate()

  // 1. Fetch assigned kiosks directly from kiosks table
  const { data: assignedKiosks = [] } = useQuery({
    queryKey: ['branch-kiosks', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('branch_ambassador_id', investor!.id)

      if (error) throw error
      return data || []
    },
  })

  // 2. Fetch logged expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['branch-expenses', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, kiosk:kiosks(name)')
        .eq('submitted_by', investor!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  // Compute KPIs
  const kpis: DashboardKpis = {
    assignedPrintersCount: assignedKiosks.length,
    totalExpensesAmount: expenses
      .filter((e: any) => e.status === 'approved')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0),
    pendingCount: expenses.filter((e: any) => e.status === 'pending').length,
    approvedCount: expenses.filter((e: any) => e.status === 'approved').length,
    rejectedCount: expenses.filter((e: any) => e.status === 'rejected').length,
  }

  const recentExpenses = expenses.slice(0, 5)

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="page-view content">
        {/* Welcome Section */}
        <div className="welcome-banner" style={{
          background: 'linear-gradient(135deg, #1A9B6C 0%, #127A54 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'var(--white)',
          boxShadow: '0 8px 32px rgba(26, 155, 108, 0.12)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="banner-title" style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              Welcome back, {investor?.full_name || 'Ambassador'}!
            </h1>
            <p className="banner-sub" style={{ fontSize: '14px', opacity: 0.9, maxWidth: '500px', lineHeight: 1.5 }}>
              You are managing campus kiosks. Log utility bills, paper refilling, or drum replacement expenses to keep our operations running smoothly.
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <Link to="/branch/log-expense" className="btn-primary" style={{
                textDecoration: 'none',
                background: 'var(--white)',
                color: 'var(--green-d)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Log New Expense
              </Link>
              <Link to="/branch/printers" className="btn-secondary" style={{
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                background: 'transparent',
                color: 'var(--white)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                View Printers
              </Link>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            filter: 'blur(30px)',
            zIndex: 1
          }} />
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-accent" style={{ background: '#1A9B6C' }} />
            <div className="kpi-label">
              <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Assigned Printers
            </div>
            <div className="kpi-value">{kpis.assignedPrintersCount}</div>
            <div className="kpi-sub">Printer kiosks assigned to you</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-accent" style={{ background: '#E8891A' }} />
            <div className="kpi-label">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Pending Expenses
            </div>
            <div className="kpi-value">{kpis.pendingCount}</div>
            <div className="kpi-sub">Awaiting admin verification</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-accent" style={{ background: 'var(--green-d)' }} />
            <div className="kpi-label">
              <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Approved Expenses
            </div>
            <div className="kpi-value">{fmt(kpis.totalExpensesAmount)}</div>
            <div className="kpi-sub">Total verified operational cost</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-accent" style={{ background: '#D94040' }} />
            <div className="kpi-label">
              <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Rejected Expenses
            </div>
            <div className="kpi-value">{kpis.rejectedCount}</div>
            <div className="kpi-sub">Disallowed expense requests</div>
          </div>
        </div>

        {/* Recent Activity / Submissions */}
        <div className="section-header" style={{ marginTop: '1rem' }}>
          <div>
            <h2 className="section-heading">Recent Expense Logs</h2>
            <p className="section-heading-sub">Track status and review admin remarks for your latest submissions</p>
          </div>
          <button className="admin-btn admin-btn-secondary" onClick={() => navigate('/branch/history')}>
            View All History →
          </button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Kiosk / Printer</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)' }}>
                      No expenses logged yet.
                    </td>
                  </tr>
                ) : (
                  recentExpenses.map((exp: any) => (
                    <tr key={exp.id}>
                      <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {new Date(exp.period_start).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>{exp.kiosk?.name || 'Smart Printer'}</td>
                      <td>
                        <span style={{
                          background: 'var(--gray-l)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: 'var(--gray)'
                        }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(exp.amount)}</td>
                      <td>
                        <span className={`status-badge ${exp.status}`} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {exp.status}
                        </span>
                      </td>
                      <td style={{ color: exp.admin_remarks ? 'var(--ink)' : 'var(--gray)', fontStyle: exp.admin_remarks ? 'normal' : 'italic', fontSize: '13px' }}>
                        {exp.admin_remarks || 'No remarks added yet.'}
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
