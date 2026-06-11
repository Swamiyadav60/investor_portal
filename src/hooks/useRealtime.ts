import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function useRealtimeSubscription(tables: string[] = ['revenues', 'expenses', 'payments', 'print_jobs', 'kiosks']) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channels = tables.map((table) =>
      supabase
        .channel(`realtime-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          queryClient.invalidateQueries({ queryKey: [table] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['kiosks'] })
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          queryClient.invalidateQueries({ queryKey: ['live-jobs'] })
        })
        .subscribe()
    )

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [queryClient, tables])
}
