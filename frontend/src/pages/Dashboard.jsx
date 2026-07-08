import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

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

const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export default function Dashboard() {
    const authUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const role = authUser.role || 'user';

    const isUser = role === 'user';
    const isAdmin = role === 'admin';
    const isSuperadmin = role === 'superadmin';
    const canApprove = isAdmin || isSuperadmin;

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const productRequest = api.get('/products');

            if (isUser) {
                const [productResponse, myOrderResponse, myBorrowResponse] =
                    await Promise.all([
                        productRequest,
                        api.get('/my-orders'),
                        api.get('/my-borrow-requests'),
                    ]);

                setProducts(productResponse.data.data || []);
                setOrders(myOrderResponse.data.data || []);
                setBorrowRequests(myBorrowResponse.data.data || []);
                setUsers([]);
                return;
            }

            if (canApprove) {
                const requests = [
                    productRequest,
                    api.get('/orders'),
                    api.get('/borrow-requests'),
                ];

                if (isSuperadmin) {
                    requests.push(api.get('/users'));
                }

                const responses = await Promise.all(requests);

                setProducts(responses[0].data.data || []);
                setOrders(responses[1].data.data || []);
                setBorrowRequests(responses[2].data.data || []);

                if (isSuperadmin) {
                    setUsers(responses[3].data.data || []);
                } else {
                    setUsers([]);
                }
            }
        } catch (error) {
            console.error('Dashboard error:', error.response?.data || error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const histories = useMemo(() => {
        const merchandiseHistories = orders.map((order) => ({
            id: `merchandise-${order.id}`,
            raw_id: order.id,
            type: 'merchandise',
            label: 'Merchandise',
            icon: 'bi-gift-fill',
            color: 'primary',
            code: order.order_code,
            title: order.event_name || 'Pengajuan Merchandise',
            subtitle: order.institution_name || order.user?.name || '-',
            status: order.status,
            submitted_at: order.submitted_at || order.created_at,
            detail_date: order.activity_date,
        }));

        const borrowingHistories = borrowRequests.map((request) => ({
            id: `borrowing-${request.id}`,
            raw_id: request.id,
            type: 'borrowing',
            label: 'Peminjaman',
            icon: 'bi-box-seam-fill',
            color: 'success',
            code: request.borrow_code,
            title: request.purpose || 'Pengajuan Peminjaman',
            subtitle: request.user?.name || `${formatDate(request.borrow_date)} - ${formatDate(request.return_date)}`,
            status: request.status,
            submitted_at: request.submitted_at || request.created_at,
            detail_date: request.borrow_date,
        }));

        return [...merchandiseHistories, ...borrowingHistories].sort((a, b) => {
            return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
        });
    }, [orders, borrowRequests]);

    const summary = useMemo(() => {
        const activeProducts = products.filter((product) => product.status === 'active');
        const merchandiseProducts = products.filter((product) =>
            ['checkout', 'both'].includes(product.type)
        );
        const borrowProducts = products.filter((product) =>
            ['borrow', 'both'].includes(product.type)
        );

        return {
            products: products.length,
            activeProducts: activeProducts.length,
            merchandiseProducts: merchandiseProducts.length,
            borrowProducts: borrowProducts.length,
            totalRequests: histories.length,
            merchandiseRequests: histories.filter((item) => item.type === 'merchandise').length,
            borrowRequests: histories.filter((item) => item.type === 'borrowing').length,
            pendingRequests: histories.filter((item) => item.status === 'pending').length,
            approvedRequests: histories.filter((item) => item.status === 'approved').length,
            revisionRequests: histories.filter((item) => item.status === 'revision').length,
            completedRequests: histories.filter((item) =>
                ['completed', 'returned'].includes(item.status)
            ).length,
            users: users.length,
        };
    }, [products, histories, users]);

    const recentHistories = useMemo(() => {
        return histories.slice(0, 5);
    }, [histories]);

    const lowStockProducts = useMemo(() => {
        return products
            .filter((product) => product.stock <= 5)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);
    }, [products]);

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
                                Dashboard
                            </span>

                            <h1 className="display-5 fw-black mb-3">
                                Selamat datang, {authUser.name || 'User'}.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Sistem ini digunakan untuk mengelola pengajuan merchandise,
                                layanan Humas, dan peminjaman barang Sekretariat Pimpinan
                                Telkom University Surabaya.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4 border border-white border-opacity-10">
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="rounded-4 bg-white bg-opacity-25 d-flex align-items-center justify-content-center"
                                        style={{ width: 58, height: 58 }}
                                    >
                                        <i className="bi bi-person-badge-fill fs-3"></i>
                                    </div>

                                    <div>
                                        <div className="small text-white-50">
                                            Role saat ini
                                        </div>
                                        <div className="fs-4 fw-black text-capitalize">
                                            {role}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {isUser ? (
                <>
                    <div className="row g-4 mb-4">
                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="icon-box bg-primary-subtle text-primary">
                                            <i className="bi bi-send-check-fill fs-4"></i>
                                        </div>
                                        <span className="badge rounded-pill text-bg-primary">
                                            Total
                                        </span>
                                    </div>

                                    <h2 className="fw-black mb-1">{summary.totalRequests}</h2>
                                    <p className="text-muted mb-0">Total Pengajuan Saya</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="icon-box bg-warning-subtle text-warning">
                                            <i className="bi bi-hourglass-split fs-4"></i>
                                        </div>
                                        <span className="badge rounded-pill text-bg-warning">
                                            Pending
                                        </span>
                                    </div>

                                    <h2 className="fw-black mb-1">{summary.pendingRequests}</h2>
                                    <p className="text-muted mb-0">Menunggu Approval</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="icon-box bg-success-subtle text-success">
                                            <i className="bi bi-check-circle-fill fs-4"></i>
                                        </div>
                                        <span className="badge rounded-pill text-bg-success">
                                            Approved
                                        </span>
                                    </div>

                                    <h2 className="fw-black mb-1">{summary.approvedRequests}</h2>
                                    <p className="text-muted mb-0">Sudah Disetujui</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-xl-3">
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="icon-box bg-danger-subtle text-danger">
                                            <i className="bi bi-pencil-square fs-4"></i>
                                        </div>
                                        <span className="badge rounded-pill text-bg-danger">
                                            Revisi
                                        </span>
                                    </div>

                                    <h2 className="fw-black mb-1">{summary.revisionRequests}</h2>
                                    <p className="text-muted mb-0">Perlu Perbaikan</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-6">
                            <a
                                href="/admin/request/merchandise"
                                className="card border-0 shadow-sm rounded-5 h-100 text-dark"
                            >
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="icon-box bg-primary-subtle text-primary">
                                            <i className="bi bi-gift-fill fs-4"></i>
                                        </div>

                                        <div>
                                            <h5 className="fw-black mb-1">
                                                Ajukan Merchandise
                                            </h5>
                                            <p className="text-muted mb-0">
                                                Pilih paket merchandise untuk tamu dan kegiatan.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>

                        <div className="col-md-6">
                            <a
                                href="/admin/request/sekpim-borrowing"
                                className="card border-0 shadow-sm rounded-5 h-100 text-dark"
                            >
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="icon-box bg-success-subtle text-success">
                                            <i className="bi bi-box-seam-fill fs-4"></i>
                                        </div>

                                        <div>
                                            <h5 className="fw-black mb-1">
                                                Ajukan Peminjaman
                                            </h5>
                                            <p className="text-muted mb-0">
                                                Ajukan peminjaman barang Sekpim.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>
                </>
            ) : (
                <div className="row g-4 mb-4">
                    <div className="col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="icon-box bg-primary-subtle text-primary">
                                        <i className="bi bi-send-check-fill fs-4"></i>
                                    </div>
                                    <span className="badge rounded-pill text-bg-primary">
                                        Request
                                    </span>
                                </div>

                                <h2 className="fw-black mb-1">{summary.totalRequests}</h2>
                                <p className="text-muted mb-0">Total Pengajuan</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="icon-box bg-warning-subtle text-warning">
                                        <i className="bi bi-hourglass-split fs-4"></i>
                                    </div>
                                    <span className="badge rounded-pill text-bg-warning">
                                        Pending
                                    </span>
                                </div>

                                <h2 className="fw-black mb-1">{summary.pendingRequests}</h2>
                                <p className="text-muted mb-0">Butuh Approval</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="icon-box bg-success-subtle text-success">
                                        <i className="bi bi-box-seam-fill fs-4"></i>
                                    </div>
                                    <span className="badge rounded-pill text-bg-success">
                                        Produk
                                    </span>
                                </div>

                                <h2 className="fw-black mb-1">{summary.activeProducts}</h2>
                                <p className="text-muted mb-0">Produk Aktif</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="icon-box bg-danger-subtle text-danger">
                                        <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                                    </div>
                                    <span className="badge rounded-pill text-bg-danger">
                                        Stock
                                    </span>
                                </div>

                                <h2 className="fw-black mb-1">{lowStockProducts.length}</h2>
                                <p className="text-muted mb-0">Stok Rendah</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        {isUser ? 'Riwayat Terbaru Saya' : 'Pengajuan Terbaru'}
                                    </h4>
                                    <p className="text-muted mb-0">
                                        Gabungan pengajuan merchandise dan peminjaman.
                                    </p>
                                </div>

                                <a
                                    href={isUser ? '/admin/my-requests' : '/admin/orders'}
                                    className="btn btn-outline-primary rounded-pill"
                                >
                                    Lihat Detail
                                </a>
                            </div>

                            {recentHistories.length === 0 ? (
                                <div className="p-5 rounded-5 bg-light text-center">
                                    <i className="bi bi-inbox fs-1 text-muted"></i>
                                    <h5 className="fw-black mt-3 mb-1">
                                        Belum ada pengajuan
                                    </h5>
                                    <p className="text-muted mb-0">
                                        Data pengajuan akan muncul setelah ada request baru.
                                    </p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {recentHistories.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 p-md-4 rounded-5 border bg-white"
                                        >
                                            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                                                <div className="d-flex gap-3">
                                                    <div
                                                        className={`icon-box bg-${item.color}-subtle text-${item.color}`}
                                                    >
                                                        <i className={`bi ${item.icon} fs-4`}></i>
                                                    </div>

                                                    <div>
                                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                            <span className={`badge rounded-pill text-bg-${item.color}`}>
                                                                {item.label}
                                                            </span>

                                                            <span className={`status status-${item.status}`}>
                                                                {item.status}
                                                            </span>
                                                        </div>

                                                        <h6 className="fw-black mb-1">
                                                            {item.title}
                                                        </h6>

                                                        <p className="text-muted mb-0">
                                                            {item.code || '-'} • {item.subtitle || '-'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-md-end">
                                                    <div className="small text-muted">
                                                        Diajukan
                                                    </div>
                                                    <div className="fw-bold">
                                                        {formatDateTime(item.submitted_at)}
                                                    </div>
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
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">Ringkasan Jenis</h4>
                            <p className="text-muted mb-4">
                                Perbandingan data merchandise dan peminjaman.
                            </p>

                            <div className="d-flex flex-column gap-3">
                                <div className="p-3 rounded-4 bg-primary-subtle">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div className="fw-black text-primary">
                                                Merchandise
                                            </div>
                                            <div className="small text-muted">
                                                Request merchandise
                                            </div>
                                        </div>

                                        <div className="fs-3 fw-black text-primary">
                                            {summary.merchandiseRequests}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-success-subtle">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div className="fw-black text-success">
                                                Peminjaman
                                            </div>
                                            <div className="small text-muted">
                                                Request barang Sekpim
                                            </div>
                                        </div>

                                        <div className="fs-3 fw-black text-success">
                                            {summary.borrowRequests}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div className="fw-black text-dark">
                                                Selesai / Kembali
                                            </div>
                                            <div className="small text-muted">
                                                Request sudah tuntas
                                            </div>
                                        </div>

                                        <div className="fs-3 fw-black text-dark">
                                            {summary.completedRequests}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {canApprove && (
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">Stok Rendah</h4>
                                <p className="text-muted mb-4">
                                    Produk dengan stok 5 atau kurang.
                                </p>

                                {lowStockProducts.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-check-circle-fill fs-1 text-success"></i>
                                        <p className="text-muted mb-0 mt-2">
                                            Tidak ada stok rendah.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {lowStockProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-4 border"
                                            >
                                                <div>
                                                    <div className="fw-black">
                                                        {product.name}
                                                    </div>
                                                    <div className="small text-muted">
                                                        {product.category?.name || '-'}
                                                    </div>
                                                </div>

                                                <span className="badge rounded-pill text-bg-danger">
                                                    {product.stock}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {isSuperadmin && (
                        <section className="card border-0 shadow-sm rounded-5 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">Superadmin</h4>
                                <p className="text-muted mb-4">
                                    Ringkasan data master sistem.
                                </p>

                                <div className="row g-3">
                                    <div className="col-6">
                                        <div className="p-3 rounded-4 bg-light text-center">
                                            <div className="fs-3 fw-black">
                                                {summary.users}
                                            </div>
                                            <div className="small text-muted">
                                                User
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-6">
                                        <div className="p-3 rounded-4 bg-light text-center">
                                            <div className="fs-3 fw-black">
                                                {summary.products}
                                            </div>
                                            <div className="small text-muted">
                                                Produk
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}