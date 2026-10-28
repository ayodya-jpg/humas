
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';

import ProtectedRoute, {
    getDefaultPath,
    getStoredUser,
} from './components/ProtectedRoute';

import ScrollToTop from './components/ScrollToTop';

import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/Dashboard';

import UserManagementPage from './pages/users/UserManagementPage';
import UserFormPage from './pages/users/UserFormPage';

import CategoryManagementPage from './pages/categories/CategoryManagementPage';
import CategoryFormPage from './pages/categories/CategoryFormPage';

import ProductManagementPage from './pages/products/ProductManagementPage';
import ProductFormPage from './pages/products/ProductFormPage';

import MerchandiseApprovalPage from './pages/merchandise/MerchandiseApprovalPage';
import MerchandiseApprovalDetailPage from './pages/merchandise/MerchandiseApprovalDetailPage';

import BorrowingApprovalPage from './pages/borrowing/BorrowingApprovalPage';
import BorrowingApprovalDetailPage from './pages/borrowing/BorrowingApprovalDetailPage';

import HumasServiceApprovalPage from './pages/humas/HumasServiceApprovalPage';
import HumasServiceApprovalDetailPage from './pages/humas/HumasServiceApprovalDetailPage';
import HumasSettingsPage from './pages/humas/HumasSettingsPage';

import MerchandiseRequestPage from './pages/requests/MerchandiseRequestPage';
import HumasServiceRequestPage from './pages/requests/HumasServiceRequestPage';
import SekpimBorrowingRequestPage from './pages/requests/SekpimBorrowingRequestPage';

import MyRequestsPage from './pages/requests/MyRequestsPage';
import MyRequestDetailPage from './pages/requests/MyRequestDetailPage';

import DirectorSchedulePage from './pages/schedule/DirectorSchedulePage';
import EventScheduleActivityPage from './pages/schedule/EventScheduleActivityPage';

import DirectorateScheduleRequestPage from './pages/requests/DirectorateScheduleRequestPage';
import DirectorateScheduleApprovalPage from './pages/schedule/DirectorateScheduleApprovalPage';

// BARU: Kalender kegiatan terintegrasi
import IntegratedCalendarPage from './pages/schedule/IntegratedCalendarPage';

import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import NotFoundPage from './pages/errors/NotFoundPage';

const USER_ROLES = [
    'user',
];

const ADMIN_ROLES = [
    'admin',
    'admin_humas',
    'admin_sekpim',
    'superadmin',
];

const SCHEDULE_APPROVAL_ROLES = [
    'admin',
    'superadmin',
];

const SUPERADMIN_ROLES = [
    'superadmin',
];

function RoleRedirect() {
    const token = localStorage.getItem('admin_token');
    const currentUser = getStoredUser();

    if (!token || !currentUser?.role) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Navigate
            to={getDefaultPath(currentUser)}
            replace
        />
    );
}

function App() {
    return (
        <>
            <ScrollToTop />

            <Routes>
                {/* ======================================================
                    PUBLIC
                ====================================================== */}

                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    path="/"
                    element={<RoleRedirect />}
                />

                <Route
                    path="/dashboard"
                    element={<RoleRedirect />}
                />

                {/* ======================================================
                    USER LAYOUT
                ====================================================== */}

                <Route
                    path="/user"
                    element={
                        <ProtectedRoute allowedRoles={USER_ROLES}>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={<RoleRedirect />}
                    />

                    <Route
                        path="dashboard"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="dashboard.view"
                            >
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Kalender Direktorat */}

                    <Route
                        path="director-schedule"
                        element={
                            <ProtectedRoute allowedRoles={USER_ROLES}>
                                <DirectorSchedulePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Request Jadwal Direktorat */}

                    <Route
                        path="request/directorate-schedule"
                        element={
                            <ProtectedRoute allowedRoles={USER_ROLES}>
                                <DirectorateScheduleRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Halaman Error */}

                    <Route
                        path="unauthorized"
                        element={<UnauthorizedPage />}
                    />

                    {/* Merchandise */}

                    <Route
                        path="request/merchandise"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="request.merchandise.create"
                            >
                                <MerchandiseRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Layanan HUMAS */}

                    <Route
                        path="request/humas-service"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="request.humas.create"
                            >
                                <HumasServiceRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Layanan SEKPiM */}

                    <Route
                        path="request/sekpim-borrowing"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="request.borrowing.create"
                            >
                                <SekpimBorrowingRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Riwayat Pengajuan */}

                    <Route
                        path="my-requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="request.history.view"
                            >
                                <MyRequestsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="my-requests/:type/:id/detail"
                        element={
                            <ProtectedRoute
                                allowedRoles={USER_ROLES}
                                requiredPermission="request.history.view"
                            >
                                <MyRequestDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="*"
                        element={<NotFoundPage />}
                    />
                </Route>

                {/* ======================================================
                    ADMIN LAYOUT
                ====================================================== */}

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={<RoleRedirect />}
                    />

                    {/* Dashboard */}

                    <Route
                        path="dashboard"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="dashboard.view"
                            >
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Kalender Direktorat */}

                    <Route
                        path="director-schedule"
                        element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <DirectorSchedulePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* BARU: Kalender Kegiatan Terintegrasi */}

                    <Route
                        path="integrated-calendar"
                        element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <IntegratedCalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Riwayat Aktivitas Jadwal */}

                    <Route
                        path="director-schedule/activity"
                        element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <EventScheduleActivityPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Pengajuan Jadwal Direktorat oleh Admin */}

                    <Route
                        path="request/directorate-schedule"
                        element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <DirectorateScheduleRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Approval Jadwal Direktorat */}

                    <Route
                        path="director-schedule/requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={SCHEDULE_APPROVAL_ROLES}
                            >
                                <DirectorateScheduleApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Halaman Error */}

                    <Route
                        path="unauthorized"
                        element={<UnauthorizedPage />}
                    />

                    {/* Pengajuan Merchandise */}

                    <Route
                        path="request/merchandise"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="request.merchandise.create"
                            >
                                <MerchandiseRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Pengajuan HUMAS */}

                    <Route
                        path="request/humas-service"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="request.humas.create"
                            >
                                <HumasServiceRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Pengajuan SEKPiM */}

                    <Route
                        path="request/sekpim-borrowing"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="request.borrowing.create"
                            >
                                <SekpimBorrowingRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Riwayat Pengajuan Pribadi */}

                    <Route
                        path="my-requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="request.history.view"
                            >
                                <MyRequestsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="my-requests/:type/:id/detail"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="request.history.view"
                            >
                                <MyRequestDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Approval Merchandise */}

                    <Route
                        path="orders"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.merchandise.view"
                            >
                                <MerchandiseApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="orders/:id"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.merchandise.view"
                            >
                                <MerchandiseApprovalDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Approval HUMAS */}

                    <Route
                        path="humas-services"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.humas.view"
                            >
                                <HumasServiceApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="humas-services/:id"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.humas.view"
                            >
                                <HumasServiceApprovalDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Pengaturan Layanan */}

                    <Route
                        path="humas-settings"
                        element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <HumasSettingsPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Approval SEKPiM */}

                    <Route
                        path="borrow-requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.borrowing.view"
                            >
                                <BorrowingApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="borrow-requests/:id"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="approval.borrowing.view"
                            >
                                <BorrowingApprovalDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Kategori */}

                    <Route
                        path="categories"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="categories.view"
                            >
                                <CategoryManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="categories/create"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="categories.manage"
                            >
                                <CategoryFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="categories/:id/edit"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="categories.manage"
                            >
                                <CategoryFormPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Produk */}

                    <Route
                        path="products"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="products.view"
                            >
                                <ProductManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="products/create"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="products.manage"
                            >
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="products/:id/edit"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="products.manage"
                            >
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Manajemen User */}

                    <Route
                        path="users"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission={[
                                    'users.view',
                                    'users.manage',
                                ]}
                            >
                                <UserManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="users/create"
                        element={
                            <ProtectedRoute allowedRoles={SUPERADMIN_ROLES}>
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="users/:id/edit"
                        element={
                            <ProtectedRoute allowedRoles={SUPERADMIN_ROLES}>
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="*"
                        element={<NotFoundPage />}
                    />
                </Route>

                {/* GLOBAL FALLBACK */}

                <Route
                    path="*"
                    element={<RoleRedirect />}
                />
            </Routes>
        </>
    );
}

export default App;
