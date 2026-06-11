import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import type { Investor } from '@/types/database'

export function AdminInvestorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ['admin-investors'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
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

  const filteredInvestors = investors.filter(investor => 
    investor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <Topbar title="Investors" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage investors</div>
            <div className="section-heading-sub">{investors.length} registered investors</div>
          </div>
          <input 
            type="text" 
            placeholder="Search investors..." 
            className="admin-form-input" 
            style={{ width: 200 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>KYC</th>
                  <th>Slots</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading investors...</td></tr>
                ) : filteredInvestors.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No investors found.</td></tr>
                ) : (
                  filteredInvestors.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.full_name}</td>
                      <td>{inv.email}</td>
                      <td>{inv.city || 'N/A'}</td>
                      <td>
                        <span className={`admin-badge ${inv.kyc_status === 'verified' ? 'admin-badge-active' : inv.kyc_status === 'rejected' ? 'admin-badge-failed' : 'admin-badge-pending'}`}>
                          {inv.kyc_status}
                        </span>
                      </td>
                      <td>N/A</td> {/* Slots are tracked via investor_kiosks, not directly on investor */}
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
