import type { AuthError } from '@supabase/supabase-js'

export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'Authentication failed. Please try again.'
  }

  const authError = error as AuthError
  const msg = authError.message.toLowerCase()

  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password. If you just signed up, confirm your email first.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox.'
  }
  if (msg.includes('user already registered')) {
    return 'This email is already registered. Try signing in instead.'
  }
  if (msg.includes('database error saving new user')) {
    return 'Account setup failed. Run migration 004_fix_signup_trigger.sql in Supabase SQL Editor, then try again.'
  }
  if (msg.includes('signup is disabled')) {
    return 'Sign up is disabled in Supabase. Enable it under Authentication → Providers → Email.'
  }

  return authError.message
}
