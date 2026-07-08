import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const initialForm = {
    category_id: '',
    name: '',
    slug: '',
    description: '',
    stock: 0,
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

const createSlug = (value) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export default function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = Boolean(id);

    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);

            const requests = [
                api.get('/categories'),
            ];

            if (isEdit) {
                requests.push(api.get(`/products/${id}`));
            }

            const responses = await Promise.all(requests);

            setCategories(responses[0].data.data || []);

            if (isEdit) {
                const product = responses[1].data.data;

                setForm({
                    category_id: product.category_id || '',
                    name: product.name || '',
                    slug: product.slug || '',
                    description: product.description || '',
                    stock: product.stock ?? 0,
                    type: product.type || 'checkout',
                    image: product.image || '',
                    status: product.status || 'active',
                });
            }
        } catch (error) {
            console.error('Fetch product form error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Form',
                error.response?.data?.message || 'Data form produk gagal dimuat.'
            );

            navigate('/admin/products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

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

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prevForm) => {
            const nextForm = {
                ...prevForm,
                [name]: value,
            };

            if (name === 'name' && !isEdit) {
                nextForm.slug = createSlug(value);
            }

            return nextForm;
        });
    };

    const validateForm = () => {
        if (!form.category_id) {
            showWarningAlert('Kategori Wajib Dipilih', 'Pilih kategori produk terlebih dahulu.');
            return false;
        }

        if (!form.name.trim()) {
            showWarningAlert('Nama Wajib Diisi', 'Isi nama produk terlebih dahulu.');
            return false;
        }

        if (!form.slug.trim()) {
            showWarningAlert('Slug Wajib Diisi', 'Isi slug produk terlebih dahulu.');
            return false;
        }

        if (Number(form.stock) < 0) {
            showWarningAlert('Stok Tidak Valid', 'Stok tidak boleh kurang dari 0.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        try {
            setSubmitting(true);

            showLoadingAlert(
                isEdit ? 'Memperbarui Produk' : 'Menyimpan Produk',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                category_id: Number(form.category_id),
                name: form.name,
                slug: form.slug,
                description: form.description,
                stock: Number(form.stock),
                type: form.type,
                image: form.image || null,
                status: form.status,
            };

            if (isEdit) {
                await api.put(`/products/${id}`, payload);
            } else {
                await api.post('/products', payload);
            }

            closeAlert();

            await showSuccessAlert(
                isEdit ? 'Produk Diperbarui' : 'Produk Ditambahkan',
                isEdit
                    ? 'Data produk berhasil diperbarui.'
                    : 'Produk baru berhasil ditambahkan.'
            );

            navigate('/admin/products');
        } catch (error) {
            console.error('Save product error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                isEdit ? 'Update Gagal' : 'Tambah Gagal',
                getBackendErrorMessage(error, 'Data produk gagal disimpan.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-warning mb-3" />
                    <p className="text-muted mb-0">Memuat form produk...</p>
                </div>
            </div>
        );
    }

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
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-warning px-3 py-2 mb-3">
                                {isEdit ? 'Edit Produk' : 'Tambah Produk'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit ? 'Perbarui data produk.' : 'Tambahkan produk baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Isi data produk dengan benar agar muncul di katalog merchandise
                                atau peminjaman sesuai jenis produk yang dipilih.
                            </p>
                        </div>

                        <Link to="/admin/products" className="btn btn-light rounded-pill">
                            <i className="bi bi-arrow-left me-2"></i>
                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Produk
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi identitas produk, kategori, dan deskripsi.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Kategori</label>
                                        <select
                                            name="category_id"
                                            className="form-select"
                                            value={form.category_id}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        >
                                            <option value="">Pilih kategori</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Nama Produk</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Paket Merchandise VIP"
                                            value={form.name}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Slug</label>
                                        <input
                                            type="text"
                                            name="slug"
                                            className="form-control rounded-pill"
                                            placeholder="paket-merchandise-vip"
                                            value={form.slug}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                        <div className="form-text">
                                            Slug otomatis dibuat saat tambah produk, tetapi tetap bisa diedit.
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">URL Gambar</label>
                                        <input
                                            type="text"
                                            name="image"
                                            className="form-control rounded-pill"
                                            placeholder="Opsional, isi URL gambar produk"
                                            value={form.image}
                                            onChange={handleChange}
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">Deskripsi</label>
                                        <textarea
                                            name="description"
                                            className="form-control rounded-4"
                                            rows="5"
                                            placeholder="Deskripsi singkat produk..."
                                            value={form.description}
                                            onChange={handleChange}
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Pengaturan Produk
                                </h4>

                                <p className="text-muted mb-4">
                                    Atur stok, jenis penggunaan, dan status produk.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label fw-bold">Stok</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        min="0"
                                        className="form-control rounded-pill"
                                        value={form.stock}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold">Jenis Produk</label>
                                    <select
                                        name="type"
                                        className="form-select"
                                        value={form.type}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        required
                                    >
                                        {typeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-bold">Status</label>
                                    <select
                                        name="status"
                                        className="form-select"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={submitting}
                                        required
                                    >
                                        {statusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-warning rounded-pill text-white"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-save-fill me-2"></i>
                                                {isEdit ? 'Update Produk' : 'Simpan Produk'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/products"
                                        className="btn btn-outline-dark rounded-pill"
                                    >
                                        Batal
                                    </Link>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-3">
                                    Preview Singkat
                                </h4>

                                <div className="p-3 rounded-4 bg-light">
                                    <span className="badge rounded-pill text-bg-warning mb-3">
                                        {typeOptions.find((option) => option.value === form.type)?.label || 'Produk'}
                                    </span>

                                    <h5 className="fw-black mb-2">
                                        {form.name || 'Nama Produk'}
                                    </h5>

                                    <p className="text-muted mb-3">
                                        {form.description || 'Deskripsi produk akan tampil di sini.'}
                                    </p>

                                    <div className="d-flex align-items-center justify-content-between">
                                        <span className={`status status-${form.status}`}>
                                            {form.status}
                                        </span>

                                        <strong>
                                            Stok {form.stock || 0}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
}