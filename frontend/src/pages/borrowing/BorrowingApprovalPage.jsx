import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const borrowingStatusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'revision', label: 'Revision' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'borrowed', label: 'Borrowed' },
    { value: 'returned', label: 'Returned' },
];

export default function BorrowingApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [adminNotes, setAdminNotes] = useState({});
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchRequests = async () => {
        try {
            setLoadingRequests(true);
            setErrorMessage('');

            const response = await api.get('/borrow-requests');
            setRequests(response.data.data);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data permintaan peminjaman.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Data', backendMessage);
            console.error(error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return requests.filter((request) => {
            const matchStatus =
                selectedStatus === 'all' || request.status === selectedStatus;

            const matchKeyword =
                request.borrow_code?.toLowerCase().includes(keyword) ||
                request.purpose?.toLowerCase().includes(keyword) ||
                request.user?.name?.toLowerCase().includes(keyword) ||
                request.items?.some((item) =>
                    item.product?.name?.toLowerCase().includes(keyword)
                );

            return matchStatus && matchKeyword;
        });
    }, [requests, selectedStatus, searchKeyword]);

    const summary = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter((item) => item.status === 'pending').length,
            approved: requests.filter((item) => item.status === 'approved').length,
            revision: requests.filter((item) => item.status === 'revision').length,
            rejected: requests.filter((item) => item.status === 'rejected').length,
            borrowed: requests.filter((item) => item.status === 'borrowed').length,
            returned: requests.filter((item) => item.status === 'returned').length,
        };
    }, [requests]);

    const handleNoteChange = (requestId, value) => {
        setAdminNotes((prev) => ({
            ...prev,
            [requestId]: value,
        }));
    };

    const getAdminNote = (requestId) => {
        return adminNotes[requestId] || '';
    };

    const clearAdminNote = (requestId) => {
        setAdminNotes((prev) => ({
            ...prev,
            [requestId]: '',
        }));
    };

    const handleApprove = async (request) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Approve Peminjaman?',
            text: `Pengajuan ${request.borrow_code} akan disetujui dan stok barang akan dikurangi.`,
            confirmButtonText: 'Ya, approve',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Memproses Approval', 'Mohon tunggu, pengajuan sedang disetujui.');

        try {
            const response = await api.put(`/borrow-requests/${request.id}/approve`);

            closeAlert();

            setMessage(response.data.message);
            await fetchRequests();

            showSuccessAlert(
                'Peminjaman Disetujui',
                'Pengajuan peminjaman berhasil di-approve.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Approval peminjaman gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Approval Gagal', backendMessage);
            console.error(error);
        }
    };

    const handleRevision = async (request) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(request.id).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum meminta revisi.');
            showWarningAlert(
                'Catatan Revisi Wajib Diisi',
                'Isi alasan revisi agar pemohon memahami bagian yang perlu diperbaiki.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: 'Minta Revisi Peminjaman?',
            text: `Pengajuan ${request.borrow_code} akan dikembalikan ke pemohon untuk diperbaiki.`,
            confirmButtonText: 'Ya, minta revisi',
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Mengirim Revisi', 'Mohon tunggu, catatan revisi sedang dikirim.');

        try {
            const response = await api.put(`/borrow-requests/${request.id}/revision`, {
                admin_note: note,
            });

            closeAlert();

            setMessage(response.data.message);
            clearAdminNote(request.id);
            await fetchRequests();

            showSuccessAlert(
                'Revisi Dikirim',
                'Pengajuan sudah dikembalikan ke pemohon untuk direvisi.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal meminta revisi pengajuan peminjaman.';

            setErrorMessage(backendMessage);
            showErrorAlert('Revisi Gagal', backendMessage);
            console.error(error);
        }
    };

    const handleReject = async (request) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(request.id).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum menolak pengajuan.');
            showWarningAlert(
                'Catatan Penolakan Wajib Diisi',
                'Isi alasan penolakan agar pemohon memahami keputusan admin.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: 'Tolak Peminjaman?',
            text: `Pengajuan ${request.borrow_code} akan ditolak.`,
            confirmButtonText: 'Ya, tolak',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menolak Pengajuan', 'Mohon tunggu, keputusan sedang diproses.');

        try {
            const response = await api.put(`/borrow-requests/${request.id}/reject`, {
                admin_note: note,
            });

            closeAlert();

            setMessage(response.data.message);
            clearAdminNote(request.id);
            await fetchRequests();

            showSuccessAlert(
                'Peminjaman Ditolak',
                'Pengajuan peminjaman berhasil ditolak.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menolak pengajuan peminjaman.';

            setErrorMessage(backendMessage);
            showErrorAlert('Penolakan Gagal', backendMessage);
            console.error(error);
        }
    };

    const handleBorrowed = async (request) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Tandai Sudah Dipinjam?',
            text: `Barang pada pengajuan ${request.borrow_code} akan ditandai sudah diambil/dipinjam.`,
            confirmButtonText: 'Ya, tandai dipinjam',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Memperbarui Status', 'Mohon tunggu, status sedang diperbarui.');

        try {
            const response = await api.put(`/borrow-requests/${request.id}/borrowed`);

            closeAlert();

            setMessage(response.data.message);
            await fetchRequests();

            showSuccessAlert(
                'Status Diperbarui',
                'Pengajuan berhasil ditandai sudah dipinjam.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menandai barang sebagai dipinjam.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Memperbarui Status', backendMessage);
            console.error(error);
        }
    };

    const handleReturned = async (request) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Tandai Sudah Dikembalikan?',
            text: `Barang pada pengajuan ${request.borrow_code} akan ditandai sudah dikembalikan dan stok akan dikembalikan.`,
            confirmButtonText: 'Ya, tandai kembali',
            icon: 'question',
            confirmButtonColor: '#0f766e',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Memproses Pengembalian', 'Mohon tunggu, stok dan status sedang diperbarui.');

        try {
            const response = await api.put(`/borrow-requests/${request.id}/returned`);

            closeAlert();

            setMessage(response.data.message);
            await fetchRequests();

            showSuccessAlert(
                'Barang Dikembalikan',
                'Peminjaman berhasil ditandai selesai dan stok sudah dikembalikan.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menandai barang sebagai dikembalikan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Memproses Pengembalian', backendMessage);
            console.error(error);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return '-';
        }

        return new Date(dateValue).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const getStatusCount = (status) => {
        if (status === 'all') {
            return summary.total;
        }

        return summary[status] || 0;
    };

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #2563eb 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-9">
                            <span className="text-white-50 small fw-bold text-uppercase">
                                Borrowing Approval
                            </span>

                            <h2 className="display-5 fw-black mt-2 mb-3">
                                Approval Peminjaman Sekpim
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Tinjau pengajuan peminjaman barang Sekpim berdasarkan barang,
                                jumlah, tanggal pinjam, tanggal kembali, dan keperluan.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <button
                                className="btn btn-light rounded-pill fw-bold w-100"
                                type="button"
                                onClick={fetchRequests}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {message && (
                <div className="alert alert-success rounded-4">
                    {message}
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger rounded-4">
                    {errorMessage}
                </div>
            )}

            <div className="row g-3 mb-4">
                {borrowingStatusOptions.map((option) => (
                    <div className="col-6 col-md-4 col-xl" key={option.value}>
                        <button
                            type="button"
                            className={`card border-0 shadow-sm rounded-5 w-100 h-100 text-start ${
                                selectedStatus === option.value ? 'ring-active-success' : ''
                            }`}
                            onClick={() => setSelectedStatus(option.value)}
                        >
                            <div className="card-body p-3 p-lg-4">
                                <p className="text-muted small fw-bold text-uppercase mb-2">
                                    {option.label}
                                </p>

                                <h3 className="fw-black mb-0">
                                    {getStatusCount(option.value)}
                                </h3>
                            </div>
                        </button>
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-8">
                            <label className="form-label fw-bold">
                                Cari Peminjaman
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 rounded-start-4">
                                    <i className="bi bi-search"></i>
                                </span>

                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(event) => setSearchKeyword(event.target.value)}
                                    className="form-control border-start-0 rounded-end-4"
                                    placeholder="Cari kode, pemohon, keperluan, atau nama barang..."
                                />
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <label className="form-label fw-bold">
                                Status
                            </label>

                            <select
                                value={selectedStatus}
                                onChange={(event) => setSelectedStatus(event.target.value)}
                                className="form-select rounded-4"
                            >
                                {borrowingStatusOptions.map((option) => (
                                    <option value={option.value} key={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {loadingRequests && (
                <div className="alert alert-primary rounded-4">
                    Sedang mengambil data permintaan peminjaman...
                </div>
            )}

            {!loadingRequests && filteredRequests.length === 0 && (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="icon-box bg-success-subtle text-success mx-auto mb-3">
                            <i className="bi bi-inbox-fill fs-4"></i>
                        </div>

                        <h4 className="fw-black">
                            Tidak ada permintaan
                        </h4>

                        <p className="text-muted mb-0">
                            Tidak ada permintaan peminjaman sesuai filter yang dipilih.
                        </p>
                    </div>
                </div>
            )}

            <div className="d-grid gap-3">
                {filteredRequests.map((request) => (
                    <article className="card border-0 shadow-sm rounded-5 overflow-hidden" key={request.id}>
                        <div className="card-body p-4">
                            <div className="row g-4 align-items-start">
                                <div className="col-lg-7">
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                        <h4 className="fw-black mb-0">
                                            {request.borrow_code}
                                        </h4>

                                        <span className={`status status-${request.status}`}>
                                            {request.status}
                                        </span>
                                    </div>

                                    <p className="text-muted mb-0">
                                        Diajukan oleh{' '}
                                        <strong className="text-dark">
                                            {request.user?.name || 'User tidak diketahui'}
                                        </strong>
                                    </p>
                                </div>

                                <div className="col-lg-5">
                                    <div className="row g-2">
                                        <div className="col-md-6">
                                            <div className="bg-light border rounded-4 p-3 h-100">
                                                <span className="d-block text-muted small fw-bold text-uppercase mb-1">
                                                    Tanggal Pinjam
                                                </span>

                                                <strong>
                                                    {formatDate(request.borrow_date)}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="bg-light border rounded-4 p-3 h-100">
                                                <span className="d-block text-muted small fw-bold text-uppercase mb-1">
                                                    Tanggal Kembali
                                                </span>

                                                <strong>
                                                    {formatDate(request.return_date)}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <div className="row g-3 mb-4">
                                <div className="col-lg-5">
                                    <div className="bg-light border rounded-4 p-3 h-100">
                                        <span className="d-block text-muted small fw-bold text-uppercase mb-2">
                                            Keperluan Peminjaman
                                        </span>

                                        <p className="mb-0" style={{ lineHeight: 1.7 }}>
                                            {request.purpose || 'Tidak ada keperluan yang diisi.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-lg-7">
                                    <div className="border rounded-4 p-3 h-100">
                                        <h6 className="fw-black mb-3">
                                            Barang yang Diajukan
                                        </h6>

                                        <div className="d-grid gap-2">
                                            {request.items?.map((item) => (
                                                <div
                                                    className="d-flex flex-column flex-md-row justify-content-between gap-3 bg-light border rounded-4 p-3"
                                                    key={item.id}
                                                >
                                                    <div>
                                                        <strong>
                                                            {item.product?.name || 'Barang tidak ditemukan'}
                                                        </strong>

                                                        <p className="text-muted small mb-0 mt-1">
                                                            {item.product?.description ||
                                                                'Tidak ada deskripsi barang.'}
                                                        </p>
                                                    </div>

                                                    <span className="badge text-bg-success rounded-pill align-self-start">
                                                        Qty {item.quantity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {request.admin_note && (
                                <div className="alert alert-warning rounded-4 mb-4">
                                    <strong>Catatan admin sebelumnya:</strong>
                                    <div>{request.admin_note}</div>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="form-label fw-bold">
                                    Catatan Admin
                                </label>

                                <textarea
                                    value={getAdminNote(request.id)}
                                    onChange={(event) => handleNoteChange(request.id, event.target.value)}
                                    className="form-control rounded-4"
                                    placeholder="Isi catatan jika ingin meminta revisi atau menolak pengajuan."
                                    rows="3"
                                    disabled={request.status !== 'pending'}
                                />
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                <button
                                    className="btn btn-primary rounded-pill fw-bold px-3"
                                    type="button"
                                    onClick={() => handleApprove(request)}
                                    disabled={request.status !== 'pending'}
                                >
                                    <i className="bi bi-check-circle-fill me-1"></i>
                                    Approve
                                </button>

                                <button
                                    className="btn btn-warning text-white rounded-pill fw-bold px-3"
                                    type="button"
                                    onClick={() => handleRevision(request)}
                                    disabled={request.status !== 'pending'}
                                >
                                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                                    Revisi
                                </button>

                                <button
                                    className="btn btn-danger rounded-pill fw-bold px-3"
                                    type="button"
                                    onClick={() => handleReject(request)}
                                    disabled={request.status !== 'pending'}
                                >
                                    <i className="bi bi-x-circle-fill me-1"></i>
                                    Tolak
                                </button>

                                <button
                                    className="btn btn-dark rounded-pill fw-bold px-3"
                                    type="button"
                                    onClick={() => handleBorrowed(request)}
                                    disabled={request.status !== 'approved'}
                                >
                                    <i className="bi bi-box-arrow-up-right me-1"></i>
                                    Tandai Dipinjam
                                </button>

                                <button
                                    className="btn btn-success rounded-pill fw-bold px-3"
                                    type="button"
                                    onClick={() => handleReturned(request)}
                                    disabled={request.status !== 'borrowed'}
                                >
                                    <i className="bi bi-check2-square me-1"></i>
                                    Tandai Kembali
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}