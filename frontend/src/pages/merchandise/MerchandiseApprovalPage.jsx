import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { showErrorAlert } from '../../utils/sweetAlert';

const statusOptions = [
    { key: 'all', label: 'Semua', icon: 'bi-collection-fill' },
    { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split' },
    { key: 'approved', label: 'Approved', icon: 'bi-check-circle-fill' },
    { key: 'revision', label: 'Revisi', icon: 'bi-pencil-square' },
    { key: 'rejected', label: 'Ditolak', icon: 'bi-x-circle-fill' },
    { key: 'completed', label: 'Selesai', icon: 'bi-patch-check-fill' },
];

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

export default function MerchandiseApprovalPage() {
    const [orders, setOrders] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            setLoading(true);

            const response = await api.get('/orders');
            setOrders(response.data.data || []);
        } catch (error) {
            console.error('Fetch merchandise approval error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data approval merchandise gagal dimuat.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const searchValue = search.toLowerCase();

            const matchStatus =
                selectedStatus === 'all' || order.status === selectedStatus;

            const matchSearch =
                order.order_code?.toLowerCase().includes(searchValue) ||
                order.event_name?.toLowerCase().includes(searchValue) ||
                order.institution_name?.toLowerCase().includes(searchValue) ||
                order.guest_name?.toLowerCase().includes(searchValue) ||
                order.user?.name?.toLowerCase().includes(searchValue) ||
                order.user_note?.toLowerCase().includes(searchValue) ||
                order.admin_note?.toLowerCase().includes(searchValue);

            return matchStatus && matchSearch;
        });
    }, [orders, selectedStatus, search]);

    const summary = useMemo(() => {
        return statusOptions.reduce((result, status) => {
            if (status.key === 'all') {
                result[status.key] = orders.length;
                return result;
            }

            result[status.key] = orders.filter((order) => order.status === status.key).length;
            return result;
        }, {});
    }, [orders]);

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Approval Merchandise
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Daftar pengajuan merchandise.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Halaman ini dibuat ringkas. Untuk melihat detail kegiatan,
                                lampiran, item, dan memproses approval, buka halaman detail
                                pengajuan.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.all || 0}</div>
                                        <div className="small text-white-50">Total</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.pending || 0}</div>
                                        <div className="small text-white-50">Pending</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.approved || 0}</div>
                                        <div className="small text-white-50">Approved</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.completed || 0}</div>
                                        <div className="small text-white-50">Selesai</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">Cari pengajuan</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Kode, kegiatan, instansi, tamu, pemohon..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-7">
                            <label className="form-label fw-bold">Filter status</label>
                            <div className="d-flex flex-wrap gap-2">
                                {statusOptions.map((status) => (
                                    <button
                                        key={status.key}
                                        type="button"
                                        className={`btn rounded-pill ${
                                            selectedStatus === status.key
                                                ? 'btn-primary ring-active'
                                                : 'btn-outline-primary'
                                        }`}
                                        onClick={() => setSelectedStatus(status.key)}
                                    >
                                        <i className={`bi ${status.icon} me-2`}></i>
                                        {status.label}
                                        <span className="ms-2 badge rounded-pill text-bg-light text-primary">
                                            {summary[status.key] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-primary mb-3" />
                        <p className="text-muted mb-0">Memuat data approval merchandise...</p>
                    </div>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{ width: 76, height: 76 }}
                        >
                            <i className="bi bi-inbox fs-1"></i>
                        </div>

                        <h5 className="fw-black mb-2">Data tidak ditemukan</h5>

                        <p className="text-muted mb-0">
                            Tidak ada pengajuan merchandise berdasarkan filter yang dipilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredOrders.map((order) => (
                        <div className="col-12" key={order.id}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-lg-6">
                                            <div className="d-flex gap-3">
                                                <div className="icon-box bg-primary-subtle text-primary">
                                                    <i className="bi bi-gift-fill fs-4"></i>
                                                </div>

                                                <div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        <span className="badge rounded-pill text-bg-primary">
                                                            {order.order_code}
                                                        </span>

                                                        <span className={`status status-${order.status}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>

                                                    <h5 className="fw-black mb-1">
                                                        {order.event_name || 'Pengajuan Merchandise'}
                                                    </h5>

                                                    <p className="text-muted mb-0">
                                                        Pemohon: <strong>{order.user?.name || '-'}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Instansi</div>
                                            <div className="fw-bold">{order.institution_name || '-'}</div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Tanggal kegiatan</div>
                                            <div className="fw-bold">{formatDate(order.activity_date)}</div>
                                        </div>

                                        <div className="col-lg-2 text-lg-end">
                                            <div className="small text-muted mb-1">
                                                {formatDateTime(order.submitted_at || order.created_at)}
                                            </div>

                                            <Link
                                                to={`/admin/orders/${order.id}`}
                                                className="btn btn-primary rounded-pill"
                                            >
                                                <i className="bi bi-eye-fill me-2"></i>
                                                Detail
                                            </Link>
                                        </div>
                                    </div>

                                    {order.admin_note && (
                                        <div className="mt-3 p-3 rounded-4 bg-light border">
                                            <div className="small fw-bold text-muted mb-1">
                                                Catatan admin terakhir
                                            </div>
                                            <p className="mb-0 text-muted">
                                                {order.admin_note}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}