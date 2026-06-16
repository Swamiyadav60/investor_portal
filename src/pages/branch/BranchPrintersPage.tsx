import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function BranchPrintersPage() {
  const { investor } = useAuth()
  const navigate = useNavigate()

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['branch-printers-list', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        // Mock assigned printers for demo
        return [
          {
            id: 'p1',
            name: 'Printer 1',
            location: 'Madhapur IT Park',
            status: 'active',
            is_online: true,
            displayCode: 'SP-001',
            college: { name: 'Madhapur Transit Hub' }
          },
          {
            id: 'p2',
            name: 'Printer 2',
            location: 'Kukatpally HB',
            status: 'active',
            is_online: true,
            displayCode: 'SP-002',
            college: { name: 'JNTU Campus' }
          }
        ]
      }

      // Query database
      const { data: kiosks, error } = await supabase
        .from('kiosks')
        .select('*, college:colleges(name)')
        .eq('branch_ambassador_id', investor!.id)

      if (error) throw error

      return kiosks?.map((k: any, index: number) => {
        return {
          ...k,
          displayCode: `SP-00${index + 1}`
        }
      }) || []
    }
  })

  return (
    <>
      <Topbar title="Assigned Printers" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <h2 className="section-heading">Your Assigned Kiosks</h2>
            <p className="section-heading-sub">Monitor health status and quickly log operational costs for your printers</p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>Loading assigned printers...</div>
        ) : printers.length === 0 ? (
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>No printers assigned</h3>
            <p style={{ color: 'var(--gray)', fontSize: '14px', marginTop: '4px' }}>You have not been assigned any smart printers yet. Contact the system administrator.</p>
          </div>
        ) : (
          <div className="printer-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {printers.map((k: any) => (
              <div key={k.id} className="pc" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--green-l)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--green-d)'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{
                      background: k.is_online ? 'var(--green-l)' : 'var(--red-l)',
                      color: k.is_online ? 'var(--green-d)' : 'var(--red)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {k.is_online ? 'Online' : 'Offline'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--gray)', fontWeight: 600 }}>{k.displayCode}</span>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>{k.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {k.location}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--gray)' }}>Last Service Date:</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {k.updated_at ? new Date(k.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--gray)' }}>Current Status:</span>
                    <span className={`status-badge ${k.status === 'active' ? 'approved' : k.status === 'offline' ? 'rejected' : 'pending'}`} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {k.status}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>Campus</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{k.college?.name || 'Main Campus'}</div>
                  </div>
                  <button 
                    onClick={() => navigate(`/branch/log-expense?code=${k.displayCode}`)}
                    className="btn-primary" 
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      border: 'none',
                      background: 'var(--green)',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Log Expense
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
