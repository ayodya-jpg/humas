import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const token = localStorage.getItem('admin_token');
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const role = user.role || '';

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to="/admin/unauthorized" replace />;
    }

    return children;
}