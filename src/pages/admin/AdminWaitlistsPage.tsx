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
  .from("branch_waitlist")
  .select(`
    *,
    user:users(
      id,
      full_name,
      email
    ),
    branch:branches(
      id,
      name,
      location
    )
  `)
  .order("created_at", { ascending: false })

if (error) throw error


const { data: users } = await supabase
  .from("users")
  .select("id, full_name, email")

const { data: branches } = await supabase
  .from("branches")
  .select("id, name, location")

return (data || []).map((w: any) => ({
  ...w,
  investor: users?.find(u => u.id === w.user_id),
  college: branches?.find(b => b.id === w.branch_id),
}))
    },
  })

  // ── Approve: update waitlist + create investor_kiosk entry ───
  const approveMutation = useMutation({
    mutationFn: async (w: Waitlist) => {
      if (!isSupabaseConfigured) return

      // 1. Mark waitlist as approved
      const { error: wlError } = await supabase
        .from('branch_waitlist')
        .update({ status: 'approved' })
        .eq('id', w.id)
      if (wlError) throw wlError

      const { error: branchError } = await supabase
  .from("branches")
  .update({
    owner_id: (w as any).user_id,
    slots_taken: 1
  })
  .eq("id", (w as any).branch_id)

if (branchError) throw branchError

toast("Waitlist approved successfully.", "success")

      toast(`Approved! ${w.user?.full_name} now has access to their kiosk dashboard.`, 'success')
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
        .from('branch_waitlist')
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
        .from('branch_waitlist')
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
                        <div style={{ fontWeight: 600 }}>{w.user?.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.user?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{w.branch?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.branch?.location}</div>
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