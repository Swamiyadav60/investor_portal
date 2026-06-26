import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import type { ExpenseCatalogItem } from '@/types/database'


export function BranchLogExpensePage() {
  const { investor } = useAuth()
  const [searchParams] = useSearchParams()
  const codeParam = searchParams.get('code')

  const [printerCode, setPrinterCode] = useState('')
  const [step, setStep] = useState<'initial' | 'loading' | 'verified' | 'error' | 'form'>('initial')
  const [foundPrinter, setFoundPrinter] = useState<any>(null)
  
  // Form state
  const [form, setForm] = useState({
    expense_catalog_id: '',
    amount: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: '',
  })
  
  const [billFile, setBillFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 1. Fetch assigned kiosks for verification directly from kiosks table
  const { data: assignedKiosks = [], isSuccess: isKiosksLoaded } = useQuery({
    queryKey: ['branch-kiosks-verify', investor?.id],
    enabled: !!investor?.id,
    queryFn: async () => {
      const { data: kiosks, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('branch_ambassador_id', investor!.id)

      if (error) throw error

      return kiosks?.map((k: any, idx: number) => {
        return {
          ...k,
          displayCode: `SP-00${idx + 1}`
        }
      }) || []
    },
  })

  // 2. Fetch active catalog items
  const { data: catalogItems = [], isLoading: loadingCatalog } = useQuery<ExpenseCatalogItem[]>({
    queryKey: ['active-expense-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const selectedCatalogItem = useMemo(() => {
    return catalogItems.find(item => item.id === form.expense_catalog_id)
  }, [catalogItems, form.expense_catalog_id])

  const handleCatalogItemChange = (catalogId: string) => {
    const item = catalogItems.find(i => i.id === catalogId)
    setForm(prev => ({
      ...prev,
      expense_catalog_id: catalogId,
      amount: item && item.expense_mode === 'fixed' ? item.default_amount.toString() : '',
    }))
  }

  // Prefill check
  useEffect(() => {
    if (isKiosksLoaded && codeParam && assignedKiosks.length > 0) {
      setPrinterCode(codeParam.toUpperCase())
      handleFindCode(codeParam.toUpperCase())
    }
  }, [codeParam, isKiosksLoaded, assignedKiosks])

  const handleFindCode = (code: string) => {
    if (!code.trim()) return
    
    setStep('loading')
    setFoundPrinter(null)
    
    // Simulate lookup verification delay
    setTimeout(() => {
      // Find matching printer ONLY in the assigned list
      const match = assignedKiosks.find((k: any) => 
        k.id.toLowerCase() === code.toLowerCase() || 
        k.displayCode.toLowerCase() === code.toLowerCase()
      )
      
      if (match) {
        setFoundPrinter(match)
        setStep('verified')
      } else {
        setStep('error')
      }
    }, 500)
  }

  const handleFind = () => {
    handleFindCode(printerCode)
  }

  const handleYesLogExpense = () => {
    setStep('form')
  }

  const handleNotThisOne = () => {
    setStep('initial')
    setPrinterCode('')
    setFoundPrinter(null)
  }

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!foundPrinter) throw new Error('No printer selected')
      if (!form.expense_catalog_id) throw new Error('Please select an expense type')
      if (!selectedCatalogItem) throw new Error('Selected expense type is invalid')
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Please enter a valid amount')

      // Custom mode validation: Bill upload is mandatory
      if (selectedCatalogItem.expense_mode === 'custom' && !billFile) {
        throw new Error('A receipt/bill upload is mandatory for custom amount expenses.')
      }

      setUploading(true)
      let billUrl: string | null = null

      try {
        if (billFile && isSupabaseConfigured) {
          const ext = billFile.name.split('.').pop()
          const path = `receipts/${investor?.id}-${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('bills').upload(path, billFile)
          if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
          const { data: { publicUrl } } = supabase.storage.from('bills').getPublicUrl(path)
          billUrl = publicUrl
        }

        const isFixedCategory = ['Rent / Space', 'Internet / Electricity', 'Staff', 'Insurance'].includes(selectedCatalogItem.category)

        const payload = {
          kiosk_id: foundPrinter.id,
          amount: Number(form.amount),
          category: selectedCatalogItem.category,
          expense_name: selectedCatalogItem.name,
          expense_catalog_id: selectedCatalogItem.id,
          expense_type: isFixedCategory ? 'fixed' : 'variable',
          period_start: form.period_start,
          period_end: form.period_end,
          period_type: 'monthly',
          notes: selectedCatalogItem.name + (form.notes.trim() ? ` — ${form.notes.trim()}` : ''),
          submitted_by: investor?.id || null,
          status: 'pending',
          bill_url: billUrl,
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast('Expense submitted successfully and sent for admin review.', 'success')
      
      // Reset wizard
      setStep('initial')
      setPrinterCode('')
      setFoundPrinter(null)
      setForm({
        expense_catalog_id: '',
        amount: '',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setBillFile(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Error submitting expense.', 'error')
    }
  })

  // Quick select chips (only display printer codes that are assigned!)
  const quickChips = assignedKiosks.map((k: any) => k.displayCode)

  return (
    <>
      <Topbar title="Log Expense" />
      <div className="tech-expense-container">
        <div className="tech-card">
          <div className="tech-icon-wrapper">
            <div className="tech-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
          </div>

          <div className="tech-heading">Verify Printer</div>
          <div className="tech-subtitle">Enter or select the printer code to verify your assignment</div>

          <div className="search-row">
            <input 
              type="text" 
              className="search-input" 
              placeholder="e.g. SP-001" 
              value={printerCode}
              onChange={(e) => setPrinterCode(e.target.value)}
              disabled={step === 'loading'}
              style={{
                height: 50,
                border: '1px solid #eaeaea',
                borderRadius: 14,
                padding: '0 18px',
                fontSize: 15,
                outline: 'none'
              }}
            />
            <button 
              className="btn-primary" 
              onClick={handleFind}
              disabled={!printerCode.trim() || step === 'loading'}
              style={{
                height: 50,
                padding: '0 24px',
                borderRadius: 14,
                fontWeight: 600,
                background: '#1A9B6C',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Find
            </button>
          </div>

          {(step === 'initial' || step === 'error' || step === 'loading') && quickChips.length > 0 && (
            <div className="chips-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {quickChips.map(chip => (
                <button 
                  key={chip} 
                  className="chip"
                  onClick={() => {
                    setPrinterCode(chip)
                    handleFindCode(chip)
                  }}
                  disabled={step === 'loading'}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: '1px solid #1A9B6C',
                    background: '#f0faf5',
                    color: '#1A9B6C',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 13
                  }}
                >
                  {chip}
                </button>
              ))}
              <span className="chip-hint" style={{ fontSize: 11, color: 'var(--gray)', alignSelf: 'center' }}>← tap to select</span>
            </div>
          )}

          {step === 'error' && (
            <div className="error-message" style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16, display: 'flex', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Printer not found or not assigned to you.
            </div>
          )}

          {(step === 'verified' || step === 'form') && foundPrinter && (
            <div className="verification-card" style={{ border: '1px solid #1A9B6C', borderRadius: 16, padding: 18, background: '#f0faf5', marginBottom: 20 }}>
              <div className="vc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="vc-title" style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{foundPrinter.name}</div>
                  <div className="vc-location" style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {foundPrinter.location}
                  </div>
                </div>
                <div className="vc-badge" style={{ textAlign: 'right' }}>
                  <div className="vc-badge-text" style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-d)' }}>CODE VERIFIED</div>
                  <div className="vc-badge-code" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{foundPrinter.displayCode}</div>
                </div>
              </div>
            </div>
          )}

          {step === 'verified' && (
            <div className="action-area" style={{ textAlign: 'center', marginTop: 24 }}>
              <div className="action-text" style={{ marginBottom: 12, fontWeight: 600 }}>Is this the correct printer?</div>
              <div className="action-buttons" style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="btn-secondary" 
                  onClick={handleNotThisOne}
                  style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Not this one
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleYesLogExpense}
                  style={{ flex: 2, height: 44, borderRadius: 10, background: '#1A9B6C', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Yes — log expense
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div style={{ marginTop: '24px', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: '16px', color: 'var(--ink)' }}>Expense Details</div>
              
              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Expense Type *</label>
                {loadingCatalog ? (
                  <div className="search-input" style={{ height: '44px', display: 'flex', alignItems: 'center', color: 'var(--gray)' }}>Loading types...</div>
                ) : (
                  <select 
                    className="search-input" 
                    style={{ height: '44px', width: '100%', borderRadius: 10, border: '1px solid var(--border)', padding: '0 12px' }} 
                    value={form.expense_catalog_id} 
                    onChange={(e) => handleCatalogItemChange(e.target.value)}
                  >
                    <option value="">— Select type —</option>
                    {catalogItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>
                  Amount (₹) * {selectedCatalogItem?.expense_mode === 'fixed' && '(Fixed Mode)'}
                </label>
                <input 
                  className="search-input" 
                  style={{ height: '44px', width: '100%', borderRadius: 10, border: '1px solid var(--border)', padding: '0 12px' }} 
                  type="number" 
                  min="0.01"
                  step="0.01"
                  placeholder="0.00" 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  disabled={selectedCatalogItem?.expense_mode === 'fixed'}
                  required
                />
                {selectedCatalogItem && (
                  <div style={{ fontSize: 11, color: selectedCatalogItem.expense_mode === 'fixed' ? 'var(--gray)' : 'var(--amber)', marginTop: 4 }}>
                    {selectedCatalogItem.expense_mode === 'fixed' 
                      ? '🔒 Enforced default price.' 
                      : '✍️ Enter manually. Receipt upload is mandatory.'}
                  </div>
                )}
              </div>

              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Additional Details / Notes (optional)</label>
                <textarea 
                  className="search-input" 
                  style={{ height: '80px', width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }} 
                  placeholder="Optional details or context..." 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '20px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>
                  Upload Receipt {selectedCatalogItem?.expense_mode === 'custom' ? '(Mandatory *)' : '(Optional)'}
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  id="bill-upload-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setBillFile(file)
                  }}
                  disabled={uploading || createMutation.isPending}
                />
                <label 
                  htmlFor="bill-upload-input"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    padding: '20px',
                    border: `2px dashed ${
                      billFile 
                        ? 'var(--green)' 
                        : selectedCatalogItem?.expense_mode === 'custom' 
                          ? 'var(--amber)' 
                          : '#eaeaea'
                    }`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: '#fafafa',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="2" style={{ marginBottom: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {billFile ? billFile.name : 'Click to upload receipt (PDF/Image)'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '4px' }}>
                    {selectedCatalogItem?.expense_mode === 'custom' && !billFile ? (
                      <span style={{ color: 'var(--red)', fontWeight: 600 }}>⚠️ Required for Custom Mode</span>
                    ) : (
                      'Max size: 5MB'
                    )}
                  </span>
                </label>
              </div>

              <div className="action-buttons" style={{ display: 'flex', gap: 10, marginTop: '24px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }} 
                  onClick={() => setStep('verified')} 
                  disabled={uploading || createMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ 
                    flex: 2, 
                    height: 44, 
                    borderRadius: 10, 
                    background: '#1A9B6C', 
                    color: '#fff', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 600, 
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }} 
                  onClick={() => createMutation.mutate()} 
                  disabled={
                    !form.expense_catalog_id ||
                    !form.amount ||
                    (selectedCatalogItem?.expense_mode === 'custom' && !billFile) ||
                    uploading || 
                    createMutation.isPending
                  }
                >
                  {uploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : 'Submit Expense'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        .tech-expense-container {
          display: flex;
          justify-content: center;
          padding: 2rem 1rem;
          min-height: calc(100vh - 72px);
        }
        
        .tech-card {
          width: 100%;
          max-width: 500px;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #eaeaea;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
          padding: 32px;
          transition: all 0.3s ease;
          height: fit-content;
        }

        .tech-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .tech-icon-box {
          width: 56px;
          height: 56px;
          background: #eef8f3;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A9B6C;
        }

        .tech-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          text-align: center;
          margin-bottom: 8px;
        }

        .tech-subtitle {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 32px;
        }

        .search-row {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-input {
          flex: 1;
          height: 50px;
          border: 1px solid #eaeaea;
          border-radius: 14px;
          padding: 0 18px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }

        .search-input:focus {
          border-color: #1A9B6C;
        }
      `}</style>
    </>
  )
}
