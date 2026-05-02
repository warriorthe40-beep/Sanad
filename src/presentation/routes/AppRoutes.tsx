import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/presentation/layouts/AppLayout';
import AuthLayout from '@/presentation/layouts/AuthLayout';

import LoginPage from '@/presentation/pages/auth/Login/LoginPage';
import RegisterPage from '@/presentation/pages/auth/Register/RegisterPage';
import ResetPasswordPage from '@/presentation/pages/auth/ResetPassword/ResetPasswordPage';

import PurchaseListPage from '@/presentation/pages/purchases/PurchaseList/PurchaseListPage';
import AddPurchasePage from '@/presentation/pages/purchases/AddPurchase/AddPurchasePage';
import QuickAddPage from '@/presentation/pages/purchases/QuickAdd/QuickAddPage';
import PurchaseDetailsPage from '@/presentation/pages/purchases/PurchaseDetails/PurchaseDetailsPage';
import EditPurchasePage from '@/presentation/pages/purchases/EditPurchase/EditPurchasePage';

import AlertsPage from '@/presentation/pages/alerts/AlertsPage';
import AnalyticsPage from '@/presentation/pages/analytics/AnalyticsPage';
import ClaimsPage from '@/presentation/pages/claims/ClaimsPage';
import SettingsPage from '@/presentation/pages/settings/SettingsPage';
import CleanUpHistoryPage from '@/presentation/pages/settings/CleanUpHistory/CleanUpHistoryPage';

import AdminDashboardPage from '@/presentation/pages/admin/AdminDashboardPage';
import ManageCategoriesPage from '@/presentation/pages/admin/ManageCategories/ManageCategoriesPage';
import ManageStorePoliciesPage from '@/presentation/pages/admin/ManageStorePolicies/ManageStorePoliciesPage';
import MonitorCommunityPage from '@/presentation/pages/admin/MonitorCommunity/MonitorCommunityPage';

import RequireAuth from '@/auth/guards/RequireAuth';
import RequireAdmin from '@/auth/guards/RequireAdmin';
import RoleLanding from '@/auth/guards/RoleLanding';

/**
 * Route tree with role-based access control:
 *
 *   - /login, /register  — AuthLayout, public.
 *   - /                  — RoleLanding redirect (admin → /admin, user → /purchases).
 *   - /purchases, /alerts, /analytics, /claims  — RequireAuth.
 *   - /admin/*           — RequireAuth + RequireAdmin.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<RoleLanding />} />

          <Route path="purchases" element={<PurchaseListPage />} />
          <Route path="purchases/new" element={<AddPurchasePage />} />
          <Route path="purchases/new/quick" element={<QuickAddPage />} />
          <Route path="purchases/:id" element={<PurchaseDetailsPage />} />
          <Route path="purchases/:id/edit" element={<EditPurchasePage />} />

          <Route path="alerts" element={<AlertsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="claims" element={<ClaimsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/cleanup" element={<CleanUpHistoryPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/categories" element={<ManageCategoriesPage />} />
            <Route path="admin/policies" element={<ManageStorePoliciesPage />} />
            <Route path="admin/community" element={<MonitorCommunityPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
