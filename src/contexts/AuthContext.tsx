import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/format'
import type { Investor } from '@/types/database'

export type SignUpResult = 'session' | 'confirm_email'

interface AuthContextType {
  user: User | null
  session: Session | null
  investor: Investor | null
  loading: boolean
  isAdmin: boolean
  isInvestor: boolean
  isAmbassador: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    kycDetails?: {
      mobile_number: string
      pan_number: string
      aadhaar_number: string
      bank_account_holder: string
      bank_account_number: string
      ifsc_code: string
      bank_name: string
    }
  ) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshInvestor: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureInvestorProfile = async (
    userId: string,
    email: string,
    fullName?: string,
    kycDetails?: {
      mobile_number: string
      pan_number: string
      aadhaar_number: string
      bank_account_holder: string
      bank_account_number: string
      ifsc_code: string
      bank_name: string
    }
  ) => {
    let { data: existing } = await supabase
      .from('decrypted_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const name = fullName || email.split('@')[0]

    if (!existing) {
      const insertPayload: any = {
        user_id: userId,
        full_name: name,
        email,
        avatar_initials: getInitials(name),
      }

      if (kycDetails) {
        insertPayload.mobile_number = kycDetails.mobile_number
        insertPayload.pan_number = kycDetails.pan_number
        insertPayload.aadhaar_number = kycDetails.aadhaar_number
        insertPayload.bank_account_holder = kycDetails.bank_account_holder
        insertPayload.bank_account_number = kycDetails.bank_account_number
        insertPayload.ifsc_code = kycDetails.ifsc_code
        insertPayload.bank_name = kycDetails.bank_name
        insertPayload.kyc_submitted_at = new Date().toISOString()
        insertPayload.kyc_status = 'pending'
      }

      const { data: created, error } = await supabase
        .from('investors')
        .insert(insertPayload)
        .select()
        .single()

      if (created) {
        const { data: decrypted } = await supabase
          .from('decrypted_investors')
          .select('*')
          .eq('id', created.id)
          .single()
        existing = decrypted as Investor
      } else if (error) {
        console.warn('Could not create investor profile:', error.message)
      }
    } else if (kycDetails && !existing.kyc_submitted_at) {
      // Handle the case where auth trigger created basic profile but we have signup KYC details
      const updatePayload: any = {
        mobile_number: kycDetails.mobile_number,
        pan_number: kycDetails.pan_number,
        aadhaar_number: kycDetails.aadhaar_number,
        bank_account_holder: kycDetails.bank_account_holder,
        bank_account_number: kycDetails.bank_account_number,
        ifsc_code: kycDetails.ifsc_code,
        bank_name: kycDetails.bank_name,
        kyc_submitted_at: new Date().toISOString(),
        kyc_status: 'pending'
      }

      const { data: updated, error } = await supabase
        .from('investors')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single()

      if (updated) {
        const { data: decrypted } = await supabase
          .from('decrypted_investors')
          .select('*')
          .eq('id', updated.id)
          .single()
        existing = decrypted as Investor
      } else if (error) {
        console.warn('Could not update investor profile with KYC details:', error.message)
      }
    }

    if (existing) setInvestor(existing as Investor)
    else setInvestor(null)
  }

  const fetchInvestor = async (userId: string, email: string) => {
    let { data: investorData } = await supabase
      .from('decrypted_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!investorData) {
      await ensureInvestorProfile(userId, email)
      const { data: refetched } = await supabase
        .from('decrypted_investors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      investorData = refetched
    }

    if (investorData) setInvestor(investorData as Investor)
    else setInvestor(null)
  }

  const refreshInvestor = async () => {
    if (user) await fetchInvestor(user.id, user.email!)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id, s.user.email!).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id, s.user.email!)
      else setInvestor(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (
    email: string, 
    password: string, 
    fullName: string,
    kycDetails?: {
      mobile_number: string
      pan_number: string
      aadhaar_number: string
      bank_account_holder: string
      bank_account_number: string
      ifsc_code: string
      bank_name: string
    }
  ): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    if (data.user) {
      await ensureInvestorProfile(data.user.id, email, fullName, kycDetails)
      if (data.session) {
        return 'session'
      }
    }

    return 'confirm_email'
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setInvestor(null)
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user, session, investor, loading,
      isAdmin: investor?.role === 'admin',
      isInvestor: investor?.role === 'investor',
      isAmbassador: investor?.role === 'branch_ambassador',
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshInvestor,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
