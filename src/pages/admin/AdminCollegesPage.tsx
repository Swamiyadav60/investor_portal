import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_COLLEGES } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import type { College } from '@/types/database'

export function AdminCollegesPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', city: 'Hyderabad', type: 'college', slots_total: 3, investment_amount: 25000, avg_monthly_earnings: 5000 })
  const queryClient = useQueryClient()

  const { data: colleges = DEMO_COLLEGES } = useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_COLLEGES
      const { data } = await supabase.from('colleges').select('*').order('created_at', { ascending: false })
      return (data as College[]) || DEMO_COLLEGES
    },
  })

  const createMutation = useMutation({
    mutationFn: async (college: typeof form) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase.from('colleges').insert(college)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['colleges'] }); setShowModal(false) },
  })

  return (
    <>
      <Topbar title="Colleges" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage colleges & locations</div>
            <div className="section-heading-sub">{colleges.length} locations registered</div>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>+ Add College</button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Location</th><th>Type</th><th>Slots</th><th>Investment</th><th>Avg Monthly</th><th>Status</th></tr>
              </thead>
              <tbody>
                {colleges.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.location}</td>
                    <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                    <td>{c.slots_taken}/{c.slots_total}</td>
                    <td>{fmt(c.investment_amount)}</td>
                    <td>{fmt(c.avg_monthly_earnings)}</td>
                    <td><span className="admin-badge admin-badge-active">{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>Add College</div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Name</label>
                  <input className="admin-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">City</label>
                  <input className="admin-form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
                <label className="admin-form-label">Location</label>
                <input className="admin-form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Type</label>
                  <select className="admin-form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="college">College</option>
                    <option value="transit">Transit</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Total Slots</label>
                  <input className="admin-form-input" type="number" value={form.slots_total} onChange={(e) => setForm({ ...form, slots_total: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                <button className="admin-btn admin-btn-primary" onClick={() => createMutation.mutate(form)}>Create</button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
