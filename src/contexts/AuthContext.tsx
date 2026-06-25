import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getInitials } from '@/lib/format'
import type { Investor, UserRole } from '@/types/database'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)

  const ensureInvestorProfile = async (
    userId: string,
    email: string,
    fullName?: string,
    phone?: string,
  ) => {
    if (!isSupabaseConfigured) return

    let { data: existing } = await supabase
      .from('decrypted_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    const name = fullName || email.split('@')[0]

    if (!existing) {
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        full_name: name,
        email,
        avatar_initials: getInitials(name),
      }

      if (phone) {
        insertPayload.mobile_number = phone
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
    } else if (phone && !existing.mobile_number) {
      // Profile was auto-created by trigger but doesn't have phone — update it
      const { data: updated, error } = await supabase
        .from('investors')
        .update({ mobile_number: phone })
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
        console.warn('Could not update investor phone:', error.message)
      }
    }

    if (existing) setInvestor(existing as Investor)
    else setInvestor(null)
  }

  const fetchInvestor = async (userId: string, email: string) => {
    if (!isSupabaseConfigured) return

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
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id, s.user.email!)
      else setInvestor(null)
    })
    let investorSubscription: any = null;

    if (user) {
      investorSubscription = supabase
      .channel(`investor-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'investors',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await fetchInvestor(user.id, user.email!);
        }
      )
      .subscribe();
    }

    return () => {
      subscription.unsubscribe();

      if (investorSubscription) {
        supabase.removeChannel(investorSubscription);
      }
    };
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Mock login for demo mode
      const mockUser = {
        id: 'mock-investor-id',
        email,
        user_metadata: { full_name: 'Demo Investor' },
      } as any
      setUser(mockUser)
      setInvestor({
        id: 'mock-investor-profile-id',
        user_id: 'mock-investor-id',
        full_name: 'Demo Investor',
        email,
        phone: '9876543210',
        role: 'investor',
        profile_completed: false, // will enforce onboarding modal
      } as any)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
        id: 'mock-investor-profile-id',
        user_id: 'mock-investor-id',
        full_name: fullName,
        email,
        phone: phone || null,
        role: 'investor',
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

    if (data.user) {
      if (data.session) {
        // If there's an active session, it's safe to ensure profile
        await ensureInvestorProfile(data.user.id, email, fullName, phone)
        return 'session'
      }
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
    
    const { error } = await supabase
      .from('investors')
      .update(data)
      .eq('user_id', user.id)

    if (error) throw error

    // Refresh the investor data
    await fetchInvestor(user.id, user.email!)
  }

  const loginAsDemo = (role: UserRole) => {
    const mockUser = {
      id: `mock-${role}-id`,
      email: `${role}@example.com`,
      user_metadata: { full_name: `Demo ${role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}` }
    } as any
    setUser(mockUser)
    setInvestor({
      id: `mock-${role}-investor-id`,
      user_id: `mock-${role}-id`,
      full_name: `Demo ${role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      email: `${role}@example.com`,
      phone: '9876543210',
      role: role,
      profile_completed: role === 'investor' ? false : true, // Enforce onboarding modal for investor
    } as any)
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
