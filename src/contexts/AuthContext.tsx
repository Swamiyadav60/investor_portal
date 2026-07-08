import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User as AuthUser, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getInitials } from '@/lib/format'
import type { User as UserProfile, UserRole } from '@/types/database'

export type SignUpResult = 'session' | 'confirm_email'

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  investor: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isInvestor: boolean
  isAmbassador: boolean
  signInWithEmail: (email: string, password: string, expectedRole?: UserRole) => Promise<UserProfile | null>
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshInvestor: () => Promise<void>
  checkEmailVerified: () => Promise<boolean>
  updateInvestorProfile: (data: Record<string, unknown>) => Promise<void>
  loginAsDemo: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Fields on the profile shape that actually live on public.user_kyc
// (everything else that's persistable lives on public.users)
const KYC_FIELDS = new Set([
  'mobile_number', 'pan_number', 'aadhaar_number', 'dob', 'address', 'city',
  'state', 'pincode', 'bank_account_holder', 'bank_account_number', 'ifsc_code',
  'bank_name', 'bank_account_type', 'kyc_status', 'kyc_submitted_at',
])

// Fields with no backing column in the schema. Kept on the in-memory
// profile object (with sane defaults) so existing UI doesn't break, but
// they are NOT persisted anywhere.
const UNPERSISTED_DEFAULTS = {
  pan: null as string | null,
  gst: null as string | null,
  profit_share: 70,
  notification_prefs: {
    job_alerts: false,
    daily_summary: true,
    monthly_payout: true,
    maintenance_alerts: true,
    new_slots: false,
  },
}

async function buildProfileFromDb(userId: string): Promise<UserProfile | null> {
  const [{ data: userRow }, { data: roleRows }, { data: kycRow }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('*').eq('user_id', userId),
    supabase.from('decrypted_user_kyc').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (!userRow) return null

  // Prefer admin, then branch_owner, then branch if a user somehow has multiple rows.
  const roles = (roleRows || []) as { role: UserRole; branch_id: string | null }[]
  const bestRole =
    roles.find(r => r.role === 'admin') ||
    roles.find(r => r.role === 'branch_owner') ||
    roles.find(r => r.role === 'branch') ||
    null

  const role: UserRole = bestRole?.role ?? 'branch_owner'
  const kycCompleted = !!(kycRow?.pan_number && kycRow?.aadhaar_number)
  const bankCompleted = !!(kycRow?.bank_account_number && kycRow?.ifsc_code)
  const profileCompleted = !!(userRow.full_name && userRow.phone && kycCompleted && bankCompleted)

  const profile: UserProfile = {
    id: userRow.id,
    email: userRow.email,
    full_name: userRow.full_name,
    phone: userRow.phone,
    upi_id: userRow.upi_id,
    wallet: userRow.wallet,
    referral_code: userRow.referral_code,
    referral_code_input: userRow.referral_code_input,
    referred_by: userRow.referred_by,
    role,
    branch_id: bestRole?.branch_id ?? null,
    mobile_number: kycRow?.mobile_number ?? null,
    pan_number: kycRow?.pan_number ?? null,
    aadhaar_number: kycRow?.aadhaar_number ?? null,
    bank_account_holder: kycRow?.bank_account_holder ?? null,
    bank_account_number: kycRow?.bank_account_number ?? null,
    bank_name: kycRow?.bank_name ?? null,
    bank_account_type: kycRow?.bank_account_type ?? null,
    ifsc_code: kycRow?.ifsc_code ?? null,
    dob: kycRow?.dob ?? null,
    address: kycRow?.address ?? null,
    state: kycRow?.state ?? null,
    pincode: kycRow?.pincode ?? null,
    kyc_status: kycRow?.kyc_status ?? null,
    kyc_completed: kycCompleted,
    bank_completed: bankCompleted,
    profile_completed: profileCompleted,
    kyc_submitted_at: kycRow?.kyc_submitted_at ?? null,
    created_at: userRow.created_at,
    updated_at: userRow.created_at,
    // Not present in the schema — kept for UI compatibility only, never persisted.
    city: kycRow?.city ?? null,
    gst: null,
    avatar_initials: getInitials(userRow.full_name || userRow.email || ''),
    notification_prefs: UNPERSISTED_DEFAULTS.notification_prefs,
    user_role: bestRole,
    user_kyc: kycRow,
    profit_share: userRow.profit_share ?? 70,
  } as UserProfile

  return profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [investor, setInvestor] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // While true, the onAuthStateChange listener below ignores SIGNED_IN events.
  // This prevents the global session/user state (and any route guards watching it)
  // from updating before we've confirmed the account's role matches the selected tab.
  const skipNextAuthEvent = useRef(false)

  const ensureUserProfile = async (
    userId: string,
    email: string,
    fullName?: string,
    phone?: string,
  ) => {
    if (!isSupabaseConfigured) return

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const name = fullName || email.split('@')[0]

    if (!existingUser) {
      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: userId, email, full_name: name, phone: phone || null }, { onConflict: 'id' })

      if (userError) {
        console.warn('Could not create user profile:', userError.message)
      }
    } else if (phone && !existingUser.phone) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ phone })
        .eq('id', userId)

      if (updateError) {
        console.warn('Could not update user phone:', updateError.message)
      }
    }

    // Make sure the user has a role row (defaults to branch_owner / investor)
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'branch_owner' })

      if (roleError) {
        console.warn('Could not create user role:', roleError.message)
      }
    }
  }

  const fetchInvestor = async (userId: string, email: string) => {
    if (!isSupabaseConfigured) return

    let built = await buildProfileFromDb(userId)

    if (!built) {
      await ensureUserProfile(userId, email)
      built = await buildProfileFromDb(userId)
    }

    setInvestor(built)
  }

  const refreshInvestor = async () => {
    if (user) await fetchInvestor(user.id, user.email!)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id, s.user.email!).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (skipNextAuthEvent.current) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id, s.user.email!)
      else setInvestor(null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Realtime: refresh profile when the user's row changes.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return

    const channel = supabase
      .channel(`user-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        () => { fetchInvestor(user.id, user.email!) },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_kyc', filter: `user_id=eq.${user.id}` },
        () => { fetchInvestor(user.id, user.email!) },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const signInWithEmail = async (email: string, password: string, expectedRole?: UserRole): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) {
      // Mock login for demo mode
      const mockUser = {
        id: 'mock-investor-id',
        email,
        user_metadata: { full_name: 'Demo Investor' },
      } as any
      const mockInvestor = {
        id: 'mock-investor-id',
        full_name: 'Demo Investor',
        email,
        phone: '9876543210',
        role: 'branch_owner',
        profile_completed: false, // will enforce onboarding modal
      } as any
      setUser(mockUser)
      setInvestor(mockInvestor)
      return mockInvestor
    }

    skipNextAuthEvent.current = true
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      skipNextAuthEvent.current = false
      throw error
    }

    if (expectedRole) {
      const authedUser = data.user
      if (!authedUser) {
        await supabase.auth.signOut()
        skipNextAuthEvent.current = false
        throw new Error('Could not verify account role.')
      }

      const profile = await buildProfileFromDb(authedUser.id)
      const actualRole = profile?.role

      // Investor tab (branch_owner) also covers admin accounts.
      // Ambassador tab only covers branch accounts.
      const isAllowed =
        expectedRole === 'branch'
          ? actualRole === 'branch'
          : actualRole === 'branch_owner' || actualRole === 'admin'

      if (!isAllowed) {
        await supabase.auth.signOut()
        skipNextAuthEvent.current = false
        setUser(null)
        setSession(null)
        setInvestor(null)
        const err: any = new Error('ROLE_MISMATCH')
        err.code = 'ROLE_MISMATCH'
        throw err
      }

      // Role confirmed — now it's safe to commit the session globally.
      skipNextAuthEvent.current = false
      setSession(data.session)
      setUser(authedUser)
      setInvestor(profile)
      return profile
    }

    skipNextAuthEvent.current = false
    setSession(data.session)
    setUser(data.user)
    return null
  }

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ): Promise<SignUpResult> => {
    if (!isSupabaseConfigured) {
      // Mock registration for demo mode
      const mockUser = {
        id: 'mock-investor-id',
        email,
        user_metadata: { full_name: fullName },
      } as any
      setUser(mockUser)
      setInvestor({
        id: 'mock-investor-id',
        full_name: fullName,
        email,
        phone: phone || null,
        role: 'branch_owner',
        profile_completed: false,
      } as any)
      return 'confirm_email'
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    })
    if (error) throw error

    if (data.user && data.session) {
      // If there's an active session, it's safe to ensure profile
      await ensureUserProfile(data.user.id, email, fullName, phone)
      return 'session'
    }

    return 'confirm_email'
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setInvestor(null)
    setUser(null)
    setSession(null)
  }

  const checkEmailVerified = async (): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      return true // Auto-verify in demo mode
    }

    const { data: { user: freshUser }, error } = await supabase.auth.getUser()
    if (error || !freshUser) return false
    if (freshUser.email_confirmed_at) {
      setUser(freshUser)
      await fetchInvestor(freshUser.id, freshUser.email!)
    }
    return !!freshUser.email_confirmed_at
  }

  const updateInvestorProfile = async (data: Record<string, unknown>) => {
    if (!isSupabaseConfigured) {
      setInvestor(prev => prev ? { ...prev, ...data } as any : null)
      return
    }

    if (!user) throw new Error('Not authenticated')

    const usersPayload: Record<string, unknown> = {}
    const kycPayload: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (KYC_FIELDS.has(key)) {
        kycPayload[key] = value
      } else if (key === 'full_name' || key === 'phone' || key === 'upi_id' || key === 'email') {
        usersPayload[key] = value
      }
      // Fields with no backing column (pan, gst, profit_share, notification_prefs,
      // kyc_completed, bank_completed, profile_completed) are intentionally dropped —
      // they're derived/computed, not stored.
    }

    if (Object.keys(usersPayload).length > 0) {
      const { error } = await supabase.from('users').update(usersPayload).eq('id', user.id)
      if (error) throw error
    }

    if (Object.keys(kycPayload).length > 0) {
      const { error } = await supabase
        .from('user_kyc')
        .upsert({ user_id: user.id, ...kycPayload }, { onConflict: 'user_id' })
      if (error) throw error
    }

    // Refresh the profile data
    await fetchInvestor(user.id, user.email!)
  }

  const loginAsDemo = (role: UserRole) => {
    const label = role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    const mockUser = {
      id: `mock-${role}-id`,
      email: `${role}@example.com`,
      user_metadata: { full_name: `Demo ${label}` }
    } as any
    setUser(mockUser)
    setInvestor({
      id: `mock-${role}-id`,
      full_name: `Demo ${label}`,
      email: `${role}@example.com`,
      phone: '9876543210',
      role: role,
      profile_completed: role === 'branch_owner' ? false : true, // Enforce onboarding modal for investor
    } as any)
  }

  return (
    <AuthContext.Provider value={{
      user, session, investor, loading,
      isAdmin: investor?.role === 'admin',
      isInvestor: investor?.role === 'branch_owner',
      isAmbassador: investor?.role === 'branch',
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshInvestor,
      checkEmailVerified,
      updateInvestorProfile,
      loginAsDemo,
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