import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ToastProvider } from '@/components/ui/Toast'
import { InvestorLayout } from '@/components/layout/InvestorLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { BranchAmbassadorLayout } from '@/components/layout/BranchAmbassadorLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { LocationsPage } from '@/pages/public/LocationsPage'
import { DashboardPage } from '@/pages/investor/DashboardPage'
import { KiosksPage } from '@/pages/investor/KiosksPage'
import { PayoutsPage } from '@/pages/investor/PayoutsPage'
import { ReportsPage } from '@/pages/investor/ReportsPage'
import { ProfilePage } from '@/pages/investor/ProfilePage'
import { WaitlistPage } from '@/pages/investor/WaitlistPage'
import { BranchDashboardPage } from '@/pages/branch/BranchDashboardPage'
import { BranchPrintersPage } from '@/pages/branch/BranchPrintersPage'
import { BranchLogExpensePage } from '@/pages/branch/BranchLogExpensePage'
import { BranchHistoryPage } from '@/pages/branch/BranchHistoryPage'
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

            <Route element={<ProtectedRoute allowedRoles={['investor']}><InvestorLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/kiosks" element={<KiosksPage />} />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['branch_ambassador']}><BranchAmbassadorLayout /></ProtectedRoute>}>
              <Route path="/branch/dashboard" element={<BranchDashboardPage />} />
              <Route path="/branch/printers" element={<BranchPrintersPage />} />
              <Route path="/branch/log-expense" element={<BranchLogExpensePage />} />
              <Route path="/branch/history" element={<BranchHistoryPage />} />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
