import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const statusOptions = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'revision', label: 'Revisi' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'completed', label: 'Selesai' },
    { key: 'borrowed', label: 'Dipinjam' },
    { key: 'returned', label: 'Kembali' },
];

const typeOptions = [
    { key: 'all', label: 'Semua Jenis' },
    { key: 'merchandise', label: 'Merchandise' },
    { key: 'borrowing', label: 'Peminjaman' },
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

export default function MyRequestsPage() {
    const [orders, setOrders] = useState([]);
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);

            const [ordersResponse, borrowResponse] = await Promise.all([
                api.get('/my-orders'),
                api.get('/my-borrow-requests'),
            ]);

            setOrders(ordersResponse.data.data || []);
            setBorrowRequests(borrowResponse.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRequests();
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
            main_date: order.activity_date,
            submitted_date: order.submitted_at || order.created_at,
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
            main_date: request.borrow_date,
            submitted_date: request.submitted_at || request.created_at,
        }));

        return [...merchandiseHistories, ...borrowingHistories].sort((a, b) => {
            return new Date(b.submitted_date || b.created_at) - new Date(a.submitted_date || a.created_at);
        });
    }, [orders, borrowRequests]);

    const filteredHistories = useMemo(() => {
        return histories.filter((item) => {
            const searchValue = search.toLowerCase();

            const matchStatus =
                selectedStatus === 'all' || item.status === selectedStatus;

            const matchType =
                selectedType === 'all' || item.history_type === selectedType;

            const matchSearch =
                item.code?.toLowerCase().includes(searchValue) ||
                item.title?.toLowerCase().includes(searchValue) ||
                item.subtitle?.toLowerCase().includes(searchValue) ||
                item.user_note?.toLowerCase().includes(searchValue) ||
                item.admin_note?.toLowerCase().includes(searchValue);

            return matchStatus && matchType && matchSearch;
        });
    }, [histories, selectedStatus, selectedType, search]);

    const summary = useMemo(() => {
        return {
            total: histories.length,
            merchandise: histories.filter((item) => item.history_type === 'merchandise').length,
            borrowing: histories.filter((item) => item.history_type === 'borrowing').length,
            pending: histories.filter((item) => item.status === 'pending').length,
            approved: histories.filter((item) => item.status === 'approved').length,
            revision: histories.filter((item) => item.status === 'revision').length,
        };
    }, [histories]);

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
                                Riwayat Pengajuan
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Pantau semua pengajuan kamu di satu halaman.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 720, lineHeight: 1.8 }}
                            >
                                Halaman ini menampilkan riwayat pengajuan merchandise dan
                                peminjaman barang Sekpim, lengkap dengan status approval
                                serta catatan dari admin.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.total}</div>
                                        <div className="small text-white-50">Total</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.pending}</div>
                                        <div className="small text-white-50">Pending</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.merchandise}</div>
                                        <div className="small text-white-50">Merchandise</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.borrowing}</div>
                                        <div className="small text-white-50">Peminjaman</div>
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
                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Cari riwayat</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Kode, kegiatan, keperluan..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Filter jenis</label>
                            <div className="d-flex flex-wrap gap-2">
                                {typeOptions.map((type) => (
                                    <button
                                        key={type.key}
                                        type="button"
                                        className={`btn rounded-pill ${
                                            selectedType === type.key
                                                ? 'btn-primary'
                                                : 'btn-outline-primary'
                                        }`}
                                        onClick={() => setSelectedType(type.key)}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Filter status</label>
                            <select
                                className="form-select"
                                value={selectedStatus}
                                onChange={(event) => setSelectedStatus(event.target.value)}
                            >
                                {statusOptions.map((status) => (
                                    <option key={status.key} value={status.key}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-primary mb-3" />
                        <p className="text-muted mb-0">Memuat riwayat pengajuan...</p>
                    </div>
                </div>
            ) : filteredHistories.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{ width: 76, height: 76 }}
                        >
                            <i className="bi bi-inbox fs-1"></i>
                        </div>
                        <h5 className="fw-black mb-2">Belum ada riwayat</h5>
                        <p className="text-muted mb-0">
                            Data tidak ditemukan berdasarkan filter yang kamu pilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredHistories.map((item) => (
                        <div className="col-12" key={`${item.history_type}-${item.id}`}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                                        <div className="d-flex gap-3">
                                            <div
                                                className={`icon-box bg-${item.history_color}-subtle text-${item.history_color}`}
                                            >
                                                <i className={`bi ${item.history_icon} fs-4`}></i>
                                            </div>

                                            <div>
                                                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                    <span className={`badge rounded-pill text-bg-${item.history_color}`}>
                                                        {item.history_label}
                                                    </span>

                                                    <span className={`status status-${item.status}`}>
                                                        {item.status}
                                                    </span>
                                                </div>

                                                <h5 className="fw-black mb-1">
                                                    {item.title || '-'}
                                                </h5>

                                                <p className="text-muted mb-0">
                                                    {item.code || '-'} • {item.subtitle || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-lg-end">
                                            <div className="small text-muted">
                                                Tanggal submit
                                            </div>
                                            <div className="fw-bold">
                                                {formatDateTime(item.submitted_date)}
                                            </div>
                                        </div>
                                    </div>

                                    {item.history_type === 'merchandise' && (
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-3">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Nama tamu</div>
                                                    <div className="fw-bold">{item.guest_name || '-'}</div>
                                                </div>
                                            </div>

                                            <div className="col-md-3">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Jabatan tamu</div>
                                                    <div className="fw-bold">{item.guest_position || '-'}</div>
                                                </div>
                                            </div>

                                            <div className="col-md-3">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Tanggal kegiatan</div>
                                                    <div className="fw-bold">{formatDate(item.activity_date)}</div>
                                                </div>
                                            </div>

                                            <div className="col-md-3">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Lampiran</div>
                                                    {item.proof_file_url ? (
                                                        <a
                                                            href={item.proof_file_url}
                                                            className="fw-bold"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Buka file
                                                        </a>
                                                    ) : (
                                                        <div className="fw-bold">-</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {item.history_type === 'borrowing' && (
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-4">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Tanggal pinjam</div>
                                                    <div className="fw-bold">{formatDate(item.borrow_date)}</div>
                                                </div>
                                            </div>

                                            <div className="col-md-4">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Tanggal kembali</div>
                                                    <div className="fw-bold">{formatDate(item.return_date)}</div>
                                                </div>
                                            </div>

                                            <div className="col-md-4">
                                                <div className="p-3 rounded-4 bg-light h-100">
                                                    <div className="small text-muted">Kode peminjaman</div>
                                                    <div className="fw-bold">{item.borrow_code || '-'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="table-responsive rounded-4 border mb-3">
                                        <table className="table align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Kategori</th>
                                                    <th className="text-end">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.items?.map((requestItem) => (
                                                    <tr key={requestItem.id}>
                                                        <td className="fw-bold">
                                                            {requestItem.product?.name || '-'}
                                                        </td>
                                                        <td>
                                                            {requestItem.product?.category?.name || '-'}
                                                        </td>
                                                        <td className="text-end fw-bold">
                                                            {requestItem.quantity}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="row g-3">
                                        {item.history_type === 'merchandise' && (
                                            <div className="col-md-6">
                                                <div className="p-3 rounded-4 border h-100">
                                                    <div className="small fw-bold text-muted mb-1">
                                                        Catatan pemohon
                                                    </div>
                                                    <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                                        {item.user_note || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className={item.history_type === 'merchandise' ? 'col-md-6' : 'col-12'}>
                                            <div className="p-3 rounded-4 border h-100">
                                                <div className="small fw-bold text-muted mb-1">
                                                    Catatan admin
                                                </div>
                                                <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                                    {item.admin_note || 'Belum ada catatan admin.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}