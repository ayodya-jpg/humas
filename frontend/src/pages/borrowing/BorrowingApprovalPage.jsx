import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { showErrorAlert } from '../../utils/sweetAlert';

const statusOptions = [
    { key: 'all', label: 'Semua', icon: 'bi-collection-fill' },
    { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split' },
    { key: 'approved', label: 'Approved', icon: 'bi-check-circle-fill' },
    { key: 'borrowed', label: 'Dipinjam', icon: 'bi-box-arrow-up' },
    { key: 'returned', label: 'Dikembalikan', icon: 'bi-box-arrow-in-down' },
    { key: 'revision', label: 'Revisi', icon: 'bi-pencil-square' },
    { key: 'rejected', label: 'Ditolak', icon: 'bi-x-circle-fill' },
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

export default function BorrowingApprovalPage() {
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchBorrowRequests = async () => {
        try {
            setLoading(true);

            const response = await api.get('/borrow-requests');
            setBorrowRequests(response.data.data || []);
        } catch (error) {
            console.error('Fetch borrowing approval error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data approval peminjaman gagal dimuat.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBorrowRequests();
    }, []);

    const filteredBorrowRequests = useMemo(() => {
        return borrowRequests.filter((request) => {
            const searchValue = search.toLowerCase();

            const matchStatus =
                selectedStatus === 'all' || request.status === selectedStatus;

            const matchSearch =
                request.borrow_code?.toLowerCase().includes(searchValue) ||
                request.purpose?.toLowerCase().includes(searchValue) ||
                request.user?.name?.toLowerCase().includes(searchValue) ||
                request.admin_note?.toLowerCase().includes(searchValue) ||
                request.items?.some((item) =>
                    item.product?.name?.toLowerCase().includes(searchValue)
                );

            return matchStatus && matchSearch;
        });
    }, [borrowRequests, selectedStatus, search]);

    const summary = useMemo(() => {
        return statusOptions.reduce((result, status) => {
            if (status.key === 'all') {
                result[status.key] = borrowRequests.length;
                return result;
            }

            result[status.key] = borrowRequests.filter(
                (request) => request.status === status.key
            ).length;

            return result;
        }, {});
    }, [borrowRequests]);

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-success px-3 py-2 mb-3">
                                Approval Peminjaman
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Daftar pengajuan peminjaman.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Halaman ini dibuat ringkas. Untuk melihat detail barang,
                                tanggal, keperluan, dan memproses approval peminjaman,
                                buka halaman detail pengajuan.
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
                                        <div className="fs-3 fw-black">{summary.borrowed || 0}</div>
                                        <div className="small text-white-50">Dipinjam</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.returned || 0}</div>
                                        <div className="small text-white-50">Kembali</div>
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
                                    placeholder="Kode, pemohon, keperluan, barang..."
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
                                                ? 'btn-success ring-active-success'
                                                : 'btn-outline-success'
                                        }`}
                                        onClick={() => setSelectedStatus(status.key)}
                                    >
                                        <i className={`bi ${status.icon} me-2`}></i>
                                        {status.label}
                                        <span className="ms-2 badge rounded-pill text-bg-light text-success">
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
                        <div className="spinner-border text-success mb-3" />
                        <p className="text-muted mb-0">Memuat data approval peminjaman...</p>
                    </div>
                </div>
            ) : filteredBorrowRequests.length === 0 ? (
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
                            Tidak ada pengajuan peminjaman berdasarkan filter yang dipilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredBorrowRequests.map((request) => (
                        <div className="col-12" key={request.id}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-lg-6">
                                            <div className="d-flex gap-3">
                                                <div className="icon-box bg-success-subtle text-success">
                                                    <i className="bi bi-box-seam-fill fs-4"></i>
                                                </div>

                                                <div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        <span className="badge rounded-pill text-bg-success">
                                                            {request.borrow_code}
                                                        </span>

                                                        <span className={`status status-${request.status}`}>
                                                            {request.status}
                                                        </span>
                                                    </div>

                                                    <h5 className="fw-black mb-1">
                                                        {request.purpose || 'Pengajuan Peminjaman'}
                                                    </h5>

                                                    <p className="text-muted mb-0">
                                                        Pemohon: <strong>{request.user?.name || '-'}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Tanggal pinjam</div>
                                            <div className="fw-bold">{formatDate(request.borrow_date)}</div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Tanggal kembali</div>
                                            <div className="fw-bold">{formatDate(request.return_date)}</div>
                                        </div>

                                        <div className="col-lg-2 text-lg-end">
                                            <div className="small text-muted mb-1">
                                                {formatDateTime(request.submitted_at || request.created_at)}
                                            </div>

                                            <Link
                                                to={`/admin/borrow-requests/${request.id}`}
                                                className="btn btn-success rounded-pill"
                                            >
                                                <i className="bi bi-eye-fill me-2"></i>
                                                Detail
                                            </Link>
                                        </div>
                                    </div>

                                    {request.admin_note && (
                                        <div className="mt-3 p-3 rounded-4 bg-light border">
                                            <div className="small fw-bold text-muted mb-1">
                                                Catatan admin terakhir
                                            </div>
                                            <p className="mb-0 text-muted">
                                                {request.admin_note}
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