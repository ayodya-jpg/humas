
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const SERVICE_OPTIONS = [
    {
        value: 'merchandise',
        label: 'Merchandise HUMAS',
        description: 'Barang untuk permintaan merchandise.',
        icon: 'bi-gift',
    },
    {
        value: 'borrow',
        label: 'Peminjaman SEKPiM',
        description: 'Barang dipinjam dan wajib dikembalikan.',
        icon: 'bi-arrow-left-right',
    },
    {
        value: 'asset_request',
        label: 'Request Aset SEKPiM',
        description: 'Barang diberikan kepada penerima dan tidak dikembalikan.',
        icon: 'bi-box-seam',
    },
];

const EMPTY_FORM = {
    category_id: '',
    name: '',
    description: '',
    stock: '0',
    image: '',
    status: 'active',
    services: ['merchandise'],
    slug: '',
};

const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
};

const hasManagePermission = () => {
    const user = getUser();
    return user.role === 'superadmin' ||
        (Array.isArray(user.permissions) &&
            user.permissions.includes('products.manage'));
};

const getRows = (response) => {
    const data = response?.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Permintaan gagal diproses.';

// Konversi jenis lama + jenis SEKPiM menjadi daftar layanan di form.
const servicesFromProduct = (product) => {
    const services = [];

    if (['checkout', 'both'].includes(product.type)) {
        services.push('merchandise');
    }

    let sekpimType = product.sekpim_item_type;
    if (!sekpimType && ['borrow', 'both'].includes(product.type)) {
        sekpimType = 'borrow'; // kompatibilitas produk lama
    }

    if (['borrow', 'both'].includes(sekpimType)) {
        services.push('borrow');
    }
    if (['asset_request', 'both'].includes(sekpimType)) {
        services.push('asset_request');
    }
    return services;
};

// Kompatibel dengan enum products.type yang sudah ada di Laravel.
const typeFromServices = (services) => {
    const merchandise = services.includes('merchandise');
    const borrow = services.includes('borrow');
    const assetRequest = services.includes('asset_request');

    const type = merchandise
        ? (borrow || assetRequest ? 'both' : 'checkout')
        : 'borrow';

    const sekpim_item_type = borrow && assetRequest
        ? 'both'
        : borrow
          ? 'borrow'
          : assetRequest
            ? 'asset_request'
            : null;

    return { type, sekpim_item_type };
};

const normalizeImage = (value) => {
    const image = String(value || '').trim();
    if (!image) return null;
    if (/^https?:\/\//i.test(image) || image.startsWith('/')) return image;
    return `https://${image}`;
};

export default function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const canManage = useMemo(() => hasManagePermission(), []);

    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        if (!canManage) {
            setError('Akun tidak memiliki izin products.manage.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const requests = [api.get('/categories')];
            if (editing) requests.push(api.get(`/products/${id}`));
            const results = await Promise.all(requests);

            const categoryRows = getRows(results[0]);
            setCategories(categoryRows);

            if (editing) {
                const product = results[1]?.data?.data;
                if (!product || !product.id) {
                    throw new Error('Produk tidak ditemukan.');
                }

                setForm({
                    category_id: String(product.category_id ?? ''),
                    name: product.name || '',
                    description: product.description || '',
                    stock: String(product.stock ?? 0),
                    image: product.image || '',
                    status: product.status || 'active',
                    services: servicesFromProduct(product),
                    slug: product.slug || '',
                });
            }
        } catch (err) {
            setError(err.response ? getError(err) : err.message);
        } finally {
            setLoading(false);
        }
    }, [canManage, editing, id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateField = (name, value) => {
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const toggleService = (service, checked) => {
        setForm((previous) => ({
            ...previous,
            services: checked
                ? [...new Set([...previous.services, service])]
                : previous.services.filter((value) => value !== service),
        }));
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        if (!canManage || saving) return;

        const qty = Number(form.stock);
        if (
            !form.category_id ||
            form.name.trim().length < 3 ||
            form.stock === '' ||
            !Number.isSafeInteger(qty) ||
            qty < 0 ||
            form.services.length === 0
        ) {
            await showWarningAlert(
                'Periksa Form',
                'Isi kategori, nama minimal 3 karakter, stok valid, dan pilih setidaknya satu layanan.'
            );
            return;
        }

        const classification = typeFromServices(form.services);
        const payload = {
            category_id: Number(form.category_id),
            name: form.name.trim(),
            description: form.description.trim() || null,
            stock: qty,
            image: normalizeImage(form.image),
            status: form.status,
            ...classification,
            // Saat edit, pertahankan slug agar tautan produk tidak berubah.
            ...(editing && form.slug ? { slug: form.slug } : {}),
        };

        try {
            setSaving(true);
            showLoadingAlert('Menyimpan Produk', 'Menyimpan produk ke katalog HUMAS dan SEKPiM.');

            const response = editing
                ? await api.put(`/products/${id}`, payload)
                : await api.post('/products', payload);

            closeAlert();
            await showSuccessAlert(
                editing ? 'Produk Diperbarui' : 'Produk Ditambahkan',
                response?.data?.message || 'Produk berhasil disimpan.'
            );
            navigate('/admin/products', { replace: true });
        } catch (err) {
            closeAlert();
            await showErrorAlert('Gagal Menyimpan Produk', getError(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                <div><span className="spinner-border text-success" /></div>
                <p className="text-muted mt-3 mb-0">Memuat formulir produk...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="alert alert-danger mb-3">{error}</div>
                <div><Link className="btn btn-outline-secondary" to="/admin/products">Kembali ke Data Produk</Link></div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div
                    className="card-body text-white p-4"
                    style={{ background: 'linear-gradient(115deg,#047857,#0f172a)' }}
                >
                    <Link to="/admin/products" className="text-white text-decoration-none small">
                        <i className="bi bi-arrow-left me-2" />Kembali ke Data Produk
                    </Link>
                    <h2 className="fw-bold mt-3 mb-1">
                        {editing ? 'Edit Produk' : 'Tambah Produk Baru'}
                    </h2>
                    <p className="mb-0 opacity-75">
                        Satu produk dapat digunakan oleh lebih dari satu layanan HUMAS/SEKPiM.
                    </p>
                </div>
            </div>

            <form onSubmit={saveProduct}>
                <div className="row g-3">
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-3">Informasi Produk</h5>
                                <div className="row g-3">
                                    <div className="col-md-8">
                                        <label htmlFor="product-name" className="form-label fw-semibold">Nama Produk *</label>
                                        <input
                                            id="product-name"
                                            className="form-control"
                                            required minLength={3} maxLength={255}
                                            value={form.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            placeholder="Contoh: Map Dokumen SEKPiM"
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label htmlFor="product-stock" className="form-label fw-semibold">Stok *</label>
                                        <input
                                            id="product-stock" type="number"
                                            className="form-control" required min={0} step={1}
                                            value={form.stock}
                                            onChange={(e) => updateField('stock', e.target.value)}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="product-category" className="form-label fw-semibold">Kategori *</label>
                                        <select
                                            id="product-category" className="form-select" required
                                            value={form.category_id}
                                            onChange={(e) => updateField('category_id', e.target.value)}
                                            disabled={saving}
                                        >
                                            <option value="">Pilih kategori</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                        {categories.length === 0 && (
                                            <div className="form-text text-danger">Belum ada kategori yang tersedia.</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="product-status" className="form-label fw-semibold">Status</label>
                                        <select
                                            id="product-status" className="form-select"
                                            value={form.status}
                                            onChange={(e) => updateField('status', e.target.value)}
                                            disabled={saving}
                                        >
                                            <option value="active">Aktif — tampil di katalog</option>
                                            <option value="inactive">Nonaktif — sembunyikan dari katalog</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label htmlFor="product-description" className="form-label fw-semibold">Deskripsi</label>
                                        <textarea
                                            id="product-description" className="form-control" rows={4} maxLength={5000}
                                            value={form.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            disabled={saving}
                                            placeholder="Deskripsi atau spesifikasi barang"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label htmlFor="product-image" className="form-label fw-semibold">URL Gambar (opsional)</label>
                                        <input
                                            id="product-image" className="form-control"
                                            value={form.image}
                                            onChange={(e) => updateField('image', e.target.value)}
                                            disabled={saving}
                                            placeholder="https://contoh.com/gambar.jpg"
                                        />
                                        {form.image.trim() && (
                                            <img
                                                src={normalizeImage(form.image)}
                                                alt="Pratinjau produk"
                                                className="mt-3 rounded-3 border"
                                                style={{ width: '100%', maxWidth: 250, maxHeight: 180, objectFit: 'contain' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-2">Digunakan untuk Layanan *</h5>
                                <p className="small text-muted">
                                    Pilih satu atau beberapa layanan. Produk akan otomatis muncul di katalog yang sesuai.
                                </p>
                                <div className="d-flex flex-column gap-2">
                                    {SERVICE_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`border rounded-3 p-3 d-flex gap-3 align-items-start ${
                                                form.services.includes(option.value)
                                                    ? 'border-success bg-success-subtle'
                                                    : ''
                                            }`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="form-check-input mt-1"
                                                checked={form.services.includes(option.value)}
                                                onChange={(e) => toggleService(option.value, e.target.checked)}
                                                disabled={saving}
                                            />
                                            <span>
                                                <span className="fw-semibold d-block">
                                                    <i className={`bi ${option.icon} me-2`} />
                                                    {option.label}
                                                </span>
                                                <small className="text-muted">{option.description}</small>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="alert alert-light border small mt-3 mb-0">
                                    <i className="bi bi-info-circle me-2" />
                                    Untuk Request Aset, stok berkurang setelah serah terima selesai. Untuk Peminjaman, stok kembali saat barang dikembalikan.
                                </div>
                            </div>
                        </div>
                        <div className="d-grid gap-2">
                            <button
                                className="btn btn-success rounded-pill py-2 fw-semibold"
                                type="submit"
                                disabled={saving || categories.length === 0}
                            >
                                {saving ? (
                                    <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                                ) : (
                                    <><i className="bi bi-check-lg me-2" />{editing ? 'Simpan Perubahan' : 'Tambah Produk'}</>
                                )}
                            </button>
                            <Link className="btn btn-light rounded-pill" to="/admin/products">Batal</Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
