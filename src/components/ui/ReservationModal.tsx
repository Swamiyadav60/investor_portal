import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { initiatePayment } from '@/lib/razorpay'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import type { College } from '@/types/database'
import { fmt } from '@/lib/format'

interface ReservationModalProps {
  college: College | null
  isOpen: boolean
  onClose: () => void
}

export function ReservationModal({ college, isOpen, onClose }: ReservationModalProps) {
  const [type, setType] = useState<'free' | 'priority'>('priority')
  const [successData, setSuccessData] = useState<{ position: number; isPriority: boolean } | null>(null)
  const { investor } = useAuth()
  const { toast } = useToast()

  const reservationMutation = useMutation({
    mutationFn: async (paymentId: string | null = null) => {
      if (!college || !investor) return

      if (!isSupabaseConfigured) {
        return { position: type === 'priority' ? 1 : Math.floor(Math.random() * 20) + 5, isPriority: type === 'priority' }
      }

      // Call the join_waitlist RPC which handles shifting and positioning
      const { data: pos, error } = await supabase.rpc('join_waitlist', {
        p_investor_id: investor.id,
        p_college_id: college.id,
        p_waitlist_type: type,
        p_payment_id: paymentId,
        p_notes: type === 'priority' ? `Priority Waitlist (Paid ₹499 via Razorpay)` : 'Free Waitlist'
      })

      if (error) throw error

      return { position: pos as number, isPriority: type === 'priority' }
    },
    onSuccess: (data) => {
      if (data) setSuccessData(data)
      toast(type === 'priority' ? 'Priority reservation confirmed!' : 'Added to waitlist.', 'success')
    },
    onError: (err: any) => {
      toast(err.message, 'error')
    }
  })

  const handleReserve = async () => {
    if (type === 'priority') {
      try {
        await initiatePayment({
          amount: 499,
          description: `Priority Waitlist: ${college?.name}`,
          name: investor?.full_name || '',
          email: investor?.email || '',
          onSuccess: (res) => reservationMutation.mutate(res.razorpay_payment_id),
          onDismiss: () => toast('Payment cancelled', 'info')
        })
      } catch (err: any) {
        toast(err.message || 'Payment initiation failed', 'error')
      }
    } else {
      reservationMutation.mutate(null)
    }
  }

  const handleClose = () => {
    setSuccessData(null)
    onClose()
  }

  if (!isOpen || !college) return null

  if (successData) {
    return (
      <div className="admin-modal-overlay" onClick={handleClose} style={{ zIndex: 1000 }}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div className="success-icon-wrap" style={{ background: successData.isPriority ? 'var(--amber-l)' : 'var(--green-l)' }}>
            <svg viewBox="0 0 24 24" className="success-icon" style={{ stroke: successData.isPriority ? 'var(--amber)' : 'var(--green)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="section-title" style={{ fontSize: 20, marginBottom: '0.5rem' }}>
            {successData.isPriority ? 'Payment Successful' : 'Successfully Joined Waitlist'}
          </h2>
          <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>
            {successData.isPriority
              ? `You are now in the Priority Waitlist for ${college.name}`
              : `You are now in queue for ${college.name}`}
          </p>

          <div className="queue-pill" style={{ borderColor: successData.isPriority ? 'var(--amber)' : 'var(--border)' }}>
            <div className="queue-lbl">Your Position</div>
            <div className="queue-val" style={{ color: successData.isPriority ? 'var(--amber)' : 'var(--ink)' }}>
              #{successData.position}
            </div>
            {successData.isPriority && <div className="priority-tag">Priority</div>}
          </div>

          <p style={{ fontSize: 13, color: 'var(--gray)', margin: '1.5rem 0' }}>
            The VPrint team will contact you soon with the next steps for your investment.
          </p>

          <button className="av-invest-btn" onClick={handleClose}>Got it</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="rpt-card-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div className="rpt-card-title" style={{ fontSize: 18 }}>Investor Waitlist</div>
            <div className="rpt-card-sub">{college.name} · {college.city}</div>
          </div>
          <button className="admin-btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        <div className="reservation-options">
          <div
            className={`reservation-option ${type === 'free' ? 'active' : ''}`}
            onClick={() => setType('free')}
          >
            <div className="option-radio" />
            <div style={{ flex: 1 }}>
              <div className="option-title">Free Waitlist</div>
              <div className="option-desc">Join investor queue. Access after priority investors.</div>
            </div>
          </div>

          <div
            className={`reservation-option ${type === 'priority' ? 'active' : ''}`}
            onClick={() => setType('priority')}
          >
            <div className="option-radio" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="option-title">Priority Waitlist</div>
                <div className="option-price">₹499</div>
              </div>
              <div className="option-desc">Jump to the front of queue. Early access to premium slots.</div>
            </div>
            <div className="priority-badge">Recommended</div>
          </div>
        </div>

        <div className="reservation-summary">
          <div className="summary-row">
            <span>Location Investment</span>
            <span>{fmt(college.investment_amount)}</span>
          </div>
          <div className="summary-row">
            <span>Estimated Earnings</span>
            <span style={{ color: 'var(--green)' }}>{fmt(college.avg_monthly_earnings)} /mo</span>
          </div>
        </div>

        <button
          className="av-invest-btn"
          style={{ marginTop: '1.5rem', padding: '12px' }}
          onClick={handleReserve}
          disabled={reservationMutation.isPending}
        >
          {reservationMutation.isPending ? 'Processing...' : type === 'priority' ? 'Pay ₹499 & Reserve' : 'Join Free Waitlist'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray)', marginTop: '1rem' }}>
          By clicking, you agree to Smart Printer Investor Terms & Conditions.
        </p>
      </div>
    </div>
  )
}
