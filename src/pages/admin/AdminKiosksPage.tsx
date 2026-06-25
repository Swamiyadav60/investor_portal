import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase,  } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export function AdminKiosksPage() {
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [assignType, setAssignType] = useState<'investor' | 'ambassador'>('investor')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newKioskName, setNewKioskName] = useState('')
  const [newKioskLocation, setNewKioskLocation] = useState('')
  const [newKioskCollegeId, setNewKioskCollegeId] = useState('')
  const [newKioskStatus, setNewKioskStatus] = useState<'active'|'pending_installation'|'maintenance'|'suspended'|'offline'>('pending_installation')
  const [newKioskInvestorId, setNewKioskInvestorId] = useState('')
  const [newKioskAmbassadorId, setNewKioskAmbassadorId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 1. Fetch live kiosks
  const { data: kiosks = [], isLoading } = useQuery({
    queryKey: ['admin-kiosks'],
   queryFn: async () => {
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
  return data || []
}
  })

  // 2. Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-simple'],
    queryFn: async () => {
  const { data, error } = await supabase
    .from('investors')
    .select('id, full_name, email, role')
    .order('full_name')

  if (error) throw error

  return data || []
}
  })

  const { data: colleges = [] } = useQuery({
    queryKey: ['admin-colleges-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('colleges').select('id, name').order('name')
      if (error) throw error
      return data || []
    }
  })

  const addKioskMutation = useMutation({
    mutationFn: async () => {
      const { data: kiosk, error: kioskError } = await supabase
        .from('kiosks')
        .insert({
          name: newKioskName,
          location: newKioskLocation,
          college_id: newKioskCollegeId || null,
          status: newKioskStatus,
          branch_ambassador_id: newKioskAmbassadorId || null
        })
        .select('id')
        .single()

      if (kioskError) throw kioskError

      if (newKioskInvestorId) {
        const { error: invError } = await supabase
          .from('investor_kiosks')
          .insert({
            kiosk_id: kiosk.id,
            investor_id: newKioskInvestorId,
            status: 'active'
          })
        if (invError) throw invError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kiosks'] })
      toast('Kiosk created successfully.', 'success')
      setShowAddModal(false)
      setNewKioskName('')
      setNewKioskLocation('')
      setNewKioskCollegeId('')
      setNewKioskStatus('pending_installation')
      setNewKioskInvestorId('')
      setNewKioskAmbassadorId('')
    },
    onError: (err: any) => {
      toast(err.message || 'Error creating kiosk.', 'error')
    }
  })

  const assignMutation = useMutation({
    mutationFn: async ({ kioskId, userId }: { kioskId: string; userId: string }) => {

      // Remove assignment
      if (userId === 'unassign') {

        if (assignType === 'ambassador') {
          const { error } = await supabase
          .from('kiosks')
          .update({ branch_ambassador_id: null })
          .eq('id', kioskId)

          if (error) throw error
        } else {
          const { error } = await supabase
          .from('investor_kiosks')
          .delete()
          .eq('kiosk_id', kioskId)

          if (error) throw error
        }

        return
      }

      // Normal assignment
      if (assignType === 'ambassador') {
        const { error } = await supabase
        .from('kiosks')
        .update({ branch_ambassador_id: userId })
        .eq('id', kioskId)

        if (error) throw error
      } else {
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
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['admin-kiosks'],
      });

      setShowAssign(null);
      setSelectedUserId('');
      toast('Kiosk assignment saved successfully.', 'success');
    },

    onError: (err: any) => {
      toast(err.message || 'Error assigning kiosk.', 'error');
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
          <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>+ Add Kiosk</button>
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
                          <span className={`admin-badge ${k.status === 'active' ? 'admin-badge-active' : k.status === 'pending_installation' ? 'admin-badge-pending' : k.status === 'maintenance' ? 'admin-badge-maintenance' : k.status === 'suspended' ? 'admin-badge-suspended' : 'admin-badge-offline'}`}>
                            {k.status === 'pending_installation' ? 'Pending Installation' : k.status}
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
                  <option value="unassign">
                    Not Assigned
                  </option>
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

        {showAddModal && (
          <div className="admin-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="rpt-card-title" style={{ marginBottom: '1.25rem' }}>Add New Kiosk</div>
              
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Name</label>
                <input 
                  type="text"
                  className="admin-form-input"
                  value={newKioskName}
                  onChange={(e) => setNewKioskName(e.target.value)}
                  placeholder="e.g. Kiosk Alpha"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Location</label>
                <input 
                  type="text"
                  className="admin-form-input"
                  value={newKioskLocation}
                  onChange={(e) => setNewKioskLocation(e.target.value)}
                  placeholder="e.g. Library 1st Floor"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Campus / College</label>
                <select 
                  className="admin-form-input"
                  value={newKioskCollegeId}
                  onChange={(e) => setNewKioskCollegeId(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {colleges.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Status</label>
                <select 
                  className="admin-form-input"
                  value={newKioskStatus}
                  onChange={(e) => setNewKioskStatus(e.target.value as 'active'|'pending_installation'|'maintenance'|'suspended'|'offline')}
                >
                  <option value="pending_installation">Pending Installation</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="suspended">Suspended</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label">Assigned Investor</label>
                <select 
                  className="admin-form-input"
                  value={newKioskInvestorId}
                  onChange={(e) => setNewKioskInvestorId(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {users.filter(u => u.role === 'investor').map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="admin-form-label">Branch Ambassador</label>
                <select 
                  className="admin-form-input"
                  value={newKioskAmbassadorId}
                  onChange={(e) => setNewKioskAmbassadorId(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {users.filter(u => u.role === 'branch_ambassador').map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button 
                  className="admin-btn admin-btn-primary" 
                  onClick={() => addKioskMutation.mutate()}
                  disabled={!newKioskName || !newKioskLocation || addKioskMutation.isPending}
                >
                  {addKioskMutation.isPending ? 'Adding...' : 'Add Kiosk'}
                </button>
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                  disabled={addKioskMutation.isPending}
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
