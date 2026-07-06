import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CatalogPage from './pages/ecommerce/CatalogPage';
import OrderApprovalPage from './pages/ecommerce/OrderApprovalPage';
import BorrowingPage from './pages/borrowing/BorrowingPage';
import BorrowingApprovalPage from './pages/borrowing/BorrowingApprovalPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                <Route path="ecommerce/catalog" element={<CatalogPage />} />
                <Route path="ecommerce/approval" element={<OrderApprovalPage />} />

                <Route path="borrowing/request" element={<BorrowingPage />} />
                <Route path="borrowing/approval" element={<BorrowingApprovalPage />} />
            </Route>
        </Routes>
    );
}

export default App;