import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Investor } from '@/types/database'

export function AdminInvestorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'investor' | 'branch_ambassador'>('investor')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAmbassador, setNewAmbassador] = useState({
    fullName: '',
    email: '',
    password: 'Password123!',
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ['admin-investors'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        // Return demo investors + a couple branch ambassadors for demo representation
        return [
          { id: 'inv-1', user_id: 'u1', full_name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', city: 'Hyderabad', kyc_status: 'verified', role: 'investor', created_at: new Date().toISOString() },
          { id: 'inv-2', user_id: 'u2', full_name: 'Priyanka Patel', email: 'priyanka@gmail.com', city: 'Mumbai', kyc_status: 'pending', role: 'investor', created_at: new Date().toISOString() },
          { id: 'amb-1', user_id: 'u3', full_name: 'Vikram Prasad', email: 'vikram.p@smartprinter.in', city: 'Hyderabad', kyc_status: 'verified', role: 'branch_ambassador', created_at: new Date().toISOString() },
          { id: 'amb-2', user_id: 'u4', full_name: 'Aditi Rao', email: 'aditi.r@smartprinter.in', city: 'Bengaluru', kyc_status: 'verified', role: 'branch_ambassador', created_at: new Date().toISOString() },
        ] as Investor[]
      }
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Investor[]
    },
  })

  const updateKycMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' | 'pending' }) => {
      if (!isSupabaseConfigured) return
      const { error } = await supabase.from('investors').update({ kyc_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-investors'] })
      toast('Investor KYC status updated.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error updating investor KYC status.', 'error')
    }
  })

  const createAmbassadorMutation = useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        // Add to query cache locally for demo feedback
        queryClient.setQueryData(['admin-investors'], (old: any) => {
          const mockAmb = {
            id: `amb-${Date.now()}`,
            user_id: `u-${Date.now()}`,
            full_name: newAmbassador.fullName,
            email: newAmbassador.email,
            city: 'Hyderabad',
            kyc_status: 'verified',
            role: 'branch_ambassador',
            created_at: new Date().toISOString()
          }
          return [mockAmb, ...(old || [])]
        })
        return
      }

      // Call supabase RPC
      const { data, error } = await supabase.rpc('create_ambassador_account', {
        p_email: newAmbassador.email,
        p_password: newAmbassador.password,
        p_full_name: newAmbassador.fullName
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-investors'] })
      toast('Branch Ambassador account created successfully.', 'success')
      setShowCreateModal(false)
      setNewAmbassador({ fullName: '', email: '', password: 'Password123!' })
    },
    onError: (err: any) => {
      toast(err.message || 'Error creating ambassador account.', 'error')
    }
  })

  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = inv.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = inv.role === activeTab
    return matchesSearch && matchesRole
  })

  return (
    <>
      <Topbar title="User Management" />
      <div className="page-view content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div className="section-heading">Manage Accounts</div>
            <div className="section-heading-sub">
              {investors.filter(i => i.role === 'investor').length} Investors · {investors.filter(i => i.role === 'branch_ambassador').length} Branch Ambassadors
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="admin-form-input" 
              style={{ width: 200, height: 40 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {activeTab === 'branch_ambassador' && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="admin-btn admin-btn-primary"
                style={{ height: 40, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                + Create Ambassador
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('investor')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'investor' ? '2px solid var(--green)' : '2px solid transparent',
              color: activeTab === 'investor' ? 'var(--green-d)' : 'var(--gray)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Investors
          </button>
          <button
            onClick={() => setActiveTab('branch_ambassador')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'branch_ambassador' ? '2px solid var(--green)' : '2px solid transparent',
              color: activeTab === 'branch_ambassador' ? 'var(--green-d)' : 'var(--gray)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Branch Ambassadors
          </button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  {activeTab === 'investor' ? (
                    <>
                      <th>City</th>
                      <th>KYC</th>
                      <th>Actions</th>
                    </>
                  ) : (
                    <>
                      <th>City</th>
                      <th>Account Status</th>
                      <th>Created Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading accounts...</td></tr>
                ) : filteredInvestors.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No accounts found.</td></tr>
                ) : (
                  filteredInvestors.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.full_name}</td>
                      <td>{inv.email}</td>
                      <td>{inv.city || 'Hyderabad'}</td>
                      {activeTab === 'investor' ? (
                        <>
                          <td>
                            <span className={`admin-badge ${inv.kyc_status === 'verified' ? 'admin-badge-active' : inv.kyc_status === 'rejected' ? 'admin-badge-failed' : 'admin-badge-pending'}`}>
                              {inv.kyc_status}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: 4 }}>
                            {inv.kyc_status === 'pending' && (
                              <>
                                <button className="admin-btn admin-btn-primary" onClick={() => updateKycMutation.mutate({ id: inv.id, status: 'verified' })}>Verify</button>
                                <button className="admin-btn admin-btn-danger" onClick={() => updateKycMutation.mutate({ id: inv.id, status: 'rejected' })}>Reject</button>
                              </>
                            )}
                            {inv.kyc_status === 'verified' && (
                              <button className="admin-btn admin-btn-secondary" onClick={() => toast('Already verified.', 'info')}>View Details</button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="admin-badge admin-badge-active">Active</span>
                          </td>
                          <td style={{ color: 'var(--gray)', fontSize: '13px' }}>
                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Ambassador Modal */}
        {showCreateModal && (
          <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="rpt-card-title" style={{ marginBottom: '1.25rem' }}>Create Ambassador Account</div>
              
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Full Name</label>
                <input 
                  type="text" 
                  className="admin-form-input" 
                  placeholder="e.g. Ramesh Kumar"
                  value={newAmbassador.fullName} 
                  onChange={(e) => setNewAmbassador({ ...newAmbassador, fullName: e.target.value })} 
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Email Address</label>
                <input 
                  type="email" 
                  className="admin-form-input" 
                  placeholder="e.g. ramesh@smartprinter.in"
                  value={newAmbassador.email} 
                  onChange={(e) => setNewAmbassador({ ...newAmbassador, email: e.target.value })} 
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="admin-form-label">Temporary Password</label>
                <input 
                  type="text" 
                  className="admin-form-input" 
                  value={newAmbassador.password} 
                  onChange={(e) => setNewAmbassador({ ...newAmbassador, password: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button 
                  className="admin-btn admin-btn-primary" 
                  onClick={() => createAmbassadorMutation.mutate()}
                  disabled={!newAmbassador.fullName || !newAmbassador.email || createAmbassadorMutation.isPending}
                >
                  {createAmbassadorMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={createAmbassadorMutation.isPending}
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
