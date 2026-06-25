import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { fmt } from '@/lib/format'

export function AdminRevenuePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    kiosk_id: '',
    amount: '',
    print_jobs: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // ── Fetch all kiosks from Supabase ───────────────────────────
  const { data: kiosks = [], isLoading: loadingKiosks } = useQuery({
    queryKey: ['all-kiosks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiosks')
        .select('id, name, location, status')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data || []
    },
  })

  // ── Fetch recent revenue entries ─────────────────────────────
  const { data: recentRevenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ['admin-revenues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenues')
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
      if (!form.amount) throw new Error('Please enter an amount')

      const payload = {
        kiosk_id: form.kiosk_id,
        amount: Number(form.amount),
        print_jobs: Number(form.print_jobs) || 0,
        period_start: form.period_start,
        period_end: form.period_end,
        period_type: 'monthly',
        notes: form.notes || null,
      }

      const { error } = await supabase.from('revenues').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenues'] })
      queryClient.invalidateQueries({ queryKey: ['revenues'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Revenue added. Investor dashboards will update in realtime.', 'success')
      setForm(f => ({ ...f, amount: '', print_jobs: '', notes: '' }))
    },
    onError: (err: any) => {
      toast(err.message || 'Error adding revenue.', 'error')
    },
  })

  const totalRevenue = recentRevenues.reduce((s: number, r: any) => s + Number(r.amount), 0)
  const totalJobs    = recentRevenues.reduce((s: number, r: any) => s + Number(r.print_jobs || 0), 0)

  return (
    <>
      <Topbar title="Revenue Management" />
      <div className="page-view content">

        {/* KPI summary */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{fmt(totalRevenue)}</div>
            <div className="rpt-kpi-lbl">Total revenue logged</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{totalJobs.toLocaleString('en-IN')}</div>
            <div className="rpt-kpi-lbl">Total print jobs</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{recentRevenues.length}</div>
            <div className="rpt-kpi-lbl">Revenue entries</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{kiosks.filter((k: any) => k.status === 'active').length}</div>
            <div className="rpt-kpi-lbl">Active kiosks</div>
          </div>
        </div>

        {/* Add revenue form */}
        <div className="section-header">
          <div>
            <div className="section-heading">Add revenue entry</div>
            <div className="section-heading-sub">Revenue entries update investor dashboards in realtime</div>
          </div>
        </div>

        <div className="rpt-card" style={{ maxWidth: 640 }}>
          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Kiosk</label>
            {loadingKiosks ? (
              <div style={{ fontSize: 13, color: 'var(--gray)' }}>Loading kiosks...</div>
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

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Amount (₹)</label>
              <input
                className="admin-form-input"
                type="number"
                placeholder="e.g. 21000"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Print Jobs</label>
              <input
                className="admin-form-input"
                type="number"
                placeholder="e.g. 1400"
                value={form.print_jobs}
                onChange={e => setForm({ ...form, print_jobs: e.target.value })}
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
            disabled={!form.amount || !form.kiosk_id || createMutation.isPending}
          >
            {createMutation.isPending ? 'Adding...' : 'Add Revenue'}
          </button>
        </div>

        {/* Recent revenue entries */}
        <div className="rpt-card">
          <div className="rpt-card-header">
            <div>
              <div className="rpt-card-title">Recent revenue entries</div>
              <div className="rpt-card-sub">Last 50 entries across all kiosks</div>
            </div>
          </div>
          <div className="rpt-table-wrap">
            {loadingRevenues ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray)' }}>Loading...</div>
            ) : recentRevenues.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray)' }}>No revenue entries yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kiosk</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Print Jobs</th>
                    <th>Notes</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRevenues.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.kiosk?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{r.kiosk?.location}</div>
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                        {new Date(r.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(Number(r.amount))}</td>
                      <td>{Number(r.print_jobs || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>{r.notes || '—'}</td>
                      <td style={{ color: 'var(--gray)', fontSize: 12 }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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