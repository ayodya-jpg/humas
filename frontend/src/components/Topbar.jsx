
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
        match: (path) => path === `${basePath}/request/merchandise`,
        title: 'Pengajuan Merchandise',
        subtitle: 'Pilih paket merchandise dan lengkapi data kegiatan.',
        icon: 'bi-cart-plus-fill',
    },
    {
        match: (path) => path === `${basePath}/request/humas-service`,
        title: 'Request Liputan Humas',
        subtitle: 'Ajukan kebutuhan liputan, dokumentasi, publikasi, atau video.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path === `${basePath}/request/sekpim-borrowing`,
        title: 'Peminjaman & Request Aset',
        subtitle: 'Ajukan peminjaman atau permintaan barang SEKPiM.',
        icon: 'bi-box-seam-fill',
    },
    {
        match: (path) => path === `${basePath}/my-requests`,
        title: 'Riwayat Pengajuan',
        subtitle: 'Pantau seluruh pengajuan dan hasil pelayanan.',
        icon: 'bi-clock-history',
    },
    {
        match: (path) =>
            path.startsWith(`${basePath}/my-requests/`) &&
            path.endsWith('/detail'),
        title: 'Detail Pengajuan',
        subtitle: 'Lihat informasi dan perkembangan status pengajuan.',
        icon: 'bi-file-earmark-text-fill',
    },
    {
        match: (path) => path === '/admin/orders',
        title: 'Approval Merchandise',
        subtitle: 'Periksa dan proses pengajuan merchandise.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path.startsWith('/admin/orders/'),
        title: 'Detail Merchandise',
        subtitle: 'Periksa detail pengajuan sebelum memberikan keputusan.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path === '/admin/humas-services',
        title: 'Approval Liputan Humas',
        subtitle: 'Periksa dan proses request liputan yang masuk.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path.startsWith('/admin/humas-services/'),
        title: 'Detail Request Liputan',
        subtitle: 'Periksa informasi kegiatan dan dokumen pendukung.',
        icon: 'bi-camera-reels-fill',
    },
    {
        match: (path) => path === '/admin/borrow-requests',
        title: 'Approval Peminjaman & Request Aset',
        subtitle: 'Periksa dan proses pengajuan barang SEKPiM.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path.startsWith('/admin/borrow-requests/'),
        title: 'Detail Pengajuan SEKPiM',
        subtitle: 'Periksa detail barang, persetujuan, dan serah terima.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path === '/admin/categories',
        title: 'Data Kategori',
        subtitle: 'Kelola kategori merchandise dan perlengkapan.',
        icon: 'bi-tags-fill',
    },
    {
        match: (path) => path === '/admin/categories/create',
        title: 'Tambah Kategori',
        subtitle: 'Tambahkan kategori baru ke dalam sistem.',
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
        subtitle: 'Kelola merchandise, peminjaman, dan request aset.',
        icon: 'bi-boxes',
    },
    {
        match: (path) => path === '/admin/products/create',
        title: 'Tambah Produk',
        subtitle: 'Tambahkan produk HUMAS atau barang SEKPiM.',
        icon: 'bi-plus-circle-fill',
    },
    {
        match: (path) =>
            path.startsWith('/admin/products/') &&
            path.endsWith('/edit'),
        title: 'Edit Produk',
        subtitle: 'Perbarui informasi produk, layanan, dan stok.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/users',
        title: 'Data User',
        subtitle: 'Kelola akun, role, dan hak akses pengguna.',
        icon: 'bi-people-fill',
    },
    {
        match: (path) => path === '/admin/users/create',
        title: 'Tambah User',
        subtitle: 'Tambahkan akun dan atur hak aksesnya.',
        icon: 'bi-person-plus-fill',
    },
    {
        match: (path) =>
            path.startsWith('/admin/users/') &&
            path.endsWith('/edit'),
        title: 'Edit User',
        subtitle: 'Perbarui data, role, dan hak akses pengguna.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) =>
            path === '/admin/unauthorized' ||
            path === '/user/unauthorized',
        title: 'Akses Ditolak',
        subtitle: 'Akun tidak memiliki izin membuka halaman ini.',
        icon: 'bi-shield-lock-fill',
    },
];

export default function Topbar({
    sidebarOpen = false,
    setSidebarOpen = () => {},
    isSidebarOpen = false,
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

    const pageInfo = useMemo(() => {
        const found = pageMap.find(
            (page) => page.match(location.pathname)
        );

        return found || {
            title: 'Sistem Layanan',
            subtitle: 'Kelola kebutuhan HUMAS dan SEKPiM.',
            icon: 'bi-grid-fill',
        };
    }, [pageMap, location.pathname]);

    const openSidebar = () => {
        setSidebarOpen(true);
        setIsSidebarOpen(true);
    };

    const handleLogout = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Logout dari sistem?',
            text: 'Sesi login kamu akan diakhiri.',
            confirmButtonText: 'Ya, logout',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation?.isConfirmed) return;

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

            navigate('/login', {
                replace: true,
            });
        } catch (error) {
            console.error(
                'Logout error:',
                error?.response?.data || error
            );

            closeAlert();
            clearLocalSession();

            await showErrorAlert(
                'Logout Bermasalah',
                error?.response?.data?.message ||
                    'Sesi lokal sudah dihapus. Silakan login kembali.'
            );

            navigate('/login', {
                replace: true,
            });
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="btn btn-light rounded-circle d-lg-none topbar-menu-button"
                    onClick={openSidebar}
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
                <NotificationCenter currentUser={currentUser} />

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
