import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function BorrowingPage() {
    const [products, setProducts] = useState([]);
    const [borrowRequests, setBorrowRequests] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [processingProductId, setProcessingProductId] = useState(null);

    const [formData, setFormData] = useState({
        purpose: '',
        borrow_date: '',
        return_date: '',
        quantity: 1,
    });

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const response = await api.get('/products');

            const borrowableProducts = response.data.data.filter((product) => {
                return product.type === 'borrow' || product.type === 'both';
            });

            setProducts(borrowableProducts);
        } catch (error) {
            setErrorMessage('Gagal mengambil data produk peminjaman.');
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchBorrowRequests = async () => {
        try {
            setLoadingRequests(true);
            const response = await api.get('/borrow-requests');
            setBorrowRequests(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchBorrowRequests();
    }, []);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleBorrow = async (product) => {
        setMessage('');
        setErrorMessage('');

        if (!formData.purpose || !formData.borrow_date || !formData.return_date) {
            setErrorMessage('Keperluan, tanggal pinjam, dan tanggal kembali wajib diisi.');
            return;
        }

        if (Number(formData.quantity) < 1) {
            setErrorMessage('Jumlah peminjaman minimal 1.');
            return;
        }

        setProcessingProductId(product.id);

        try {
            const response = await api.post('/borrow-requests', {
                purpose: formData.purpose,
                borrow_date: formData.borrow_date,
                return_date: formData.return_date,
                items: [
                    {
                        product_id: product.id,
                        quantity: Number(formData.quantity),
                    },
                ],
            });

            setMessage(response.data.message);

            setFormData({
                purpose: '',
                borrow_date: '',
                return_date: '',
                quantity: 1,
            });

            await fetchBorrowRequests();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Pengajuan peminjaman gagal. Silakan coba lagi.';

            setErrorMessage(backendMessage);
            console.error(error);
        } finally {
            setProcessingProductId(null);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Pengajuan Peminjaman</h2>
                    <p>User dapat memilih barang yang tersedia untuk dipinjam.</p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <div className="form-card">
                <h3>Form Pengajuan</h3>
                <p>Isi detail pengajuan terlebih dahulu, lalu pilih barang yang ingin dipinjam.</p>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Keperluan</label>
                        <input
                            type="text"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleInputChange}
                            placeholder="Contoh: Dipakai untuk kegiatan rapat koordinasi"
                        />
                    </div>

                    <div className="form-group">
                        <label>Tanggal Pinjam</label>
                        <input
                            type="date"
                            name="borrow_date"
                            value={formData.borrow_date}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Tanggal Kembali</label>
                        <input
                            type="date"
                            name="return_date"
                            value={formData.return_date}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Jumlah</label>
                        <input
                            type="number"
                            name="quantity"
                            min="1"
                            value={formData.quantity}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
            </div>

            <div className="page-section">
                <div className="section-heading">
                    <h3>Barang yang Bisa Dipinjam</h3>
                    <p>Produk dengan tipe borrow atau both akan tampil di sini.</p>
                </div>

                {loadingProducts && (
                    <div className="info-box">
                        Sedang mengambil data barang...
                    </div>
                )}

                {!loadingProducts && products.length === 0 && (
                    <div className="info-box">
                        Belum ada barang yang bisa dipinjam.
                    </div>
                )}

                <div className="product-grid">
                    {products.map((product) => (
                        <div className="product-card" key={product.id}>
                            <div className="product-image">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} />
                                ) : (
                                    <span>No Image</span>
                                )}
                            </div>

                            <div className="product-body">
                                <div className="product-category">
                                    {product.category?.name || 'Tanpa Kategori'}
                                </div>

                                <h3>{product.name}</h3>

                                <p className="product-description">
                                    {product.description || 'Tidak ada deskripsi.'}
                                </p>

                                <div className="product-meta">
                                    <span>Stok: {product.stock}</span>
                                    <span className={`badge badge-${product.type}`}>
                                        {product.type}
                                    </span>
                                </div>

                                <div className="product-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleBorrow(product)}
                                        disabled={
                                            processingProductId === product.id ||
                                            product.stock <= 0
                                        }
                                    >
                                        {processingProductId === product.id
                                            ? 'Memproses...'
                                            : 'Ajukan Pinjam'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="page-section">
                <div className="section-heading">
                    <h3>Riwayat Pengajuan Peminjaman</h3>
                    <p>Daftar pengajuan peminjaman yang sudah masuk ke sistem.</p>
                </div>

                {loadingRequests && (
                    <div className="info-box">
                        Sedang mengambil data pengajuan...
                    </div>
                )}

                {!loadingRequests && borrowRequests.length === 0 && (
                    <div className="info-box">
                        Belum ada pengajuan peminjaman.
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}