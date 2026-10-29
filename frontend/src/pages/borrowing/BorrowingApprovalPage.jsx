
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { showErrorAlert } from '../../utils/sweetAlert';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'borrowed', label: 'Dipinjam' },
    { value: 'returned', label: 'Dikembalikan' },
    { value: 'completed', label: 'Selesai' },
    { value: 'revision', label: 'Revisi' },
    { value: 'rejected', label: 'Ditolak' },
];

const extractRows = (response) => {
    const data = response?.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

const dateLabel = (value) => {
    if (!value) return '-';
    const text = String(value).slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? new Date(`${text}T12:00:00`)
        : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

export default function BorrowingApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/borrow-requests');
            setRequests(extractRows(response));
        } catch (error) {
            await showErrorAlert(
                'Gagal Memuat Pengajuan',
                error?.response?.data?.message || 'Tidak dapat memuat pengajuan SEKPiM.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const counts = useMemo(() => {
        const result = { all: requests.length };
        STATUS_OPTIONS.forEach(({ value }) => {
            if (value !== 'all') {
                result[value] = requests.filter((item) => item.status === value).length;
            }
        });
        return result;
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const term = search.trim().toLowerCase();
        return requests.filter((request) => {
            if (status !== 'all' && request.status !== status) return false;
            if (!term) return true;
            return [
                request.borrow_code,
                request.purpose,
                request.pic_name,
                request.user?.name,
                ...(request.items || []).map((item) => item.product?.name),
            ].filter(Boolean).join(' ').toLowerCase().includes(term);
        });
    }, [requests, search, status]);

    return (
        <div className="container-fluid px-0">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3">
                <div
                    className="card-body text-white p-4"
                    style={{ background: 'linear-gradient(115deg,#047857,#0f172a)' }}
                >
                    <span className="badge bg-white text-success rounded-pill mb-2">ADMIN SEKPiM</span>
                    <h2 className="fw-bold mb-1">Peminjaman &amp; Request Aset</h2>
                    <p className="mb-0 opacity-75 small">
                        Tinjau pengajuan, proses persetujuan, dan catat serah terima barang.
                    </p>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                        <span className="badge bg-white bg-opacity-25 p-2">Total: {counts.all}</span>
                        <span className="badge bg-white bg-opacity-25 p-2">Menunggu: {counts.pending || 0}</span>
                        <span className="badge bg-white bg-opacity-25 p-2">Disetujui: {counts.approved || 0}</span>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-3">
                <div className="card-body p-3 p-lg-4">
                    <div className="row g-3">
                        <div className="col-lg-4">
                            <label className="form-label fw-semibold small">Cari pengajuan</label>
                            <input
                                type="search" className="form-control"
                                placeholder="Kode, nama pemohon, barang..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-lg-8">
                            <label className="form-label fw-semibold small">Filter status</label>
                            <div className="d-flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((item) => (
                                    <button
                                        key={item.value} type="button"
                                        className={`btn btn-sm rounded-pill ${
                                            status === item.value ? 'btn-success' : 'btn-outline-success'
                                        }`}
                                        onClick={() => setStatus(item.value)}
                                    >
                                        {item.label} <span className="badge bg-white text-dark ms-1">
                                            {counts[item.value] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-5"><span className="spinner-border text-success" /></div>
            ) : filteredRequests.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                    <i className="bi bi-inbox fs-1 text-muted" />
                    <h5 className="mt-3">Tidak ada pengajuan</h5>
                    <p className="text-muted mb-0">Coba gunakan pencarian atau status lainnya.</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-3 p-lg-4">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                    <div className="d-flex gap-3 align-items-start">
                                        <div className="rounded-3 bg-success-subtle text-success p-3">
                                            <i className="bi bi-box-seam-fill fs-5" />
                                        </div>
                                        <div>
                                            <div className="d-flex flex-wrap gap-2 mb-2">
                                                <span className="badge text-bg-success">
                                                    {request.borrow_code || `BRW-${request.id}`}
                                                </span>
                                                <span className="badge bg-light border text-dark">
                                                    {STATUS_OPTIONS.find((x) => x.value === request.status)?.label || request.status}
                                                </span>
                                                <span className="badge bg-primary-subtle text-primary">
                                                    {request.request_type === 'asset_request' ? 'Request Aset' : 'Peminjaman'}
                                                </span>
                                            </div>
                                            <h5 className="fw-bold mb-1">
                                                {request.purpose || 'Pengajuan Barang SEKPiM'}
                                            </h5>
                                            <div className="small text-muted">
                                                Pemohon: {request.user?.name || request.pic_name || '-'}
                                            </div>
                                            <div className="small text-muted mt-1">
                                                Pengambilan: {dateLabel(request.borrow_date)}
                                                {request.request_type !== 'asset_request' &&
                                                    ` • Pengembalian: ${dateLabel(request.return_date)}`}
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        className="btn btn-success rounded-pill px-4"
                                        to={`/admin/borrow-requests/${request.id}`}
                                    >
                                        <i className="bi bi-eye me-2" />Detail
                                    </Link>
                                </div>
                                {request.admin_note && (
                                    <div className="bg-light p-3 rounded-3 small mt-3">
                                        Catatan admin: {request.admin_note}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
