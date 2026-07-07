import { useEffect, useState } from 'react';
import api from '../../api/axios';

const initialForm = {
    name: '',
    description: '',
    stock: 0,
    type: 'checkout',
    status: 'active',
    category_id: '',
    image: '',
};

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingProductId, setEditingProductId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data paket merchandise.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data kategori.');
            console.error(error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetForm = () => {
        setFormData(initialForm);
        setEditingProductId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        const payload = {
            category_id: formData.category_id ? Number(formData.category_id) : null,
            name: formData.name,
            description: formData.description,
            stock: Number(formData.stock),
            type: formData.type,
            image: formData.image || null,
            status: formData.status,
        };

        try {
            if (editingProductId) {
                const response = await api.put(`/products/${editingProductId}`, payload);
                setMessage(response.data.message);
            } else {
                const response = await api.post('/products', payload);
                setMessage(response.data.message);
            }

            resetForm();
            await fetchProducts();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyimpan paket merchandise. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    const handleEdit = (product) => {
        setEditingProductId(product.id);
        setFormData({
            name: product.name || '',
            description: product.description || '',
            stock: product.stock || 0,
            type: product.type || 'checkout',
            status: product.status || 'active',
            category_id: product.category_id || '',
            image: product.image || '',
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleDelete = async (productId) => {
        const confirmed = window.confirm('Yakin ingin menghapus paket merchandise ini?');

        if (!confirmed) {
            return;
        }

        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.delete(`/products/${productId}`);
            setMessage(response.data.message);
            await fetchProducts();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menghapus paket merchandise.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Paket Merchandise</h2>
                    <p>
                        Kelola paket merchandise atau buah tangan Telkom untuk tamu,
                        mitra kerja sama, dan pihak eksternal.
                    </p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingProductId ? 'Edit Paket Merchandise' : 'Tambah Paket Merchandise'}</h3>
                <p>
                    Paket ini akan dipilih oleh pemohon saat mengajukan permintaan
                    merchandise untuk tamu atau kerja sama eksternal.
                </p>

                <div className="form-grid product-form-grid">
                    <div className="form-group">
                        <label>Nama Paket</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Contoh: Paket Merchandise VIP"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Kategori</label>
                        <select
                            name="category_id"
                            value={formData.category_id}
                            onChange={handleInputChange}
                        >
                            <option value="">Tanpa Kategori</option>
                            {categories.map((category) => (
                                <option value={category.id} key={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Stok Paket</label>
                        <input
                            type="number"
                            name="stock"
                            min="0"
                            value={formData.stock}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Tipe Penggunaan</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="checkout">Merchandise</option>
                            <option value="borrow">Peminjaman</option>
                            <option value="both">Merchandise & Peminjaman</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                    </div>

                    <div className="form-group span-2">
                        <label>Isi / Deskripsi Paket</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Contoh: Totebag, tumbler, notebook, pulpen, dan kartu ucapan."
                            rows="4"
                        />
                    </div>

                    <div className="form-group span-2">
                        <label>URL Gambar Paket</label>
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleInputChange}
                            placeholder="Opsional, contoh: https://..."
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                        {editingProductId ? 'Update Paket' : 'Simpan Paket'}
                    </button>

                    {editingProductId && (
                        <button
                            className="btn btn-dark"
                            type="button"
                            onClick={resetForm}
                        >
                            Batal Edit
                        </button>
                    )}
                </div>
            </form>

            <div className="page-section">
                <div className="section-heading">
                    <h3>Daftar Paket Merchandise</h3>
                    <p>Paket yang tersedia untuk pengajuan merchandise.</p>
                </div>

                {loading && (
                    <div className="info-box">
                        Sedang mengambil data paket merchandise...
                    </div>
                )}

                {!loading && products.length === 0 && (
                    <div className="info-box">
                        Belum ada paket merchandise.
                    </div>
                )}

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Paket</th>
                                    <th>Kategori</th>
                                    <th>Stok</th>
                                    <th>Tipe</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="table-product">
                                                <div className="table-image">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} />
                                                    ) : (
                                                        <span>No</span>
                                                    )}
                                                </div>

                                                <div>
                                                    <strong>{product.name}</strong>
                                                    <p>{product.description || 'Tidak ada deskripsi paket.'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td>{product.category?.name || '-'}</td>
                                        <td>{product.stock}</td>
                                        <td>
                                            <span className={`badge badge-${product.type}`}>
                                                {product.type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status status-${product.status}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-warning"
                                                    type="button"
                                                    onClick={() => handleEdit(product)}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn btn-danger"
                                                    type="button"
                                                    onClick={() => handleDelete(product.id)}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}