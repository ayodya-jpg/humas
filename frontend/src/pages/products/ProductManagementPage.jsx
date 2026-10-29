
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

const SERVICE_FILTERS = [
    { value: 'all', label: 'Semua Layanan' },
    { value: 'merchandise', label: 'Merchandise HUMAS' },
    { value: 'borrow', label: 'Peminjaman SEKPiM' },
    { value: 'asset_request', label: 'Request Aset SEKPiM' },
];

const getServices = (product) => {
    const services = [];
    if (['checkout', 'both'].includes(product.type)) {
        services.push('merchandise');
    }

    let sekpimType = product.sekpim_item_type;
    if (!sekpimType && ['borrow', 'both'].includes(product.type)) {
        sekpimType = 'borrow';
    }

    if (['borrow', 'both'].includes(sekpimType)) services.push('borrow');
    if (['asset_request', 'both'].includes(sekpimType)) services.push('asset_request');
    return services;
};

const getRows = (response) => {
    const data = response?.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {}).flat().find(Boolean) ||
    error?.response?.data?.message ||
    'Permintaan gagal diproses.';

const canManageProducts = () => {
    try {
        const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        return user.role === 'superadmin' ||
            (Array.isArray(user.permissions) && user.permissions.includes('products.manage'));
    } catch {
        return false;
    }
};

export default function ProductManagementPage() {
    const canManage = useMemo(() => canManageProducts(), []);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [service, setService] = useState('all');
    const [status, setStatus] = useState('all');
    const [deletingId, setDeletingId] = useState(null);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/products');
            setProducts(getRows(response));
        } catch (err) {
            setProducts([]);
            setError(getError(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = useMemo(() => {
        const text = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchSearch = !text || [
                product.name,
                product.slug,
                product.description,
                product.category?.name,
            ].filter(Boolean).join(' ').toLowerCase().includes(text);

            const matchService = service === 'all' || getServices(product).includes(service);
            const matchStatus = status === 'all' || product.status === status;
            return matchSearch && matchService && matchStatus;
        });
    }, [products, search, service, status]);

    const summary = useMemo(() => ({
        total: products.length,
        active: products.filter((p) => p.status === 'active').length,
        lowStock: products.filter((p) => Number(p.stock ?? 0) <= 5).length,
    }), [products]);

    const handleDelete = async (product) => {
        if (!canManage || deletingId !== null) return;

        const confirmation = await showConfirmAlert({
            title: 'Hapus Produk?',
            text: `Produk "${product.name}" akan dihapus. Produk yang sudah dipakai dalam pengajuan mungkin tidak dapat dihapus.`,
            confirmButtonText: 'Ya, hapus',
            cancelButtonText: 'Batal',
            icon: 'warning',
        });
        if (!confirmation?.isConfirmed) return;

        try {
            setDeletingId(product.id);
            showLoadingAlert('Menghapus Produk', 'Memproses penghapusan...');
            await api.delete(`/products/${product.id}`);
            closeAlert();
            await loadProducts();
            await showSuccessAlert('Produk Dihapus', 'Produk berhasil dihapus.');
        } catch (err) {
            closeAlert();
            await showErrorAlert('Gagal Menghapus Produk', getError(err));
        } finally {
            setDeletingId(null);
        }
    };

    const resetFilters = () => {
        setSearch('');
        setService('all');
        setStatus('all');
    };

    return (
        <div className="container-fluid px-0">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3">
                <div
                    className="card-body text-white p-4"
                    style={{ background: 'linear-gradient(115deg,#047857,#0f172a)' }}
                >
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <span className="badge bg-white text-success rounded-pill mb-2">MASTER KATALOG</span>
                            <h2 className="fw-bold mb-1">Data Produk</h2>
                            <p className="mb-0 opacity-75 small">
                                Kelola Merchandise HUMAS, Peminjaman SEKPiM, dan Request Aset dalam satu tempat.
                            </p>
                        </div>
                        {canManage && (
                            <Link to="/admin/products/create" className="btn btn-light text-success fw-bold rounded-pill px-4">
                                <i className="bi bi-plus-lg me-2" />Tambah Produk
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-3">
                {[
                    { label: 'Total Produk', value: summary.total, icon: 'bi-boxes' },
                    { label: 'Produk Aktif', value: summary.active, icon: 'bi-check-circle' },
                    { label: 'Stok ≤ 5', value: summary.lowStock, icon: 'bi-exclamation-circle' },
                ].map((item) => (
                    <div key={item.label} className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                            <div className="card-body d-flex align-items-center gap-3 p-3">
                                <div className="rounded-3 bg-success-subtle text-success p-3">
                                    <i className={`bi ${item.icon} fs-4`} />
                                </div>
                                <div>
                                    <div className="small text-muted">{item.label}</div>
                                    <div className="fs-4 fw-bold">{item.value}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-3">
                <div className="card-body p-3 p-lg-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-semibold small">Cari Produk</label>
                            <input
                                type="search" className="form-control" value={search}
                                placeholder="Nama barang, kategori, deskripsi..."
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-lg-4">
                            <label className="form-label fw-semibold small">Layanan</label>
                            <select className="form-select" value={service} onChange={(e) => setService(e.target.value)}>
                                {SERVICE_FILTERS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-lg-2">
                            <label className="form-label fw-semibold small">Status</label>
                            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="all">Semua</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </div>
                        <div className="col-lg-1">
                            <button type="button" className="btn btn-outline-secondary w-100" onClick={resetFilters} title="Reset Filter">
                                <i className="bi bi-arrow-counterclockwise" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={loadProducts}>Coba Lagi</button>
                </div>
            )}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-4 text-center p-5">
                    <div><span className="spinner-border text-success" /></div>
                    <p className="text-muted mt-2 mb-0">Memuat produk...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-4 text-center p-5">
                    <i className="bi bi-inbox fs-1 text-muted" />
                    <h5 className="mt-3">Tidak ada produk</h5>
                    <p className="text-muted mb-0">Periksa filter atau tambahkan produk baru.</p>
                </div>
            ) : (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Produk</th>
                                    <th>Kategori</th>
                                    <th>Layanan</th>
                                    <th>Stok</th>
                                    <th>Status</th>
                                    {canManage && <th className="text-end pe-4">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const services = getServices(product);
                                    return (
                                        <tr key={product.id}>
                                            <td className="ps-4" style={{ minWidth: 220 }}>
                                                <div className="d-flex gap-3 align-items-center">
                                                    {product.image ? (
                                                        <img
                                                            src={product.image} alt={product.name}
                                                            className="rounded-3 border"
                                                            style={{ width: 50, height: 50, objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div className="rounded-3 bg-light p-3 text-secondary">
                                                            <i className="bi bi-box-seam" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="fw-semibold">{product.name}</div>
                                                        <small className="text-muted">{product.slug}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{product.category?.name || '-'}</td>
                                            <td style={{ minWidth: 190 }}>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {services.length === 0 ? (
                                                        <span className="badge text-bg-secondary">Belum diatur</span>
                                                    ) : services.map((value) => (
                                                        <span key={value} className="badge bg-success-subtle text-success border border-success-subtle">
                                                            {SERVICE_FILTERS.find((x) => x.value === value)?.label || value}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="fw-semibold">{product.stock ?? 0}</td>
                                            <td>
                                                <span className={`badge ${product.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                                    {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            {canManage && (
                                                <td className="text-end pe-4">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <Link
                                                            to={`/admin/products/${product.id}/edit`}
                                                            className="btn btn-sm btn-outline-success rounded-pill"
                                                        >
                                                            <i className="bi bi-pencil-square me-1" />Edit
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger rounded-pill"
                                                            disabled={deletingId !== null}
                                                            onClick={() => handleDelete(product)}
                                                        >
                                                            <i className="bi bi-trash me-1" />Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer border-0 bg-white small text-muted px-4 py-3">
                        Menampilkan {filteredProducts.length} dari {products.length} produk.
                    </div>
                </div>
            )}
        </div>
    );
}
