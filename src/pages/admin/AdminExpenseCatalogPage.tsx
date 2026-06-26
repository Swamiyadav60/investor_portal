import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'
import type { ExpenseCatalogItem } from '@/types/database'

interface ExpenseCatalogForm {
  id?: string
  name: string
  category: string
  default_amount: number
  expense_mode: 'fixed' | 'custom'
  description: string
  is_active: boolean
}

const STANDARD_CATEGORIES = [
  'Paper',
  'Toner / Ink',
  'Drum',
  'Maintenance',
  'Rent / Space',
  'Internet / Electricity',
  'Staff',
  'Insurance'
]

const INITIAL_FORM: ExpenseCatalogForm = {
  name: '',
  category: 'Paper',
  default_amount: 0,
  expense_mode: 'fixed',
  description: '',
  is_active: true,
}

export function AdminExpenseCatalogPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseCatalogItem | null>(null)
  
  // Search & Filter States
  const [searchName, setSearchName] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [filterMode, setFilterMode] = useState('')

  // Form States
  const [form, setForm] = useState<ExpenseCatalogForm>(INITIAL_FORM)
  const [isOtherCategory, setIsOtherCategory] = useState(false)
  const [customCategoryText, setCustomCategoryText] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch expense catalog
  const { data: catalogItems = [], isLoading } = useQuery<ExpenseCatalogItem[]>({
    queryKey: ['admin-expense-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_catalog')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    }
  })

  // Synchronize form when editing changes
  useEffect(() => {
    if (editingItem) {
      const isStandard = STANDARD_CATEGORIES.includes(editingItem.category)
      setForm({
        id: editingItem.id,
        name: editingItem.name,
        category: isStandard ? editingItem.category : 'Other',
        default_amount: editingItem.default_amount,
        expense_mode: editingItem.expense_mode,
        description: editingItem.description || '',
        is_active: editingItem.is_active,
      })
      setIsOtherCategory(!isStandard)
      setCustomCategoryText(isStandard ? '' : editingItem.category)
    } else {
      setForm(INITIAL_FORM)
      setIsOtherCategory(false)
      setCustomCategoryText('')
    }
  }, [editingItem])

  // Get unique list of categories for filter dropdown
  const allCategories = useMemo(() => {
    const fromItems = catalogItems.map(item => item.category)
    const combined = [...STANDARD_CATEGORIES, ...fromItems]
    return Array.from(new Set(combined)).sort()
  }, [catalogItems])

  // Client-side filtering logic
  const filtered = useMemo(() => {
    return catalogItems.filter(item => {
      // 1. Search name
      if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false
      }
      // 2. Filter category
      if (filterCategory && item.category !== filterCategory) {
        return false
      }
      // 3. Filter mode
      if (filterMode && item.expense_mode !== filterMode) {
        return false
      }
      // 4. Filter status
      if (filterActive) {
        const isCurrentActive = filterActive === 'active'
        if (item.is_active !== isCurrentActive) {
          return false
        }
      }
      return true
    })
  }, [catalogItems, searchName, filterCategory, filterMode, filterActive])

  const hasActiveFilters = searchName || filterCategory || filterMode || filterActive

  const clearFilters = () => {
    setSearchName('')
    setFilterCategory('')
    setFilterMode('')
    setFilterActive('')
  }

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: ExpenseCatalogForm) => {
      const categoryToSave = isOtherCategory ? customCategoryText.trim() : formData.category
      if (!categoryToSave) {
        throw new Error('Please select or specify a category')
      }

      const payload = {
        name: formData.name.trim(),
        category: categoryToSave,
        default_amount: formData.expense_mode === 'fixed' ? Number(formData.default_amount) : 0,
        expense_mode: formData.expense_mode,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      }

      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('expense_catalog')
          .update(payload)
          .eq('id', formData.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('expense_catalog')
          .insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-catalog'] })
      toast(`Expense type ${editingItem ? 'updated' : 'created'} successfully!`, 'success')
      setShowModal(false)
      setEditingItem(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Error saving expense type.', 'error')
    }
  })

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (item: ExpenseCatalogItem) => {
      const { error } = await supabase
        .from('expense_catalog')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)

      if (error) throw error
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['admin-expense-catalog'] })
      toast(`Expense type "${item.name}" ${item.is_active ? 'deactivated' : 'activated'} successfully.`, 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Error updating status.', 'error')
    }
  })

  const openAddModal = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const openEditModal = (item: ExpenseCatalogItem) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleFormCategoryChange = (val: string) => {
    setForm(prev => ({ ...prev, category: val }))
    setIsOtherCategory(val === 'Other')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    saveMutation.mutate(form)
  }

  return (
    <>
      <Topbar title="Expense Catalog" />
      <div className="page-view content">
        
        {/* Header Section */}
        <div className="section-header">
          <div>
            <div className="section-heading">Expense Catalog Management</div>
            <div className="section-heading-sub">
              Define standard expense types, categories, and default prices
            </div>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={openAddModal}>
            + Add Expense Type
          </button>
        </div>

        {/* KPI Summary Strip */}
        <div className="rpt-kpi-row">
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{catalogItems.length}</div>
            <div className="rpt-kpi-lbl">Total Expense Types</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green)' }}>
              {catalogItems.filter(i => i.is_active).length}
            </div>
            <div className="rpt-kpi-lbl">Active Types</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--amber)' }}>
              {catalogItems.filter(i => i.expense_mode === 'fixed').length}
            </div>
            <div className="rpt-kpi-lbl">Fixed Price Items</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--gray)' }}>
              {catalogItems.filter(i => i.expense_mode === 'custom').length}
            </div>
            <div className="rpt-kpi-lbl">Custom Price Items</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="rpt-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}>
            {/* Search Expense Name */}
            <div className="admin-form-group">
              <label className="admin-form-label">Search Expense Name</label>
              <input
                className="admin-form-input"
                placeholder="Search by name..."
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
            </div>

            {/* Filter Category */}
            <div className="admin-form-group">
              <label className="admin-form-label">Filter Category</label>
              <select
                className="admin-form-input"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filter Expense Mode */}
            <div className="admin-form-group">
              <label className="admin-form-label">Filter Expense Mode</label>
              <select
                className="admin-form-input"
                value={filterMode}
                onChange={e => setFilterMode(e.target.value)}
              >
                <option value="">All Modes</option>
                <option value="fixed">Fixed Amount</option>
                <option value="custom">Custom Amount</option>
              </select>
            </div>

            {/* Filter Active/Inactive */}
            <div className="admin-form-group">
              <label className="admin-form-label">Filter Status</label>
              <select
                className="admin-form-input"
                value={filterActive}
                onChange={e => setFilterActive(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Clear Button */}
            {hasActiveFilters && (
              <div className="admin-form-group" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={clearFilters}
                  style={{ height: 34, alignSelf: 'flex-end' }}
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <div style={{ marginTop: '0.5rem', fontSize: 12, color: 'var(--gray)' }}>
              Showing {filtered.length} of {catalogItems.length} entries
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="rpt-card">
          <div className="rpt-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Expense Name</th>
                  <th>Category</th>
                  <th>Default Amount</th>
                  <th>Expense Mode</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                      Loading expense catalog...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray)' }}>
                      No expense types match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ fontWeight: 500 }}>
                        {item.expense_mode === 'fixed' ? fmt(item.default_amount) : '— (Custom)'}
                      </td>
                      <td>
                        <span style={{
                          background: item.expense_mode === 'fixed' ? 'rgba(26,155,108,0.1)' : 'rgba(232,137,26,0.1)',
                          color: item.expense_mode === 'fixed' ? 'var(--green)' : 'var(--amber)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          {item.expense_mode === 'fixed' ? 'Fixed Amount' : 'Custom Amount'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${item.is_active ? 'admin-badge-active' : 'admin-badge-pending'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: 13 }}>
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="admin-btn admin-btn-secondary"
                            onClick={() => openEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            className={`admin-btn ${item.is_active ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                            onClick={() => toggleActiveMutation.mutate(item)}
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="rpt-card-title" style={{ marginBottom: '1.25rem' }}>
                {editingItem ? 'Edit Expense Type' : 'Create Expense Type'}
              </div>
              
              <form onSubmit={handleSubmit}>
                {/* Expense Name */}
                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">Expense Name *</label>
                  <input
                    className="admin-form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Paper Refill, Toner Refill, Emergency Repair"
                    required
                  />
                </div>

                <div className="admin-form-row">
                  {/* Category Selection */}
                  <div className="admin-form-group">
                    <label className="admin-form-label">Category *</label>
                    <select
                      className="admin-form-input"
                      value={form.category}
                      onChange={e => handleFormCategoryChange(e.target.value)}
                    >
                      {STANDARD_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Other">Other (Specify...)</option>
                    </select>
                  </div>

                  {/* Expense Mode */}
                  <div className="admin-form-group">
                    <label className="admin-form-label">Expense Mode *</label>
                    <select
                      className="admin-form-input"
                      value={form.expense_mode}
                      onChange={e => setForm({ ...form, expense_mode: e.target.value as 'fixed' | 'custom' })}
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="custom">Custom Amount</option>
                    </select>
                  </div>
                </div>

                {/* Custom Category Input if "Other" chosen */}
                {isOtherCategory && (
                  <div className="admin-form-group" style={{ marginBottom: '1rem', marginTop: '0.25rem' }}>
                    <label className="admin-form-label">Specify Custom Category *</label>
                    <input
                      className="admin-form-input"
                      value={customCategoryText}
                      onChange={e => setCustomCategoryText(e.target.value)}
                      placeholder="e.g. Spare Parts, License Fees"
                      required
                    />
                  </div>
                )}

                {/* Default Amount */}
                <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="admin-form-label">
                    Default Amount (₹) {form.expense_mode === 'custom' && '(Ignored for Custom Mode)'}
                  </label>
                  <input
                    className="admin-form-input"
                    type="number"
                    value={form.expense_mode === 'custom' ? '' : form.default_amount}
                    onChange={e => setForm({ ...form, default_amount: Number(e.target.value) })}
                    placeholder={form.expense_mode === 'custom' ? 'Branch Ambassador enters amount manually' : 'e.g. 250'}
                    disabled={form.expense_mode === 'custom'}
                    required={form.expense_mode === 'fixed'}
                    min={0}
                  />
                  {form.expense_mode === 'custom' ? (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>
                      ⚠️ Ambassador will type their custom amount manually (e.g. repair bill value).
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
                      🔒 Enforced default value. Branch Ambassadors cannot override this amount.
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="admin-form-label">Description</label>
                  <textarea
                    className="admin-form-input"
                    style={{ minHeight: '70px', fontFamily: 'inherit', resize: 'vertical', padding: '8px 12px' }}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description of this expense type..."
                  />
                </div>

                {/* Active Status */}
                <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="admin-form-label">Active Status</label>
                  <select
                    className="admin-form-input"
                    value={form.is_active.toString()}
                    onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}
                  >
                    <option value="true">Active (Visible in dropdowns)</option>
                    <option value="false">Inactive (Hidden from dropdowns)</option>
                  </select>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Type'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
