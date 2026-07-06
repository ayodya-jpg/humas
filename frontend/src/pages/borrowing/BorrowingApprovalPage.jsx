import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function BorrowingApprovalPage() {
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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

        try {
            const response = await api.put(`/borrow-requests/${requestId}/revision`, {
                admin_note: 'Mohon lengkapi atau perbaiki pengajuan peminjaman.',
            });

            setMessage(response.data.message);
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

        try {
            const response = await api.put(`/borrow-requests/${requestId}/reject`, {
                admin_note: 'Pengajuan peminjaman ditolak oleh admin.',
            });

            setMessage(response.data.message);
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
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            {loadingRequests && (
                <div className="info-box">
                    Sedang mengambil data pengajuan peminjaman...
                </div>
            )}

            {!loadingRequests && borrowRequests.length === 0 && (
                <div className="info-box">
                    Belum ada data pengajuan peminjaman.
                </div>
            )}

            <div className="order-list">
                {borrowRequests.map((request) => (
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
                                Catatan admin: {request.admin_note}
                            </div>
                        )}

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