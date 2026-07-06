import { useEffect, useState } from 'react';
import api from './api/axios';
import './App.css';

function App() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/products');
                setProducts(response.data.data);
            } catch (error) {
                setErrorMessage('Gagal mengambil data produk dari Laravel.');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    return (
        <div className="app-container">
            <header className="header">
                <h1>HUMAS</h1>
                <p>Sistem Katalog, Checkout, Approval, dan Peminjaman</p>
            </header>

            <main className="content">
                <div className="section-title">
                    <h2>Katalog Barang</h2>
                    <p>Data berikut diambil langsung dari API Laravel.</p>
                </div>

                {loading && (
                    <div className="info-box">
                        Sedang mengambil data produk...
                    </div>
                )}

                {errorMessage && (
                    <div className="error-box">
                        {errorMessage}
                    </div>
                )}

                {!loading && !errorMessage && products.length === 0 && (
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
                                        <button className="btn btn-primary">
                                            Checkout
                                        </button>
                                    )}

                                    {(product.type === 'borrow' || product.type === 'both') && (
                                        <button className="btn btn-secondary">
                                            Pinjam
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default App;