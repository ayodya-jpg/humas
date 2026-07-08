import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../utils/sweetAlert';

const pageMap = [
    {
        match: (path) => path === '/admin/dashboard',
        title: 'Dashboard',
        subtitle: 'Ringkasan aktivitas dan pengajuan terbaru.',
        icon: 'bi-speedometer2',
    },
    {
        match: (path) => path === '/admin/request/merchandise',
        title: 'Ajukan Merchandise',
        subtitle: 'Buat pengajuan paket merchandise.',
        icon: 'bi-cart-plus-fill',
    },
    {
        match: (path) => path === '/admin/request/humas-service',
        title: 'Ajukan Layanan Humas',
        subtitle: 'Buat pengajuan kebutuhan layanan Humas.',
        icon: 'bi-megaphone-fill',
    },
    {
        match: (path) => path === '/admin/request/sekpim-borrowing',
        title: 'Ajukan Peminjaman',
        subtitle: 'Buat pengajuan peminjaman barang Sekpim.',
        icon: 'bi-box-seam-fill',
    },
    {
        match: (path) => path === '/admin/my-requests',
        title: 'Riwayat Saya',
        subtitle: 'Pantau status pengajuan pribadi.',
        icon: 'bi-clock-history',
    },
    {
        match: (path) => path.startsWith('/admin/my-requests/') && path.endsWith('/detail'),
        title: 'Detail Riwayat',
        subtitle: 'Detail pengajuan dan status terbaru.',
        icon: 'bi-file-earmark-text-fill',
    },
    {
        match: (path) => path.startsWith('/admin/my-requests/') && path.endsWith('/resubmit'),
        title: 'Ajukan Ulang',
        subtitle: 'Perbaiki pengajuan sesuai catatan revisi.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/orders',
        title: 'Approval Merchandise',
        subtitle: 'Kelola approval pengajuan merchandise.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path.startsWith('/admin/orders/'),
        title: 'Detail Approval Merchandise',
        subtitle: 'Lihat detail dan proses approval merchandise.',
        icon: 'bi-gift-fill',
    },
    {
        match: (path) => path === '/admin/borrow-requests',
        title: 'Approval Peminjaman',
        subtitle: 'Kelola approval peminjaman barang.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path.startsWith('/admin/borrow-requests/'),
        title: 'Detail Approval Peminjaman',
        subtitle: 'Lihat detail dan proses approval peminjaman.',
        icon: 'bi-clipboard-check-fill',
    },
    {
        match: (path) => path === '/admin/humas-services',
        title: 'Approval Layanan Humas',
        subtitle: 'Kelola approval layanan Humas.',
        icon: 'bi-headset',
    },
    {
        match: (path) => path === '/admin/categories',
        title: 'Data Kategori',
        subtitle: 'Kelola kategori produk dan barang.',
        icon: 'bi-tags-fill',
    },
    {
        match: (path) => path === '/admin/categories/create',
        title: 'Tambah Kategori',
        subtitle: 'Tambahkan kategori baru.',
        icon: 'bi-plus-circle-fill',
    },
    {
        match: (path) => path.startsWith('/admin/categories/') && path.endsWith('/edit'),
        title: 'Edit Kategori',
        subtitle: 'Perbarui data kategori.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/products',
        title: 'Paket Merchandise',
        subtitle: 'Kelola produk, stok, dan barang peminjaman.',
        icon: 'bi-boxes',
    },
    {
        match: (path) => path === '/admin/products/create',
        title: 'Tambah Produk',
        subtitle: 'Tambahkan produk baru.',
        icon: 'bi-plus-circle-fill',
    },
    {
        match: (path) => path.startsWith('/admin/products/') && path.endsWith('/edit'),
        title: 'Edit Produk',
        subtitle: 'Perbarui data produk.',
        icon: 'bi-pencil-square',
    },
    {
        match: (path) => path === '/admin/users',
        title: 'Data User',
        subtitle: 'Kelola akun pengguna sistem.',
        icon: 'bi-people-fill',
    },
    {
        match: (path) => path === '/admin/users/create',
        title: 'Tambah User',
        subtitle: 'Tambahkan akun pengguna baru.',
        icon: 'bi-person-plus-fill',
    },
    {
        match: (path) => path.startsWith('/admin/users/') && path.endsWith('/edit'),
        title: 'Edit User',
        subtitle: 'Perbarui data akun pengguna.',
        icon: 'bi-pencil-square',
    },
];

const formatDateTime = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function Topbar({
    sidebarOpen = false,
    setSidebarOpen = () => {},
    isSidebarOpen = false,
    setIsSidebarOpen = () => {},
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const notificationRef = useRef(null);

    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationLoading, setNotificationLoading] = useState(false);

    let currentUser = {};

    try {
        currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        currentUser = {};
    }

    const role = currentUser.role || 'user';
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isSuperadmin = role === 'superadmin';

    const pageInfo = useMemo(() => {
        const foundPage = pageMap.find((page) => page.match(location.pathname));

        return foundPage || {
            title: 'Halaman Admin',
            subtitle: 'Kelola kebutuhan HUMAS dan SEKPIM.',
            icon: 'bi-grid-fill',
        };
    }, [location.pathname]);

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem('admin_token');

        if (!token) return;

        try {
            setNotificationLoading(true);

            const requests = [];

            if (isAdmin) {
                requests.push(api.get('/orders'));
                requests.push(api.get('/borrow-requests'));
            } else {
                requests.push(api.get('/my-orders'));
                requests.push(api.get('/my-borrow-requests'));
            }

            if (isSuperadmin) {
                requests.push(api.get('/products'));
            }

            const responses = await Promise.all(requests);

            const orders = responses[0]?.data?.data || [];
            const borrowRequests = responses[1]?.data?.data || [];
            const products = isSuperadmin ? responses[2]?.data?.data || [] : [];

            const nextNotifications = [];

            if (isAdmin) {
                orders
                    .filter((order) => order.status === 'pending')
                    .slice(0, 3)
                    .forEach((order) => {
                        nextNotifications.push({
                            id: `order-${order.id}`,
                            title: 'Approval merchandise menunggu',
                            description: order.event_name || order.order_code,
                            meta: formatDateTime(order.submitted_at || order.created_at),
                            icon: 'bi-gift-fill',
                            color: 'primary',
                            path: `/admin/orders/${order.id}`,
                        });
                    });

                borrowRequests
                    .filter((request) => request.status === 'pending')
                    .slice(0, 3)
                    .forEach((request) => {
                        nextNotifications.push({
                            id: `borrow-${request.id}`,
                            title: 'Approval peminjaman menunggu',
                            description: request.purpose || request.borrow_code,
                            meta: formatDateTime(request.submitted_at || request.created_at),
                            icon: 'bi-box-seam-fill',
                            color: 'success',
                            path: `/admin/borrow-requests/${request.id}`,
                        });
                    });
            } else {
                orders
                    .filter((order) => order.status === 'revision')
                    .slice(0, 3)
                    .forEach((order) => {
                        nextNotifications.push({
                            id: `my-order-${order.id}`,
                            title: 'Merchandise perlu revisi',
                            description: order.event_name || order.order_code,
                            meta: order.admin_note || 'Buka detail untuk melihat catatan admin.',
                            icon: 'bi-pencil-square',
                            color: 'warning',
                            path: `/admin/my-requests/merchandise/${order.id}/detail`,
                        });
                    });

                borrowRequests
                    .filter((request) => request.status === 'revision')
                    .slice(0, 3)
                    .forEach((request) => {
                        nextNotifications.push({
                            id: `my-borrow-${request.id}`,
                            title: 'Peminjaman perlu revisi',
                            description: request.purpose || request.borrow_code,
                            meta: request.admin_note || 'Buka detail untuk melihat catatan admin.',
                            icon: 'bi-pencil-square',
                            color: 'warning',
                            path: `/admin/my-requests/borrowing/${request.id}/detail`,
                        });
                    });
            }

            if (isSuperadmin) {
                products
                    .filter((product) => Number(product.stock) <= 5)
                    .sort((a, b) => Number(a.stock) - Number(b.stock))
                    .slice(0, 3)
                    .forEach((product) => {
                        nextNotifications.push({
                            id: `product-${product.id}`,
                            title: 'Stok produk rendah',
                            description: product.name,
                            meta: `Stok tersisa ${product.stock}`,
                            icon: 'bi-boxes',
                            color: 'danger',
                            path: `/admin/products/${product.id}/edit`,
                        });
                    });
            }

            setNotifications(nextNotifications.slice(0, 8));
        } catch (error) {
            console.error('Fetch topbar notification error:', error.response?.data || error);
        } finally {
            setNotificationLoading(false);
        }
    }, [isAdmin, isSuperadmin]);

    useEffect(() => {
        fetchNotifications();
        setNotificationOpen(false);
    }, [fetchNotifications, location.pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const notificationCount = notifications.length;

    const openSidebar = () => {
        setSidebarOpen(true);
        setIsSidebarOpen(true);
    };

    const handleLogout = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Logout dari sistem?',
            text: 'Sesi login kamu akan diakhiri.',
            confirmButtonText: 'Ya, logout',
            icon: 'question',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            showLoadingAlert('Logout', 'Mengakhiri sesi login...');

            await api.post('/admin/logout');

            closeAlert();

            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');

            await showSuccessAlert(
                'Logout Berhasil',
                'Kamu berhasil keluar dari sistem.'
            );

            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error.response?.data || error);

            closeAlert();

            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');

            showErrorAlert(
                'Logout Bermasalah',
                error.response?.data?.message || 'Sesi lokal dihapus. Silakan login kembali.'
            );

            navigate('/login', { replace: true });
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
                    <i className="bi bi-list fs-4"></i>
                </button>

                <div className="topbar-page-icon">
                    <i className={`bi ${pageInfo.icon}`}></i>
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
                <div className="topbar-notification" ref={notificationRef}>
                    <button
                        type="button"
                        className="topbar-notification-button"
                        onClick={() => setNotificationOpen((prev) => !prev)}
                        aria-label="Buka notifikasi"
                    >
                        {notificationLoading ? (
                            <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                            <i className="bi bi-bell-fill"></i>
                        )}

                        {notificationCount > 0 && (
                            <span className="topbar-notification-count">
                                {notificationCount > 99 ? '99+' : notificationCount}
                            </span>
                        )}
                    </button>

                    {notificationOpen && (
                        <div className="topbar-notification-panel">
                            <div className="topbar-notification-header">
                                <div>
                                    <div className="fw-black">Notifikasi</div>
                                    <div className="small text-muted">
                                        Auto-refresh setiap 30 detik.
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                    onClick={fetchNotifications}
                                    disabled={notificationLoading}
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                    Refresh
                                </button>
                            </div>

                            {notifications.length === 0 ? (
                                <div className="topbar-notification-empty">
                                    <i className="bi bi-check-circle-fill fs-2 text-success mb-2"></i>
                                    <div className="fw-bold">Aman</div>
                                    <div className="small text-muted">
                                        Tidak ada notifikasi penting saat ini.
                                    </div>
                                </div>
                            ) : (
                                <div className="topbar-notification-list">
                                    {notifications.map((notification) => (
                                        <Link
                                            key={notification.id}
                                            to={notification.path}
                                            className="topbar-notification-item"
                                            onClick={() => setNotificationOpen(false)}
                                        >
                                            <div className={`icon-box bg-${notification.color}-subtle text-${notification.color}`}>
                                                <i className={`bi ${notification.icon}`}></i>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="topbar-notification-title">
                                                    {notification.title}
                                                </div>

                                                <div className="topbar-notification-description text-truncate">
                                                    {notification.description}
                                                </div>

                                                <div className="topbar-notification-meta text-truncate">
                                                    {notification.meta}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <div className="topbar-notification-footer">
                                <Link
                                    to={isAdmin ? '/admin/orders' : '/admin/my-requests'}
                                    onClick={() => setNotificationOpen(false)}
                                >
                                    Lihat halaman terkait
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-user d-none d-md-flex">
                    <div className="profile-avatar bg-danger text-white">
                        {(currentUser.name || 'U').charAt(0)}
                    </div>

                    <div className="min-w-0">
                        <div className="topbar-user-name text-truncate">
                            {currentUser.name || 'User'}
                        </div>

                        <div className="topbar-user-role text-capitalize">
                            {currentUser.role || 'user'}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-danger rounded-pill"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right me-lg-2"></i>
                    <span className="d-none d-lg-inline">Logout</span>
                </button>
            </div>
        </header>
    );
}