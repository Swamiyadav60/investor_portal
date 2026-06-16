import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '@/components/layout/Topbar'
import { DEMO_KIOSKS } from '@/data/demo'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

const CATEGORIES = {
  variable: ['Paper', 'Toner / Ink', 'Drum'],
  fixed: ['Rent', 'Power bill', 'Maintenance'],
}

export function AdminExpensesPage() {
  const { investor } = useAuth()
  const [activeTab, setActiveTab] = useState<'add' | 'review'>('review')
  const [form, setForm] = useState({
    kiosk_id: '',
    amount: '',
    category: 'Paper',
    expense_type: 'variable' as 'variable' | 'fixed',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // Review states
  const [reviewingExpense, setReviewingExpense] = useState<any | null>(null)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved')
  const [remarks, setRemarks] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 1. Fetch live active kiosks for selection dropdown
  const { data: kiosks = [] } = useQuery({
    queryKey: ['admin-kiosks-active'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_KIOSKS.filter((k) => k.status === 'active')
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Set default kiosk selection once kiosks are loaded
  useEffect(() => {
    if (kiosks.length > 0 && !form.kiosk_id) {
      setForm((prev) => ({ ...prev, kiosk_id: kiosks[0].id }))
    }
  }, [kiosks])

  // 2. Fetch pending expenses submitted by ambassadors
  const { data: pendingExpenses = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ['admin-pending-expenses'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return [
          { id: 'mock-exp-1', created_at: new Date(Date.now() - 3600000).toISOString(), amount: 1500, category: 'Toner / Ink', expense_type: 'variable', notes: 'Ink cartridges refilled for JNTU campus printer.', status: 'pending', bill_url: 'https://placeholder.supabase.co/receipt.jpg', period_start: '2026-06-15', kiosk: { name: 'Printer 1', location: 'Madhapur IT Park' }, submitted_by_user: { full_name: 'Vikram Prasad' } },
          { id: 'mock-exp-2', created_at: new Date(Date.now() - 7200000).toISOString(), amount: 750, category: 'Paper', expense_type: 'variable', notes: 'Purchased 3 bundles of A4 sheets.', status: 'pending', bill_url: null, period_start: '2026-06-14', kiosk: { name: 'Printer 2', location: 'Kukatpally HB' }, submitted_by_user: { full_name: 'Aditi Rao' } },
        ]
      }
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          kiosk:kiosks(name, location),
          submitted_by_user:investors!expenses_created_by_fkey(full_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        kiosk_id: form.kiosk_id,
        amount: Number(form.amount),
        category: form.category,
        expense_type: form.expense_type,
        period_start: form.period_start,
        period_end: form.period_end,
        period_type: 'monthly',
        notes: form.notes || null,
        status: 'approved', // Admin direct entries are auto-approved
      }
      if (!isSupabaseConfigured) {
        toast(`Expense of ₹${form.amount} added (demo).`, 'success')
        return
      }
      const { error } = await supabase.from('expenses').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Expense added. Investor dashboards will update in realtime.', 'success')
      setForm({ ...form, amount: '', notes: '' })
    },
  })

  const reviewExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!reviewingExpense) return

      if (!isSupabaseConfigured) {
        // Mock review update in client cache
        queryClient.setQueryData(['admin-pending-expenses'], (old: any) => {
          return (old || []).filter((e: any) => e.id !== reviewingExpense.id)
        })
        return
      }

      const { error } = await supabase
        .from('expenses')
        .update({
          status: reviewAction,
          admin_remarks: remarks || null,
          approved_by: investor?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', reviewingExpense.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['branch-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      
      toast(`Expense ${reviewAction === 'approved' ? 'approved' : 'rejected'} successfully.`, 'success')
      setReviewingExpense(null)
      setRemarks('')
    },
    onError: (err: any) => {
      toast(err.message || 'Error saving review.', 'error')
    }
  })

  const handleOpenReview = (expense: any, action: 'approved' | 'rejected') => {
    setReviewingExpense(expense)
    setReviewAction(action)
    setRemarks('')
  }

  const handleConfirmReview = () => {
    reviewExpenseMutation.mutate()
  }

  return (
    <>
      <Topbar title="Expense Management" />
      <div className="page-view content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div className="section-heading">Expense Control Panel</div>
            <div className="section-heading-sub">
              Review ambassador submissions or directly add verified campus expenses.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('review')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'review' ? '2px solid var(--green)' : '2px solid transparent',
              color: activeTab === 'review' ? 'var(--green-d)' : 'var(--gray)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Review Pending Submissions ({pendingExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'add' ? '2px solid var(--green)' : '2px solid transparent',
              color: activeTab === 'add' ? 'var(--green-d)' : 'var(--gray)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Direct Add Expense
          </button>
        </div>

        {activeTab === 'review' ? (
          <div className="rpt-card">
            <div className="rpt-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date Logged</th>
                    <th>Ambassador</th>
                    <th>Printer / Kiosk</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th>Receipt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isPendingLoading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading submissions...</td></tr>
                  ) : pendingExpenses.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)' }}>No pending expense submissions to review.</td></tr>
                  ) : (
                    pendingExpenses.map((exp: any) => (
                      <tr key={exp.id}>
                        <td style={{ fontSize: '13px' }}>
                          {new Date(exp.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td style={{ fontWeight: 500 }}>{exp.submitted_by_user?.full_name || 'Ambassador'}</td>
                        <td>{exp.kiosk?.name || 'Smart Printer'}</td>
                        <td>
                          <span style={{
                            background: 'var(--gray-l)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--gray)'
                          }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmt(exp.amount)}</td>
                        <td style={{ fontSize: '13px', maxWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {exp.notes || 'No description'}
                        </td>
                        <td>
                          {exp.bill_url ? (
                            <a href={exp.bill_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-d)', fontWeight: 600, textDecoration: 'none' }}>
                              View Bill ↗
                            </a>
                          ) : (
                            <span style={{ color: 'var(--gray)', fontStyle: 'italic', fontSize: '12px' }}>No receipt uploaded</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="admin-btn admin-btn-primary" 
                              onClick={() => handleOpenReview(exp, 'approved')}
                              style={{ background: '#1A9B6C', borderColor: '#1A9B6C', padding: '4px 10px', fontSize: '12px' }}
                            >
                              Approve
                            </button>
                            <button 
                              className="admin-btn admin-btn-danger" 
                              onClick={() => handleOpenReview(exp, 'rejected')}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Reject
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
        ) : (
          <div className="rpt-card" style={{ maxWidth: 600 }}>
            <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
              <label className="admin-form-label">Kiosk</label>
              <select 
                className="admin-form-input" 
                value={form.kiosk_id} 
                onChange={(e) => setForm({ ...form, kiosk_id: e.target.value })}
              >
                {kiosks.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.name} — {k.location}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Type</label>
                <select className="admin-form-input" value={form.expense_type} onChange={(e) => {
                  const type = e.target.value as 'variable' | 'fixed'
                  setForm({ ...form, expense_type: type, category: CATEGORIES[type][0] })
                }}>
                  <option value="variable">Variable</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Category</label>
                <select className="admin-form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES[form.expense_type].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="admin-form-group" style={{ marginBottom: '.75rem' }}>
              <label className="admin-form-label">Amount (₹)</label>
              <input className="admin-form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Period Start</label>
                <input className="admin-form-input" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Period End</label>
                <input className="admin-form-input" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              </div>
            </div>
            <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
              <label className="admin-form-label">Description / Notes</label>
              <textarea 
                className="admin-form-input" 
                style={{ height: '70px', padding: '8px', fontFamily: 'inherit' }} 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              />
            </div>
            <button className="admin-btn admin-btn-primary" onClick={() => createMutation.mutate()} disabled={!form.amount}>
              Add Expense
            </button>
          </div>
        )}

        {/* Review Approval/Rejection Modal */}
        {reviewingExpense && (
          <div className="admin-modal-overlay" onClick={() => setReviewingExpense(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>
                Confirm Expense {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--gray-d)', marginBottom: '1rem', lineHeight: '1.4' }}>
                You are about to <strong>{reviewAction}</strong> the expense request of <strong>{fmt(reviewingExpense.amount)}</strong> submitted by <strong>{reviewingExpense.submitted_by_user?.full_name}</strong> for <strong>{reviewingExpense.kiosk?.name}</strong>.
              </p>

              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="admin-form-label">
                  Admin Remarks {reviewAction === 'rejected' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  className="admin-form-input"
                  style={{ height: '80px', padding: '8px', fontFamily: 'inherit' }}
                  placeholder={reviewAction === 'rejected' ? 'Explain why this expense was rejected...' : 'Add audit notes...'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button 
                  className={`admin-btn ${reviewAction === 'approved' ? 'admin-btn-primary' : 'admin-btn-danger'}`}
                  onClick={handleConfirmReview}
                  disabled={reviewExpenseMutation.isPending || (reviewAction === 'rejected' && !remarks.trim())}
                >
                  {reviewExpenseMutation.isPending ? 'Processing...' : `Confirm ${reviewAction === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
                <button 
                  className="admin-btn admin-btn-secondary" 
                  onClick={() => setReviewingExpense(null)}
                  disabled={reviewExpenseMutation.isPending}
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
