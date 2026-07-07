import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const orderStatusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'revision', label: 'Revision' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
];

export default function OrderApprovalPage() {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [adminNotes, setAdminNotes] = useState({});
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchOrders = async () => {
        try {
            setLoadingOrders(true);
            const response = await api.get('/orders');
            setOrders(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data order.');
            console.error(error);
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const matchStatus =
                selectedStatus === 'all' || order.status === selectedStatus;

            const keyword = searchKeyword.toLowerCase();

            const matchKeyword =
                order.order_code?.toLowerCase().includes(keyword) ||
                order.user_note?.toLowerCase().includes(keyword) ||
                order.items?.some((item) =>
                    item.product?.name?.toLowerCase().includes(keyword)
                );

            return matchStatus && matchKeyword;
        });
    }, [orders, selectedStatus, searchKeyword]);

    const summary = useMemo(() => {
        return {
            total: orders.length,
            pending: orders.filter((order) => order.status === 'pending').length,
            approved: orders.filter((order) => order.status === 'approved').length,
            revision: orders.filter((order) => order.status === 'revision').length,
            rejected: orders.filter((order) => order.status === 'rejected').length,
            completed: orders.filter((order) => order.status === 'completed').length,
        };
    }, [orders]);

    const handleNoteChange = (orderId, value) => {
        setAdminNotes((prev) => ({
            ...prev,
            [orderId]: value,
        }));
    };

    const getAdminNote = (orderId) => {
        return adminNotes[orderId] || '';
    };

    const handleApproveOrder = async (orderId) => {
        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.put(`/orders/${orderId}/approve`);
            setMessage(response.data.message);
            await fetchOrders();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Approval gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleRejectOrder = async (orderId) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(orderId).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum menolak checkout.');
            return;
        }

        try {
            const response = await api.put(`/orders/${orderId}/reject`, {
                admin_note: note,
            });

            setMessage(response.data.message);

            setAdminNotes((prev) => ({
                ...prev,
                [orderId]: '',
            }));

            await fetchOrders();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Penolakan gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleRevisionOrder = async (orderId) => {
        setMessage('');
        setErrorMessage('');

        const note = getAdminNote(orderId).trim();

        if (!note) {
            setErrorMessage('Catatan admin wajib diisi sebelum meminta revisi checkout.');
            return;
        }

        try {
            const response = await api.put(`/orders/${orderId}/revision`, {
                admin_note: note,
            });

            setMessage(response.data.message);

            setAdminNotes((prev) => ({
                ...prev,
                [orderId]: '',
            }));

            await fetchOrders();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Revisi gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleCompleteOrder = async (orderId) => {
        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.put(`/orders/${orderId}/complete`);
            setMessage(response.data.message);
            await fetchOrders();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyelesaikan checkout.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Checkout</h2>
                    <p>Admin dapat menyetujui, meminta revisi, menolak, atau menyelesaikan checkout.</p>
                </div>

                <button className="btn btn-primary" onClick={fetchOrders}>
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
                    <label>Cari Checkout</label>
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) => setSearchKeyword(event.target.value)}
                        placeholder="Cari kode order, catatan, atau nama produk..."
                    />
                </div>

                <div className="filter-field">
                    <label>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                    >
                        {orderStatusOptions.map((option) => (
                            <option value={option.value} key={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingOrders && (
                <div className="info-box">
                    Sedang mengambil data order...
                </div>
            )}

            {!loadingOrders && filteredOrders.length === 0 && (
                <div className="info-box">
                    Tidak ada data checkout sesuai filter.
                </div>
            )}

            <div className="order-list">
                {filteredOrders.map((order) => (
                    <div className="order-card" key={order.id}>
                        <div className="order-header">
                            <div>
                                <h3>{order.order_code}</h3>
                                <p>{order.user_note || 'Tidak ada catatan user.'}</p>
                            </div>

                            <span className={`status status-${order.status}`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="order-items">
                            {order.items.map((item) => (
                                <div className="order-item" key={item.id}>
                                    <span>{item.product?.name || 'Produk tidak ditemukan'}</span>
                                    <strong>Qty: {item.quantity}</strong>
                                </div>
                            ))}
                        </div>

                        {order.admin_note && (
                            <div className="admin-note">
                                Catatan admin sebelumnya: {order.admin_note}
                            </div>
                        )}

                        <div className="approval-note">
                            <label>Catatan Admin</label>
                            <textarea
                                value={getAdminNote(order.id)}
                                onChange={(event) => handleNoteChange(order.id, event.target.value)}
                                placeholder="Isi catatan jika ingin meminta revisi atau menolak checkout."
                                rows="3"
                                disabled={order.status !== 'pending'}
                            />
                        </div>

                        <div className="order-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => handleApproveOrder(order.id)}
                                disabled={order.status !== 'pending'}
                            >
                                Approve
                            </button>

                            <button
                                className="btn btn-warning"
                                onClick={() => handleRevisionOrder(order.id)}
                                disabled={order.status !== 'pending'}
                            >
                                Revisi
                            </button>

                            <button
                                className="btn btn-danger"
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={order.status !== 'pending'}
                            >
                                Tolak
                            </button>

                            <button
                                className="btn btn-dark"
                                onClick={() => handleCompleteOrder(order.id)}
                                disabled={order.status !== 'approved'}
                            >
                                Complete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}