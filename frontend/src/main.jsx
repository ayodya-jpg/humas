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

import AccountManagementPage from './pages/account/AccountManagementPage';

import RecoveryPage from './pages/security/RecoveryPage';

import UserManagementHubPage from './pages/users/UserManagementHubPage';

/*
|--------------------------------------------------------------------------
| KONFIGURASI ROLE
|--------------------------------------------------------------------------
*/

const ADMIN_ROLES = [
    'admin',
    'admin_humas',
    'admin_sekpim',
    'superadmin',
];

/*
|--------------------------------------------------------------------------
| LAYOUT HALAMAN TERPROTEKSI
|--------------------------------------------------------------------------
|
| Halaman menggunakan:
| - ProtectedRoute
| - DashboardLayout
| - Sidebar
| - Topbar
|
| Validasi keamanan tetap dilakukan
| melalui backend Laravel Sanctum.
|
*/

function PrivateLayout({
    allowedRoles,
    requiredPermission = null,
}) {
    return (
        <ProtectedRoute
            allowedRoles={allowedRoles}
            requiredPermission={requiredPermission}
        >
            <DashboardLayout />
        </ProtectedRoute>
    );
}

/*
|--------------------------------------------------------------------------
| ROUTING UTAMA
|--------------------------------------------------------------------------
*/

function RootRoutes() {
    const location = useLocation();

    const params = new URLSearchParams(
        location.search
    );

    /*
    |--------------------------------------------------------------------------
    | KOMPATIBILITAS LINK LUPA PASSWORD LAMA
    |--------------------------------------------------------------------------
    |
    | Mengarahkan:
    |
    | /login?mode=forgot
    |
    | ke:
    |
    | /account/recovery
    |
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

            {/*
            |--------------------------------------------------------------------------
            | PEMULIHAN PASSWORD PUBLIK
            |--------------------------------------------------------------------------
            |
            | Halaman ini dapat dibuka tanpa login.
            |
            | Pengajuan tetap menggunakan pertanyaan
            | keamanan dan persetujuan Superadmin.
            |
            */}

            <Route
                path="/account/recovery"
                element={<RecoveryPage />}
            />

            {/*
            |--------------------------------------------------------------------------
            | MANAJEMEN AKUN USER
            |--------------------------------------------------------------------------
            |
            | User dapat:
            |
            | - Mengedit profil sendiri
            | - Mengubah nama dan nomor HP
            | - Mengubah email, unit, dan jabatan
            | - Mengatur pertanyaan keamanan
            |
            | Tidak dapat mengedit role atau
            | permission melalui halaman ini.
            |
            */}

            <Route
                path="/user/account-security"
                element={
                    <PrivateLayout
                        allowedRoles={['user']}
                    />
                }
            >
                <Route
                    index
                    element={
                        <AccountManagementPage />
                    }
                />
            </Route>

            {/*
            |--------------------------------------------------------------------------
            | MANAJEMEN AKUN ADMIN
            |--------------------------------------------------------------------------
            |
            | Admin dan Superadmin dapat mengubah
            | profil akunnya masing-masing.
            |
            */}

            <Route
                path="/admin/account-security"
                element={
                    <PrivateLayout
                        allowedRoles={ADMIN_ROLES}
                    />
                }
            >
                <Route
                    index
                    element={
                        <AccountManagementPage />
                    }
                />
            </Route>

            {/*
            |--------------------------------------------------------------------------
            | MANAJEMEN USER TERPADU
            |--------------------------------------------------------------------------
            |
            | Halaman:
            |
            | /admin/users
            |
            | Tab:
            |
            | 1. Daftar User & Hak Akses
            | 2. Edit Profil User (Superadmin)
            | 3. Persetujuan Pemulihan (Superadmin)
            |
            | Permission users.view atau users.manage
            | diperlukan untuk membuka daftar user.
            |
            | Aksi sensitif tetap diperiksa
            | langsung di backend.
            |
            */}

            <Route
                path="/admin/users"
                element={
                    <PrivateLayout
                        allowedRoles={ADMIN_ROLES}
                        requiredPermission={[
                            'users.view',
                            'users.manage',
                        ]}
                    />
                }
            >
                <Route
                    index
                    element={
                        <UserManagementHubPage />
                    }
                />
            </Route>

            {/*
            |--------------------------------------------------------------------------
            | REDIRECT HALAMAN PEMULIHAN LAMA
            |--------------------------------------------------------------------------
            |
            | Sebelumnya:
            |
            | /admin/recovery-requests
            |
            | Sekarang:
            |
            | /admin/users?tab=recovery
            |
            | Hanya Superadmin yang boleh
            | menggunakan redirect ini.
            |
            */}

            <Route
                path="/admin/recovery-requests"
                element={
                    <ProtectedRoute
                        allowedRoles={['superadmin']}
                    >
                        <Navigate
                            to="/admin/users?tab=recovery"
                            replace
                        />
                    </ProtectedRoute>
                }
            />

            {/*
            |--------------------------------------------------------------------------
            | ROUTE WEBSITE YANG SUDAH ADA
            |--------------------------------------------------------------------------
            |
            | Route lainnya tetap ditangani
            | oleh App.jsx:
            |
            | - Login
            | - Dashboard
            | - Merchandise
            | - Layanan HUMAS
            | - Peminjaman SEKPiM
            | - Kalender Direktorat
            | - Approval
            | - Tambah User
            | - Edit User
            | - Master Data
            |
            | Jangan menambahkan BrowserRouter
            | kedua di App.jsx.
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
