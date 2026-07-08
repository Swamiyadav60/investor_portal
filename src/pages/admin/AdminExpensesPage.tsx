import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { fmt } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'pending' | 'approved' | 'rejected'

interface ExpenseRow {
  id: string
  created_at: string
  category: string
  expense_type: string
  amount: number
  notes: string | null
  bill_url: string | null
  status: Tab
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  admin_remarks: string | null
  expense_name: string | null
  expense_catalog_id: string | null
  branch: { id: string; name: string; location: string } | null
  submitted_by_inv: { id: string; full_name: string } | null
  approved_by_inv: { id: string; full_name: string } | null
  catalog_item?: { id: string; name: string; default_amount: number; expense_mode: 'fixed' | 'custom' } | null
}

// ─── Helper: status badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'admin-badge admin-badge-pending',
    approved: 'admin-badge admin-badge-active',
    rejected: 'admin-badge admin-badge-failed',
  }
  const label: Record<string, string> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  }
  return <span className={map[status] ?? 'admin-badge'}>{label[status] ?? status}</span>
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminExpensesPage() {
  const { toast }      = useToast()
  const queryClient    = useQueryClient()
  const { investor }   = useAuth()
  const adminId        = investor?.id

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('pending')

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchPrinter,   setSearchPrinter]   = useState('')
  const [searchAmbassador, setSearchAmbassador] = useState('')
  const [filterCollege,   setFilterCollege]   = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')

  // ── Reject modal ─────────────────────────────────────────────────────────
  const [rejectModal, setRejectModal] = useState<{ open: boolean; expense: ExpenseRow | null }>({
    open: false, expense: null,
  })
  const [rejectReason, setRejectReason] = useState('')

  // ── Summary counts (all statuses, single query) ───────────────────────────
  const { data: allCounts = { pending: 0, approved: 0, rejected: 0, totalPending: 0, totalApproved: 0, totalRejected: 0, rows: [] } } = useQuery({
    queryKey: ['admin-expense-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branch_expenses')
        .select('status, amount, category, expense_name')
      const rows = data || []
      return {
        pending:      rows.filter(r => r.status === 'pending').length,
        approved:     rows.filter(r => r.status === 'approved').length,
        rejected:     rows.filter(r => r.status === 'rejected').length,
        totalPending: rows
          .filter(r => r.status === 'pending')
          .reduce((s: number, r: any) => s + Number(r.amount), 0),
        totalApproved: rows
          .filter(r => r.status === 'approved')
          .reduce((s: number, r: any) => s + Number(r.amount), 0),
        totalRejected: rows
          .filter(r => r.status === 'rejected')
          .reduce((s: number, r: any) => s + Number(r.amount), 0),
        rows: rows
      }
    },
  })

  // ── Expense rows for selected tab ─────────────────────────────────────────
  const { data: expenses = [], isLoading } = useQuery<ExpenseRow[]>({
    queryKey: ['admin-expenses-v2', tab],
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from('branch_expenses')
        .select(`
          id, created_at, category, expense_type, amount, notes, bill_url,
          status, approved_at, rejected_at, rejection_reason, admin_remarks,
          expense_name, expense_catalog_id,
          branch:branches(id, name, location),
          submitted_by_inv:users!branch_expenses_submitted_by_fkey(id, full_name),
          approved_by_inv:users!branch_expenses_approved_by_fkey(id, full_name),
          catalog_item:expense_catalog_id(id, name, default_amount, expense_mode)
        `)
        .eq('status', tab)
        .order('created_at', { ascending: false })
      if (error) {
        // Fallback: simpler select without aliased joins if FK aliases not defined
        const { data: fallback, error: e2 } = await supabase
          .from('branch_expenses')
          .select('*, branch:branches(id, name, location), submitted_by:users(id, full_name)')
          .eq('status', tab)
          .order('created_at', { ascending: false })
        if (e2) throw e2
        return (fallback || []).map((r: any) => ({
          ...r,
          submitted_by_inv: r.submitted_by ?? null,
          approved_by_inv:  null,
        })) as unknown as ExpenseRow[]
      }
      return (data || []) as unknown as ExpenseRow[]
    },
  })

  // ── Category Breakdown ──────────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    if (!allCounts.rows) return []
    const approvedRows = allCounts.rows.filter((r: any) => r.status === 'approved')
    const totalApproved = allCounts.totalApproved
    if (totalApproved === 0) return []

    const groupings: Record<string, number> = {}
    approvedRows.forEach((r: any) => {
      const cat = r.expense_name || r.category || 'Other'
      groupings[cat] = (groupings[cat] || 0) + Number(r.amount)
    })

    const colors = [
      '#f97316', // Orange (Paper)
      '#3b82f6', // Blue (Ink/Toner)
      '#10b981', // Green (Maintenance)
      '#a855f7', // Purple (Drum)
      '#ec4899', // Pink (Rent)
      '#eab308', // Yellow (Power)
      '#14b8a6', // Teal (Staff)
      '#6b7280', // Gray (Insurance)
    ]

    return Object.entries(groupings)
      .map(([name, amount], idx) => ({
        name,
        amount,
        pct: (amount / totalApproved) * 100,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [allCounts])

  // ── All colleges (for filter dropdown) ───────────────────────────────────
  const colleges = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    expenses.forEach(e => {
      const loc = e.branch?.location
      if (loc && !seen.has(loc)) { seen.add(loc); list.push(loc) }
    })
    return list.sort()
  }, [expenses])

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (searchPrinter && !e.branch?.name?.toLowerCase().includes(searchPrinter.toLowerCase())) return false
      if (searchAmbassador && !e.submitted_by_inv?.full_name?.toLowerCase().includes(searchAmbassador.toLowerCase())) return false
      if (filterCollege && e.branch?.location !== filterCollege) return false
      if (dateFrom && e.created_at < dateFrom) return false
      if (dateTo && e.created_at > dateTo + 'T23:59:59') return false
      return true
    })
  }, [expenses, searchPrinter, searchAmbassador, filterCollege, dateFrom, dateTo])

  const hasActiveFilters = searchPrinter || searchAmbassador || filterCollege || dateFrom || dateTo
  const clearFilters = () => {
    setSearchPrinter(''); setSearchAmbassador('')
    setFilterCollege(''); setDateFrom(''); setDateTo('')
  }

  // ── Approve mutation ──────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('branch_expenses')
        .update({ status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() })
        .eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses-v2'] })
      queryClient.invalidateQueries({ queryKey: ['admin-expense-counts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast('Expense approved successfully.', 'success')
    },
    onError: (err: any) => toast(err.message || 'Error approving expense.', 'error'),
  })

  // ── Reject mutation ───────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      const { error } = await supabase
        .from('branch_expenses')
        .update({
          status:           'rejected',
          rejection_reason: reason || null,
          admin_remarks:    reason || null,
          rejected_at:      new Date().toISOString(),
        })
        .eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses-v2'] })
      queryClient.invalidateQueries({ queryKey: ['admin-expense-counts'] })
      toast('Expense rejected.', 'success')
      setRejectModal({ open: false, expense: null })
      setRejectReason('')
    },
    onError: (err: any) => toast(err.message || 'Error rejecting expense.', 'error'),
  })

  const openReject = (e: ExpenseRow) => setRejectModal({ open: true, expense: e })
  const confirmReject = () => {
    if (rejectModal.expense) {
      rejectMutation.mutate({ expenseId: rejectModal.expense.id, reason: rejectReason })
    }
  }

  return (
    <>
      <Topbar title="Expense Approval Center" />
      <div className="page-view content">

        {/* ── KPI Summary & Breakdown Row ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="kpi-breakdown-row">
          
          {/* Summary KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', height: '100%' }}>
              <div className="rpt-kpi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="rpt-kpi-val" style={{ color: '#E8891A' }}>{allCounts.pending}</div>
                <div className="rpt-kpi-lbl">Total Pending Expenses</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>Value: {fmt(allCounts.totalPending)}</div>
              </div>
              <div className="rpt-kpi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>{allCounts.approved}</div>
                <div className="rpt-kpi-lbl">Total Approved Expenses</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>Value: {fmt(allCounts.totalApproved)}</div>
              </div>
              <div className="rpt-kpi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="rpt-kpi-val" style={{ color: 'var(--red)' }}>{allCounts.rejected}</div>
                <div className="rpt-kpi-lbl">Total Rejected Expenses</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>Value: {fmt(allCounts.totalRejected)}</div>
              </div>
              <div className="rpt-kpi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--green-ll)', border: '1px solid rgba(26,155,108,0.2)' }}>
                <div className="rpt-kpi-val" style={{ color: 'var(--green-d)', fontSize: 26 }}>{fmt(allCounts.totalApproved)}</div>
                <div className="rpt-kpi-lbl" style={{ fontWeight: 600 }}>Total Expense Value</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>Only approved items affect payouts</div>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown Chart */}
          <div className="rpt-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div className="rpt-card-title" style={{ fontSize: 13, marginBottom: '1rem', fontWeight: 600 }}>Approved Category Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {categoryBreakdown.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--gray)', textAlign: 'center', padding: '2rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No approved expenses to show breakdown.
                </div>
              ) : (
                categoryBreakdown.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{c.name}</span>
                    <div style={{ flex: 2, background: 'var(--gray-l)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${c.pct}%`, background: c.color, height: '100%' }} />
                    </div>
                    <span style={{ width: '65px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>{fmt(c.amount)}</span>
                    <span style={{ width: '35px', textAlign: 'right', color: 'var(--gray)', fontSize: 11 }}>{c.pct.toFixed(0)}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          {(['pending', 'approved', 'rejected'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = {
              pending: 'Pending Approval',
              approved: 'Approved Expenses',
              rejected: 'Rejected Expenses',
            }
            const counts: Record<Tab, number> = {
              pending: allCounts.pending,
              approved: allCounts.approved,
              rejected: allCounts.rejected,
            }
            const dotColor: Record<Tab, string> = {
              pending: '#c2410c',
              approved: 'var(--green-d)',
              rejected: 'var(--red)',
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 500,
                  color: tab === t ? 'var(--ink)' : 'var(--gray)',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {labels[t]}
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: tab === t ? (t === 'pending' ? '#fff7ed' : t === 'approved' ? 'var(--green-l)' : 'var(--red-l)') : 'var(--gray-l)',
                  color: tab === t ? dotColor[t] : 'var(--gray)',
                }}>
                  {counts[t]}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Filters bar ─────────────────────────────────────────────────── */}
        <div className="rpt-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}>
            {/* Search Printer */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search Printer</label>
              <input
                className="admin-form-input"
                placeholder="Printer name..."
                value={searchPrinter}
                onChange={e => setSearchPrinter(e.target.value)}
              />
            </div>

            {/* Search Ambassador */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search Ambassador</label>
              <input
                className="admin-form-input"
                placeholder="Ambassador name..."
                value={searchAmbassador}
                onChange={e => setSearchAmbassador(e.target.value)}
              />
            </div>

            {/* Filter College */}
            <div className="admin-form-group">
              <label className="admin-form-label">College / Location</label>
              <select
                className="admin-form-input"
                value={filterCollege}
                onChange={e => setFilterCollege(e.target.value)}
              >
                <option value="">All locations</option>
                {colleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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

            {/* Clear */}
            {hasActiveFilters && (
              <div className="admin-form-group" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={clearFilters}
                  style={{ height: 34, alignSelf: 'flex-end' }}
                >
                  ✕ Clear Filters
                </button>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--gray)' }}>
              Showing {filtered.length} of {expenses.length} entries
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="rpt-card" style={{ marginTop: '1.25rem' }}>
          <div className="rpt-table-wrap">
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray)' }}>
                Loading expenses list...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray)' }}>
                <div>
                  {hasActiveFilters
                    ? 'No expenses match your current filters.'
                    : tab === 'pending'
                    ? 'No pending expenses for review. 🎉'
                    : tab === 'approved'
                    ? 'No approved expenses found.'
                    : 'No rejected expenses.'}
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{ marginTop: 8, fontSize: 13, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear filters →
                  </button>
                )}
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ambassador</th>
                    <th>College</th>
                    <th>Printer</th>
                    <th>Expense Type</th>
                    <th>Expense Mode</th>
                    <th>Amount</th>
                    <th>Bill</th>
                    <th>Status</th>
                    {tab === 'pending'  && <th>Actions</th>}
                    {tab === 'approved' && <th>Approved At</th>}
                    {tab === 'approved' && <th>Approved By</th>}
                    {tab === 'rejected' && <th>Rejected At</th>}
                    {tab === 'rejected' && <th>Reason</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      {/* Date */}
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray)', fontSize: 12 }}>
                        {new Date(e.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {/* Ambassador */}
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {e.submitted_by_inv?.full_name || '—'}
                        </div>
                      </td>

                      {/* College */}
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                        {e.branch?.location || '—'}
                      </td>

                      {/* Printer */}
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {e.branch?.name || '—'}
                        </div>
                      </td>

                      {/* Expense Type */}
                      <td>
                        <span style={{
                          background: 'var(--gray-l)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: 'var(--gray)',
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }}>
                          {e.expense_name || e.category}
                        </span>
                      </td>

                      {/* Expense Mode */}
                      <td>
                        {e.catalog_item ? (
                          <span style={{
                            background: e.catalog_item.expense_mode === 'fixed' ? 'rgba(26,155,108,0.1)' : 'rgba(232,137,26,0.1)',
                            color: e.catalog_item.expense_mode === 'fixed' ? 'var(--green)' : 'var(--amber)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {e.catalog_item.expense_mode === 'fixed' ? 'Fixed' : 'Custom'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--gray)', fontSize: 12, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                            {fmt(Number(e.amount))}
                          </span>
                          {/* Price mismatch warning for fixed expenses */}
                          {e.catalog_item && e.catalog_item.expense_mode === 'fixed' && (
                            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                              Catalog: {fmt(e.catalog_item.default_amount)}
                              {Number(e.catalog_item.default_amount) !== Number(e.amount) && (
                                <span style={{
                                  background: 'rgba(217, 64, 64, 0.12)',
                                  color: 'var(--red)',
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  marginLeft: 4,
                                  display: 'inline-block'
                                }}>
                                  ⚠️ Price mismatch
                                </span>
                              )}
                            </div>
                          )}
                          {e.catalog_item && e.catalog_item.expense_mode === 'custom' && (
                            <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500, marginTop: 2 }}>
                              Custom mode
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bill */}
                      <td>
                        {e.bill_url ? (
                          <a
                            href={e.bill_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: 'var(--green-d)',
                              fontWeight: 600,
                              fontSize: 12,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            View
                          </a>
                        ) : (
                          <span style={{ color: 'var(--gray)', fontSize: 12, fontStyle: 'italic' }}>None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td><StatusBadge status={e.status} /></td>

                      {/* ─ PENDING: approve / reject actions ─ */}
                      {tab === 'pending' && (
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="admin-btn admin-btn-primary"
                              onClick={() => approveMutation.mutate(e.id)}
                              disabled={approveMutation.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Approve
                            </button>
                            <button
                              className="admin-btn admin-btn-danger"
                              onClick={() => openReject(e)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        </td>
                      )}

                      {/* ─ APPROVED: date + who approved ─ */}
                      {tab === 'approved' && (
                        <>
                          <td style={{ fontSize: 12, color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                            {e.approved_at
                              ? new Date(e.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--gray)' }}>
                            {e.approved_by_inv?.full_name || 'Admin'}
                          </td>
                        </>
                      )}

                      {/* ─ REJECTED: date + reason ─ */}
                      {tab === 'rejected' && (
                        <>
                          <td style={{ fontSize: 12, color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                            {e.rejected_at
                              ? new Date(e.rejected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--ink)', maxWidth: 220 }}>
                            {e.rejection_reason || e.admin_remarks || (
                              <span style={{ fontStyle: 'italic', color: 'var(--gray)' }}>No reason given</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Row count footer */}
          {!isLoading && filtered.length > 0 && (
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--gray)',
            }}>
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
              {hasActiveFilters ? ` (filtered from ${expenses.length})` : ''}
            </div>
          )}
        </div>

        {/* ── Reject Modal ─────────────────────────────────────────────────── */}
        {rejectModal.open && rejectModal.expense && (
          <div className="admin-modal-overlay">
            <div className="admin-modal">
              {/* Modal header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 17,
                    color: 'var(--ink)',
                    marginBottom: 4,
                  }}>
                    Reject Expense
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                    This will notify the ambassador and exclude this expense from all reports.
                  </div>
                </div>
                <button
                  onClick={() => { setRejectModal({ open: false, expense: null }); setRejectReason('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', fontSize: 18, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {/* Expense summary */}
              <div style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ambassador</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>
                    {rejectModal.expense.submitted_by_inv?.full_name || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginTop: 2 }}>
                    {fmt(Number(rejectModal.expense.amount))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Printer</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                    {rejectModal.expense.branch?.name || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expense Type</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
                    {rejectModal.expense.expense_name || rejectModal.expense.category}
                  </div>
                </div>
              </div>

              {/* Reason input */}
              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Rejection Reason (optional)</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this expense is being rejected. The ambassador will see this reason."
                  style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: 13 }}
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={() => { setRejectModal({ open: false, expense: null }); setRejectReason('') }}
                >
                  Cancel
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={confirmReject}
                  disabled={rejectMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {rejectMutation.isPending ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .kpi-breakdown-row {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .rpt-kpi-row { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  )
}