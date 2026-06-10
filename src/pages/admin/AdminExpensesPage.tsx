import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_KIOSKS } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

const CATEGORIES = {
  variable: ['Paper', 'Toner / Ink', 'Drum'],
  fixed: ['Rent', 'Power bill', 'Maintenance'],
}

export function AdminExpensesPage() {
  const [form, setForm] = useState({
    kiosk_id: DEMO_KIOSKS[0].id,
    amount: '',
    category: 'Paper',
    expense_type: 'variable' as 'variable' | 'fixed',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        kiosk_id: form.kiosk_id,
        amount: Number(form.amount),
        category: form.category,
        expense_type: form.expense_type,
        period_start: form.period_start,
        period_end: form.period_end,
        period_type: 'monthly',
        notes: form.notes || null,
      }
      if (!isSupabaseConfigured) {
        toast(`Expense of ₹${form.amount} added (demo).`, 'success')
        return
      }
      const { error } = await supabase.from('expenses').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Expense added. Investor dashboards will update in realtime.', 'success')
      setForm({ ...form, amount: '', notes: '' })
    },
  })

  return (
    <>
      <Topbar title="Expense Management" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Add expense</div>
            <div className="section-heading-sub">Expense entries update investor dashboards in realtime</div>
          </div>
        </div>

        <div className="rpt-card" style={{ maxWidth: 600 }}>
          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Kiosk</label>
            <select className="admin-form-input" value={form.kiosk_id} onChange={(e) => setForm({ ...form, kiosk_id: e.target.value })}>
              {DEMO_KIOSKS.filter((k) => k.status === 'active').map((k) => (
                <option key={k.id} value={k.id}>{k.name} — {k.location}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Type</label>
              <select className="admin-form-input" value={form.expense_type} onChange={(e) => {
                const type = e.target.value as 'variable' | 'fixed'
                setForm({ ...form, expense_type: type, category: CATEGORIES[type][0] })
              }}>
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Category</label>
              <select className="admin-form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES[form.expense_type].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Amount (₹)</label>
            <input className="admin-form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Period Start</label>
              <input className="admin-form-input" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Period End</label>
              <input className="admin-form-input" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </div>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={() => createMutation.mutate()} disabled={!form.amount}>
            Add Expense
          </button>
        </div>
      </div>
    </>
  )
}
