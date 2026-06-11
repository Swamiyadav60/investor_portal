import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { College } from '@/types/database'
import { fmt } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { supabase } from '@/lib/supabase'
import { initiatePayment } from '@/lib/razorpay'
import { useToast } from '@/components/ui/Toast'

interface InvestorWaitlistModalProps {
  college: College
  isOpen: boolean
  onClose: () => void
}

export function InvestorWaitlistModal({ college, isOpen, onClose }: InvestorWaitlistModalProps) {
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
      console.log('RPC payload:', payload)

      const { data: pos, error } = await supabase.rpc('join_waitlist', payload)

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }
      return { position: pos as number, type }
    },
    onSuccess: (data) => {
      setSuccessData(data)
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
        console.error('Razorpay key missing')
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

  if (successData) {
    return (
      <div className="admin-modal-overlay" onClick={handleClose} style={{ zIndex: 1000 }}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center', padding: '2.5rem' }}>
          <h2 className="section-title">Reservation Submitted</h2>
          <p className="section-subtitle">Your reservation has been recorded. The VPrint team will contact you soon regarding this location.</p>
          <div className="queue-pill" style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid var(--border)' }}>
            <div>Type: {successData.type === 'priority' ? 'Priority' : 'Free'}</div>
            <div>Position: #{successData.position}</div>
            <div>Location: {college.name}</div>
          </div>
          <button className="av-invest-btn" onClick={handleClose}>Got it</button>
        </div>
      </div>
    )
  }

  const comparisonRows = [
    { label: 'Join investor queue', free: true, priority: true },
    { label: 'Location reservation eligibility', free: true, priority: true },
    { label: 'Queue position visibility', free: false, priority: true },
    { label: 'Priority access', free: false, priority: true },
    { label: 'Dedicated onboarding', free: false, priority: true },
    { label: 'First access to allocations', free: false, priority: true },
    { label: '₹499 adjusted against fee', free: false, priority: true },
    { label: 'Dashboard access', free: true, priority: true },
  ]

  return (
    <>
      <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
          {/* Header */}
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)' }}>
            <h2 className="section-title" style={{ fontSize: 24, marginBottom: '0.5rem' }}>Investor Waitlist</h2>
            <p className="section-subtitle" style={{ fontSize: 16 }}>Choose how you want to reserve this location: <strong>{college.name}</strong></p>
          </div>

          {/* Comparison Table */}
          <div className="comparison-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '2rem', gap: '1rem' }}>
            <div style={{ alignSelf: 'center', color: 'var(--gray)', fontWeight: 500 }}>Feature</div>
            <div style={{ textAlign: 'center', fontWeight: 600 }}>Free Waitlist</div>
            <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--amber)' }}>Priority Waitlist</div>

            {comparisonRows.map((row) => (
              <div key={row.label} style={{ display: 'contents' }}>
                <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>{row.label}</div>
                <div style={{ textAlign: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>{row.free ? '✓' : '—'}</div>
                <div style={{ textAlign: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)', color: 'var(--amber)' }}>{row.priority ? '✓' : '—'}</div>
              </div>
            ))}
          </div>

          {/* Footer CTAs */}
          <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: 'var(--bg-subtle)' }}>
            <button className="admin-btn-secondary" onClick={() => handleAction('free')}>Free Waitlist</button>
            <button className="av-invest-btn" style={{ background: 'var(--amber)', color: 'var(--white)', border: 'none' }} onClick={() => handleAction('priority')}>₹499 Priority Access</button>
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
