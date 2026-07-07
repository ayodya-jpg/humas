import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagementPage from './pages/users/UserManagementPage';
import CategoryManagementPage from './pages/categories/CategoryManagementPage';
import ProductManagementPage from './pages/products/ProductManagementPage';
import OrderApprovalPage from './pages/ecommerce/OrderApprovalPage';
import BorrowingApprovalPage from './pages/borrowing/BorrowingApprovalPage';
import HumasServiceApprovalPage from './pages/humas/HumasServiceApprovalPage';

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
                <Route path="admin/users" element={<UserManagementPage />} />
                <Route path="admin/categories" element={<CategoryManagementPage />} />
                <Route path="admin/products" element={<ProductManagementPage />} />
                <Route path="admin/orders" element={<OrderApprovalPage />} />
                <Route path="admin/humas-services" element={<HumasServiceApprovalPage />} />
                <Route path="admin/borrow-requests" element={<BorrowingApprovalPage />} />
            </Route>
        </Routes>
    );
}

export default App;