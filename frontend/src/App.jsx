import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';

import Dashboard from './pages/Dashboard';

import UserManagementPage from './pages/users/UserManagementPage';
import CategoryManagementPage from './pages/categories/CategoryManagementPage';
import ProductManagementPage from './pages/products/ProductManagementPage';

import MerchandiseApprovalPage from './pages/merchandise/MerchandiseApprovalPage';
import BorrowingApprovalPage from './pages/borrowing/BorrowingApprovalPage';
import HumasServiceApprovalPage from './pages/humas/HumasServiceApprovalPage';

import MerchandiseRequestPage from './pages/requests/MerchandiseRequestPage';
import HumasServiceRequestPage from './pages/requests/HumasServiceRequestPage';
import SekpimBorrowingRequestPage from './pages/requests/SekpimBorrowingRequestPage';
import MyRequestsPage from './pages/requests/MyRequestsPage';

function App() {
    return (
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

                <Route path="admin/request/merchandise" element={<MerchandiseRequestPage />} />
                <Route path="admin/request/humas-service" element={<HumasServiceRequestPage />} />
                <Route path="admin/request/sekpim-borrowing" element={<SekpimBorrowingRequestPage />} />
                <Route path="admin/my-requests" element={<MyRequestsPage />} />

                <Route path="admin/users" element={<UserManagementPage />} />
                <Route path="admin/categories" element={<CategoryManagementPage />} />
                <Route path="admin/products" element={<ProductManagementPage />} />

                <Route path="admin/orders" element={<MerchandiseApprovalPage />} />
                <Route path="admin/humas-services" element={<HumasServiceApprovalPage />} />
                <Route path="admin/borrow-requests" element={<BorrowingApprovalPage />} />
            </Route>
        </Routes>
    );
}

export default App;