import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { NotificationPrefs } from '@/types/database'
import { useToast } from '@/components/ui/Toast'

const KYC_DOCS = [
  { name: 'PAN Card', status: 'ok' },
  { name: 'Aadhaar Card', status: 'ok' },
  { name: 'Bank statement', status: 'ok' },
  { name: 'GST Certificate', status: 'pending' },
]

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
    full_name: investor?.full_name || '',
    email: investor?.email || '',
    phone: investor?.phone || '',
    city: investor?.city || '',
    pan: investor?.pan || '',
    gst: investor?.gst || 'Not added',
  })
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    investor?.notification_prefs || {
      job_alerts: false, daily_summary: true,
      monthly_payout: true, maintenance_alerts: true, new_slots: false,
    }
  )
  const formatDate = (date?: string) => {
  if (!date) return 'N/A'

  return new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

  const handleSave = async () => {
    if (isSupabaseConfigured && investor) {
      await supabase.from('investors').update({
        full_name: form.full_name, phone: form.phone,
        city: form.city, pan: form.pan, gst: form.gst,
        notification_prefs: prefs,
      }).eq('id', investor.id)
      await refreshInvestor()
    }
    setEditing(false)
    toast('Profile updated successfully.', 'success')
  }

  const fields = [
    { lbl: 'Full name', key: 'full_name' as const },
    { lbl: 'Email', key: 'email' as const },
    { lbl: 'Phone', key: 'phone' as const },
    { lbl: 'City', key: 'city' as const },
    { lbl: 'PAN', key: 'pan' as const },
    { lbl: 'GST (opt.)', key: 'gst' as const },
  ]

  return (
    <>
      <Topbar title="Profile" />
      <div className="page-view content">

        {/*
          Desktop: 2-column grid
            Row 1 → Personal info | KYC & docs
            Row 2 → Bank details  | Notifications
          Mobile: 1-column
            Personal info → KYC → Bank → Notifications
        */}
        <div className="profile-grid">

          {/* 1. Personal information */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Personal information</div>
              <button className="rpt-export-btn" onClick={() => setEditing(!editing)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            </div>
            <div className="prof-avatar-row">
              <div className="prof-avatar">{investor?.avatar_initials || 'VP'}</div>
              <div>
                <div className="prof-name">{investor?.full_name}</div>
                <div className="prof-since">Investor since {formatDate(investor?.created_at)}</div>
              </div>
            </div>
            {fields.map((f) => (
              <div key={f.key} className="prof-field">
                <span className="prof-field-lbl">{f.lbl}</span>
                {editing ? (
                  <input
                    className="prof-field-input"
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    disabled={f.key === 'email'}
                  />
                ) : (
                  <span className="prof-field-val">{form[f.key]}</span>
                )}
              </div>
            ))}
            {editing && (
              <button className="prof-save-btn" onClick={handleSave}>Save changes</button>
            )}
          </div>

          {/* 2. KYC & documents */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">KYC & documents</div>
              <span className={`kyc-badge ${investor?.kyc_status === 'verified' ? 'verified' : 'pending'}`}>
                {investor?.kyc_status === 'verified' ? '✓ Verified' : 'Pending'}
              </span>
            </div>
            {KYC_DOCS.map((d) => (
              <div key={d.name} className="kyc-doc-item">
                <div className="kyc-doc-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="kyc-doc-name">{d.name}</div>
                <span className={`kyc-doc-status ${d.status}`}>
                  {d.status === 'ok' ? '✓ Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          {/* 3. Payout bank details */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="rpt-card-title">Payout bank details</div>
            </div>
            {[
               { l: 'Bank name', v: investor?.bank_name || 'Not provided' },
               { l: 'Account no.', v: investor?.bank_account || 'Not provided' },
               { l: 'IFSC code', v: investor?.bank_ifsc || 'Not provided' },
               { l: 'UPI ID', v: investor?.upi_id || 'Not provided' },
              ].map((r) => (
              <div key={r.l} className="bank-row">
                <span className="bank-row-lbl">{r.l}</span>
                <span className="bank-row-val">{r.v}</span>
              </div>
            ))}
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
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
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