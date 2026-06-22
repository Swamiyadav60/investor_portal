import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Investor } from '@/types/database'
import { maskPan, maskAadhaar, maskBankAccount } from '@/lib/format'

export function AdminInvestorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'investor' | 'branch_ambassador'>('investor')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null)
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
      // Query decrypted view to retrieve PAN and Aadhaar in decrypted form
      const { data, error } = await supabase
        .from('decrypted_investors')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Investor[]
    },
  })

  const updateKycMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' | 'pending' }) => {
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
                            <button 
                              className="admin-btn admin-btn-secondary" 
                              onClick={() => {
                                setSelectedInvestor(inv)
                                setShowDetailsModal(true)
                              }}
                            >
                              View Details
                            </button>
                            {inv.kyc_status === 'pending' && (
                              <>
                                <button className="admin-btn admin-btn-primary" onClick={() => updateKycMutation.mutate({ id: inv.id, status: 'verified' })}>Verify</button>
                                <button className="admin-btn admin-btn-danger" onClick={() => updateKycMutation.mutate({ id: inv.id, status: 'rejected' })}>Reject</button>
                              </>
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

        {/* View Details / KYC Modal */}
        {showDetailsModal && selectedInvestor && (
          <div className="admin-modal-overlay" onClick={() => { setShowDetailsModal(false); setSelectedInvestor(null); }}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="rpt-card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div className="rpt-card-title">Investor KYC & Bank Details</div>
                <span className={`admin-badge ${selectedInvestor.kyc_status === 'verified' ? 'admin-badge-active' : selectedInvestor.kyc_status === 'rejected' ? 'admin-badge-failed' : 'admin-badge-pending'}`}>
                  {selectedInvestor.kyc_status}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.full_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.city || 'Hyderabad'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>KYC Mobile Number</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.mobile_number || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAN Card (Masked)</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px', color: 'var(--green-d)' }}>{maskPan(selectedInvestor.pan_number)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aadhaar Card (Masked)</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px', color: 'var(--green-d)' }}>{maskAadhaar(selectedInvestor.aadhaar_number)}</div>
                </div>
                <div style={{ gridColumn: 'span 2', height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank Account Holder</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.bank_account_holder || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank Name</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.bank_name || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank Account (Masked)</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{maskBankAccount(selectedInvestor.bank_account_number)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IFSC Code</div>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{selectedInvestor.ifsc_code || 'Not provided'}</div>
                </div>
                {selectedInvestor.kyc_submitted_at && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submission Timestamp</div>
                    <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px', color: 'var(--gray)' }}>
                      {new Date(selectedInvestor.kyc_submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                {selectedInvestor.kyc_status === 'pending' && (
                  <>
                    <button 
                      className="admin-btn admin-btn-primary" 
                      onClick={() => {
                        updateKycMutation.mutate({ id: selectedInvestor.id, status: 'verified' })
                        setShowDetailsModal(false)
                        setSelectedInvestor(null)
                      }}
                    >
                      Verify KYC
                    </button>
                    <button 
                      className="admin-btn admin-btn-danger" 
                      onClick={() => {
                        updateKycMutation.mutate({ id: selectedInvestor.id, status: 'rejected' })
                        setShowDetailsModal(false)
                        setSelectedInvestor(null)
                      }}
                    >
                      Reject KYC
                    </button>
                  </>
                )}
                {selectedInvestor.kyc_status === 'verified' && (
                  <button 
                    className="admin-btn admin-btn-danger" 
                    onClick={() => {
                      updateKycMutation.mutate({ id: selectedInvestor.id, status: 'rejected' })
                      setShowDetailsModal(false)
                      setSelectedInvestor(null)
                    }}
                  >
                    Revoke/Reject KYC
                  </button>
                )}
                {selectedInvestor.kyc_status === 'rejected' && (
                  <button 
                    className="admin-btn admin-btn-primary" 
                    onClick={() => {
                      updateKycMutation.mutate({ id: selectedInvestor.id, status: 'verified' })
                      setShowDetailsModal(false)
                      setSelectedInvestor(null)
                    }}
                  >
                    Verify KYC
                  </button>
                )}
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => { setShowDetailsModal(false); setSelectedInvestor(null); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
