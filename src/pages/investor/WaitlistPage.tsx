import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { fmt } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'
import { initiatePayment } from '@/lib/razorpay'
import type { Waitlist } from '@/types/database'

export function WaitlistPage() {
  const { investor } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: waitlists = [], isLoading } = useQuery({
    queryKey: ['waitlists', investor?.id],
    queryFn: async () => {
      if (!isSupabaseConfigured || !investor) return []
      const { data, error } = await supabase
        .from('waitlists')
        .select('*, college:colleges(*)')
        .eq('investor_id', investor.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Waitlist[]
    },
    enabled: !!investor,
  })

  const upgradeMutation = useMutation({
    mutationFn: async ({ id, paymentId }: { id: string; paymentId: string }) => {
      const { data, error } = await supabase.rpc('upgrade_to_priority', {
        p_waitlist_id: id,
        p_payment_id: paymentId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlists'] })
      toast('Upgraded to Priority Waitlist!', 'success')
    },
    onError: (err: any) => {
      toast(err.message, 'error')
    }
  })

  const handleUpgrade = async (w: Waitlist) => {
    try {
      await initiatePayment({
        amount: 499,
        description: `Upgrade to Priority: ${w.college?.name}`,
        name: investor?.full_name || '',
        email: investor?.email || '',
        onSuccess: (res) => upgradeMutation.mutate({ id: w.id, paymentId: res.razorpay_payment_id }),
      })
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  return (
    <>
      <Topbar title="My Waitlist" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Reservation pipeline</div>
            <div className="section-heading-sub">Track your queue positions for new locations</div>
          </div>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Queue Position</th>
                  <th>Joined Date</th>
                  <th>Est. Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading waitlist...</td></tr>
                ) : waitlists.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No active reservations.</td></tr>
                ) : (
                  waitlists.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.college?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{w.college?.city}</div>
                      </td>
                      <td>
                        <span className={`admin-badge ${w.status === 'approved' ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                          {w.status === 'approved' ? 'Priority Confirmed' : 'In Queue'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {w.waitlist_type === 'priority' ? (
                            <span className="priority-pill">Priority</span>
                          ) : (
                            <span className="free-pill">Free</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="queue-pos-cell">
                          <span className="hash">#</span>{w.queue_position}
                        </div>
                      </td>
                      <td>{new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ color: 'var(--gray)' }}>
                        {w.waitlist_type === 'priority' ? '2-3 Days' : '10-14 Days'}
                      </td>
                      <td>
                        {w.waitlist_type === 'free' && (
                          <button className="upgrade-btn" onClick={() => handleUpgrade(w)}>
                            ⚡ Upgrade
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="waitlist-info-grid">
          <div className="rpt-card">
            <div className="rpt-card-title" style={{ marginBottom: '0.75rem' }}>How the queue works</div>
            <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
              Priority investors are always ranked at the top of the queue. When you upgrade, you jump ahead of all "Free" waitlist members for that specific location. We contact investors in order of their position as slots become available.
            </p>
          </div>
          <div className="rpt-card" style={{ background: 'var(--amber-l)', borderColor: 'var(--amber)' }}>
            <div className="rpt-card-title" style={{ color: 'var(--amber)', marginBottom: '0.5rem' }}>Priority Benefits</div>
            <ul style={{ fontSize: 13, color: 'var(--ink)', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
              <li>Guaranteed placement ahead of free users</li>
              <li>Priority site visit & location survey</li>
              <li>Early access to hardware installation</li>
              <li>Dedicated investment manager</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
