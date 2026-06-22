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
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<SignUpResult>
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

  const fetchInvestor = async (userId: string, email: string) => {
    let { data: investorData } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Changed to maybeSingle()

    if (!investorData) {
      // If investor row is missing, ensure it's created and then refetch
      await ensureInvestorProfile(userId, email); // Call ensure to create
        ({ data: investorData } = await supabase // Refetch
          .from('investors')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle())
    }

    if (investorData) setInvestor(investorData as Investor)
    else setInvestor(null) // Ensure investor is null if still not found
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
    await supabase.auth.signOut()
setInvestor(null)
setUser(null)
setSession(null)
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
