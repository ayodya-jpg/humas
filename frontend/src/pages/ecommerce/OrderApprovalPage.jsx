import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function OrderApprovalPage() {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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

        try {
            const response = await api.put(`/orders/${orderId}/reject`, {
                admin_note: 'Pengajuan checkout ditolak oleh admin.',
            });

            setMessage(response.data.message);
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

        try {
            const response = await api.put(`/orders/${orderId}/revision`, {
                admin_note: 'Mohon lengkapi atau perbaiki pengajuan checkout.',
            });

            setMessage(response.data.message);
            await fetchOrders();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Revisi gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Checkout</h2>
                    <p>Admin dapat menyetujui, meminta revisi, atau menolak checkout.</p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            {loadingOrders && (
                <div className="info-box">
                    Sedang mengambil data order...
                </div>
            )}

            {!loadingOrders && orders.length === 0 && (
                <div className="info-box">
                    Belum ada data order.
                </div>
            )}

            <div className="order-list">
                {orders.map((order) => (
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
                                Catatan admin: {order.admin_note}
                            </div>
                        )}

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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}