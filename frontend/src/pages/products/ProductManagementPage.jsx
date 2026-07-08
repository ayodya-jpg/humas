import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

const typeOptions = [
    { value: 'checkout', label: 'Merchandise' },
    { value: 'borrow', label: 'Peminjaman' },
    { value: 'both', label: 'Keduanya' },
];

const filterTypeOptions = [
    { value: 'all', label: 'Semua Jenis' },
    { value: 'checkout', label: 'Merchandise' },
    { value: 'borrow', label: 'Peminjaman' },
    { value: 'both', label: 'Keduanya' },
];

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        try {
            setLoading(true);

            const response = await api.get('/products');
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Fetch products error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data produk gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const searchValue = search.toLowerCase();

            const matchSearch =
                product.name?.toLowerCase().includes(searchValue) ||
                product.slug?.toLowerCase().includes(searchValue) ||
                product.description?.toLowerCase().includes(searchValue) ||
                product.category?.name?.toLowerCase().includes(searchValue);

            const matchType =
                selectedType === 'all' || product.type === selectedType;

            const matchStatus =
                selectedStatus === 'all' || product.status === selectedStatus;

            return matchSearch && matchType && matchStatus;
        });
    }, [products, search, selectedType, selectedStatus]);

    const summary = useMemo(() => {
        return {
            total: products.length,
            active: products.filter((product) => product.status === 'active').length,
            inactive: products.filter((product) => product.status === 'inactive').length,
            checkout: products.filter((product) => product.type === 'checkout').length,
            borrow: products.filter((product) => product.type === 'borrow').length,
            both: products.filter((product) => product.type === 'both').length,
            lowStock: products.filter((product) => Number(product.stock) <= 5).length,
        };
    }, [products]);

    const getBackendErrorMessage = (error, fallbackMessage = 'Proses gagal dilakukan.') => {
        const responseData = error.response?.data;

        if (responseData?.errors) {
            const firstError = Object.values(responseData.errors)?.[0]?.[0];

            if (firstError) {
                return firstError;
            }
        }

        if (responseData?.message) {
            return responseData.message;
        }

        return fallbackMessage;
    };

    const handleDelete = async (product) => {
        const confirmation = await showConfirmAlert({
            title: 'Hapus Produk?',
            text: `Produk "${product.name}" akan dihapus dari sistem.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            showLoadingAlert('Menghapus Produk', 'Mohon tunggu sebentar.');

            await api.delete(`/products/${product.id}`);

            closeAlert();

            await showSuccessAlert(
                'Produk Dihapus',
                'Data produk berhasil dihapus.'
            );

            fetchProducts();
        } catch (error) {
            console.error('Delete product error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Hapus Gagal',
                getBackendErrorMessage(error, 'Produk gagal dihapus.')
            );
        }
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(245,158,11,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-warning px-3 py-2 mb-3">
                                Master Data Produk
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Kelola produk tanpa form menumpuk.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Halaman ini hanya menampilkan daftar produk. Tambah dan edit
                                produk dilakukan di halaman khusus agar tampilan lebih bersih.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.total}</div>
                                        <div className="small text-white-50">Total</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.active}</div>
                                        <div className="small text-white-50">Aktif</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.checkout}</div>
                                        <div className="small text-white-50">Merchandise</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.lowStock}</div>
                                        <div className="small text-white-50">Stok Rendah</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Cari produk</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nama, slug, kategori..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-3">
                            <label className="form-label fw-bold">Filter jenis</label>
                            <select
                                className="form-select"
                                value={selectedType}
                                onChange={(event) => setSelectedType(event.target.value)}
                            >
                                {filterTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-lg-3">
                            <label className="form-label fw-bold">Filter status</label>
                            <select
                                className="form-select"
                                value={selectedStatus}
                                onChange={(event) => setSelectedStatus(event.target.value)}
                            >
                                <option value="all">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </div>

                        <div className="col-lg-2">
                            <Link
                                to="/admin/products/create"
                                className="btn btn-warning rounded-pill text-white w-100"
                            >
                                <i className="bi bi-plus-lg me-2"></i>
                                Tambah
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-warning mb-3" />
                        <p className="text-muted mb-0">Memuat data produk...</p>
                    </div>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{ width: 76, height: 76 }}
                        >
                            <i className="bi bi-inbox fs-1"></i>
                        </div>

                        <h5 className="fw-black mb-2">Produk tidak ditemukan</h5>

                        <p className="text-muted mb-0">
                            Tidak ada produk berdasarkan filter yang dipilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredProducts.map((product) => (
                        <div className="col-12" key={product.id}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-lg-6">
                                            <div className="d-flex gap-3">
                                                <div className="icon-box bg-warning-subtle text-warning">
                                                    <i className="bi bi-box-seam-fill fs-4"></i>
                                                </div>

                                                <div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        <span className="badge rounded-pill text-bg-warning">
                                                            {product.category?.name || 'Tanpa Kategori'}
                                                        </span>

                                                        <span className={`status status-${product.status}`}>
                                                            {product.status}
                                                        </span>

                                                        <span className={`badge rounded-pill ${
                                                            product.type === 'borrow'
                                                                ? 'text-bg-success'
                                                                : product.type === 'both'
                                                                    ? 'text-bg-info'
                                                                    : 'text-bg-primary'
                                                        }`}>
                                                            {typeOptions.find((option) => option.value === product.type)?.label || product.type}
                                                        </span>
                                                    </div>

                                                    <h5 className="fw-black mb-1">
                                                        {product.name}
                                                    </h5>

                                                    <p className="text-muted mb-0">
                                                        {product.description || 'Tidak ada deskripsi.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Slug</div>
                                            <div className="fw-bold text-break">{product.slug}</div>
                                        </div>

                                        <div className="col-md-6 col-lg-2">
                                            <div className="small text-muted">Stok</div>
                                            <div className={`fw-black fs-4 ${
                                                Number(product.stock) <= 5
                                                    ? 'text-danger'
                                                    : 'text-dark'
                                            }`}>
                                                {product.stock}
                                            </div>
                                        </div>

                                        <div className="col-lg-2 text-lg-end">
                                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                                <Link
                                                    to={`/admin/products/${product.id}/edit`}
                                                    className="btn btn-outline-primary rounded-pill"
                                                >
                                                    <i className="bi bi-pencil-square me-2"></i>
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={() => handleDelete(product)}
                                                >
                                                    <i className="bi bi-trash me-2"></i>
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {Number(product.stock) <= 5 && (
                                        <div className="mt-3 p-3 rounded-4 bg-danger-subtle border border-danger-subtle">
                                            <div className="fw-bold text-danger">
                                                Stok rendah
                                            </div>
                                            <div className="small text-muted">
                                                Pertimbangkan untuk memperbarui stok produk ini.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}