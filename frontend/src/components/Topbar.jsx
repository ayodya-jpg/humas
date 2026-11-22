import { useMemo } from 'react';

import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import api, {
    clearLocalSession,
} from '../api/axios';

import {
    getStoredUser,
} from './ProtectedRoute';

import NotificationCenter from './NotificationCenter';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../utils/sweetAlert';

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin Humas',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Super Admin',
};

const createPageMap = (basePath) => [
    {
        match: (path) => path === `${basePath}/dashboard`,
        title: 'Dashboard',
        subtitle: 'Ringkasan aktivitas layanan HUMAS dan SEKPiM.',
        icon: 'bi-speedometer2',
    },
    {
        match: (path) => path === `${basePath}/account-security`,
        title: 'Keamanan Akun',
        subtitle: 'Kelola pertanyaan dan jawaban pemulihan akun.',
        icon: 'bi-shield-lock',
    },
    {
        match: (path) => path === '/admin/recovery-requests',
        title: 'Persetujuan Pemulihan Akun',
        subtitle: 'Verifikasi identitas dan proses permintaan pemulihan akun.',
        icon: 'bi-person-check',
    },
    {
        match: (path) => path === `${basePath}/request/merchandise`,
        title: 'Pengajuan Merchandise',
        subtitle: 'Pilih paket merchandise dan lengkapi data kegiatan.',
        icon: 'bi-cart-plus-fill',
    },
    {
        match: (path) => path === `${basePath}/request/humas-service`,
        title: 'Request Liputan Humas',
        subtitle: 'Ajukan kebutuhan liputan dan dokumentasi.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path === `${basePath}/request/sekpim-borrowing`,
        title: 'Peminjaman & Request Aset',
        subtitle: 'Ajukan peminjaman atau permintaan barang.',
        icon: 'bi-box-seam-fill',
    },
    {
        match: (path) => path === `${basePath}/my-requests`,
        title: 'Riwayat Pengajuan',
        subtitle: 'Pantau seluruh pengajuan dan hasil pelayanan.',
        icon: 'bi-clock-history',
    },
    {
        match: (path) => path.startsWith(`${basePath}/my-requests/`),
        title: 'Detail Pengajuan',
        subtitle: 'Lihat perkembangan status pengajuan.',
        icon: 'bi-file-earmark-text-fill',
    },
    {
        match: (path) => path === '/admin/orders',
        title: 'Approval Merchandise',
        subtitle: 'Periksa pengajuan merchandise.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path.startsWith('/admin/orders/'),
        title: 'Detail Merchandise',
        subtitle: 'Detail persetujuan merchandise.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path === '/admin/humas-services',
        title: 'Approval Liputan Humas',
        subtitle: 'Periksa request liputan yang masuk.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path.startsWith('/admin/humas-services/'),
        title: 'Detail Request Liputan',
        subtitle: 'Periksa informasi kegiatan.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path === '/admin/borrow-requests',
        title: 'Approval Peminjaman & Request Aset',
        subtitle: 'Periksa pengajuan barang.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path.startsWith('/admin/borrow-requests/'),
        title: 'Detail Pengajuan SEKPiM',
        subtitle: 'Periksa data dan serah terima.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path === '/admin/categories',
        title: 'Data Kategori',
        subtitle: 'Kelola kategori dan perlengkapan.',
        icon: 'bi-tags-fill',
    },
    {
        match: (path) => path === '/admin/categories/create',
        title: 'Tambah Kategori',
        subtitle: 'Tambahkan kategori baru.',
        icon: 'bi-plus-circle-fill',
    },
    {
        match: (path) =>
            path.startsWith('/admin/categories/') &&
            path.endsWith('/edit'),
        title: 'Edit Kategori',
        subtitle: 'Perbarui informasi kategori.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/products',
        title: 'Data Produk',
        subtitle: 'Kelola merchandise dan barang.',
        icon: 'bi-boxes',
    },
    {
        match: (path) => path === '/admin/products/create',
        title: 'Tambah Produk',
        subtitle: 'Tambahkan produk baru.',
        icon: 'bi-plus-circle-fill',
    },
    {
        match: (path) =>
            path.startsWith('/admin/products/') &&
            path.endsWith('/edit'),
        title: 'Edit Produk',
        subtitle: 'Perbarui produk.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/users',
        title: 'Data User',
        subtitle: 'Kelola akun dan hak akses.',
        icon: 'bi-people-fill',
    },
    {
        match: (path) => path === '/admin/users/create',
        title: 'Tambah User',
        subtitle: 'Tambahkan akun.',
        icon: 'bi-person-plus-fill',
    },
    {
        match: (path) =>
            path.startsWith('/admin/users/') &&
            path.endsWith('/edit'),
        title: 'Edit User',
        subtitle: 'Perbarui data user.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) =>
            path === '/admin/unauthorized' ||
            path === '/user/unauthorized',
        title: 'Akses Ditolak',
        subtitle: 'Akun tidak memiliki izin.',
        icon: 'bi-shield-lock-fill',
    },
];

export default function Topbar({
    setSidebarOpen = () => {},
    setIsSidebarOpen = () => {},
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const currentUser = getStoredUser();
    const role = currentUser?.role || 'user';
    const basePath = role === 'user' ? '/user' : '/admin';

    const pageMap = useMemo(
        () => createPageMap(basePath),
        [basePath]
    );

    const pageInfo = useMemo(
        () =>
            pageMap.find(
                (page) => page.match(location.pathname)
            ) || {
                title: 'Sistem Layanan',
                subtitle: 'Kelola kebutuhan HUMAS dan SEKPiM.',
                icon: 'bi-grid-fill',
            },
        [pageMap, location.pathname]
    );

    const handleLogout = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Logout dari sistem?',
            text: 'Sesi login kamu akan diakhiri.',
            confirmButtonText: 'Ya, logout',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            showLoadingAlert(
                'Logout',
                'Mengakhiri sesi login...'
            );

            await api.post('/admin/logout');

            closeAlert();
            clearLocalSession();

            await showSuccessAlert(
                'Logout Berhasil',
                'Kamu berhasil keluar dari sistem.'
            );
        } catch (error) {
            console.error(
                'Logout error:',
                error?.response?.data || error
            );

            closeAlert();
            clearLocalSession();

            await showErrorAlert(
                'Logout Bermasalah',
                'Sesi lokal sudah dihapus. Silakan login kembali.'
            );
        }

        navigate('/login', {
            replace: true,
        });
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="btn btn-light rounded-circle d-lg-none topbar-menu-button"
                    onClick={() => {
                        setSidebarOpen(true);
                        setIsSidebarOpen(true);
                    }}
                    aria-label="Buka sidebar"
                >
                    <i className="bi bi-list fs-4" />
                </button>

                <div className="topbar-page-icon">
                    <i className={`bi ${pageInfo.icon}`} />
                </div>

                <div className="min-w-0">
                    <h1 className="topbar-title">
                        {pageInfo.title}
                    </h1>

                    <p className="topbar-subtitle">
                        {pageInfo.subtitle}
                    </p>
                </div>
            </div>

            <div className="topbar-right">
                <NotificationCenter
                    currentUser={currentUser}
                />

                <Link
                    to={`${basePath}/account-security`}
                    className="btn btn-outline-secondary rounded-pill"
                    title="Atur pertanyaan keamanan akun"
                    aria-label="Keamanan akun"
                >
                    <i className="bi bi-shield-lock me-lg-2" />

                    <span className="d-none d-xl-inline">
                        Keamanan Akun
                    </span>
                </Link>

                {role === 'superadmin' && (
                    <Link
                        to="/admin/recovery-requests"
                        className="btn btn-outline-danger rounded-pill"
                        title="Persetujuan pemulihan akun"
                        aria-label="Persetujuan pemulihan akun"
                    >
                        <i className="bi bi-person-check me-lg-2" />

                        <span className="d-none d-xl-inline">
                            Pemulihan
                        </span>
                    </Link>
                )}

                <div className="topbar-user d-none d-md-flex">
                    <div className="profile-avatar bg-danger text-white">
                        {(currentUser?.name || 'U')
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <div className="topbar-user-name text-truncate">
                            {currentUser?.name || 'Pengguna'}
                        </div>

                        <div className="topbar-user-role">
                            {ROLE_LABELS[role] || role}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-danger rounded-pill"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right me-lg-2" />

                    <span className="d-none d-lg-inline">
                        Logout
                    </span>
                </button>
            </div>
        </header>
    );
}
