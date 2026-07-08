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
    name: '',
    slug: '',
    description: '',
    status: 'active',
};

const createSlug = (value) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export default function CategoryFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = Boolean(id);

    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);

    const fetchCategory = async () => {
        if (!isEdit) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await api.get(`/categories/${id}`);
            const category = response.data.data;

            setForm({
                name: category.name || '',
                slug: category.slug || '',
                description: category.description || '',
                status: category.status || 'active',
            });
        } catch (error) {
            console.error('Fetch category form error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Form',
                error.response?.data?.message || 'Data kategori gagal dimuat.'
            );

            navigate('/admin/categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategory();
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
        if (!form.name.trim()) {
            showWarningAlert('Nama Wajib Diisi', 'Isi nama kategori terlebih dahulu.');
            return false;
        }

        if (!form.slug.trim()) {
            showWarningAlert('Slug Wajib Diisi', 'Isi slug kategori terlebih dahulu.');
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
                isEdit ? 'Memperbarui Kategori' : 'Menyimpan Kategori',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                name: form.name,
                slug: form.slug,
                description: form.description,
                status: form.status,
            };

            if (isEdit) {
                await api.put(`/categories/${id}`, payload);
            } else {
                await api.post('/categories', payload);
            }

            closeAlert();

            await showSuccessAlert(
                isEdit ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
                isEdit
                    ? 'Data kategori berhasil diperbarui.'
                    : 'Kategori baru berhasil ditambahkan.'
            );

            navigate('/admin/categories');
        } catch (error) {
            console.error('Save category error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                isEdit ? 'Update Gagal' : 'Tambah Gagal',
                getBackendErrorMessage(error, 'Data kategori gagal disimpan.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-primary mb-3" />
                    <p className="text-muted mb-0">Memuat form kategori...</p>
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
                        'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit ? 'Perbarui data kategori.' : 'Tambahkan kategori baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Kategori dipakai untuk mengelompokkan produk agar katalog
                                merchandise dan peminjaman lebih rapi.
                            </p>
                        </div>

                        <Link to="/admin/categories" className="btn btn-light rounded-pill">
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
                                    Informasi Kategori
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi nama, slug, dan deskripsi kategori.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Nama Kategori</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Merchandise"
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
                                            placeholder="merchandise"
                                            value={form.slug}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                        <div className="form-text">
                                            Slug otomatis dibuat saat tambah kategori, tetapi tetap bisa diedit.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">Deskripsi</label>
                                        <textarea
                                            name="description"
                                            className="form-control rounded-4"
                                            rows="6"
                                            placeholder="Deskripsi singkat kategori..."
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
                                    Pengaturan
                                </h4>

                                <p className="text-muted mb-4">
                                    Atur status kategori.
                                </p>

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
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Nonaktif</option>
                                    </select>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill"
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
                                                {isEdit ? 'Update Kategori' : 'Simpan Kategori'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/categories"
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
                                    <span className="badge rounded-pill text-bg-primary mb-3">
                                        Kategori
                                    </span>

                                    <h5 className="fw-black mb-2">
                                        {form.name || 'Nama Kategori'}
                                    </h5>

                                    <p className="text-muted mb-3">
                                        {form.description || 'Deskripsi kategori akan tampil di sini.'}
                                    </p>

                                    <div className="d-flex align-items-center justify-content-between">
                                        <span className={`status status-${form.status}`}>
                                            {form.status}
                                        </span>

                                        <strong className="text-muted">
                                            {form.slug || 'slug-kategori'}
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