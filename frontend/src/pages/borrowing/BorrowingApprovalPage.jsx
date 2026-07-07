import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const borrowStatusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'revision', label: 'Revision' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'borrowed', label: 'Borrowed' },
    { value: 'returned', label: 'Returned' },
];

export default function BorrowingApprovalPage() {
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [adminNotes, setAdminNotes] = useState({});
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchBorrowRequests = async () => {
        try {
            setLoadingRequests(true);
            const response = await api.get('/borrow-requests');
            setBorrowRequests(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data pengajuan peminjaman.');
            console.error(error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchBorrowRequests();
    }, []);

    const filteredBorrowRequests = useMemo(() => {
        return borrowRequests.filter((request) => {
            const matchStatus =
                selectedStatus === 'all' || request.status === selectedStatus;

            const keyword = searchKeyword.toLowerCase();

            const matchKeyword =
                request.borrow_code?.toLowerCase().includes(keyword) ||
                request.purpose?.toLowerCase().includes(keyword) ||
                request.items?.some((item) =>
                    item.product?.name?.toLowerCase().includes(keyword)
                );

            return matchStatus && matchKeyword;
        });
    }, [borrowRequests, selectedStatus, searchKeyword]);

    const summary = useMemo(() => {
        return {
            total: borrowRequests.length,
            pending: borrowRequests.filter((request) => request.status === 'pending').length,
            approved: borrowRequests.filter((request) => request.status === 'approved').length,
            revision: borrowRequests.filter((request) => request.status === 'revision').length,
            rejected: borrowRequests.filter((request) => request.status === 'rejected').length,
            borrowed: borrowRequests.filter((request) => request.status === 'borrowed').length,
            returned: borrowRequests.filter((request) => request.status === 'returned').length,
        };
    }, [borrowRequests]);

    const handleNoteChange = (requestId, value) => {
        setAdminNotes((prev) => ({
            ...prev,
            [requestId]: value,
        }));
    };

    const getAdminNote = (requestId) => {
        return adminNotes[requestId] || '';
    };

    const handleApprove = async (requestId) => {
        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.put(`/borrow-requests/${requestId}/approve`);
            setMessage(response.data.message);
            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Approval peminjaman gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleRevision = async (requestId) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(requestId).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum meminta revisi peminjaman.');
            return;
        }

        try {
            const response = await api.put(`/borrow-requests/${requestId}/revision`, {
                admin_note: note,
            });

            setMessage(response.data.message);

            setAdminNotes((prev) => ({
                ...prev,
                [requestId]: '',
            }));

            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Revisi peminjaman gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleReject = async (requestId) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(requestId).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum menolak peminjaman.');
            return;
        }

        try {
            const response = await api.put(`/borrow-requests/${requestId}/reject`, {
                admin_note: note,
            });

            setMessage(response.data.message);

            setAdminNotes((prev) => ({
                ...prev,
                [requestId]: '',
            }));

            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Penolakan peminjaman gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleBorrowed = async (requestId) => {
        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.put(`/borrow-requests/${requestId}/borrowed`);
            setMessage(response.data.message);
            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengubah status menjadi borrowed.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleReturned = async (requestId) => {
        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.put(`/borrow-requests/${requestId}/returned`);
            setMessage(response.data.message);
            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menandai barang sudah dikembalikan.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Peminjaman</h2>
                    <p>Admin dapat approve, revisi, tolak, borrowed, atau returned.</p>
                </div>

                <button className="btn btn-primary" onClick={fetchBorrowRequests}>
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
                    className={selectedStatus === 'borrowed' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('borrowed')}
                    type="button"
                >
                    <span>Borrowed</span>
                    <strong>{summary.borrowed}</strong>
                </button>

                <button
                    className={selectedStatus === 'returned' ? 'filter-card active' : 'filter-card'}
                    onClick={() => setSelectedStatus('returned')}
                    type="button"
                >
                    <span>Returned</span>
                    <strong>{summary.returned}</strong>
                </button>
            </div>

            <div className="filter-bar">
                <div className="filter-field">
                    <label>Cari Peminjaman</label>
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) => setSearchKeyword(event.target.value)}
                        placeholder="Cari kode peminjaman, keperluan, atau nama produk..."
                    />
                </div>

                <div className="filter-field">
                    <label>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                    >
                        {borrowStatusOptions.map((option) => (
                            <option value={option.value} key={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingRequests && (
                <div className="info-box">
                    Sedang mengambil data pengajuan peminjaman...
                </div>
            )}

            {!loadingRequests && filteredBorrowRequests.length === 0 && (
                <div className="info-box">
                    Tidak ada data peminjaman sesuai filter.
                </div>
            )}

            <div className="order-list">
                {filteredBorrowRequests.map((request) => (
                    <div className="order-card" key={request.id}>
                        <div className="order-header">
                            <div>
                                <h3>{request.borrow_code}</h3>
                                <p>{request.purpose}</p>
                            </div>

                            <span className={`status status-${request.status}`}>
                                {request.status}
                            </span>
                        </div>

                        <div className="date-row">
                            <span>
                                Pinjam: <strong>{request.borrow_date}</strong>
                            </span>
                            <span>
                                Kembali: <strong>{request.return_date}</strong>
                            </span>
                        </div>

                        <div className="order-items">
                            {request.items.map((item) => (
                                <div className="order-item" key={item.id}>
                                    <span>{item.product?.name || 'Produk tidak ditemukan'}</span>
                                    <strong>Qty: {item.quantity}</strong>
                                </div>
                            ))}
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
                                placeholder="Isi catatan jika ingin meminta revisi atau menolak peminjaman."
                                rows="3"
                                disabled={request.status !== 'pending'}
                            />
                        </div>

                        <div className="order-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => handleApprove(request.id)}
                                disabled={request.status !== 'pending'}
                            >
                                Approve
                            </button>

                            <button
                                className="btn btn-warning"
                                onClick={() => handleRevision(request.id)}
                                disabled={request.status !== 'pending'}
                            >
                                Revisi
                            </button>

                            <button
                                className="btn btn-danger"
                                onClick={() => handleReject(request.id)}
                                disabled={request.status !== 'pending'}
                            >
                                Tolak
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={() => handleBorrowed(request.id)}
                                disabled={request.status !== 'approved'}
                            >
                                Borrowed
                            </button>

                            <button
                                className="btn btn-dark"
                                onClick={() => handleReturned(request.id)}
                                disabled={
                                    request.status !== 'approved' &&
                                    request.status !== 'borrowed'
                                }
                            >
                                Returned
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}