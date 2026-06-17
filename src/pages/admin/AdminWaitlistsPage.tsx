import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Waitlist } from '@/types/database'

export function AdminWaitlistsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: waitlists = [], isLoading } = useQuery({
    queryKey: ['admin-waitlists'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const { data, error } = await supabase
        .from('waitlists')
        .select('*, investor:investors(id, full_name, email), college:colleges(id, name, city)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Waitlist[]
    },
  })

  // ── Approve: update waitlist + create investor_kiosk entry ───
  const approveMutation = useMutation({
    mutationFn: async (w: Waitlist) => {
      if (!isSupabaseConfigured) return

      // 1. Mark waitlist as approved
      const { error: wlError } = await supabase
        .from('waitlists')
        .update({ status: 'approved' })
        .eq('id', w.id)
      if (wlError) throw wlError

      // 2. Find a kiosk linked to this college that isn't assigned yet
      const { data: kiosks, error: kError } = await supabase
        .from('kiosks')
        .select('id')
        .eq('college_id', w.college_id)
        .order('created_at')
      if (kError) throw kError

      if (!kiosks || kiosks.length === 0) {
        // No kiosk for this college yet — still approve waitlist,
        // admin can assign kiosk manually later from Kiosks page
        toast('Waitlist approved. No kiosk found for this college yet — assign one from the Kiosks page.', 'info')
        return
      }

      // 3. Check which kiosks are already assigned
      const kioskIds = kiosks.map(k => k.id)
      const { data: existing } = await supabase
        .from('investor_kiosks')
        .select('kiosk_id')
        .in('kiosk_id', kioskIds)
        .eq('status', 'active')

      const assignedIds = new Set((existing || []).map(e => e.kiosk_id))
      const freeKiosk = kiosks.find(k => !assignedIds.has(k.id))

      if (!freeKiosk) {
        toast('Waitlist approved. All kiosks at this location are already assigned — add a new kiosk first.', 'info')
        return
      }

      // 4. Insert into investor_kiosks → investor dashboard updates
      const { error: ikError } = await supabase
        .from('investor_kiosks')
        .insert({
          investor_id: w.investor_id,
          kiosk_id:    freeKiosk.id,
          status:      'active',
          assigned_at: new Date().toISOString(),
        })
      if (ikError) throw ikError

      // 5. Update college slots_taken
      const {} = await supabase.rpc('increment_slots_taken', {
        p_college_id: w.college_id,
      })
      // Non-fatal if RPC doesn't exist — slots updated by join_waitlist already

      toast(`Approved! ${w.investor?.full_name} now has access to their kiosk dashboard.`, 'success')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlists'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['my-kiosks'] })
      queryClient.invalidateQueries({ queryKey: ['active-kiosks'] })
      queryClient.invalidateQueries({ queryKey: ['kiosks-dashboard'] })
    },
    onError: (err: any) => {
      toast(err.message || 'Error approving waitlist.', 'error')
    },
  })

  // ── Reject ───────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase
        .from('waitlists')
        .update({ status: 'rejected' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlists'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] })
      toast('Waitlist entry rejected.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error rejecting waitlist.', 'error')
    },
  })

  // ── Convert (priority → full investor) ──────────────────────
  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase
        .from('waitlists')
        .update({ status: 'converted' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlists'] })
      toast('Converted to full investor.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error converting.', 'error')
    },
  })

  const isPending = approveMutation.isPending || rejectMutation.isPending || convertMutation.isPending

  return (
    <>
      <Topbar title="Waitlists" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Investment waitlists</div>
            <div className="section-heading-sub">
              {waitlists.filter(w => w.status === 'pending').length} pending requests
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>
              {waitlists.filter(w => w.status === 'pending').length}
            </div>
            <div className="rpt-kpi-lbl">Pending</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>
              {waitlists.filter(w => w.status === 'approved').length}
            </div>
            <div className="rpt-kpi-lbl">Approved</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">
              {waitlists.filter(w => w.waitlist_type === 'priority').length}
            </div>
            <div className="rpt-kpi-lbl">Priority</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">
              {waitlists.filter(w => w.status === 'converted').length}
            </div>
            <div className="rpt-kpi-lbl">Converted</div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading waitlists...</td></tr>
                ) : waitlists.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No waitlist entries.</td></tr>
                ) : (
                  waitlists.map(w => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.investor?.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.investor?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{w.college?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.college?.city}</div>
                      </td>
                      <td>
                        <span className={w.waitlist_type === 'priority' ? 'priority-pill' : 'free-pill'}>
                          {w.waitlist_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>#{w.queue_position}</td>
                      <td>
                        <span className={`admin-badge ${
                          w.status === 'approved'  ? 'admin-badge-active'  :
                          w.status === 'rejected'  ? 'admin-badge-failed'  :
                          w.status === 'converted' ? 'admin-badge-paid'    :
                          'admin-badge-pending'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: 13 }}>
                        {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {w.status === 'pending' && (
                            <>
                              <button
                                className="admin-btn admin-btn-primary"
                                disabled={isPending}
                                onClick={() => approveMutation.mutate(w)}
                              >
                                {approveMutation.isPending ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className="admin-btn admin-btn-danger"
                                disabled={isPending}
                                onClick={() => rejectMutation.mutate(w.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {w.status === 'approved' && w.waitlist_type === 'priority' && (
                            <button
                              className="admin-btn admin-btn-secondary"
                              disabled={isPending}
                              onClick={() => convertMutation.mutate(w.id)}
                            >
                              Convert
                            </button>
                          )}
                          {(w.status === 'rejected' || w.status === 'converted') && (
                            <span style={{ fontSize: 12, color: 'var(--gray)', fontStyle: 'italic' }}>
                              {w.status === 'converted' ? 'Done' : 'Rejected'}
                            </span>
                          )}
                        </div>
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