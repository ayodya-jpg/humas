import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({
    children,
    allowedRoles = ['user', 'admin', 'superadmin'],
}) {
    const location = useLocation();

    const token = localStorage.getItem('admin_token');

    let currentUser = {};

    try {
        currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        currentUser = {};
    }

    const role = currentUser.role;

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location.pathname,
                }}
            />
        );
    }

    if (!role) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');

        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location.pathname,
                }}
            />
        );
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/admin/unauthorized" replace />;
    }

    return children;
}