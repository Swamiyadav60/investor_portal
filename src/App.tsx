import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ToastProvider } from '@/components/ui/Toast'
import { InvestorLayout } from '@/components/layout/InvestorLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/investor/DashboardPage'
import { KiosksPage } from '@/pages/investor/KiosksPage'
import { EarningsPage } from '@/pages/investor/EarningsPage'
import { PayoutsPage } from '@/pages/investor/PayoutsPage'
import { ReportsPage } from '@/pages/investor/ReportsPage'
import { LiveActivityPage } from '@/pages/investor/LiveActivityPage'
import { ProfilePage } from '@/pages/investor/ProfilePage'
import { AdminCollegesPage } from '@/pages/admin/AdminCollegesPage'
import { AdminInvestorsPage } from '@/pages/admin/AdminInvestorsPage'
import { AdminKiosksPage } from '@/pages/admin/AdminKiosksPage'
import { AdminRevenuePage } from '@/pages/admin/AdminRevenuePage'
import { AdminExpensesPage } from '@/pages/admin/AdminExpensesPage'
import { AdminWaitlistsPage } from '@/pages/admin/AdminWaitlistsPage'
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

            <Route element={<ProtectedRoute><InvestorLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/kiosks" element={<KiosksPage />} />
              <Route path="/earnings" element={<EarningsPage />} />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/live" element={<LiveActivityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/colleges" element={<AdminCollegesPage />} />
              <Route path="/admin/investors" element={<AdminInvestorsPage />} />
              <Route path="/admin/kiosks" element={<AdminKiosksPage />} />
              <Route path="/admin/revenue" element={<AdminRevenuePage />} />
              <Route path="/admin/expenses" element={<AdminExpensesPage />} />
              <Route path="/admin/waitlists" element={<AdminWaitlistsPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
