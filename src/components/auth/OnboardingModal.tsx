import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'

interface OnboardingModalProps {
  prefillName?: string
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

export function OnboardingModal({ prefillName }: OnboardingModalProps) {
  const { user, updateInvestorProfile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Step 1 Form States
  const [dob, setDob] = useState('')
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')

  // Step 2 Form States
  const [pan, setPan] = useState('')
  const [aadhaar, setAadhaar] = useState('')
  const [bankHolder, setBankHolder] = useState(prefillName || user?.user_metadata?.full_name || '')
  const [bankAccNumber, setBankAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [bankName, setBankName] = useState('')

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Format Aadhaar: XXXX XXXX XXXX
  const handleAadhaarChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 12)
    let formatted = ''
    for (let i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' '
      }
      formatted += clean[i]
    }
    setAadhaar(formatted)
  }

  // Validations
  const errors = useMemo(() => {
    const errs: Record<string, string> = {}

    if (step === 1) {
      if (!dob) {
        errs.dob = 'Date of birth is required.'
      } else {
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        if (age < 18) {
          errs.dob = 'You must be at least 18 years old.'
        }
      }

      if (!address.trim()) {
        errs.address = 'Complete address is required.'
      }

      if (!state) {
        errs.state = 'Please select a state.'
      }

      if (!pincode.trim()) {
        errs.pincode = 'Pincode is required.'
      } else if (!/^\d{6}$/.test(pincode.trim())) {
        errs.pincode = 'Pincode must be exactly 6 digits.'
      }
    }

    if (step === 2) {
      const cleanPan = pan.trim().toUpperCase()
      if (!cleanPan) {
        errs.pan = 'PAN number is required.'
      } else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
        errs.pan = 'Invalid PAN format. e.g. ABCDE1234F'
      }

      const cleanAadhaar = aadhaar.replace(/\s+/g, '')
      if (!cleanAadhaar) {
        errs.aadhaar = 'Aadhaar number is required.'
      } else if (!/^\d{12}$/.test(cleanAadhaar)) {
        errs.aadhaar = 'Aadhaar number must be exactly 12 digits.'
      }

      if (!bankHolder.trim()) {
        errs.bankHolder = 'Account holder name is required.'
      }

      const cleanAcc = bankAccNumber.trim()
      if (!cleanAcc) {
        errs.bankAccNumber = 'Bank account number is required.'
      } else if (!/^\d{9,18}$/.test(cleanAcc)) {
        errs.bankAccNumber = 'Invalid bank account number.'
      }

      const cleanIfsc = ifsc.trim().toUpperCase()
      if (!cleanIfsc) {
        errs.ifsc = 'IFSC code is required.'
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        errs.ifsc = 'Invalid IFSC format. e.g. HDFC0000123'
      }

      if (!bankName.trim()) {
        errs.bankName = 'Bank name is required.'
      }
    }

    return errs
  }, [step, dob, address, state, pincode, pan, aadhaar, bankHolder, bankAccNumber, ifsc, bankName])

  const isStep1Valid = !errors.dob && !errors.address && !errors.state && !errors.pincode
  const isStep2Valid = !errors.pan && !errors.aadhaar && !errors.bankHolder && !errors.bankAccNumber && !errors.ifsc && !errors.bankName

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ dob: true, address: true, state: true, pincode: true })
    if (isStep1Valid) {
      setStep(2)
      setTouched({})
    } else {
      toast('Please correct the errors in Step 1.', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({
      pan: true,
      aadhaar: true,
      bankHolder: true,
      bankAccNumber: true,
      ifsc: true,
      bankName: true,
    })

    if (!isStep2Valid) {
      toast('Please correct the errors in Step 2.', 'error')
      return
    }

    setLoading(true)
    setError('')
    try {
      await updateInvestorProfile({
        dob,
        address: address.trim(),
        state,
        pincode: pincode.trim(),
        pan_number: pan.trim().toUpperCase(),
        aadhaar_number: aadhaar.replace(/\s+/g, ''),
        bank_account_holder: bankHolder.trim(),
        bank_account_number: bankAccNumber.trim(),
        ifsc_code: ifsc.trim().toUpperCase(),
        bank_name: bankName.trim(),
        kyc_completed: true,
        bank_completed: true,
        profile_completed: true,
      })

      setSuccess(true)
      toast('Onboarding completed! Welcome to Smart Printer Portal.', 'success')
      
      // Delay to show checkmark/confetti animation
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit onboarding details. Please try again.')
      toast('Submission failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="admin-modal-overlay" style={{ zIndex: 1000 }}>
      <div className="onboarding-card" style={{ maxWidth: step === 1 ? 520 : 640 }}>
        {/* Onboarding Header */}
        <div className="onboarding-header">
          <div className="auth-logo">
            <div className="sidebar-logo-dot" />
            <div>
              <div className="sidebar-logo-text" style={{ color: 'var(--ink)' }}>Smart Printer</div>
              <div className="sidebar-logo-sub">Portal</div>
            </div>
          </div>
          
          <button className="onboarding-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>

        <div className="auth-title">Complete your profile</div>
        <div className="auth-sub">Just a few more details to set up your account</div>

        {/* Progress Bar & Step Indicators */}
        <div className="onboarding-steps">
          <div className={`onboarding-step ${step >= 1 ? 'active' : ''} ${success ? 'completed' : ''}`}>
            <span className="step-number">{step > 1 || success ? '✓' : '1'}</span>
            <span className="step-label">Personal Info</span>
          </div>
          <div className="onboarding-step-line-wrap">
            <div className={`onboarding-step-line ${step === 2 || success ? 'filled' : ''}`} />
          </div>
          <div className={`onboarding-step ${step === 2 ? 'active' : ''} ${success ? 'completed' : ''}`}>
            <span className="step-number">{success ? '✓' : '2'}</span>
            <span className="step-label">KYC & Bank Details</span>
          </div>
        </div>

        {error && <div className="auth-error mt-4 mb-2">{error}</div>}

        {success ? (
          <div className="onboarding-success">
            <div className="success-checkmark-circle">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>All set!</h3>
            <p>Your profile has been successfully completed. Redirecting to dashboard...</p>
          </div>
        ) : step === 1 ? (
          /* STEP 1: PERSONAL DETAILS */
          <form onSubmit={handleNext} className="onboarding-form">
            <div className="form-grid-2">
              {/* DOB */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-dob">
                  Date of Birth <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-dob"
                  type="date"
                  className={`auth-input signup-input ${touched.dob && errors.dob ? 'input-error' : ''}`}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, dob: true }))}
                />
                {touched.dob && errors.dob && <span className="signup-error-msg">{errors.dob}</span>}
              </div>

              {/* Pincode */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-pincode">
                  Pincode <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-pincode"
                  type="text"
                  placeholder="e.g. 560001"
                  maxLength={6}
                  className={`auth-input signup-input ${touched.pincode && errors.pincode ? 'input-error' : ''}`}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => setTouched(p => ({ ...p, pincode: true }))}
                />
                {touched.pincode && errors.pincode && <span className="signup-error-msg">{errors.pincode}</span>}
              </div>
            </div>

            {/* Address */}
            <div className="signup-field">
              <label className="signup-label" htmlFor="ob-address">
                Complete Address <span className="signup-required">*</span>
              </label>
              <textarea
                id="ob-address"
                rows={2}
                placeholder="e.g. Apartment, Street name, Area"
                className={`auth-input signup-input ${touched.address && errors.address ? 'input-error' : ''}`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, address: true }))}
                style={{ resize: 'vertical', minHeight: 60 }}
              />
              {touched.address && errors.address && <span className="signup-error-msg">{errors.address}</span>}
            </div>

            {/* State */}
            <div className="signup-field">
              <label className="signup-label" htmlFor="ob-state">
                State <span className="signup-required">*</span>
              </label>
              <select
                id="ob-state"
                className={`auth-input signup-input ${touched.state && errors.state ? 'input-error' : ''}`}
                value={state}
                onChange={(e) => setState(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, state: true }))}
              >
                <option value="">Select your state</option>
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {touched.state && errors.state && <span className="signup-error-msg">{errors.state}</span>}
            </div>

            <div className="onboarding-actions">
              <button
                type="submit"
                className="auth-btn btn-primary"
                disabled={!isStep1Valid}
              >
                Continue
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginLeft: 6 }}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: KYC & BANK DETAILS */
          <form onSubmit={handleSubmit} className="onboarding-form">
            <div className="form-grid-2">
              {/* PAN Number */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-pan">
                  PAN Number <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-pan"
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  className={`auth-input signup-input ${touched.pan && errors.pan ? 'input-error' : ''}`}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  onBlur={() => setTouched(p => ({ ...p, pan: true }))}
                  style={{ textTransform: 'uppercase' }}
                />
                {touched.pan && errors.pan && <span className="signup-error-msg">{errors.pan}</span>}
              </div>

              {/* Aadhaar Number */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-aadhaar">
                  Aadhaar Number <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-aadhaar"
                  type="text"
                  placeholder="e.g. 1234 5678 9012"
                  className={`auth-input signup-input ${touched.aadhaar && errors.aadhaar ? 'input-error' : ''}`}
                  value={aadhaar}
                  onChange={(e) => handleAadhaarChange(e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, aadhaar: true }))}
                />
                {touched.aadhaar && errors.aadhaar && <span className="signup-error-msg">{errors.aadhaar}</span>}
              </div>
            </div>

            <div className="onboarding-divider">Bank Account Details</div>

            <div className="form-grid-2">
              {/* Account Holder Name */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-bankholder">
                  Account Holder Name <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-bankholder"
                  type="text"
                  placeholder="Name as in bank record"
                  className={`auth-input signup-input ${touched.bankHolder && errors.bankHolder ? 'input-error' : ''}`}
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, bankHolder: true }))}
                />
                {touched.bankHolder && errors.bankHolder && <span className="signup-error-msg">{errors.bankHolder}</span>}
              </div>

              {/* Bank Name */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-bankname">
                  Bank Name <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-bankname"
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  className={`auth-input signup-input ${touched.bankName && errors.bankName ? 'input-error' : ''}`}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, bankName: true }))}
                />
                {touched.bankName && errors.bankName && <span className="signup-error-msg">{errors.bankName}</span>}
              </div>

              {/* Account Number */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-bankacc">
                  Account Number <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-bankacc"
                  type="text"
                  placeholder="Bank account number"
                  maxLength={18}
                  className={`auth-input signup-input ${touched.bankAccNumber && errors.bankAccNumber ? 'input-error' : ''}`}
                  value={bankAccNumber}
                  onChange={(e) => setBankAccNumber(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => setTouched(p => ({ ...p, bankAccNumber: true }))}
                />
                {touched.bankAccNumber && errors.bankAccNumber && <span className="signup-error-msg">{errors.bankAccNumber}</span>}
              </div>

              {/* IFSC Code */}
              <div className="signup-field">
                <label className="signup-label" htmlFor="ob-ifsc">
                  IFSC Code <span className="signup-required">*</span>
                </label>
                <input
                  id="ob-ifsc"
                  type="text"
                  placeholder="e.g. HDFC0000123"
                  maxLength={11}
                  className={`auth-input signup-input ${touched.ifsc && errors.ifsc ? 'input-error' : ''}`}
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  onBlur={() => setTouched(p => ({ ...p, ifsc: true }))}
                  style={{ textTransform: 'uppercase' }}
                />
                {touched.ifsc && errors.ifsc && <span className="signup-error-msg">{errors.ifsc}</span>}
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="auth-btn-outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="auth-btn btn-primary"
                disabled={!isStep2Valid || loading}
              >
                {loading ? 'Submitting...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
