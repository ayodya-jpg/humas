
import React from 'react';
import ReactDOM from 'react-dom/client';

import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import App from './App.jsx';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

import AccountSecurityPage from './pages/security/AccountSecurityPage';
import RecoveryPage from './pages/security/RecoveryPage';
import AdminRecoveryRequestsPage from './pages/security/AdminRecoveryRequestsPage';

/*
|--------------------------------------------------------------------------
| LAYOUT UNTUK HALAMAN KEAMANAN
|--------------------------------------------------------------------------
*/

function SecurityLayout({ allowedRoles }) {
    return (
        <ProtectedRoute allowedRoles={allowedRoles}>
            <DashboardLayout />
        </ProtectedRoute>
    );
}

/*
|--------------------------------------------------------------------------
| ROUTING UTAMA
|--------------------------------------------------------------------------
|
| Penting:
| Jangan membuat route /login tersendiri yang merender <App />.
|
| Semua route lama, termasuk /login, akan ditangani
| oleh App.jsx melalui route fallback /*.
|
*/

function RootRoutes() {
    const location = useLocation();

    const params = new URLSearchParams(location.search);

    /*
    |--------------------------------------------------------------------------
    | KOMPATIBILITAS TOMBOL LUPA PASSWORD LAMA
    |--------------------------------------------------------------------------
    */

    if (
        location.pathname === '/login' &&
        params.get('mode') === 'forgot'
    ) {
        return (
            <Navigate
                to="/account/recovery"
                replace
            />
        );
    }

    return (
        <Routes>
            {/* PEMULIHAN PASSWORD - PUBLIC */}

            <Route
                path="/account/recovery"
                element={<RecoveryPage />}
            />

            {/* KEAMANAN AKUN USER */}

            <Route
                path="/user/account-security"
                element={
                    <SecurityLayout allowedRoles={['user']} />
                }
            >
                <Route
                    index
                    element={<AccountSecurityPage />}
                />
            </Route>

            {/* KEAMANAN AKUN ADMIN */}

            <Route
                path="/admin/account-security"
                element={
                    <SecurityLayout
                        allowedRoles={[
                            'admin',
                            'admin_humas',
                            'admin_sekpim',
                            'superadmin',
                        ]}
                    />
                }
            >
                <Route
                    index
                    element={<AccountSecurityPage />}
                />
            </Route>

            {/* APPROVAL PEMULIHAN - SUPERADMIN */}

            <Route
                path="/admin/recovery-requests"
                element={
                    <SecurityLayout
                        allowedRoles={['superadmin']}
                    />
                }
            >
                <Route
                    index
                    element={<AdminRecoveryRequestsPage />}
                />
            </Route>

            {/*
            |--------------------------------------------------------------------------
            | SELURUH ROUTE WEBSITE LAMA
            |--------------------------------------------------------------------------
            |
            | Login, Dashboard, Merchandise, HUMAS,
            | SEKPiM, Kalender, Approval, User Management.
            |
            */}

            <Route
                path="/*"
                element={<App />}
            />
        </Routes>
    );
}

/*
|--------------------------------------------------------------------------
| RENDER APLIKASI
|--------------------------------------------------------------------------
*/

ReactDOM.createRoot(
    document.getElementById('root')
).render(
    <React.StrictMode>
        <BrowserRouter>
            <RootRoutes />
        </BrowserRouter>
    </React.StrictMode>
);
