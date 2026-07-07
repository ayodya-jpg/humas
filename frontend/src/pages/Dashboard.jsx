import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Dashboard() {
    const [summary, setSummary] = useState({
        totalUsers: 0,
        totalMerchandise: 0,
        totalMerchandiseRequests: 0,
        pendingMerchandiseRequests: 0,
        approvedMerchandiseRequests: 0,
        totalBorrowRequests: 0,
        pendingBorrowRequests: 0,
        approvedBorrowRequests: 0,
        returnedBorrowRequests: 0,
    });

    const [recentMerchandiseRequests, setRecentMerchandiseRequests] = useState([]);
    const [recentBorrowRequests, setRecentBorrowRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const [
                usersResponse,
                productsResponse,
                ordersResponse,
                borrowResponse,
            ] = await Promise.all([
                api.get('/users'),
                api.get('/products'),
                api.get('/orders'),
                api.get('/borrow-requests'),
            ]);

            const users = usersResponse.data.data || [];
            const products = productsResponse.data.data || [];
            const merchandiseRequests = ordersResponse.data.data || [];
            const borrowRequests = borrowResponse.data.data || [];

            setSummary({
                totalUsers: users.length,
                totalMerchandise: products.length,
                totalMerchandiseRequests: merchandiseRequests.length,
                pendingMerchandiseRequests: merchandiseRequests.filter((item) => item.status === 'pending').length,
                approvedMerchandiseRequests: merchandiseRequests.filter((item) => item.status === 'approved').length,
                totalBorrowRequests: borrowRequests.length,
                pendingBorrowRequests: borrowRequests.filter((item) => item.status === 'pending').length,
                approvedBorrowRequests: borrowRequests.filter((item) => item.status === 'approved').length,
                returnedBorrowRequests: borrowRequests.filter((item) => item.status === 'returned').length,
            });

            setRecentMerchandiseRequests(merchandiseRequests.slice(0, 5));
            setRecentBorrowRequests(borrowRequests.slice(0, 5));
        } catch (error) {
            setErrorMessage('Gagal mengambil data dashboard dari backend.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <div className="page">
            <div className="hero-dashboard">
                <div>
                    <span className="eyebrow">Admin Workspace</span>
                    <h2>Dashboard HUMAS & SEKPIM</h2>
                    <p>
                        Pantau permintaan merchandise, layanan humas, dan peminjaman alat
                        dalam satu halaman yang mudah dibaca.
                    </p>
                </div>

                <button className="btn btn-primary" onClick={fetchDashboardData}>
                    Refresh Data
                </button>
            </div>

            {loading && (
                <div className="info-box">
                    Sedang mengambil data dashboard...
                </div>
            )}

            {errorMessage && (
                <div className="error-box">
                    {errorMessage}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <span>Total User</span>
                    <strong>{summary.totalUsers}</strong>
                    <p>Akun yang terdaftar di sistem</p>
                </div>

                <div className="stat-card">
                    <span>Paket Merchandise</span>
                    <strong>{summary.totalMerchandise}</strong>
                    <p>Paket atau barang buah tangan</p>
                </div>

                <div className="stat-card">
                    <span>Merchandise Pending</span>
                    <strong>{summary.pendingMerchandiseRequests}</strong>
                    <p>Dari total {summary.totalMerchandiseRequests} permintaan</p>
                </div>

                <div className="stat-card">
                    <span>Peminjaman Pending</span>
                    <strong>{summary.pendingBorrowRequests}</strong>
                    <p>Dari total {summary.totalBorrowRequests} pengajuan</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Ringkasan Merchandise</h3>
                            <p>Permintaan paket buah tangan untuk tamu atau kerja sama eksternal.</p>
                        </div>
                    </div>

                    <div className="mini-stats">
                        <div>
                            <span>Total</span>
                            <strong>{summary.totalMerchandiseRequests}</strong>
                        </div>

                        <div>
                            <span>Pending</span>
                            <strong>{summary.pendingMerchandiseRequests}</strong>
                        </div>

                        <div>
                            <span>Approved</span>
                            <strong>{summary.approvedMerchandiseRequests}</strong>
                        </div>
                    </div>

                    <div className="recent-list">
                        <h4>Permintaan Merchandise Terbaru</h4>

                        {recentMerchandiseRequests.length === 0 && (
                            <p className="muted-text">Belum ada permintaan merchandise.</p>
                        )}

                        {recentMerchandiseRequests.map((request) => (
                            <div className="recent-item" key={request.id}>
                                <div>
                                    <strong>{request.order_code}</strong>
                                    <p>{request.user_note || 'Tidak ada catatan pemohon.'}</p>
                                </div>

                                <span className={`status status-${request.status}`}>
                                    {request.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h3>Ringkasan Peminjaman Sekpim</h3>
                            <p>Pengajuan peminjaman alat pendukung kegiatan Sekpim.</p>
                        </div>
                    </div>

                    <div className="mini-stats">
                        <div>
                            <span>Total</span>
                            <strong>{summary.totalBorrowRequests}</strong>
                        </div>

                        <div>
                            <span>Pending</span>
                            <strong>{summary.pendingBorrowRequests}</strong>
                        </div>

                        <div>
                            <span>Returned</span>
                            <strong>{summary.returnedBorrowRequests}</strong>
                        </div>
                    </div>

                    <div className="recent-list">
                        <h4>Peminjaman Terbaru</h4>

                        {recentBorrowRequests.length === 0 && (
                            <p className="muted-text">Belum ada pengajuan peminjaman.</p>
                        )}

                        {recentBorrowRequests.map((request) => (
                            <div className="recent-item" key={request.id}>
                                <div>
                                    <strong>{request.borrow_code}</strong>
                                    <p>{request.purpose || 'Tidak ada keperluan.'}</p>
                                </div>

                                <span className={`status status-${request.status}`}>
                                    {request.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}