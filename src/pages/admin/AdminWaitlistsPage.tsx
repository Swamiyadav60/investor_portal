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
        .select('*, investor:investors(full_name, email), college:colleges(name, city)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Waitlist[]
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'converted' }) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase.from('waitlists').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlists'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] }) // Invalidate KPIs to update counts
      toast('Waitlist status updated.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error updating waitlist status.', 'error')
    }
  })

  return (
    <>
      <Topbar title="Waitlists" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Investment waitlists</div>
            <div className="section-heading-sub">{waitlists.filter(w => w.status === 'pending').length} pending requests</div>
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
                  waitlists.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{w.investor?.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.investor?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{w.college?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.college?.city}</div>
                      </td>
                      <td>
                        <span className={`${w.waitlist_type === 'priority' ? 'priority-pill' : 'free-pill'}`}>
                          {w.waitlist_type}
                        </span>
                      </td>
                      <td>#{w.queue_position}</td>
                      <td>
                        <span className={`admin-badge ${w.status === 'approved' ? 'admin-badge-active' : w.status === 'rejected' ? 'admin-badge-failed' : 'admin-badge-pending'}`}>
                          {w.status}
                        </span>
                      </td>
                      <td>{new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {w.status === 'pending' && (
                          <>
                            <button className="admin-btn admin-btn-primary" onClick={() => updateStatusMutation.mutate({ id: w.id, status: 'approved' })}>Approve</button>
                            <button className="admin-btn admin-btn-danger" onClick={() => updateStatusMutation.mutate({ id: w.id, status: 'rejected' })}>Reject</button>
                          </>
                        )}
                        {w.status === 'approved' && w.waitlist_type === 'priority' && (
                          <button className="admin-btn admin-btn-secondary" onClick={() => updateStatusMutation.mutate({ id: w.id, status: 'converted' })}>Convert</button>
                        )}
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
