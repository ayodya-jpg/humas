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
    stock: '',
    type: 'checkout',
    image: '',
    status: 'active',
};

const typeOptions = [
    { value: 'checkout', label: 'Merchandise' },
    { value: 'borrow', label: 'Peminjaman' },
    { value: 'both', label: 'Keduanya' },
];

const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
];

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
            setProducts(response.data.data || []);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data paket atau barang.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Produk', backendMessage);
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);

            const response = await api.get('/categories');
            setCategories(response.data.data || []);
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

    const fetchInitialData = async () => {
        await Promise.all([
            fetchProducts(),
            fetchCategories(),
        ]);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const filteredProducts = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return products.filter((product) => {
            const matchKeyword =
                product.name?.toLowerCase().includes(keyword) ||
                product.description?.toLowerCase().includes(keyword) ||
                product.category?.name?.toLowerCase().includes(keyword) ||
                product.slug?.toLowerCase().includes(keyword);

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
            checkout: products.filter((item) => item.type === 'checkout').length,
            borrow: products.filter((item) => item.type === 'borrow').length,
            both: products.filter((item) => item.type === 'both').length,
        };
    }, [products]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEdit = (product) => {
        setEditingId(product.id);

        setFormData({
            category_id: product.category_id || product.category?.id || '',
            name: product.name || '',
            description: product.description || '',
            stock: product.stock ?? '',
            type: product.type || 'checkout',
            image: product.image || '',
            status: product.status || 'active',
        });

        setMessage('');
        setErrorMessage('');

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const resetForm = async () => {
        const hasData =
            formData.category_id ||
            formData.name ||
            formData.description ||
            formData.stock ||
            formData.image ||
            editingId;

        if (hasData) {
            const result = await showConfirmAlert({
                title: 'Reset Form?',
                text: 'Data paket atau barang yang sedang diisi akan dikosongkan.',
                confirmButtonText: 'Ya, reset',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setFormData(initialForm);
        setEditingId(null);
        setMessage('');
        setErrorMessage('');
    };

    const validateForm = () => {
        if (!formData.category_id) {
            setErrorMessage('Kategori wajib dipilih.');
            showWarningAlert('Kategori Wajib Dipilih', 'Pilih kategori terlebih dahulu.');
            return false;
        }

        if (!formData.name.trim()) {
            setErrorMessage('Nama paket atau barang wajib diisi.');
            showWarningAlert('Nama Wajib Diisi', 'Isi nama paket atau barang terlebih dahulu.');
            return false;
        }

        if (formData.stock === '' || Number(formData.stock) < 0) {
            setErrorMessage('Stok wajib diisi dan tidak boleh kurang dari 0.');
            showWarningAlert('Stok Tidak Valid', 'Isi stok dengan angka minimal 0.');
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

        const result = await showConfirmAlert({
            title: editingId ? 'Update Data?' : 'Tambah Data?',
            text: editingId
                ? 'Data paket atau barang akan diperbarui.'
                : 'Data paket atau barang baru akan ditambahkan.',
            confirmButtonText: editingId ? 'Ya, update' : 'Ya, tambah',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        setSubmitting(true);
        showLoadingAlert(
            editingId ? 'Memperbarui Data' : 'Menambahkan Data',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            const payload = {
                category_id: formData.category_id,
                name: formData.name,
                description: formData.description,
                stock: Number(formData.stock),
                type: formData.type,
                image: formData.image,
                status: formData.status,
            };

            const response = editingId
                ? await api.put(`/products/${editingId}`, payload)
                : await api.post('/products', payload);

            closeAlert();

            setMessage(response.data.message);
            setFormData(initialForm);
            setEditingId(null);

            await fetchProducts();

            showSuccessAlert(
                editingId ? 'Data Diperbarui' : 'Data Ditambahkan',
                response.data.message
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Data paket atau barang gagal disimpan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan', backendMessage);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (product) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Hapus Data?',
            text: `${product.name} akan dihapus dari master data.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menghapus Data', 'Mohon tunggu, data sedang dihapus.');

        try {
            const response = await api.delete(`/products/${product.id}`);

            closeAlert();

            setMessage(response.data.message);

            if (editingId === product.id) {
                setFormData(initialForm);
                setEditingId(null);
            }

            await fetchProducts();

            showSuccessAlert('Data Dihapus', response.data.message);
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Data gagal dihapus. Kemungkinan data sudah digunakan pada pengajuan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus', backendMessage);
            console.error(error);
        }
    };

    const getTypeLabel = (type) => {
        return typeOptions.find((item) => item.value === type)?.label || type;
    };

    const getTypeBadgeClass = (type) => {
        if (type === 'checkout') {
            return 'text-bg-primary';
        }

        if (type === 'borrow') {
            return 'text-bg-success';
        }

        return 'text-bg-dark';
    };

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #dc2626 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-9">
                            <span className="text-white-50 small fw-bold text-uppercase">
                                Master Data
                            </span>

                            <h2 className="display-5 fw-black mt-2 mb-3">
                                Paket Merchandise & Barang
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Kelola paket merchandise untuk pengajuan HUMAS dan barang Sekpim
                                untuk kebutuhan peminjaman internal.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <button
                                className="btn btn-light rounded-pill fw-bold w-100"
                                type="button"
                                onClick={fetchInitialData}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {message && (
                <div className="alert alert-success rounded-4">
                    {message}
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger rounded-4">
                    {errorMessage}
                </div>
            )}

            <div className="row g-3 mb-4">
                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Total
                            </p>
                            <h3 className="fw-black mb-0">{summary.total}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Aktif
                            </p>
                            <h3 className="fw-black mb-0">{summary.active}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Nonaktif
                            </p>
                            <h3 className="fw-black mb-0">{summary.inactive}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Merchandise
                            </p>
                            <h3 className="fw-black mb-0">{summary.checkout}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Peminjaman
                            </p>
                            <h3 className="fw-black mb-0">{summary.borrow}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl-2">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Keduanya
                            </p>
                            <h3 className="fw-black mb-0">{summary.both}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 align-items-start">
                <div className="col-xl-4">
                    <form className="card border-0 shadow-sm rounded-5 position-sticky" style={{ top: 110 }} onSubmit={handleSubmit}>
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                                <div>
                                    <span className="text-primary small fw-bold text-uppercase">
                                        {editingId ? 'Edit Product' : 'Create Product'}
                                    </span>

                                    <h4 className="fw-black mt-1 mb-1">
                                        {editingId ? 'Edit Paket / Barang' : 'Tambah Paket / Barang'}
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Isi data untuk katalog merchandise atau barang peminjaman.
                                    </p>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-box-seam-fill fs-4"></i>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Kategori
                                </label>

                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleInputChange}
                                    className="form-select rounded-4"
                                    disabled={loadingCategories}
                                    required
                                >
                                    <option value="">
                                        {loadingCategories ? 'Memuat kategori...' : 'Pilih kategori'}
                                    </option>

                                    {categories.map((category) => (
                                        <option value={category.id} key={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Nama Paket / Barang
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Contoh: Paket Merchandise VIP"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Deskripsi
                                </label>

                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Tuliskan isi paket atau keterangan barang."
                                    rows="4"
                                />
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6 col-xl-12">
                                    <label className="form-label fw-bold">
                                        Stok
                                    </label>

                                    <input
                                        type="number"
                                        name="stock"
                                        value={formData.stock}
                                        onChange={handleInputChange}
                                        className="form-control rounded-4"
                                        placeholder="0"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="col-md-6 col-xl-12">
                                    <label className="form-label fw-bold">
                                        Jenis Penggunaan
                                    </label>

                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="form-select rounded-4"
                                        required
                                    >
                                        {typeOptions.map((option) => (
                                            <option value={option.value} key={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label className="form-label fw-bold">
                                    Link Gambar
                                </label>

                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Opsional: https://..."
                                />
                            </div>

                            <div className="mt-3 mb-4">
                                <label className="form-label fw-bold">
                                    Status
                                </label>

                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="form-select rounded-4"
                                    required
                                >
                                    {statusOptions.map((option) => (
                                        <option value={option.value} key={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="d-grid gap-2">
                                <button
                                    className="btn btn-primary rounded-pill fw-bold"
                                    type="submit"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? 'Menyimpan...'
                                        : editingId
                                            ? 'Update Data'
                                            : 'Tambah Data'}
                                </button>

                                <button
                                    className="btn btn-outline-dark rounded-pill fw-bold"
                                    type="button"
                                    onClick={resetForm}
                                    disabled={submitting}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="col-xl-8">
                    <div className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="row g-3 align-items-end">
                                <div className="col-lg-6">
                                    <label className="form-label fw-bold">
                                        Cari Data
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0 rounded-start-4">
                                            <i className="bi bi-search"></i>
                                        </span>

                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={(event) => setSearchKeyword(event.target.value)}
                                            className="form-control border-start-0 rounded-end-4"
                                            placeholder="Cari nama, kategori, slug, atau deskripsi..."
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <label className="form-label fw-bold">
                                        Jenis
                                    </label>

                                    <select
                                        value={selectedType}
                                        onChange={(event) => setSelectedType(event.target.value)}
                                        className="form-select rounded-4"
                                    >
                                        <option value="all">Semua Jenis</option>
                                        {typeOptions.map((option) => (
                                            <option value={option.value} key={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6 col-lg-3">
                                    <label className="form-label fw-bold">
                                        Status
                                    </label>

                                    <select
                                        value={selectedStatus}
                                        onChange={(event) => setSelectedStatus(event.target.value)}
                                        className="form-select rounded-4"
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
                        </div>
                    </div>

                    {loadingProducts && (
                        <div className="alert alert-primary rounded-4">
                            Sedang mengambil data paket atau barang...
                        </div>
                    )}

                    {!loadingProducts && filteredProducts.length === 0 && (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="icon-box bg-primary-subtle text-primary mx-auto mb-3">
                                    <i className="bi bi-inbox-fill fs-4"></i>
                                </div>

                                <h4 className="fw-black">
                                    Data tidak ditemukan
                                </h4>

                                <p className="text-muted mb-0">
                                    Belum ada paket atau barang yang sesuai dengan filter.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="row g-3">
                        {filteredProducts.map((product) => (
                            <div className="col-12 col-md-6 col-xxl-4" key={product.id}>
                                <div className="card border-0 shadow-sm rounded-5 h-100 overflow-hidden">
                                    <div
                                        className="d-flex align-items-center justify-content-center text-primary fw-black"
                                        style={{
                                            height: 150,
                                            background:
                                                product.type === 'borrow'
                                                    ? 'linear-gradient(135deg, #ccfbf1, #eef2ff)'
                                                    : 'linear-gradient(135deg, #dbeafe, #eef2ff)',
                                            letterSpacing: '.12em',
                                        }}
                                    >
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-100 h-100 object-fit-cover"
                                            />
                                        ) : (
                                            <span>
                                                {product.type === 'borrow' ? 'SEKPIM' : 'HUMAS'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="card-body p-4">
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            <span className={`badge rounded-pill ${getTypeBadgeClass(product.type)}`}>
                                                {getTypeLabel(product.type)}
                                            </span>

                                            <span className={`status status-${product.status}`}>
                                                {product.status}
                                            </span>
                                        </div>

                                        <h5 className="fw-black mb-2">
                                            {product.name}
                                        </h5>

                                        <p className="text-muted small mb-3" style={{ minHeight: 66 }}>
                                            {product.description || 'Tidak ada deskripsi.'}
                                        </p>

                                        <div className="d-grid gap-2 mb-3">
                                            <div className="d-flex justify-content-between align-items-center bg-light border rounded-4 p-3">
                                                <span className="text-muted fw-bold small">
                                                    Kategori
                                                </span>

                                                <strong className="text-end">
                                                    {product.category?.name || '-'}
                                                </strong>
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center bg-light border rounded-4 p-3">
                                                <span className="text-muted fw-bold small">
                                                    Stok
                                                </span>

                                                <strong className="fs-4">
                                                    {product.stock}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 flex-wrap">
                                            <button
                                                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                type="button"
                                                onClick={() => handleEdit(product)}
                                            >
                                                <i className="bi bi-pencil-square me-1"></i>
                                                Edit
                                            </button>

                                            <button
                                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                                type="button"
                                                onClick={() => handleDelete(product)}
                                            >
                                                <i className="bi bi-trash-fill me-1"></i>
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="alert alert-info rounded-4 mt-3 mb-0">
                        <strong>Catatan:</strong> gunakan jenis <strong>Merchandise</strong> untuk katalog
                        pengajuan HUMAS, <strong>Peminjaman</strong> untuk barang Sekpim, dan
                        <strong> Keduanya</strong> jika data bisa digunakan untuk dua kebutuhan.
                    </div>
                </div>
            </div>
        </div>
    );
}