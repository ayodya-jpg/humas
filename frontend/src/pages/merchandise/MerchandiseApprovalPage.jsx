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

const merchandiseStatusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'revision', label: 'Revision' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
];

export default function MerchandiseApprovalPage() {
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

            const response = await api.get('/orders');
            setRequests(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data permintaan merchandise.');
            showErrorAlert(
                'Gagal Mengambil Data',
                'Permintaan merchandise tidak berhasil dimuat dari backend.'
            );
            console.error(error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const matchStatus =
                selectedStatus === 'all' || request.status === selectedStatus;

            const keyword = searchKeyword.toLowerCase();

            const matchKeyword =
                request.order_code?.toLowerCase().includes(keyword) ||
                request.event_name?.toLowerCase().includes(keyword) ||
                request.institution_name?.toLowerCase().includes(keyword) ||
                request.guest_name?.toLowerCase().includes(keyword) ||
                request.guest_position?.toLowerCase().includes(keyword) ||
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
            completed: requests.filter((item) => item.status === 'completed').length,
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
            title: 'Approve Pengajuan?',
            text: `Pengajuan ${request.order_code} akan disetujui dan stok merchandise akan dikurangi.`,
            confirmButtonText: 'Ya, approve',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Memproses Approval', 'Mohon tunggu, pengajuan sedang disetujui.');

        try {
            const response = await api.put(`/orders/${request.id}/approve`);

            closeAlert();
            setMessage(response.data.message);

            await fetchRequests();

            showSuccessAlert(
                'Pengajuan Disetujui',
                'Permintaan merchandise berhasil di-approve.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Approval merchandise gagal. Silakan coba lagi.';

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
            title: 'Minta Revisi Pengajuan?',
            text: `Pengajuan ${request.order_code} akan dikembalikan ke pemohon untuk diperbaiki.`,
            confirmButtonText: 'Ya, minta revisi',
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Mengirim Revisi', 'Mohon tunggu, catatan revisi sedang dikirim.');

        try {
            const response = await api.put(`/orders/${request.id}/revision`, {
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
                'Gagal meminta revisi pengajuan merchandise.';

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
            title: 'Tolak Pengajuan?',
            text: `Pengajuan ${request.order_code} akan ditolak.`,
            confirmButtonText: 'Ya, tolak',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menolak Pengajuan', 'Mohon tunggu, keputusan sedang diproses.');

        try {
            const response = await api.put(`/orders/${request.id}/reject`, {
                admin_note: note,
            });

            closeAlert();
            setMessage(response.data.message);
            clearAdminNote(request.id);

            await fetchRequests();

            showSuccessAlert(
                'Pengajuan Ditolak',
                'Permintaan merchandise berhasil ditolak.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menolak pengajuan merchandise.';

            setErrorMessage(backendMessage);
            showErrorAlert('Penolakan Gagal', backendMessage);
            console.error(error);
        }
    };

    const handleComplete = async (request) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Selesaikan Pengajuan?',
            text: `Pengajuan ${request.order_code} akan ditandai selesai.`,
            confirmButtonText: 'Ya, selesaikan',
            icon: 'question',
            confirmButtonColor: '#334155',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menyelesaikan Pengajuan', 'Mohon tunggu, status sedang diperbarui.');

        try {
            const response = await api.put(`/orders/${request.id}/complete`);

            closeAlert();
            setMessage(response.data.message);

            await fetchRequests();

            showSuccessAlert(
                'Pengajuan Selesai',
                'Permintaan merchandise berhasil ditandai selesai.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyelesaikan pengajuan merchandise.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyelesaikan', backendMessage);
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

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Merchandise</h2>
                    <p>
                        Tinjau kelayakan permintaan merchandise berdasarkan tamu,
                        jabatan, kegiatan, instansi, dan lampiran pendukung.
                    </p>
                </div>

                <button className="btn btn-primary" onClick={fetchRequests}>
                    Refresh
                </button>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <div className="filter-summary-grid">
                <button
                    className={selectedStatus === 'all' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('all')}
                    type="button"
                >
                    <span>Semua</span>
                    <strong>{summary.total}</strong>
                </button>

                <button
                    className={selectedStatus === 'pending' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('pending')}
                    type="button"
                >
                    <span>Pending</span>
                    <strong>{summary.pending}</strong>
                </button>

                <button
                    className={selectedStatus === 'approved' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('approved')}
                    type="button"
                >
                    <span>Approved</span>
                    <strong>{summary.approved}</strong>
                </button>

                <button
                    className={selectedStatus === 'revision' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('revision')}
                    type="button"
                >
                    <span>Revision</span>
                    <strong>{summary.revision}</strong>
                </button>

                <button
                    className={selectedStatus === 'rejected' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('rejected')}
                    type="button"
                >
                    <span>Rejected</span>
                    <strong>{summary.rejected}</strong>
                </button>

                <button
                    className={selectedStatus === 'completed' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('completed')}
                    type="button"
                >
                    <span>Completed</span>
                    <strong>{summary.completed}</strong>
                </button>
            </div>

            <div className="filter-bar">
                <div className="filter-field">
                    <label>Cari Permintaan</label>
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) => setSearchKeyword(event.target.value)}
                        placeholder="Cari kode, kegiatan, tamu, instansi, jabatan, atau paket..."
                    />
                </div>

                <div className="filter-field">
                    <label>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                    >
                        {merchandiseStatusOptions.map((option) => (
                            <option value={option.value} key={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingRequests && (
                <div className="info-box">
                    Sedang mengambil data permintaan merchandise...
                </div>
            )}

            {!loadingRequests && filteredRequests.length === 0 && (
                <div className="info-box">
                    Tidak ada permintaan merchandise sesuai filter.
                </div>
            )}

            <div className="merchandise-approval-list">
                {filteredRequests.map((request) => (
                    <div className="merchandise-approval-card" key={request.id}>
                        <div className="approval-card-header">
                            <div>
                                <div className="approval-code-row">
                                    <h3>{request.order_code}</h3>
                                    <span className={`status status-${request.status}`}>
                                        {request.status}
                                    </span>
                                </div>

                                <p>
                                    Diajukan oleh{' '}
                                    <strong>{request.user?.name || 'User tidak diketahui'}</strong>
                                </p>
                            </div>

                            <div className="approval-date-box">
                                <span>Tanggal Kegiatan</span>
                                <strong>{formatDate(request.activity_date)}</strong>
                            </div>
                        </div>

                        <div className="approval-detail-grid">
                            <div className="approval-detail-item span-2">
                                <span>Nama Kegiatan</span>
                                <strong>{request.event_name || '-'}</strong>
                            </div>

                            <div className="approval-detail-item">
                                <span>Instansi / Pihak Eksternal</span>
                                <strong>{request.institution_name || '-'}</strong>
                            </div>

                            <div className="approval-detail-item">
                                <span>Nama Tamu</span>
                                <strong>{request.guest_name || '-'}</strong>
                            </div>

                            <div className="approval-detail-item">
                                <span>Jabatan Tamu</span>
                                <strong>{request.guest_position || '-'}</strong>
                            </div>

                            <div className="approval-detail-item">
                                <span>Lampiran / Bukti Undangan</span>

                                {request.proof_file_url ? (
                                    <a
                                        href={request.proof_file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Buka Lampiran
                                    </a>
                                ) : (
                                    <strong>-</strong>
                                )}

                                {request.proof_file_name && (
                                    <p className="proof-file-name">
                                        {request.proof_file_name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="approval-section">
                            <h4>Paket Merchandise Diajukan</h4>

                            <div className="approval-items">
                                {request.items.map((item) => (
                                    <div className="approval-item" key={item.id}>
                                        <div>
                                            <strong>
                                                {item.product?.name || 'Paket tidak ditemukan'}
                                            </strong>
                                            <p>
                                                {item.product?.description ||
                                                    'Tidak ada deskripsi paket.'}
                                            </p>
                                        </div>

                                        <span>Qty {item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="approval-note-box">
                            <span>Catatan Pemohon</span>
                            <p>{request.user_note || 'Tidak ada catatan pemohon.'}</p>
                        </div>

                        {request.admin_note && (
                            <div className="admin-note">
                                Catatan admin sebelumnya: {request.admin_note}
                            </div>
                        )}

                        <div className="approval-note">
                            <label>Catatan Admin</label>
                            <textarea
                                value={getAdminNote(request.id)}
                                onChange={(event) => handleNoteChange(request.id, event.target.value)}
                                placeholder="Isi catatan jika ingin meminta revisi atau menolak pengajuan."
                                rows="3"
                                disabled={request.status !== 'pending'}
                            />
                        </div>

                        <div className="order-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => handleApprove(request)}
                                disabled={request.status !== 'pending'}
                            >
                                Approve
                            </button>

                            <button
                                className="btn btn-warning"
                                onClick={() => handleRevision(request)}
                                disabled={request.status !== 'pending'}
                            >
                                Revisi
                            </button>

                            <button
                                className="btn btn-danger"
                                onClick={() => handleReject(request)}
                                disabled={request.status !== 'pending'}
                            >
                                Tolak
                            </button>

                            <button
                                className="btn btn-dark"
                                onClick={() => handleComplete(request)}
                                disabled={request.status !== 'approved'}
                            >
                                Selesaikan
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}