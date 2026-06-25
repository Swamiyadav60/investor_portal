import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  pending_installation: {
    background: 'rgba(249,115,22,0.12)',
    color: '#f97316',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  active: {
    background: 'rgba(26,155,108,0.12)',
    color: '#1A9B6C',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
}

function getInstallProgress(steps: any): string {
  if (!steps || typeof steps !== 'object') return '0 of 4 steps'
  const entries = Array.isArray(steps) ? steps : Object.values(steps)
  const total = entries.length || 4
  const done = entries.filter((s: any) =>
    typeof s === 'object' ? s.completed || s.done : !!s
  ).length
  return `${done} of ${total} steps`
}

export function AdminInstallationsPage() {
  const [completeKiosk, setCompleteKiosk] = useState<any | null>(null)
  const [printerSerial, setPrinterSerial] = useState('')
  const [installDate, setInstallDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { investor } = useAuth()

  // ── Pending installations ──────────────────────────────────────
  const { data: pendingKiosks = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin-installations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiosks')
        .select(
          '*, college:colleges(name), investor_kiosks(status, investor:investors(id, full_name, email))'
        )
        .eq('status', 'pending_installation')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })

  // ── Recently completed ─────────────────────────────────────────
  const { data: recentCompleted = [], isLoading: loadingCompleted } = useQuery({
    queryKey: ['admin-installations-completed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*, college:colleges(name)')
        .eq('status', 'active')
        .not('installed_at', 'is', null)
        .order('installed_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
  })

  // ── KPI: installations completed this month ────────────────────
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const completedThisMonth = recentCompleted.filter((k: any) => {
    if (!k.installed_at) return false
    return new Date(k.installed_at) >= new Date(monthStart)
  }).length

  // ── Complete installation mutation ─────────────────────────────
  const completeMutation = useMutation({
    mutationFn: async ({
      kioskId,
      serial,
    }: {
      kioskId: string
      serial: string
    }) => {
      const { error } = await supabase.rpc('complete_installation', {
        p_kiosk_id: kioskId,
        p_admin_id: investor?.id,
        p_printer_serial: serial,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-installations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-installations-completed'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kiosks'] })
      toast('Installation marked as complete!', 'success')
      handleCloseModal()
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to complete installation.', 'error')
    },
  })

  const handleOpenModal = (kiosk: any) => {
    setCompleteKiosk(kiosk)
    setPrinterSerial(kiosk.printer_serial || '')
    setInstallDate(new Date().toISOString().slice(0, 10))
  }

  const handleCloseModal = () => {
    setCompleteKiosk(null)
    setPrinterSerial('')
    setInstallDate(new Date().toISOString().slice(0, 10))
  }

  const handleSubmitComplete = () => {
    if (!completeKiosk) return
    completeMutation.mutate({
      kioskId: completeKiosk.id,
      serial: printerSerial,
    })
  }

  return (
    <>
      <Topbar title="Installations" />
      <div className="page-view content">
        {/* Section header */}
        <div className="section-header">
          <div>
            <div className="section-heading">Pending Installations</div>
            <div className="section-heading-sub">
              Manage kiosk installation queue and track progress
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{pendingKiosks.length}</div>
            <div className="rpt-kpi-lbl">Total pending installations</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green, #1A9B6C)' }}>
              {completedThisMonth}
            </div>
            <div className="rpt-kpi-lbl">Completed this month</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">—</div>
            <div className="rpt-kpi-lbl">Avg. installation time</div>
          </div>
        </div>

        {/* Pending Queue Table */}
        <div className="rpt-card">
          <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>
            Installation Queue
          </div>
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kiosk Name</th>
                  <th>Location</th>
                  <th>College</th>
                  <th>Assigned Investor</th>
                  <th>Installation Date</th>
                  <th>Printer Serial</th>
                  <th>Install Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingPending ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading pending installations…
                    </td>
                  </tr>
                ) : pendingKiosks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      No pending installations. 🎉
                    </td>
                  </tr>
                ) : (
                  pendingKiosks.map((k: any) => {
                    const activeInvestor = k.investor_kiosks?.[0]?.investor

                    return (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 500 }}>{k.name}</td>
                        <td>{k.location || '—'}</td>
                        <td>{k.college?.name || '—'}</td>
                        <td
                          style={{
                            color: activeInvestor ? 'var(--ink)' : 'var(--gray)',
                            fontStyle: activeInvestor ? 'normal' : 'italic',
                            fontSize: 13,
                          }}
                        >
                          {activeInvestor ? activeInvestor.full_name : 'Not assigned'}
                        </td>
                        <td>{k.installation_date || '—'}</td>
                        <td>{k.printer_serial || '—'}</td>
                        <td>
                          <span style={STATUS_BADGE.pending_installation}>
                            {getInstallProgress(k.install_steps)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 13 }}
                            onClick={() => handleOpenModal(k)}
                          >
                            Mark Complete
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Completed Section */}
        <div className="rpt-card" style={{ marginTop: '2rem' }}>
          <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>
            Recently Completed
          </div>
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kiosk Name</th>
                  <th>Location</th>
                  <th>College</th>
                  <th>Completed At</th>
                  <th>Printer Serial</th>
                </tr>
              </thead>
              <tbody>
                {loadingCompleted ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading completed installations…
                    </td>
                  </tr>
                ) : recentCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      No completed installations yet.
                    </td>
                  </tr>
                ) : (
                  recentCompleted.map((k: any) => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 500 }}>{k.name}</td>
                      <td>{k.location || '—'}</td>
                      <td>{k.college?.name || '—'}</td>
                      <td>
                        <span style={STATUS_BADGE.active}>
                          {k.installed_at
                            ? new Date(k.installed_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td>{k.printer_serial || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mark Complete Modal */}
        {completeKiosk && (
          <div className="admin-modal-overlay" onClick={handleCloseModal}>
            <div
              className="admin-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '450px' }}
            >
              <div className="rpt-card-title" style={{ marginBottom: '1.25rem' }}>
                Complete Installation
              </div>

              <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: '1.25rem' }}>
                Mark <strong style={{ color: 'var(--ink)' }}>{completeKiosk.name}</strong>{' '}
                as fully installed. This will set its status to active.
              </p>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Printer Serial Number</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={printerSerial}
                  onChange={(e) => setPrinterSerial(e.target.value)}
                  placeholder="e.g. SN-20260625-001"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="admin-form-label">Installation Date</label>
                <input
                  type="date"
                  className="admin-form-input"
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleSubmitComplete}
                  disabled={!printerSerial.trim() || completeMutation.isPending}
                >
                  {completeMutation.isPending
                    ? 'Completing…'
                    : 'Complete Installation'}
                </button>
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={handleCloseModal}
                  disabled={completeMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
