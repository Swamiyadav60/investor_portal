import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { NotificationPrefs } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { maskPan, maskAadhaar, maskBankAccount } from '@/lib/format'

const NOTIF_LABELS: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
  { key: 'job_alerts', label: 'Job completed alerts', sub: 'Notify on every print job' },
  { key: 'daily_summary', label: 'Daily summary', sub: 'End-of-day earnings digest' },
  { key: 'monthly_payout', label: 'Monthly payout', sub: 'When payout is processed' },
  { key: 'maintenance_alerts', label: 'Maintenance alerts', sub: 'Ink / paper low warnings' },
  { key: 'new_slots', label: 'New slot availability', sub: 'Open investment slots nearby' },
]

export function ProfilePage() {
  const { investor, refreshInvestor } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    phone: investor?.phone || '',
    city: investor?.city || '',
    gst: investor?.gst || 'Not added',
    upi_id: investor?.upi_id || '',
  })
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    investor?.notification_prefs || {
      job_alerts: false, daily_summary: true,
      monthly_payout: true, maintenance_alerts: true, new_slots: false,
    }
  )

  useEffect(() => {
    if (investor) {
      setForm({
        phone: investor.phone || '',
        city: investor.city || '',
        gst: investor.gst || 'Not added',
        upi_id: investor.upi_id || '',
      })
      setPrefs(investor.notification_prefs || {
        job_alerts: false, daily_summary: true,
        monthly_payout: true, maintenance_alerts: true, new_slots: false,
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
        notification_prefs: prefs,
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
              <span className="kyc-badge verified" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Verified Information
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
              <span className="kyc-badge verified" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Verified Information
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

          {/* 4. Notification preferences */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Notification preferences</div>
            </div>
            {NOTIF_LABELS.map((n) => (
              <div key={n.key} className="notif-row">
                <div>
                  <div className="notif-label">{n.label}</div>
                  <div className="notif-sub">{n.sub}</div>
                </div>
                <label className="toggle-wrap">
                  <input
                    type="checkbox"
                    checked={prefs[n.key]}
                    onChange={(e) => setPrefs({ ...prefs, [n.key]: e.target.checked })}
                    disabled={!editing}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
            {!editing && (
              <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.75rem' }}>
                Click 'Edit' in Contact & Preferences to change notifications.
              </div>
            )}
          </div>

        </div>

        {/* Account actions — always full width */}
        <div className="rpt-card" style={{ borderColor: '#FBBABA' }}>
          <div className="rpt-card-title" style={{ color: 'var(--red)', marginBottom: '.75rem' }}>
            Account actions
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="danger-btn" onClick={() => toast('Support team will contact you.', 'info')}>
              Request slot transfer
            </button>
            <button className="danger-btn" onClick={() => toast('Support team will contact you.', 'info')}>
              Close investor account
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: '.75rem' }}>
            These actions require verification and are processed by the Smart Printer support team.
          </div>
        </div>

      </div>
    </>
  )
}