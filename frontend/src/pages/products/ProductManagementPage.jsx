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

const initialForm = {
    category_id: '',
    name: '',
    description: '',
    stock: 0,
    type: 'checkout',
    image: '',
    status: 'active',
};

const typeOptions = [
    {
        value: 'checkout',
        label: 'Merchandise / Checkout',
    },
    {
        value: 'borrow',
        label: 'Peminjaman',
    },
    {
        value: 'both',
        label: 'Keduanya',
    },
];

const statusOptions = [
    {
        value: 'active',
        label: 'Aktif',
    },
    {
        value: 'inactive',
        label: 'Nonaktif',
    },
];

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingProductId, setEditingProductId] = useState(null);

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            setErrorMessage('');

            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data paket/barang.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Data', backendMessage);
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);

            const response = await api.get('/categories');
            setCategories(response.data.data);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data kategori.';

            showErrorAlert('Gagal Mengambil Kategori', backendMessage);
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const keyword = searchKeyword.toLowerCase();

            const matchKeyword =
                product.name?.toLowerCase().includes(keyword) ||
                product.description?.toLowerCase().includes(keyword) ||
                product.category?.name?.toLowerCase().includes(keyword);

            const matchType =
                selectedType === 'all' || product.type === selectedType;

            const matchStatus =
                selectedStatus === 'all' || product.status === selectedStatus;

            return matchKeyword && matchType && matchStatus;
        });
    }, [products, searchKeyword, selectedType, selectedStatus]);

    const summary = useMemo(() => {
        return {
            total: products.length,
            active: products.filter((item) => item.status === 'active').length,
            inactive: products.filter((item) => item.status === 'inactive').length,
            checkout: products.filter((item) => item.type === 'checkout' || item.type === 'both').length,
            borrow: products.filter((item) => item.type === 'borrow' || item.type === 'both').length,
        };
    }, [products]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetForm = async () => {
        if (
            formData.category_id ||
            formData.name ||
            formData.description ||
            Number(formData.stock) > 0 ||
            formData.image ||
            editingProductId
        ) {
            const result = await showConfirmAlert({
                title: 'Batalkan Form?',
                text: 'Data paket/barang yang sedang diisi akan dikosongkan.',
                confirmButtonText: 'Ya, kosongkan',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setFormData(initialForm);
        setEditingProductId(null);
        setMessage('');
        setErrorMessage('');
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            showWarningAlert(
                'Nama Wajib Diisi',
                'Isi nama paket/barang terlebih dahulu.'
            );
            return false;
        }

        if (Number(formData.stock) < 0) {
            showWarningAlert(
                'Stok Tidak Valid',
                'Stok tidak boleh bernilai negatif.'
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        if (!validateForm()) {
            return;
        }

        const payload = {
            category_id: formData.category_id || null,
            name: formData.name,
            description: formData.description,
            stock: Number(formData.stock),
            type: formData.type,
            image: formData.image || null,
            status: formData.status,
        };

        const result = await showConfirmAlert({
            title: editingProductId ? 'Update Paket/Barang?' : 'Tambah Paket/Barang?',
            text: editingProductId
                ? 'Data paket/barang akan diperbarui.'
                : 'Data baru akan ditambahkan ke master data.',
            confirmButtonText: editingProductId ? 'Ya, update' : 'Ya, simpan',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert(
            editingProductId ? 'Memperbarui Data' : 'Menyimpan Data',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            if (editingProductId) {
                const response = await api.put(`/products/${editingProductId}`, payload);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'Data Berhasil Diperbarui',
                    'Paket/barang sudah berhasil diperbarui.'
                );
            } else {
                const response = await api.post('/products', payload);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'Data Berhasil Ditambahkan',
                    'Paket/barang baru sudah masuk ke master data.'
                );
            }

            setFormData(initialForm);
            setEditingProductId(null);
            await fetchProducts();
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyimpan data. Periksa kembali input yang diisi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan Data', backendMessage);
            console.error(error);
        }
    };

    const handleEdit = (product) => {
        setEditingProductId(product.id);
        setFormData({
            category_id: product.category_id || '',
            name: product.name || '',
            description: product.description || '',
            stock: product.stock ?? 0,
            type: product.type || 'checkout',
            image: product.image || '',
            status: product.status || 'active',
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleDelete = async (product) => {
        const result = await showConfirmAlert({
            title: 'Hapus Data?',
            text: `"${product.name}" akan dihapus dari master data.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        setMessage('');
        setErrorMessage('');

        showLoadingAlert('Menghapus Data', 'Mohon tunggu, data sedang dihapus.');

        try {
            const response = await api.delete(`/products/${product.id}`);

            closeAlert();
            setMessage(response.data.message);

            await fetchProducts();

            showSuccessAlert(
                'Data Berhasil Dihapus',
                'Paket/barang sudah dihapus dari sistem.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menghapus data.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus Data', backendMessage);
            console.error(error);
        }
    };

    const getTypeLabel = (type) => {
        const selected = typeOptions.find((item) => item.value === type);
        return selected ? selected.label : type;
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Paket Merchandise & Barang</h2>
                    <p>
                        Kelola katalog merchandise dan barang peminjaman yang digunakan
                        dalam layanan HUMAS & SEKPIM.
                    </p>
                </div>

                <button className="btn btn-primary" type="button" onClick={fetchProducts}>
                    Refresh
                </button>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <div className="filter-summary-grid">
                <button
                    className={selectedStatus === 'all' && selectedType === 'all' ? 'filter-card active' : 'filter-card'}
                    type="button"
                    onClick={() => {
                        setSelectedStatus('all');
                        setSelectedType('all');
                    }}
                >
                    <span>Total Data</span>
                    <strong>{summary.total}</strong>
                </button>

                <button
                    className={selectedStatus === 'active' ? 'filter-card active' : 'filter-card'}
                    type="button"
                    onClick={() => setSelectedStatus('active')}
                >
                    <span>Aktif</span>
                    <strong>{summary.active}</strong>
                </button>

                <button
                    className={selectedStatus === 'inactive' ? 'filter-card active' : 'filter-card'}
                    type="button"
                    onClick={() => setSelectedStatus('inactive')}
                >
                    <span>Nonaktif</span>
                    <strong>{summary.inactive}</strong>
                </button>

                <button
                    className={selectedType === 'checkout' ? 'filter-card active' : 'filter-card'}
                    type="button"
                    onClick={() => setSelectedType('checkout')}
                >
                    <span>Merchandise</span>
                    <strong>{summary.checkout}</strong>
                </button>

                <button
                    className={selectedType === 'borrow' ? 'filter-card active' : 'filter-card'}
                    type="button"
                    onClick={() => setSelectedType('borrow')}
                >
                    <span>Peminjaman</span>
                    <strong>{summary.borrow}</strong>
                </button>
            </div>

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingProductId ? 'Edit Paket/Barang' : 'Tambah Paket/Barang'}</h3>
                <p>
                    Gunakan tipe <strong>Merchandise / Checkout</strong> untuk katalog merchandise,
                    dan tipe <strong>Peminjaman</strong> untuk barang Sekpim.
                </p>

                <div className="form-grid product-form-grid">
                    <div className="form-group">
                        <label>Nama Paket / Barang</label>
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
                            disabled={loadingCategories}
                        >
                            <option value="">Tanpa kategori</option>
                            {categories.map((category) => (
                                <option value={category.id} key={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Stok</label>
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
                        <label>Tipe</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            required
                        >
                            {typeOptions.map((option) => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
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
                            {statusOptions.map((option) => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>URL Gambar</label>
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleInputChange}
                            placeholder="Opsional, isi URL gambar jika ada"
                        />
                    </div>

                    <div className="form-group span-2">
                        <label>Deskripsi</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Jelaskan detail paket merchandise atau barang."
                            rows="4"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                        {editingProductId ? 'Update Data' : 'Simpan Data'}
                    </button>

                    {(editingProductId || formData.name || formData.description) && (
                        <button
                            className="btn btn-dark"
                            type="button"
                            onClick={resetForm}
                        >
                            Batal
                        </button>
                    )}
                </div>
            </form>

            <div className="page-section">
                <div className="section-heading">
                    <h3>Daftar Paket Merchandise & Barang</h3>
                    <p>Data katalog yang digunakan pada pengajuan user.</p>
                </div>

                <div className="filter-bar">
                    <div className="filter-field">
                        <label>Cari Data</label>
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            placeholder="Cari nama, deskripsi, atau kategori..."
                        />
                    </div>

                    <div className="filter-field">
                        <label>Tipe</label>
                        <select
                            value={selectedType}
                            onChange={(event) => setSelectedType(event.target.value)}
                        >
                            <option value="all">Semua Tipe</option>
                            {typeOptions.map((option) => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(event) => setSelectedStatus(event.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            {statusOptions.map((option) => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loadingProducts && (
                    <div className="info-box">
                        Sedang mengambil data paket/barang...
                    </div>
                )}

                {!loadingProducts && filteredProducts.length === 0 && (
                    <div className="info-box">
                        Tidak ada data sesuai filter.
                    </div>
                )}

                <div className="product-management-grid">
                    {filteredProducts.map((product) => (
                        <div className="product-management-card" key={product.id}>
                            <div className="product-management-image">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} />
                                ) : (
                                    <span>HUMAS</span>
                                )}
                            </div>

                            <div className="product-management-content">
                                <div className="product-management-top">
                                    <span>
                                        {product.category?.name || 'Tanpa Kategori'}
                                    </span>

                                    <span className={`status status-${product.status}`}>
                                        {product.status}
                                    </span>
                                </div>

                                <h3>{product.name}</h3>

                                <p>
                                    {product.description || 'Tidak ada deskripsi.'}
                                </p>

                                <div className="product-management-meta">
                                    <div>
                                        <span>Stok</span>
                                        <strong>{product.stock}</strong>
                                    </div>

                                    <div>
                                        <span>Tipe</span>
                                        <strong>{getTypeLabel(product.type)}</strong>
                                    </div>
                                </div>

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
                                        onClick={() => handleDelete(product)}
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}