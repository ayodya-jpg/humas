import { Navigate, Route, Routes } from 'react-router-dom';
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

import MerchandiseRequestPage from './pages/requests/MerchandiseRequestPage';
import HumasServiceRequestPage from './pages/requests/HumasServiceRequestPage';
import SekpimBorrowingRequestPage from './pages/requests/SekpimBorrowingRequestPage';
import MyRequestsPage from './pages/requests/MyRequestsPage';
import MyRequestDetailPage from './pages/requests/MyRequestDetailPage';
import ResubmitRequestPage from './pages/requests/ResubmitRequestPage';

import UnauthorizedPage from './pages/errors/UnauthorizedPage';
import NotFoundPage from './pages/errors/NotFoundPage';

function App() {
    return (
        <>
            <ScrollToTop />

            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />

                    <Route path="admin/dashboard" element={<Dashboard />} />
                    <Route path="admin/unauthorized" element={<UnauthorizedPage />} />

                    <Route path="admin/request/merchandise" element={<MerchandiseRequestPage />} />
                    <Route path="admin/request/humas-service" element={<HumasServiceRequestPage />} />
                    <Route path="admin/request/sekpim-borrowing" element={<SekpimBorrowingRequestPage />} />

                    <Route path="admin/my-requests" element={<MyRequestsPage />} />
                    <Route path="admin/my-requests/:type/:id/detail" element={<MyRequestDetailPage />} />
                    <Route path="admin/my-requests/:type/:id/resubmit" element={<ResubmitRequestPage />} />

                    <Route
                        path="admin/orders"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                <MerchandiseApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/orders/:id"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                <MerchandiseApprovalDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/borrow-requests"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                <BorrowingApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/borrow-requests/:id"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                <BorrowingApprovalDetailPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/humas-services"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                                <HumasServiceApprovalPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/categories"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <CategoryManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/categories/create"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <CategoryFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/categories/:id/edit"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <CategoryFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/products"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ProductManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/products/create"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/products/:id/edit"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/users"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <UserManagementPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/users/create"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="admin/users/:id/edit"
                        element={
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <UserFormPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="admin/*" element={<NotFoundPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
        </>
    );
}

export default App;