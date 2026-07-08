import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import type { Branch } from '@/types/database'
import { useToast } from '@/components/ui/Toast'

interface CollegeForm {
  id?: string
  name: string
  location: string
  type: string
  slots_total: number
  investment_amount: number
  avg_monthly_earnings: number
  is_active: boolean
}

const initialFormState: CollegeForm = {
  name: '',
  location: '',
  type: 'college',
  slots_total: 3,
  investment_amount: 25000,
  avg_monthly_earnings: 5000,
  is_active: true,
}

export function AdminCollegesPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingCollege, setEditingCollege] = useState<CollegeForm | null>(null)
  const [form, setForm] = useState<CollegeForm>(initialFormState)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (editingCollege) {
      setForm(editingCollege)
    } else {
      setForm(initialFormState)
    }
  }, [editingCollege])

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ['admin-colleges'],
    queryFn: async () => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: false })

     

  if (error) throw error

  return data || []
}
  })
  async function uploadCollegeImage(file: File) {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('college-images')
    .upload(fileName, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('college-images')
    .getPublicUrl(fileName)

  return data.publicUrl
}
  const createUpdateMutation = useMutation({
    mutationFn: async (collegeData: CollegeForm) => {
      let imageUrl: string | undefined

      if (imageFile) {
        imageUrl = await uploadCollegeImage(imageFile)
      }
      if (collegeData.id) {
        const { id, ...updateData } = collegeData

        const payload = imageUrl
        ? { ...updateData, image_url: imageUrl }
        : updateData

        const { error } = await supabase
        .from('branches')
        .update(payload)
        .eq('id', id)

        if (error) throw error
      } else {
        const payload = {
          name: collegeData.name,
          location: collegeData.location,
          type: collegeData.type,
          slots_total: collegeData.slots_total,
          investment_amount: collegeData.investment_amount,
          avg_monthly_earnings: collegeData.avg_monthly_earnings,
          is_active: collegeData.is_active,
          image_url: imageUrl ?? null,
        }

        const { error } = await supabase
        .from('branches')
        .insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] }) // Invalidate KPIs to update counts
      toast(`College ${editingCollege ? 'updated' : 'added'} successfully.`, 'success')
      setShowModal(false)
      setEditingCollege(null)
      setImageFile(null)
    },
    onError: (err: any) => {
      toast(err.message || `Error ${editingCollege ? 'updating' : 'adding'} college.`, 'error')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (collegeId: string) => {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', collegeId)

  if (error) throw error
},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-colleges'] })
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] })
      toast('College deleted successfully.', 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error deleting college.', 'error')
    }
  })

  const openAddModal = () => {
    setEditingCollege(null)
    setShowModal(true)
    setImageFile(null)
  }

  const openEditModal = (branch: Branch) => {
    setEditingCollege(branch)
    setShowModal(true)
    setImageFile(null)
  }

  const handleDelete = (collegeId: string) => {
    if (window.confirm('Are you sure you want to delete this college? This action cannot be undone.')) {
      deleteMutation.mutate(collegeId)
    }
  }
  
  return (
    <>
      <Topbar title="Colleges" />
      <div className="page-view content">
        <div className="section-header">
          <div>
            <div className="section-heading">Manage colleges & locations</div>
            <div className="section-heading-sub">{colleges.length} locations registered</div>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={openAddModal}>+ Add College</button>
        </div>

        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <div style={{ color: 'red' }}>
  Total colleges: {colleges.length}
</div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Slots</th>
                  <th>Investment</th>
                  <th>Avg Monthly</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading colleges...</td></tr>
                ) : colleges.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No colleges registered.</td></tr>
                ) : (
                  colleges.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.location}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.type}</td>
                      <td>{c.slots_taken}/{c.slots_total}</td>
                      <td>{fmt(c.investment_amount)}</td>
                      <td>{fmt(c.avg_monthly_earnings)}</td>
                      <td><span className={`admin-badge ${c.is_active ? 'admin-badge-active' : 'admin-badge-pending'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <button className="admin-btn admin-btn-secondary" onClick={() => openEditModal(c)}>Edit</button>
                        <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>{editingCollege ? 'Edit College' : 'Add College'}</div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Name</label>
                  <input className="admin-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
                <label className="admin-form-label">Location</label>
                <input className="admin-form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Type</label>
                  <select className="admin-form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="college">College</option>
                    <option value="transit">Transit</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Total Slots</label>
                  <input className="admin-form-input" type="number" value={form.slots_total} onChange={(e) => setForm({ ...form, slots_total: Number(e.target.value) })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Investment Amount (₹)</label>
                  <input className="admin-form-input" type="number" value={form.investment_amount} onChange={(e) => setForm({ ...form, investment_amount: Number(e.target.value) })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Avg Monthly Earnings (₹)</label>
                  <input className="admin-form-input" type="number" value={form.avg_monthly_earnings} onChange={(e) => setForm({ ...form, avg_monthly_earnings: Number(e.target.value) })} />
                </div>
              </div>
              <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
                <label className="admin-form-label">Status</label>
                <select className="admin-form-input" value={form.is_active.toString()} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
                <label className="admin-form-label">College Image</label>

                <input
                  type="file"
                  accept="image/*"
                  className="admin-form-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                     if (file) {
                      setImageFile(file)
                    }
                  }}
                />

                {imageFile && (
                  <p style={{ marginTop: 6, fontSize: 12 }}>
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                <button className="admin-btn admin-btn-primary" onClick={() => createUpdateMutation.mutate(form)} disabled={createUpdateMutation.isPending}>
                  {createUpdateMutation.isPending ? 'Saving...' : editingCollege ? 'Update College' : 'Add College'}
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
