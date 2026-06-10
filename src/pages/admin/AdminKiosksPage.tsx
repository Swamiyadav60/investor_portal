import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_KIOSKS, DEMO_INVESTOR } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

export function AdminKiosksPage() {
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAssign = async (kioskId: string) => {
    if (!isSupabaseConfigured) {
      toast('Kiosk assigned (demo)', 'success')
      setShowAssign(null)
      return
    }
    const { error } = await supabase.from('investor_kiosks').insert({
      investor_id: DEMO_INVESTOR.id,
      kiosk_id: kioskId,
    })
    if (error) toast(error.message, 'error')
    else { toast('Kiosk assigned successfully', 'success'); setShowAssign(null) }
  }

  return (
    <>
      <Topbar title="Kiosks" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage kiosks</div>
            <div className="section-heading-sub">{DEMO_KIOSKS.length} kiosks registered</div>
          </div>
          <button className="admin-btn admin-btn-primary">+ Add Kiosk</button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Location</th><th>Status</th><th>Investment</th><th>Recovered</th><th>Online</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {DEMO_KIOSKS.map((k) => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 500 }}>{k.name}</td>
                    <td>{k.location}</td>
                    <td>
                      <span className={`admin-badge ${k.status === 'active' ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                        {k.status}
                      </span>
                    </td>
                    <td>{fmt(k.investment_amount)}</td>
                    <td>{fmt(k.recovered_amount)}</td>
                    <td>{k.is_online ? '🟢' : '🔴'}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="admin-btn admin-btn-secondary" onClick={() => setShowAssign(k.id)}>Assign</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAssign && (
          <div className="admin-modal-overlay" onClick={() => setShowAssign(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>Assign Kiosk to Investor</div>
              <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
                <label className="admin-form-label">Investor</label>
                <select className="admin-form-input">
                  <option>{DEMO_INVESTOR.full_name} — {DEMO_INVESTOR.email}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="admin-btn admin-btn-primary" onClick={() => handleAssign(showAssign)}>Assign</button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowAssign(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
