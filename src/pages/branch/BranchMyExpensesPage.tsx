import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { fmt } from '@/lib/format'
import type { Expense } from '@/types/database'

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = {
  variable: ['Paper', 'Toner / Ink', 'Drum', 'Maintenance'],
  fixed: ['Rent / Space', 'Internet / Electricity', 'Staff', 'Insurance'],
}

const INITIAL_FORM = {
  kiosk_id: '',
  expense_type: 'variable' as 'variable' | 'fixed',
  category: 'Paper',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

// ── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status}`}>
      {status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
    </span>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function BranchMyExpensesPage() {
  const { investor } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(INITIAL_FORM)
  const [billFile, setBillFile] = useState<File | null>(null)
  const [billPreview, setBillPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [expandedRejection, setExpandedRejection] = useState<string | null>(null)

  // ── Query: Assigned Printers ─────────────────────────────────────────────
  const { data: assignedKiosks = [], isLoading: loadingKiosks } = useQuery({
    queryKey: ['branch-my-kiosks', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiosks')
        .select('id, name, location, status')
        .eq('branch_ambassador_id', investor!.id)
        .order('name')
      if (error) throw error
      return data || []
    },
  })

  // ── Query: My Expenses ───────────────────────────────────────────────────
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['branch-my-expenses', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, kiosk:kiosks(id, name, location)')
        .eq('submitted_by', investor!.id)
        .order('created_at', { ascending: false })
      if (error) {
        // Fallback: try created_by if submitted_by column doesn't exist yet
        const { data: fallback, error: err2 } = await supabase
          .from('expenses')
          .select('*, kiosk:kiosks(id, name, location)')
          .eq('created_by', investor!.id)
          .order('created_at', { ascending: false })
        if (err2) throw err2
        return (fallback || []) as Expense[]
      }
      return (data || []) as Expense[]
    },
  })

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalApprovedAmount: expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }

  const filtered = expenses.filter(e =>
    statusFilter === 'all' ? true : e.status === statusFilter
  )

  // ── File handler ─────────────────────────────────────────────────────────
  const handleFile = (file: File | null) => {
    setBillFile(file)
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setBillPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setBillPreview(null)
    }
  }

  // ── Submit mutation ──────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.kiosk_id) throw new Error('Please select a printer')
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Please enter a valid amount')
      if (!form.category) throw new Error('Please select a category')

      setUploading(true)
      let billUrl: string | null = null

      try {
        // Upload bill if provided
        if (billFile && isSupabaseConfigured) {
          const ext = billFile.name.split('.').pop()
          const path = `receipts/${investor!.id}-${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('bills').upload(path, billFile)
          if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
          const { data: { publicUrl } } = supabase.storage.from('bills').getPublicUrl(path)
          billUrl = publicUrl
        }

        const payload = {
          kiosk_id:     form.kiosk_id,
          expense_type: form.expense_type,
          category:     form.category,
          notes:        form.description ? `${form.description}${form.notes ? ' — ' + form.notes : ''}` : form.notes || null,
          amount:       Number(form.amount),
          period_start: form.date,
          period_end:   form.date,
          period_type:  'monthly',
          status:       'pending',
          submitted_by: investor!.id,
          created_by:   investor!.id,
          bill_url:     billUrl,
        }

        const { error } = await supabase.from('expenses').insert(payload)
        if (error) throw error
      } finally {
        setUploading(false)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-my-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['branch-expenses'] })
      toast('Expense submitted successfully and sent for admin review.', 'success')
      setForm(INITIAL_FORM)
      setBillFile(null)
      setBillPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => {
      setUploading(false)
      toast(err.message || 'Failed to submit expense.', 'error')
    },
  })

  const isSubmitting = submitMutation.isPending || uploading

  return (
    <>
      <Topbar title="My Expenses" />
      <div className="page-view content">

        {/* ── KPI Summary Row ────────────────────────────────────────────── */}
        <div className="rpt-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val">{stats.total}</div>
            <div className="rpt-kpi-lbl">Total Submitted</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: '#c2410c' }}>{stats.pending}</div>
            <div className="rpt-kpi-lbl">Pending Review</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--green-d)' }}>{stats.approved}</div>
            <div className="rpt-kpi-lbl">Approved</div>
          </div>
          <div className="rpt-kpi">
            <div className="rpt-kpi-val" style={{ color: 'var(--red)' }}>{fmt(stats.totalApprovedAmount)}</div>
            <div className="rpt-kpi-lbl">Approved Amount</div>
          </div>
        </div>

        {/* ── Expense Submission Form ────────────────────────────────────── */}
        <div className="rpt-card">
          <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div className="rpt-card-title">Submit New Expense</div>
              <div className="rpt-card-sub">All submissions go to admin for approval before affecting reports</div>
            </div>
          </div>

          {/* Row 1: Printer + Type */}
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Assigned Printer *</label>
              {loadingKiosks ? (
                <div className="admin-form-input" style={{ color: 'var(--gray)', display: 'flex', alignItems: 'center' }}>
                  Loading printers...
                </div>
              ) : assignedKiosks.length === 0 ? (
                <div className="admin-form-input" style={{ color: 'var(--gray)', display: 'flex', alignItems: 'center' }}>
                  No printers assigned to you yet
                </div>
              ) : (
                <select
                  className="admin-form-input"
                  value={form.kiosk_id}
                  onChange={e => setForm({ ...form, kiosk_id: e.target.value })}
                >
                  <option value="">— Select printer —</option>
                  {assignedKiosks.map((k: any) => (
                    <option key={k.id} value={k.id}>
                      {k.name} · {k.location}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Expense Type *</label>
              <select
                className="admin-form-input"
                value={form.expense_type}
                onChange={e => {
                  const type = e.target.value as 'variable' | 'fixed'
                  setForm({ ...form, expense_type: type, category: CATEGORIES[type][0] })
                }}
              >
                <option value="variable">Variable (consumables)</option>
                <option value="fixed">Fixed (recurring)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Category + Amount */}
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Category *</label>
              <select
                className="admin-form-input"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES[form.expense_type].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Amount (₹) *</label>
              <input
                className="admin-form-input"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Row 3: Description + Date */}
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Description *</label>
              <input
                className="admin-form-input"
                type="text"
                placeholder="e.g. Monthly paper restock"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Expense Date *</label>
              <input
                className="admin-form-input"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
            <label className="admin-form-label">Additional Notes (optional)</label>
            <textarea
              className="admin-form-input"
              rows={2}
              placeholder="Any extra context for the admin reviewer..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {/* Bill Upload */}
          <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="admin-form-label">Upload Bill / Receipt (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              id="my-expense-bill"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
            <label
              htmlFor="my-expense-bill"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                border: `2px dashed ${billFile ? 'var(--green)' : 'var(--border)'}`,
                borderRadius: '10px',
                background: billFile ? 'var(--green-ll)' : 'var(--bg)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
              onMouseOver={e => {
                if (!isSubmitting) (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'
              }}
              onMouseOut={e => {
                if (!billFile) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
              }}
            >
              {billPreview ? (
                <img
                  src={billPreview}
                  alt="Bill preview"
                  style={{ height: 80, objectFit: 'contain', borderRadius: 6 }}
                />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: billFile ? 'var(--green-d)' : 'var(--ink)' }}>
                  {billFile ? billFile.name : 'Click to upload receipt (PDF / Image)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                  {billFile
                    ? `${(billFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Max 5 MB — attach to strengthen your claim'}
                </div>
              </div>
              {billFile && (
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); handleFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: 'var(--red)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ✕ Remove
                </button>
              )}
            </label>
          </div>

          {/* Submit button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="admin-btn admin-btn-primary"
              style={{ minWidth: 160, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => submitMutation.mutate()}
              disabled={
                isSubmitting ||
                !form.kiosk_id ||
                !form.amount ||
                !form.description ||
                assignedKiosks.length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {uploading ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Expense
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── My Expenses Table ──────────────────────────────────────────── */}
        <div className="rpt-card">
          <div className="rpt-card-header" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="rpt-card-title">Submission History</div>
              <div className="rpt-card-sub">Track all your submitted expenses and their approval status</div>
            </div>
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: statusFilter === s ? 'none' : '1px solid var(--border)',
                  background: statusFilter === s
                    ? s === 'pending' ? '#fff7ed'
                    : s === 'approved' ? 'var(--green-l)'
                    : s === 'rejected' ? 'var(--red-l)'
                    : 'var(--sidebar)'
                    : 'var(--white)',
                  color: statusFilter === s
                    ? s === 'pending' ? '#c2410c'
                    : s === 'approved' ? 'var(--green-d)'
                    : s === 'rejected' ? 'var(--red)'
                    : 'var(--white)'
                    : 'var(--gray)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: 11,
                }}>
                  {s === 'all' ? stats.total : s === 'pending' ? stats.pending : s === 'approved' ? stats.approved : stats.rejected}
                </span>
              </button>
            ))}
          </div>

          <div className="rpt-table-wrap">
            {loadingExpenses ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray)' }}>
                Loading expenses...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: 'var(--gray)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div>No {statusFilter !== 'all' ? statusFilter : ''} expenses found.</div>
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    style={{ fontSize: 13, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    View all →
                  </button>
                )}
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Printer</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Receipt</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: Expense) => (
                    <>
                      <tr key={e.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--gray)', fontSize: 12 }}>
                          {new Date(e.period_start).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {(e.kiosk as any)?.name || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--gray)' }}>
                            {(e.kiosk as any)?.location}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: 'var(--gray-l)',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            color: 'var(--gray)',
                          }}>
                            {e.category}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ink)', fontSize: 13, maxWidth: 180 }}>
                          {e.notes || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                          {fmt(Number(e.amount))}
                        </td>
                        <td>
                          {e.bill_url ? (
                            <a
                              href={e.bill_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--green-d)',
                                fontWeight: 600,
                                fontSize: 12,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span style={{ color: 'var(--gray)', fontSize: 12, fontStyle: 'italic' }}>None</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <StatusBadge status={e.status} />
                            {e.status === 'rejected' && (e.rejection_reason || e.admin_remarks) && (
                              <button
                                onClick={() => setExpandedRejection(expandedRejection === e.id ? null : e.id)}
                                style={{
                                  fontSize: 11,
                                  color: 'var(--red)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  padding: 0,
                                  fontWeight: 600,
                                }}
                              >
                                {expandedRejection === e.id ? '▲ Hide reason' : '▼ View reason'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Rejection reason expansion row */}
                      {e.status === 'rejected' && expandedRejection === e.id && (
                        <tr key={`${e.id}-reason`} style={{ background: 'var(--red-l)' }}>
                          <td colSpan={7}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '10px 4px',
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Rejection Reason
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                                  {e.rejection_reason || e.admin_remarks || 'No reason provided by admin.'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Spin keyframe for loading icon ──────────────────────────────── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile responsive overrides for this page */
        @media (max-width: 640px) {
          .my-expenses-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
