import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { fmt } from '@/lib/format'

export function AdminExpensesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    kiosk_id: '',
    amount: '',
    category: '',
    expense_type: 'variable' as 'variable' | 'fixed',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // ── Fetch all kiosks ─────────────────────────────────────────
  const { data: kiosks = [], isLoading: loadingKiosks } = useQuery({
    queryKey: ['all-kiosks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiosks')
        .select('id, name, location, status')
        .order('name')
      if (error) throw error
      return data || []
    },
  })

  // ── Fetch recent expenses ────────────────────────────────────
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, kiosk:kiosks(name, location)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.kiosk_id) throw new Error('Please select a kiosk')
      if (!form.amount)   throw new Error('Please enter an amount')
      if (!form.category) throw new Error('Please enter a category')

      const payload = {
        kiosk_id:     form.kiosk_id,
        amount:       Number(form.amount),
        category:     form.category,
        expense_type: form.expense_type,
        period_start: form.period_start,
        period_end:   form.period_end,
        period_type:  'monthly',
        notes:        form.notes || null,
      }

      const { error } = await supabase.from('expenses').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Expense added successfully.', 'success')
      setForm(f => ({ ...f, amount: '', category: '', notes: '' }))
    },
    onError: (err: any) => {
      toast(err.message || 'Error adding expense.', 'error')
    },
  })

  const totalVar = expenses.filter((e: any) => e.expense_type === 'variable').reduce((s: number, e: any) => s + Number(e.amount), 0)
  const totalFix = expenses.filter((e: any) => e.expense_type === 'fixed').reduce((s: number, e: any) => s + Number(e.amount), 0)

  const VAR_CATEGORIES = ['Paper', 'Toner / Ink', 'Drum', 'Maintenance']
  const FIX_CATEGORIES = ['Rent / Space', 'Internet', 'Electricity', 'Staff', 'Insurance']

  return (
    <>
      <Topbar title="Expense Management" />
      <div className="page-view content">

        {/* KPI summary */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--red)' }}>{fmt(totalVar)}</div>
            <div className="rpt-kpi-lbl">Total variable expenses</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>{fmt(totalFix)}</div>
            <div className="rpt-kpi-lbl">Total fixed expenses</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(totalVar + totalFix)}</div>
            <div className="rpt-kpi-lbl">Total expenses</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{expenses.length}</div>
            <div className="rpt-kpi-lbl">Expense entries</div>
          </div>
        </div>

        {/* Add expense form */}
        <div className="section-header">
          <div>
            <div className="section-heading">Add expense entry</div>
            <div className="section-heading-sub">Expenses update investor P&L reports in realtime</div>
          </div>
        </div>

        <div className="rpt-card" style={{ maxWidth: 640 }}>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Kiosk</label>
              {loadingKiosks ? (
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>Loading...</div>
              ) : (
                <select
                  className="admin-form-input"
                  value={form.kiosk_id}
                  onChange={e => setForm({ ...form, kiosk_id: e.target.value })}
                >
                  <option value="">-- Select kiosk --</option>
                  {kiosks.map((k: any) => (
                    <option key={k.id} value={k.id}>{k.name} — {k.location}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Expense Type</label>
              <select
                className="admin-form-input"
                value={form.expense_type}
                onChange={e => setForm({ ...form, expense_type: e.target.value as 'variable' | 'fixed', category: '' })}
              >
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Category</label>
              <select
                className="admin-form-input"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option value="">-- Select category --</option>
                {(form.expense_type === 'variable' ? VAR_CATEGORIES : FIX_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Amount (₹)</label>
              <input
                className="admin-form-input"
                type="number"
                placeholder="e.g. 2000"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Period Start</label>
              <input
                className="admin-form-input"
                type="date"
                value={form.period_start}
                onChange={e => setForm({ ...form, period_start: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Period End</label>
              <input
                className="admin-form-input"
                type="date"
                value={form.period_end}
                onChange={e => setForm({ ...form, period_end: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Notes (optional)</label>
            <input
              className="admin-form-input"
              placeholder="Any remarks..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <button
            className="admin-btn admin-btn-primary"
            onClick={() => createMutation.mutate()}
            disabled={!form.amount || !form.kiosk_id || !form.category || createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Expense'}
          </button>
        </div>

        {/* Recent expenses table */}
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Recent expense entries</div>
              <div className="rpt-card-sub">Last 50 entries across all kiosks</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            {loadingExpenses ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray)' }}>Loading...</div>
            ) : expenses.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray)' }}>No expense entries yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kiosk</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e: any) => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.kiosk?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{e.kiosk?.location}</div>
                      </td>
                      <td>{e.category}</td>
                      <td>
                        <span className={`admin-badge ${e.expense_type === 'variable' ? 'admin-badge-pending' : 'admin-badge-active'}`}>
                          {e.expense_type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--gray)' }}>
                        {new Date(e.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600, color: e.expense_type === 'variable' ? 'var(--red)' : 'var(--amber)' }}>
                        {fmt(Number(e.amount))}
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>{e.notes || '—'}</td>
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                        {new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}