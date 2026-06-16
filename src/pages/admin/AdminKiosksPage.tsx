import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_KIOSKS } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export function AdminKiosksPage() {
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [assignType, setAssignType] = useState<'investor' | 'ambassador'>('investor')
  const [selectedUserId, setSelectedUserId] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 1. Fetch live kiosks
  const { data: kiosks = [], isLoading } = useQuery({
    queryKey: ['admin-kiosks'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_KIOSKS
      const { data, error } = await supabase
        .from('kiosks')
        .select(`
          *,
          college:colleges(name),
          investor_kiosks(
            status,
            investor:investors(id, full_name, email)
          ),
          branch_ambassador:investors!kiosks_branch_ambassador_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  // 2. Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-simple'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return [
          { id: 'demo-investor', full_name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', role: 'investor' },
          { id: 'amb-1', full_name: 'Vikram Prasad', email: 'vikram.p@smartprinter.in', role: 'branch_ambassador' },
          { id: 'amb-2', full_name: 'Aditi Rao', email: 'aditi.r@smartprinter.in', role: 'branch_ambassador' },
        ]
      }
      const { data, error } = await supabase
        .from('investors')
        .select('id, full_name, email, role')
        .order('full_name')

      if (error) throw error
      return data
    }
  })

  const assignMutation = useMutation({
    mutationFn: async ({ kioskId, userId }: { kioskId: string; userId: string }) => {
      if (!isSupabaseConfigured) {
        // Mock success in local cache
        queryClient.setQueryData(['admin-kiosks'], (old: any) => {
          return (old || []).map((k: any) => {
            if (k.id === kioskId) {
              if (assignType === 'ambassador') {
                const amb = users.find(u => u.id === userId)
                return { ...k, branch_ambassador_id: userId, branch_ambassador: amb }
              } else {
                const inv = users.find(u => u.id === userId)
                return {
                  ...k,
                  investor_kiosks: [
                    { status: 'active', investor: inv }
                  ]
                }
              }
            }
            return k
          })
        })
        return
      }

      if (assignType === 'ambassador') {
        // Update kiosks table branch_ambassador_id
        const { error } = await supabase
          .from('kiosks')
          .update({ branch_ambassador_id: userId })
          .eq('id', kioskId)

        if (error) throw error
      } else {
        // Insert into investor_kiosks
        const { error } = await supabase
          .from('investor_kiosks')
          .insert({
            kiosk_id: kioskId,
            investor_id: userId,
            status: 'active'
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kiosks'] })
      toast('Kiosk assignment saved successfully.', 'success')
      setShowAssign(null)
      setSelectedUserId('')
    },
    onError: (err: any) => {
      toast(err.message || 'Error assigning kiosk.', 'error')
    }
  })

  const handleOpenAssign = (kioskId: string) => {
    setShowAssign(kioskId)
    setAssignType('investor')
    setSelectedUserId('')
  }

  const handleSaveAssign = () => {
    if (!showAssign || !selectedUserId) return
    assignMutation.mutate({ kioskId: showAssign, userId: selectedUserId })
  }

  const filteredUsers = users.filter(u => u.role === (assignType === 'ambassador' ? 'branch_ambassador' : 'investor'))

  return (
    <>
      <Topbar title="Kiosks" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage kiosks</div>
            <div className="section-heading-sub">{kiosks.length} kiosks registered</div>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={() => toast('Database action not implemented in UI yet.', 'info')}>+ Add Kiosk</button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Campus / College</th>
                  <th>Status</th>
                  <th>Assigned Investor</th>
                  <th>Branch Ambassador</th>
                  <th>Online</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading kiosks...</td></tr>
                ) : kiosks.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No kiosks registered.</td></tr>
                ) : (
                  kiosks.map((k: any) => {
                    const activeInvestor = k.investor_kiosks?.[0]?.investor
                    const ambassador = k.branch_ambassador

                    return (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 500 }}>{k.name}</td>
                        <td>{k.location}</td>
                        <td>{k.college?.name || 'Main Campus'}</td>
                        <td>
                          <span className={`admin-badge ${k.status === 'active' ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                            {k.status}
                          </span>
                        </td>
                        <td style={{ color: activeInvestor ? 'var(--ink)' : 'var(--gray)', fontStyle: activeInvestor ? 'normal' : 'italic', fontSize: '13px' }}>
                          {activeInvestor ? activeInvestor.full_name : 'Not assigned'}
                        </td>
                        <td style={{ color: ambassador ? 'var(--ink)' : 'var(--gray)', fontStyle: ambassador ? 'normal' : 'italic', fontSize: '13px' }}>
                          {ambassador ? ambassador.full_name : 'Not assigned'}
                        </td>
                        <td>{k.is_online ? '🟢 Online' : '🔴 Offline'}</td>
                        <td>
                          <button className="admin-btn admin-btn-secondary" onClick={() => handleOpenAssign(k.id)}>Assign</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAssign && (
          <div className="admin-modal-overlay" onClick={() => setShowAssign(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="rpt-card-title" style={{ marginBottom: '1.25rem' }}>Assign Kiosk</div>
              
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Role Type</label>
                <select 
                  className="admin-form-input"
                  value={assignType}
                  onChange={(e) => {
                    setAssignType(e.target.value as 'investor' | 'ambassador')
                    setSelectedUserId('')
                  }}
                >
                  <option value="investor">Assign to Investor (Investment Slot)</option>
                  <option value="ambassador">Assign to Branch Ambassador (Operational Lead)</option>
                </select>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="admin-form-label">Select User</label>
                <select 
                  className="admin-form-input"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Select {assignType === 'ambassador' ? 'Ambassador' : 'Investor'} --</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button 
                  className="admin-btn admin-btn-primary" 
                  onClick={handleSaveAssign}
                  disabled={!selectedUserId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                </button>
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowAssign(null)}
                  disabled={assignMutation.isPending}
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
