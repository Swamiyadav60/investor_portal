import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { College } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { supabase } from '@/lib/supabase'
import { initiatePayment } from '@/lib/razorpay'
import { useToast } from '@/components/ui/Toast'

// 1. Update the interface
interface InvestorWaitlistModalProps {
  college: College
  isOpen: boolean
  onClose: () => void
  onSuccess?: (collegeId: string) => void  // ← add this line
}



const FEATURES = [
  { label: 'Join investor queue', free: true, priority: true },
  { label: 'Slot confirmation on availability', free: true, priority: true },
  { label: 'Guaranteed access before public launch', free: false, priority: true },
  { label: 'First choice of premium locations', free: false, priority: true },
  { label: 'Dedicated onboarding assistance', free: false, priority: true },
  { label: '₹499 adjusted against final setup fee', free: false, priority: true },
  { label: 'Priority queue position', free: false, priority: true },
  { label: 'Early investment notifications', free: false, priority: true },
]

// 2. Update the function signature
export function InvestorWaitlistModal({ college, isOpen, onClose, onSuccess }: InvestorWaitlistModalProps) {


  const { investor } = useAuth()
  const { toast } = useToast()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [successData, setSuccessData] = useState<{ position: number; type: 'free' | 'priority' } | null>(null)

  const reservationMutation = useMutation({
    mutationFn: async ({ type, paymentId }: { type: 'free' | 'priority'; paymentId: string | null }) => {
      if (!investor) throw new Error('Not authenticated')

      const payload = {
        p_investor_id: investor.id,
        p_college_id: college.id,
        p_waitlist_type: type,
        p_payment_id: paymentId,
        p_notes: type === 'priority' ? 'Priority Waitlist (Paid ₹499 via Razorpay)' : 'Free Waitlist'
      }

      console.log('RPC Payload', {
        collegeId: college.id,
        userId: investor.id,
        type,
        paymentId
      })

      const { data: pos, error } = await supabase.rpc('join_waitlist', payload)
      if (error) throw error
      return { position: pos as number, type }
    },
    //3. In reservationMutation, update onSuccess:
    onSuccess: (data) => {
      setSuccessData(data)
      onSuccess?.(college.id)   // ← add this line
    },
    onError: (err: any) => {
      toast(err.message, 'error')
    }
  })

  const handleAction = async (type: 'free' | 'priority') => {
    if (!investor) {
      setShowAuthModal(true)
      return
    }

    if (type === 'priority') {
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!razorpayKey) {
        toast('Configuration error: Payment not available', 'error')
        return
      }
      try {
        await initiatePayment({
          amount: 499,
          description: `Priority Waitlist: ${college.name}`,
          name: investor.full_name || '',
          email: investor.email || '',
          onSuccess: (res) => reservationMutation.mutate({ type, paymentId: res.razorpay_payment_id }),
          onDismiss: () => toast('Payment cancelled', 'info')
        })
      } catch (err: any) {
        toast(err.message || 'Payment initiation failed', 'error')
      }
    } else {
      reservationMutation.mutate({ type, paymentId: null })
    }
  }

  const handleClose = () => {
    setSuccessData(null)
    onClose()
  }

  if (!isOpen) return null

  // ─── Success State ───────────────────────────────
  if (successData) {
    const isPriority = successData.type === 'priority'
    return (
      <div className="wl-overlay" onClick={handleClose}>
        <div className="wl-modal wl-modal--success" onClick={(e) => e.stopPropagation()}>
          {/* Success icon */}
          <div className={`wl-success-icon-ring ${isPriority ? 'wl-success-icon-ring--gold' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="wl-success-title">
            {isPriority ? 'Priority Access Confirmed' : 'Successfully Joined Waitlist'}
          </h2>
          <p className="wl-success-sub">
            {isPriority
              ? `You've secured a priority position for ${college.name}. Our team will reach out within 48 hours.`
              : `You're now in queue for ${college.name}. We'll notify you when a slot opens up.`}
          </p>

          <div className={`wl-position-card ${isPriority ? 'wl-position-card--gold' : ''}`}>
            <span className="wl-position-label">Your Queue Position</span>
            <span className="wl-position-number">#{successData.position}</span>
            {isPriority && <span className="wl-position-badge">Priority</span>}
          </div>

          <button className="wl-btn wl-btn--primary wl-btn--full" onClick={handleClose}>
            Got it
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Comparison Modal ───────────────────────
  return (
    <>
      <div className="wl-overlay" onClick={onClose}>
        <div className="wl-modal wl-modal--comparison" onClick={(e) => e.stopPropagation()}>

          {/* Close button */}
          <button className="wl-close-btn" onClick={onClose} aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* ─── Header ─── */}
          <div className="wl-header">
            <span className="wl-header-label">INVESTOR WAITLIST</span>
            <h2 className="wl-header-title">Choose your access level</h2>
            <p className="wl-header-sub">
              Both options let you join. Priority gives you guaranteed early access and a reserved slot before the public launch.
            </p>
          </div>

          {/* ─── Scrollable Body ─── */}
          <div className="wl-body">

            {/* ─── Table Header ─── */}
            <div className="wl-table">
              <div className="wl-table-head">
                <div className="wl-th wl-th--feature">Feature</div>
                <div className="wl-th wl-th--free">Free Waitlist</div>
                <div className="wl-th wl-th--priority">
                  <span className="wl-most-popular-badge">Most Popular</span>
                  <span className="wl-th-priority-icon">★</span> Priority Waitlist
                </div>
              </div>

              {/* ─── Table Rows ─── */}
              <div className="wl-table-body">
                {FEATURES.map((row, i) => (
                  <div className="wl-tr" key={i}>
                    <div className="wl-td wl-td--feature">{row.label}</div>
                    <div className="wl-td wl-td--free">
                      {row.free ? (
                        <svg className="wl-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="wl-dash">—</span>
                      )}
                    </div>
                    <div className="wl-td wl-td--priority">
                      {row.priority ? (
                        <svg className="wl-check wl-check--gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="wl-dash">—</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Queue position row */}
                <div className="wl-tr">
                  <div className="wl-td wl-td--feature">Queue position</div>
                  <div className="wl-td wl-td--free">
                    <span className="wl-queue-text">After priority members</span>
                  </div>
                  <div className="wl-td wl-td--priority">
                    <span className="wl-queue-text wl-queue-text--gold">Front of queue</span>
                  </div>
                </div>

                {/* Cost row */}
                <div className="wl-tr wl-tr--last">
                  <div className="wl-td wl-td--feature">Cost to join</div>
                  <div className="wl-td wl-td--free">
                    <span className="wl-cost-free">Free</span>
                  </div>
                  <div className="wl-td wl-td--priority">
                    <span className="wl-cost-paid">₹499 <span className="wl-cost-note">(non-refundable)</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Sticky CTA Footer ─── */}
          <div className="wl-footer">
            <div className="wl-footer-actions">
              <button
                className="wl-btn wl-btn--secondary"
                onClick={() => handleAction('free')}
                disabled={reservationMutation.isPending}
              >
                {reservationMutation.isPending ? (
                  <span className="wl-btn-spinner" />
                ) : null}
                Join Free Waitlist
              </button>
              <button
                className="wl-btn wl-btn--gold"
                onClick={() => handleAction('priority')}
                disabled={reservationMutation.isPending}
              >
                {reservationMutation.isPending ? (
                  <span className="wl-btn-spinner" />
                ) : (
                  <svg className="wl-btn-star" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                )}
                Get Priority Access — ₹499
              </button>
            </div>
            <p className="wl-footer-note">
              ₹499 is non-refundable and will be adjusted against your slot setup fee on confirmation.
            </p>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  )
}
