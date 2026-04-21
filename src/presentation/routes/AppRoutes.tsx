import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/presentation/layouts/AppLayout';
import AuthLayout from '@/presentation/layouts/AuthLayout';

import LoginPage from '@/presentation/pages/auth/Login/LoginPage';
import RegisterPage from '@/presentation/pages/auth/Register/RegisterPage';

import PurchaseListPage from '@/presentation/pages/purchases/PurchaseList/PurchaseListPage';
import AddPurchasePage from '@/presentation/pages/purchases/AddPurchase/AddPurchasePage';
import QuickAddPage from '@/presentation/pages/purchases/QuickAdd/QuickAddPage';
import PurchaseDetailsPage from '@/presentation/pages/purchases/PurchaseDetails/PurchaseDetailsPage';
import EditPurchasePage from '@/presentation/pages/purchases/EditPurchase/EditPurchasePage';

import AlertsPage from '@/presentation/pages/alerts/AlertsPage';
import AnalyticsPage from '@/presentation/pages/analytics/AnalyticsPage';
import ClaimsPage from '@/presentation/pages/claims/ClaimsPage';

import AdminDashboardPage from '@/presentation/pages/admin/AdminDashboardPage';
import ManageCategoriesPage from '@/presentation/pages/admin/ManageCategories/ManageCategoriesPage';
import ManageStorePoliciesPage from '@/presentation/pages/admin/ManageStorePolicies/ManageStorePoliciesPage';
import MonitorCommunityPage from '@/presentation/pages/admin/MonitorCommunity/MonitorCommunityPage';

/**
 * Top-level route tree. Two layout branches:
 *   - AuthLayout: /login, /register (no sidebar — unauthenticated surface)
 *   - AppLayout:  everything else (sidebar + topbar shell)
 *
 * Route guards for User vs Admin live in src/auth/guards and will wrap the
 * appropriate subtrees in a later task.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route index element={<PurchaseListPage />} />
        <Route path="purchases" element={<PurchaseListPage />} />
        <Route path="purchases/new" element={<AddPurchasePage />} />
        <Route path="purchases/new/quick" element={<QuickAddPage />} />
        <Route path="purchases/:id" element={<PurchaseDetailsPage />} />
        <Route path="purchases/:id/edit" element={<EditPurchasePage />} />

        <Route path="alerts" element={<AlertsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="claims" element={<ClaimsPage />} />

        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="admin/categories" element={<ManageCategoriesPage />} />
        <Route path="admin/policies" element={<ManageStorePoliciesPage />} />
        <Route path="admin/community" element={<MonitorCommunityPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
