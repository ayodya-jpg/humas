import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function CatalogPage() {
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [processingProductId, setProcessingProductId] = useState(null);

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data produk dari Laravel.');
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleCheckout = async (product) => {
        setMessage('');
        setErrorMessage('');
        setProcessingProductId(product.id);

        try {
            const response = await api.post('/orders', {
                user_note: `Checkout produk ${product.name}`,
                items: [
                    {
                        product_id: product.id,
                        quantity: 1,
                    },
                ],
            });

            setMessage(response.data.message);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Checkout gagal. Silakan coba lagi.';

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
                    <h2>Katalog Checkout</h2>
                    <p>Halaman e-commerce tanpa pembayaran. User memilih barang lalu checkout.</p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            {loadingProducts && (
                <div className="info-box">
                    Sedang mengambil data produk...
                </div>
            )}

            {!loadingProducts && products.length === 0 && (
                <div className="info-box">
                    Belum ada data produk.
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
                                {(product.type === 'checkout' || product.type === 'both') && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleCheckout(product)}
                                        disabled={processingProductId === product.id || product.stock <= 0}
                                    >
                                        {processingProductId === product.id
                                            ? 'Memproses...'
                                            : 'Checkout'}
                                    </button>
                                )}

                                {(product.type === 'borrow' || product.type === 'both') && (
                                    <button className="btn btn-secondary" disabled>
                                        Bisa Dipinjam
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}