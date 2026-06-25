import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { maskPan, maskAadhaar, maskBankAccount } from '@/lib/format'


export function ProfilePage() {
  const { investor, refreshInvestor } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false)
  const [form, setForm] = useState({
    phone: investor?.phone || '',
    city: investor?.city || '',
    gst: investor?.gst || 'Not added',
    upi_id: investor?.upi_id || '',
  })

  useEffect(() => {
    if (investor) {
      setForm({
        phone: investor.phone || '',
        city: investor.city || '',
        gst: investor.gst || 'Not added',
        upi_id: investor.upi_id || '',
      })
    }
  }, [investor])

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    })
  }

  const handleSave = async () => {
    if (isSupabaseConfigured && investor) {
      const payload = {
        phone: form.phone,
        city: form.city,
        gst: form.gst,
        upi_id: form.upi_id,
      }

      const { error } = await supabase
        .from('investors')
        .update(payload)
        .eq('id', investor.id)

      if (error) {
        toast('Error saving profile: ' + error.message, 'error')
        return
      }

      await refreshInvestor()
      setEditing(false)
      toast('Profile updated successfully.', 'success')
    }
  }

  return (
    <>
      <Topbar title="Profile" />
      <div className="page-view content">
        
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text)' }}>
          To update PAN, Aadhaar, Mobile Number, or Bank Details, please contact VPrint Support.
        </div>

        <div className="profile-grid">

          {/* 1. Verified Personal Information */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Verified Personal Information</div>
              <span
                    className={`kyc-badge ${
                    investor?.kyc_status === 'verified'
                    ? 'verified'
                    : investor?.kyc_status === 'rejected'
                    ? 'rejected'
                    : 'pending'
                  }`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>

               {investor?.kyc_status === 'verified'
                ? 'Verified Information'
                : investor?.kyc_status === 'rejected'
                ? 'KYC Rejected'
                : 'KYC Pending'}
              </span>
            </div>
            
            <div className="prof-avatar-row">
              <div className="prof-avatar">{investor?.avatar_initials || 'VP'}</div>
              <div>
                <div className="prof-name">{investor?.full_name}</div>
                <div className="prof-since">Investor since {formatDate(investor?.created_at)}</div>
              </div>
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">Email</span>
              <span className="prof-field-val">{investor?.email}</span>
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">Mobile Number</span>
              <span className="prof-field-val">{investor?.mobile_number || 'Not provided'}</span>
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">PAN Number</span>
              <span className="prof-field-val">{maskPan(investor?.pan_number)}</span>
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">Aadhaar Number</span>
              <span className="prof-field-val">{maskAadhaar(investor?.aadhaar_number)}</span>
            </div>
          </div>

          {/* 2. Verified Bank Information */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Verified Bank Information</div>
              <span className={`kyc-badge ${
                investor?.kyc_status === 'verified'
                ? 'verified'
                : investor?.kyc_status === 'rejected'
                ? 'rejected'
                : 'pending'
              }`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>

              {investor?.kyc_status === 'verified'
              ? 'Verified Information'
              : investor?.kyc_status === 'rejected'
              ? 'KYC Rejected'
              : 'KYC Pending'}
            </span>
            </div>

            <div className="bank-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '0.75rem' }}>
              <span className="bank-row-lbl">Account Holder Name</span>
              <span className="bank-row-val">{investor?.bank_account_holder || 'Not provided'}</span>
            </div>

            <div className="bank-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '0.75rem' }}>
              <span className="bank-row-lbl">Bank Name</span>
              <span className="bank-row-val">{investor?.bank_name || 'Not provided'}</span>
            </div>

            <div className="bank-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '0.75rem' }}>
              <span className="bank-row-lbl">Account Number</span>
              <span className="bank-row-val">{maskBankAccount(investor?.bank_account_number)}</span>
            </div>

            <div className="bank-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginBottom: '0.75rem' }}>
              <span className="bank-row-lbl">IFSC Code</span>
              <span className="bank-row-val">{investor?.ifsc_code || 'Not provided'}</span>
            </div>
          </div>

          {/* 3. Contact & Preferences (Editable) */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Contact & Preferences</div>
              <button className="rpt-export-btn" onClick={() => setEditing(!editing)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">Alternative Phone</span>
              {editing ? (
                <input
                  className="prof-field-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              ) : (
                <span className="prof-field-val">{investor?.phone || 'Not provided'}</span>
              )}
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">City</span>
              {editing ? (
                <input
                  className="prof-field-input"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                />
              ) : (
                <span className="prof-field-val">{investor?.city || 'Not provided'}</span>
              )}
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">GST (Optional)</span>
              {editing ? (
                <input
                  className="prof-field-input"
                  value={form.gst}
                  onChange={(e) => setForm({ ...form, gst: e.target.value })}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              ) : (
                <span className="prof-field-val">{investor?.gst || 'Not added'}</span>
              )}
            </div>

            <div className="prof-field">
              <span className="prof-field-lbl">UPI ID</span>
              {editing ? (
                <input
                  className="prof-field-input"
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                  placeholder="e.g. ramesh@okaxis"
                />
              ) : (
                <span className="prof-field-val">{investor?.upi_id || 'Not provided'}</span>
              )}
            </div>
            
            {editing && (
              <button className="prof-save-btn" onClick={handleSave} style={{ marginTop: '1rem' }}>
                Save changes
              </button>
            )}
          </div>

        </div>

        {/* Account actions — always full width */}
        <div className="rpt-card" style={{ borderColor: '#FBBABA' }}>
          <div className="rpt-card-title" style={{ color: 'var(--red)', marginBottom: '.75rem' }}>
            Account actions
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="danger-btn" onClick={() => setShowTransferModal(true)}>
              Request slot transfer
            </button>
            <button className="danger-btn" onClick={() => setShowCloseAccountModal(true)}>
              Close investor account
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem' }}>
            These actions require verification and are processed by the Smart Printer support team.
          </div>
        </div>

      </div>

      {showTransferModal && (
        <div className="admin-modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>Request Slot Transfer</div>
            <div style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              To initiate a slot transfer, please contact our support team. We'll verify your request and guide you through the process.
            </div>
            
            <div style={{ padding: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '24px' }}>📞</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>+91 81436 32036</div>
                <div style={{ fontSize: '13px', color: 'var(--gray)' }}>Smart Printer Support</div>
                <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '2px' }}>Mon – Sat, 10am – 6pm</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href="tel:+918143632036" 
                className="public-nav-btn-primary" 
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
              >
                Call Now
              </a>
              <button 
                className="admin-btn admin-btn-secondary" 
                onClick={() => setShowTransferModal(false)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gray)', marginTop: '1rem' }}>
              You can also WhatsApp us on the same number.
            </div>
          </div>
        </div>
      )}
      {showCloseAccountModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCloseAccountModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="rpt-card-title" style={{ marginBottom: '1rem' }}>Close Investor Account</div>
            <div style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Closing your account is a permanent action and requires manual verification by our team. Please contact us directly to proceed.
            </div>
            
            <div style={{ padding: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '24px' }}>📞</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>+91 81436 32036</div>
                <div style={{ fontSize: '13px', color: 'var(--gray)' }}>Smart Printer Support</div>
                <div style={{ fontSize: '12px', color: 'var(--gray)', marginTop: '2px' }}>Mon – Sat, 10am – 6pm</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href="tel:+918143632036" 
                className="public-nav-btn-primary" 
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
              >
                Call Now
              </a>
              <button 
                className="admin-btn admin-btn-secondary" 
                onClick={() => setShowCloseAccountModal(false)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--red)', marginTop: '1.25rem', fontWeight: 500, background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
              ⚠️ This action is irreversible. Our team will verify your identity before processing the request.
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gray)', marginTop: '1rem' }}>
              You can also WhatsApp us on the same number.
            </div>
          </div>
        </div>
      )}
    </>
  )
}