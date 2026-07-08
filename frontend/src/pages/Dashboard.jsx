import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { showErrorAlert } from '../utils/sweetAlert';

const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

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

export default function Dashboard() {
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const role = adminUser.role || 'user';

    const isUser = role === 'user';
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isSuperadmin = role === 'superadmin';

    const [orders, setOrders] = useState([]);
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const requests = [
                api.get('/products'),
            ];

            if (isAdmin) {
                requests.push(api.get('/orders'));
                requests.push(api.get('/borrow-requests'));

                if (isSuperadmin) {
                    requests.push(api.get('/users'));
                }
            } else {
                requests.push(api.get('/my-orders'));
                requests.push(api.get('/my-borrow-requests'));
            }

            const responses = await Promise.all(requests);

            setProducts(responses[0].data.data || []);
            setOrders(responses[1].data.data || []);
            setBorrowRequests(responses[2].data.data || []);

            if (isSuperadmin) {
                setUsers(responses[3]?.data?.data || []);
            }
        } catch (error) {
            console.error('Fetch dashboard error:', error.response?.data || error);

            showErrorAlert(
                'Dashboard Gagal Dimuat',
                error.response?.data?.message || 'Data dashboard gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const histories = useMemo(() => {
        const merchandiseHistories = orders.map((order) => ({
            ...order,
            history_type: 'merchandise',
            history_label: 'Merchandise',
            history_icon: 'bi-gift-fill',
            history_color: 'primary',
            code: order.order_code,
            title: order.event_name,
            subtitle: order.institution_name,
            requester: order.user?.name || adminUser.name || '-',
            main_date: order.activity_date,
            submitted_date: order.submitted_at || order.created_at,
            detail_url: isAdmin
                ? `/admin/orders/${order.id}`
                : `/admin/my-requests/merchandise/${order.id}/detail`,
        }));

        const borrowingHistories = borrowRequests.map((request) => ({
            ...request,
            history_type: 'borrowing',
            history_label: 'Peminjaman',
            history_icon: 'bi-box-seam-fill',
            history_color: 'success',
            code: request.borrow_code,
            title: request.purpose,
            subtitle: `${formatDate(request.borrow_date)} - ${formatDate(request.return_date)}`,
            requester: request.user?.name || adminUser.name || '-',
            main_date: request.borrow_date,
            submitted_date: request.submitted_at || request.created_at,
            detail_url: isAdmin
                ? `/admin/borrow-requests/${request.id}`
                : `/admin/my-requests/borrowing/${request.id}/detail`,
        }));

        return [...merchandiseHistories, ...borrowingHistories].sort((a, b) => {
            return new Date(b.submitted_date || b.created_at) - new Date(a.submitted_date || a.created_at);
        });
    }, [orders, borrowRequests, isAdmin]);

    const summary = useMemo(() => {
        const totalRequests = histories.length;

        return {
            totalRequests,
            pending: histories.filter((item) => item.status === 'pending').length,
            approved: histories.filter((item) => item.status === 'approved').length,
            revision: histories.filter((item) => item.status === 'revision').length,
            completed: histories.filter((item) => ['completed', 'returned'].includes(item.status)).length,
            rejected: histories.filter((item) => item.status === 'rejected').length,
            merchandise: histories.filter((item) => item.history_type === 'merchandise').length,
            borrowing: histories.filter((item) => item.history_type === 'borrowing').length,
            productTotal: products.length,
            lowStock: products.filter((product) => Number(product.stock) <= 5).length,
            activeProducts: products.filter((product) => product.status === 'active').length,
            userTotal: users.length,
        };
    }, [histories, products, users]);

    const recentHistories = useMemo(() => {
        return histories.slice(0, 6);
    }, [histories]);

    const lowStockProducts = useMemo(() => {
        return products
            .filter((product) => Number(product.stock) <= 5)
            .sort((a, b) => Number(a.stock) - Number(b.stock))
            .slice(0, 6);
    }, [products]);

    const quickActions = useMemo(() => {
        if (isSuperadmin) {
            return [
                {
                    title: 'Approval Merchandise',
                    description: 'Kelola pengajuan merchandise.',
                    icon: 'bi-gift-fill',
                    color: 'primary',
                    url: '/admin/orders',
                },
                {
                    title: 'Approval Peminjaman',
                    description: 'Kelola peminjaman barang Sekpim.',
                    icon: 'bi-box-seam-fill',
                    color: 'success',
                    url: '/admin/borrow-requests',
                },
                {
                    title: 'Paket Merchandise',
                    description: 'Kelola item dan stok merchandise/barang.',
                    icon: 'bi-boxes',
                    color: 'warning',
                    url: '/admin/products',
                },
                {
                    title: 'Manajemen User',
                    description: 'Kelola akun user, admin, dan superadmin.',
                    icon: 'bi-people-fill',
                    color: 'danger',
                    url: '/admin/users',
                },
            ];
        }

        if (isAdmin) {
            return [
                {
                    title: 'Approval Merchandise',
                    description: 'Cek pengajuan merchandise terbaru.',
                    icon: 'bi-gift-fill',
                    color: 'primary',
                    url: '/admin/orders',
                },
                {
                    title: 'Approval Peminjaman',
                    description: 'Cek pengajuan peminjaman terbaru.',
                    icon: 'bi-box-seam-fill',
                    color: 'success',
                    url: '/admin/borrow-requests',
                },
                {
                    title: 'Ajukan Merchandise',
                    description: 'Buat pengajuan merchandise sebagai user.',
                    icon: 'bi-cart-plus-fill',
                    color: 'warning',
                    url: '/admin/request/merchandise',
                },
                {
                    title: 'Riwayat Saya',
                    description: 'Lihat pengajuan pribadi.',
                    icon: 'bi-clock-history',
                    color: 'info',
                    url: '/admin/my-requests',
                },
            ];
        }

        return [
            {
                title: 'Ajukan Merchandise',
                description: 'Pilih paket merchandise dan kirim request.',
                icon: 'bi-cart-plus-fill',
                color: 'primary',
                url: '/admin/request/merchandise',
            },
            {
                title: 'Ajukan Peminjaman',
                description: 'Ajukan peminjaman barang Sekpim.',
                icon: 'bi-box-seam-fill',
                color: 'success',
                url: '/admin/request/sekpim-borrowing',
            },
            {
                title: 'Layanan Humas',
                description: 'Ajukan kebutuhan layanan Humas.',
                icon: 'bi-megaphone-fill',
                color: 'warning',
                url: '/admin/request/humas-service',
            },
            {
                title: 'Riwayat Saya',
                description: 'Pantau status seluruh pengajuan.',
                icon: 'bi-clock-history',
                color: 'info',
                url: '/admin/my-requests',
            },
        ];
    }, [isAdmin, isSuperadmin]);

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-primary mb-3" />
                    <p className="text-muted mb-0">Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Dashboard HUMAS & SEKPIM
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Halo, {adminUser.name || 'User'}.
                            </h1>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 780, lineHeight: 1.8 }}>
                                {isAdmin
                                    ? 'Pantau pengajuan merchandise dan peminjaman, proses approval, serta cek kondisi data master dari satu dashboard.'
                                    : 'Ajukan kebutuhan merchandise, layanan Humas, peminjaman barang, dan pantau status pengajuan kamu dari satu dashboard.'}
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="profile-avatar bg-white text-danger">
                                        {(adminUser.name || 'U').charAt(0)}
                                    </div>

                                    <div>
                                        <div className="fw-black fs-5">{adminUser.name || 'User'}</div>
                                        <div className="text-white-50 text-capitalize">
                                            Role: {role}
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-white border-opacity-25" />

                                <div className="small text-white-50">
                                    Sistem pengajuan internal untuk kebutuhan Humas dan Sekretariat Pimpinan.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Total Pengajuan
                                    </div>
                                    <div className="display-6 fw-black">
                                        {summary.totalRequests}
                                    </div>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-files fs-4"></i>
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Merchandise dan peminjaman.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Menunggu Approval
                                    </div>
                                    <div className="display-6 fw-black">
                                        {summary.pending}
                                    </div>
                                </div>

                                <div className="icon-box bg-warning-subtle text-warning">
                                    <i className="bi bi-hourglass-split fs-4"></i>
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Request dengan status pending.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Perlu Revisi
                                    </div>
                                    <div className="display-6 fw-black">
                                        {summary.revision}
                                    </div>
                                </div>

                                <div className="icon-box bg-info-subtle text-info">
                                    <i className="bi bi-pencil-square fs-4"></i>
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Request yang perlu diperbaiki.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        {isAdmin ? 'Stok Rendah' : 'Selesai'}
                                    </div>
                                    <div className="display-6 fw-black">
                                        {isAdmin ? summary.lowStock : summary.completed}
                                    </div>
                                </div>

                                <div className="icon-box bg-success-subtle text-success">
                                    <i className={`bi ${isAdmin ? 'bi-boxes' : 'bi-check-circle-fill'} fs-4`}></i>
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                {isAdmin
                                    ? 'Produk dengan stok 5 atau kurang.'
                                    : 'Pengajuan yang selesai/dikembalikan.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Aktivitas Terbaru
                                    </h4>
                                    <p className="text-muted mb-0">
                                        Pengajuan terbaru yang masuk ke sistem.
                                    </p>
                                </div>

                                <Link to={isAdmin ? '/admin/orders' : '/admin/my-requests'} className="btn btn-outline-primary rounded-pill">
                                    Lihat Semua
                                </Link>
                            </div>

                            {recentHistories.length === 0 ? (
                                <div className="p-5 rounded-5 bg-light text-center">
                                    <i className="bi bi-inbox fs-1 text-muted"></i>
                                    <h5 className="fw-black mt-3 mb-2">Belum ada aktivitas</h5>
                                    <p className="text-muted mb-0">
                                        Data pengajuan akan muncul di sini setelah ada request.
                                    </p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {recentHistories.map((item) => (
                                        <div
                                            key={`${item.history_type}-${item.id}`}
                                            className="p-3 rounded-4 border"
                                        >
                                            <div className="row g-3 align-items-center">
                                                <div className="col-lg-6">
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div className={`icon-box bg-${item.history_color}-subtle text-${item.history_color}`}>
                                                            <i className={`bi ${item.history_icon} fs-5`}></i>
                                                        </div>

                                                        <div>
                                                            <div className="d-flex flex-wrap gap-2 mb-2">
                                                                <span className={`badge rounded-pill text-bg-${item.history_color}`}>
                                                                    {item.history_label}
                                                                </span>

                                                                <span className={`status status-${item.status}`}>
                                                                    {item.status}
                                                                </span>
                                                            </div>

                                                            <div className="fw-black">
                                                                {item.title || '-'}
                                                            </div>

                                                            <div className="text-muted small">
                                                                {item.code || '-'} • {item.requester}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-3">
                                                    <div className="small text-muted">
                                                        Tanggal utama
                                                    </div>
                                                    <div className="fw-bold">
                                                        {formatDate(item.main_date)}
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-3 text-lg-end">
                                                    <div className="small text-muted mb-1">
                                                        {formatDateTime(item.submitted_date)}
                                                    </div>

                                                    <Link
                                                        to={item.detail_url}
                                                        className={`btn btn-sm rounded-pill ${
                                                            item.history_type === 'borrowing'
                                                                ? 'btn-success'
                                                                : 'btn-primary'
                                                        }`}
                                                    >
                                                        Detail
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Akses Cepat
                            </h4>

                            <p className="text-muted mb-4">
                                Menu yang sering digunakan.
                            </p>

                            <div className="d-flex flex-column gap-3">
                                {quickActions.map((action) => (
                                    <Link
                                        key={action.title}
                                        to={action.url}
                                        className="text-decoration-none"
                                    >
                                        <div className="p-3 rounded-4 border action-card">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={`icon-box bg-${action.color}-subtle text-${action.color}`}>
                                                    <i className={`bi ${action.icon} fs-5`}></i>
                                                </div>

                                                <div>
                                                    <div className="fw-black text-dark">
                                                        {action.title}
                                                    </div>
                                                    <div className="small text-muted">
                                                        {action.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {isAdmin && (
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Ringkasan Kategori Request
                                        </h4>
                                        <p className="text-muted mb-0">
                                            Komposisi pengajuan yang tercatat.
                                        </p>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="p-4 rounded-5 bg-primary-subtle h-100">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="text-primary fw-bold mb-1">
                                                        Merchandise
                                                    </div>
                                                    <div className="display-6 fw-black">
                                                        {summary.merchandise}
                                                    </div>
                                                </div>

                                                <i className="bi bi-gift-fill fs-1 text-primary"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-4 rounded-5 bg-success-subtle h-100">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="text-success fw-bold mb-1">
                                                        Peminjaman
                                                    </div>
                                                    <div className="display-6 fw-black">
                                                        {summary.borrowing}
                                                    </div>
                                                </div>

                                                <i className="bi bi-box-seam-fill fs-1 text-success"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Stok Rendah
                                        </h4>
                                        <p className="text-muted mb-0">
                                            Produk dengan stok 5 atau kurang.
                                        </p>
                                    </div>

                                    {isSuperadmin && (
                                        <Link to="/admin/products" className="btn btn-outline-warning rounded-pill btn-sm">
                                            Kelola
                                        </Link>
                                    )}
                                </div>

                                {lowStockProducts.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-check-circle-fill fs-1 text-success"></i>
                                        <p className="text-muted mt-2 mb-0">
                                            Tidak ada stok rendah.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {lowStockProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="p-3 rounded-4 border d-flex align-items-center justify-content-between gap-3"
                                            >
                                                <div>
                                                    <div className="fw-bold">{product.name}</div>
                                                    <div className="small text-muted">
                                                        {product.category?.name || '-'}
                                                    </div>
                                                </div>

                                                <span className="badge rounded-pill text-bg-warning">
                                                    Stok {product.stock}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}