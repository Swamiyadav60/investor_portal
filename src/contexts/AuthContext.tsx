import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getInitials } from '@/lib/format'
import type { Investor } from '@/types/database'
import { DEMO_INVESTOR } from '@/data/demo'

export type SignUpResult = 'session' | 'confirm_email'

interface AuthContextType {
  user: User | null
  session: Session | null
  investor: Investor | null
  loading: boolean
  isAdmin: boolean
  isDemo: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshInvestor: () => Promise<void>
  enterDemo: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const ensureInvestorProfile = async (userId: string, email: string, fullName?: string) => {
    const { data: existing } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      setInvestor(existing as Investor)
      return
    }

    const name = fullName || email.split('@')[0]
    const { data: created, error } = await supabase
      .from('investors')
      .insert({
        user_id: userId,
        full_name: name,
        email,
        avatar_initials: getInitials(name),
      })
      .select()
      .single()

    if (created) setInvestor(created as Investor)
    else if (error) console.warn('Could not create investor profile:', error.message)
  }

  const fetchInvestor = async (userId: string) => {
    const { data } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) setInvestor(data as Investor)
  }

  const refreshInvestor = async () => {
    if (user) await fetchInvestor(user.id)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchInvestor(s.user.id)
      else setInvestor(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    if (data.user && data.session) {
      await ensureInvestorProfile(data.user.id, email, fullName)
      return 'session'
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
    if (isDemo) {
      setInvestor(null)
      setIsDemo(false)
      setUser(null)
      setSession(null)
      return
    }
    await supabase.auth.signOut()
    setInvestor(null)
    setUser(null)
    setSession(null)
  }

  const enterDemo = () => {
    setInvestor({
      ...DEMO_INVESTOR,
      user_id: 'demo',
      notification_prefs: { job_alerts: false, daily_summary: true, monthly_payout: true, maintenance_alerts: true, new_slots: false },
      updated_at: new Date().toISOString(),
    } as Investor)
    setIsDemo(true)
  }

  return (
    <AuthContext.Provider value={{
      user, session, investor, loading,
      isAdmin: investor?.role === 'admin',
      isDemo,
      signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, refreshInvestor, enterDemo,
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
