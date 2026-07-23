import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import DashboardLayout from './layouts/DashboardLayout';

import ProtectedRoute from './components/ProtectedRoute';
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

import MerchandiseRequestPage from './pages/requests/MerchandiseRequestPage';
import HumasServiceRequestPage from './pages/requests/HumasServiceRequestPage';
import SekpimBorrowingRequestPage from './pages/requests/SekpimBorrowingRequestPage';

import MyRequestsPage from './pages/requests/MyRequestsPage';
import MyRequestDetailPage from './pages/requests/MyRequestDetailPage';

import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import NotFoundPage from './pages/errors/NotFoundPage';

const ADMIN_ROLES = [
    'admin',
    'admin_humas',
    'admin_sekpim',
    'superadmin',
];

const getStoredUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

function RoleRedirect() {
    const token =
        localStorage.getItem('admin_token');

    const currentUser =
        getStoredUser();

    if (
        !token ||
        !currentUser?.role
    ) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return (
        <Navigate
            to={
                currentUser.role === 'user'
                    ? '/user/dashboard'
                    : '/admin/dashboard'
            }
            replace
        />
    );
}

function App() {
    return (
        <>
            <ScrollToTop />

            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    path="/"
                    element={<RoleRedirect />}
                />

                {/* ======================================================
                    AREA USER
                ====================================================== */}

                <Route
                    path="/user"
                    element={
                        <ProtectedRoute
                            allowedRoles={['user']}
                        >
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={
                            <Navigate
                                to="/user/dashboard"
                                replace
                            />
                        }
                    />

                    <Route
                        path="dashboard"
                        element={
                            <ProtectedRoute
                                allowedRoles={['user']}
                                requiredPermission="dashboard.view"
                            >
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="unauthorized"
                        element={
                            <UnauthorizedPage />
                        }
                    />

                    <Route
                        path="request/merchandise"
                        element={
                            <ProtectedRoute
                                allowedRoles={['user']}
                                requiredPermission="request.merchandise.create"
                            >
                                <MerchandiseRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="request/humas-service"
                        element={
                            <ProtectedRoute
                                allowedRoles={['user']}
                                requiredPermission="request.humas.create"
                            >
                                <HumasServiceRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="request/sekpim-borrowing"
                        element={
                            <ProtectedRoute
                                allowedRoles={['user']}
                                requiredPermission="request.borrowing.create"
                            >
                                <SekpimBorrowingRequestPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="my-requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={['user']}
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
                                allowedRoles={['user']}
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
                    AREA ADMIN
                ====================================================== */}

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute
                            allowedRoles={ADMIN_ROLES}
                        >
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={
                            <Navigate
                                to="/admin/dashboard"
                                replace
                            />
                        }
                    />

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

                    <Route
                        path="unauthorized"
                        element={
                            <UnauthorizedPage />
                        }
                    />

                    {/* ==================================================
                        PENGAJUAN ADMIN
                    ================================================== */}

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

                    {/* ==================================================
                        APPROVAL MERCHANDISE
                    ================================================== */}

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

                    {/* ==================================================
                        APPROVAL LIPUTAN HUMAS
                    ================================================== */}

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

                    {/* ==================================================
                        APPROVAL PEMINJAMAN SEKPiM
                    ================================================== */}

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

                    {/* ==================================================
                        MASTER KATEGORI
                    ================================================== */}

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
                                requiredPermissions={[
                                    'categories.view',
                                    'categories.manage',
                                ]}
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
                                requiredPermissions={[
                                    'categories.view',
                                    'categories.manage',
                                ]}
                            >
                                <CategoryFormPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* ==================================================
                        MASTER PRODUK
                    ================================================== */}

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
                                requiredPermissions={[
                                    'products.view',
                                    'products.manage',
                                ]}
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
                                requiredPermissions={[
                                    'products.view',
                                    'products.manage',
                                ]}
                            >
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* ==================================================
                        MANAJEMEN USER
                    ================================================== */}

                    <Route
                        path="users"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermission="users.view"
                            >
                                <UserManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="users/create"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermissions={[
                                    'users.view',
                                    'users.manage',
                                ]}
                            >
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="users/:id/edit"
                        element={
                            <ProtectedRoute
                                allowedRoles={ADMIN_ROLES}
                                requiredPermissions={[
                                    'users.view',
                                    'users.manage',
                                ]}
                            >
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="*"
                        element={<NotFoundPage />}
                    />
                </Route>

                <Route
                    path="/dashboard"
                    element={<RoleRedirect />}
                />

                <Route
                    path="*"
                    element={<RoleRedirect />}
                />
            </Routes>
        </>
    );
}

export default App;