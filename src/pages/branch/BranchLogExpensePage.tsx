import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { supabase, isSupabaseConfigured} from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

const CATEGORIES = {
  variable: ['Paper', 'Toner / Ink', 'Drum'],
  fixed: ['Rent', 'Power bill', 'Maintenance'],
}

// Mock service history for demo
const mockServiceHistory = [
  { date: '15 Jun 2026', items: 'Drum, Ink', status: 'pending' },
  { date: '06 Jun 2026', items: 'Drum, Paper', status: 'approved' }
]

export function BranchLogExpensePage() {
  const { investor } = useAuth()
  const [searchParams] = useSearchParams()
  const codeParam = searchParams.get('code')

  const [printerCode, setPrinterCode] = useState('')
  const [step, setStep] = useState<'initial' | 'loading' | 'verified' | 'error' | 'form'>('initial')
  const [foundPrinter, setFoundPrinter] = useState<any>(null)
  
  // Form state
  const [form, setForm] = useState({
    amount: '',
    category: 'Paper',
    expense_type: 'variable' as 'variable' | 'fixed',
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

  const handleNotThisOne = () => {
    setStep('initial')
    setPrinterCode('')
    setFoundPrinter(null)
  }

  const handleYesLogExpense = () => {
    setStep('form')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      try {
        let billUrl = null
        if (billFile) {
          if (isSupabaseConfigured) {
            const fileExt = billFile.name.split('.').pop()
            const fileName = `${investor?.id || 'ambassador'}-${Date.now()}.${fileExt}`
            const filePath = `receipts/${fileName}`

            const { error: uploadError } = await supabase.storage
               .from('bills')
               .upload(filePath, billFile)

            if (uploadError) throw new Error(`Bill upload error: ${uploadError.message}`)

            const { data: { publicUrl } } = supabase.storage
               .from('bills')
               .getPublicUrl(filePath)

            billUrl = publicUrl
          } else {
            billUrl = `https://placeholder.supabase.co/storage/v1/object/public/bills/receipts/mock-${Date.now()}`
          }
        }

        const payload = {
          kiosk_id: foundPrinter?.id,
          amount: Number(form.amount),
          category: form.category,
          expense_type: form.expense_type,
          period_start: form.period_start,
          period_end: form.period_end,
          period_type: 'monthly',
          notes: form.notes || null,
          created_by: investor?.id || null,
          status: 'pending',
          bill_url: billUrl,
        }

        if (!isSupabaseConfigured) {
          toast(`Expense of ₹${form.amount} logged for verification.`, 'success')
          return
        }

        const { error } = await supabase.from('expenses').insert(payload)
        if (error) throw error
      } finally {
        setUploading(false)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast('Expense submitted for admin approval.', 'success')
      
      // Reset wizard
      setStep('initial')
      setPrinterCode('')
      setFoundPrinter(null)
      setForm({ ...form, amount: '', notes: '' })
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
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 16px;
          font-weight: 500;
          color: #111827;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .search-input:focus {
          border-color: #1A9B6C;
          box-shadow: 0 0 0 3px rgba(26, 155, 108, 0.1);
        }
        
        .search-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .btn-find {
          height: 50px;
          padding: 0 24px;
          background: #1A9B6C;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .btn-find:hover {
          background: #15825A;
        }

        .btn-find:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .chips-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chip:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .chip-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-left: 4px;
        }

        .verification-card {
          margin-top: 32px;
          background: #eef8f3;
          border: 1px solid #d1eedf;
          border-radius: 16px;
          padding: 24px;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .vc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .vc-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .vc-location {
          font-size: 13px;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .vc-badge {
          text-align: right;
        }

        .vc-badge-text {
          font-size: 10px;
          font-weight: 700;
          color: #1A9B6C;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .vc-badge-code {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #1A9B6C;
        }

        .history-section {
          border-top: 1px solid #d1eedf;
          padding-top: 16px;
        }

        .history-title {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .history-item-left {
          color: #4b5563;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge::before {
          content: '';
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-badge.pending {
          background: #fff7ed;
          color: #c2410c;
        }
        .status-badge.pending::before { background: #ea580c; }

        .status-badge.approved {
          background: #ecfdf5;
          color: #047857;
        }
        .status-badge.approved::before { background: #10b981; }

        .status-badge.rejected {
          background: #fef2f2;
          color: #b91c1c;
        }
        .status-badge.rejected::before { background: #ef4444; }

        .action-area {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: fadeIn 0.5s ease 0.2s both;
        }

        .action-text {
          font-size: 14px;
          color: #4b5563;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-secondary {
          padding: 0 16px;
          height: 44px;
          background: #f3f4f6;
          border: none;
          border-radius: 10px;
          font-weight: 500;
          font-size: 14px;
          color: #4b5563;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          padding: 0 20px;
          height: 44px;
          background: #1A9B6C;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #15825A;
        }
        
        .error-message {
          margin-top: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      <Topbar title="Log Expense" />
      <div className="tech-expense-container page-view content">
        <div className="tech-card">
          
          <div className="tech-icon-wrapper">
            <div className="tech-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </div>
          </div>

          <h1 className="tech-heading">Enter printer code</h1>
          <p className="tech-subtitle">Find the code on the sticker at the back of the printer</p>

          <div className="search-row">
            <input 
              type="text" 
              className="search-input" 
              placeholder="E.G. SP-001"
              value={printerCode}
              onChange={(e) => setPrinterCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
              disabled={step === 'loading' || step === 'verified' || step === 'form'}
            />
            <button 
              className="btn-find" 
              onClick={handleFind}
              disabled={!printerCode.trim() || step === 'loading' || step === 'verified' || step === 'form'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Find
            </button>
          </div>

          {(step === 'initial' || step === 'error' || step === 'loading') && quickChips.length > 0 && (
            <div className="chips-row">
              {quickChips.map(chip => (
                <button 
                  key={chip} 
                  className="chip"
                  onClick={() => {
                    setPrinterCode(chip)
                    handleFindCode(chip)
                  }}
                  disabled={step === 'loading'}
                >
                  {chip}
                </button>
              ))}
              <span className="chip-hint">← tap your assigned printers</span>
            </div>
          )}

          {step === 'error' && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Printer not found or not assigned to you.
            </div>
          )}

          {(step === 'verified' || step === 'form') && foundPrinter && (
            <div className="verification-card">
              <div className="vc-header">
                <div>
                  <div className="vc-title">{foundPrinter.name}</div>
                  <div className="vc-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {foundPrinter.location}
                  </div>
                </div>
                <div className="vc-badge">
                  <div className="vc-badge-text">CODE VERIFIED</div>
                  <div className="vc-badge-code">{foundPrinter.displayCode}</div>
                </div>
              </div>

              <div className="history-section">
                <div className="history-title">LAST SERVICE: {mockServiceHistory[0].date.toUpperCase()}</div>
                <div className="history-list">
                  {mockServiceHistory.map((history, idx) => (
                    <div className="history-item" key={idx}>
                      <div className="history-item-left">
                        {history.date} - {history.items}
                      </div>
                      <div className={`status-badge ${history.status}`}>
                        {history.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'verified' && (
            <div className="action-area">
              <div className="action-text">Is this the correct printer?</div>
              <div className="action-buttons">
                <button className="btn-secondary" onClick={handleNotThisOne}>
                  Not this one
                </button>
                <button className="btn-primary" onClick={handleYesLogExpense}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Yes — log expense
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div style={{ marginTop: '32px', animation: 'fadeIn 0.4s ease' }}>
              <div className="section-heading" style={{ marginBottom: '16px' }}>Expense Details</div>
              
              <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Type</label>
                  <select className="search-input" style={{ height: '44px', width: '100%' }} value={form.expense_type} onChange={(e) => {
                    const type = e.target.value as 'variable' | 'fixed'
                    setForm({ ...form, expense_type: type, category: CATEGORIES[type][0] })
                  }}>
                    <option value="variable">Variable</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select className="search-input" style={{ height: '44px', width: '100%' }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES[form.expense_type].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '16px', marginTop: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Amount (₹)</label>
                <input className="search-input" style={{ height: '44px', width: '100%' }} type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>Notes</label>
                <textarea className="search-input" style={{ height: '80px', width: '100%', padding: '12px', fontFamily: 'inherit' }} placeholder="Optional notes/bill details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                <label className="admin-form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: '6px' }}>
                  Upload Bill / Receipt
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
                    padding: '16px',
                    border: '2px dashed #eaeaea',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: '#fafafa',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#1A9B6C'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#eaeaea'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="2" style={{ marginBottom: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
                    {billFile ? billFile.name : 'Click to upload receipt (PDF/Image)'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '4px' }}>
                    {billFile ? `${(billFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max size: 5MB'}
                  </span>
                </label>
              </div>

              <div className="action-buttons" style={{ marginTop: '24px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('verified')} disabled={uploading || createMutation.isPending}>
                  Cancel
                </button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={() => createMutation.mutate()} disabled={!form.amount || uploading || createMutation.isPending}>
                  {uploading ? 'Uploading receipt...' : createMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
