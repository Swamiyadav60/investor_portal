import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_KIOSKS } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export function AdminRevenuePage() {
  const [form, setForm] = useState({
    kiosk_id: DEMO_KIOSKS[0].id,
    amount: '',
    print_jobs: '',
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
        print_jobs: Number(form.print_jobs) || 0,
        period_start: form.period_start,
        period_end: form.period_end,
        period_type: 'monthly',
        notes: form.notes || null,
      }
      if (!isSupabaseConfigured) {
        toast(`Revenue of ₹${form.amount} added (demo).`, 'success')
        return
      }
      const { error } = await supabase.from('revenues').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Revenue added. Investor dashboards will update in realtime.', 'success')
      setForm({ ...form, amount: '', print_jobs: '', notes: '' })
    },
  })

  return (
    <>
      <Topbar title="Revenue Management" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Add revenue</div>
            <div className="section-heading-sub">Revenue entries update investor dashboards in realtime</div>
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
              <label className="admin-form-label">Amount (₹)</label>
              <input className="admin-form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Print Jobs</label>
              <input className="admin-form-input" type="number" value={form.print_jobs} onChange={(e) => setForm({ ...form, print_jobs: e.target.value })} />
            </div>
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
          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Notes</label>
            <input className="admin-form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="admin-btn admin-btn-primary" onClick={() => createMutation.mutate()} disabled={!form.amount}>
            Add Revenue
          </button>
        </div>
      </div>
    </>
  )
}
