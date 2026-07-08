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
    name: '',
    description: '',
};

export default function CategoryManagementPage() {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const [loadingCategories, setLoadingCategories] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            setErrorMessage('');

            const response = await api.get('/categories');
            setCategories(response.data.data || []);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data kategori.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Data', backendMessage);
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return categories.filter((category) => {
            return (
                category.name?.toLowerCase().includes(keyword) ||
                category.slug?.toLowerCase().includes(keyword) ||
                category.description?.toLowerCase().includes(keyword)
            );
        });
    }, [categories, searchKeyword]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEdit = (category) => {
        setEditingId(category.id);

        setFormData({
            name: category.name || '',
            description: category.description || '',
        });

        setMessage('');
        setErrorMessage('');

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const resetForm = async () => {
        if (formData.name || formData.description || editingId) {
            const result = await showConfirmAlert({
                title: 'Reset Form?',
                text: 'Data yang sedang diisi akan dikosongkan.',
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

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        if (!formData.name.trim()) {
            setErrorMessage('Nama kategori wajib diisi.');
            showWarningAlert('Nama Kategori Wajib Diisi', 'Isi nama kategori terlebih dahulu.');
            return;
        }

        const result = await showConfirmAlert({
            title: editingId ? 'Update Kategori?' : 'Tambah Kategori?',
            text: editingId
                ? 'Data kategori akan diperbarui.'
                : 'Kategori baru akan ditambahkan ke master data.',
            confirmButtonText: editingId ? 'Ya, update' : 'Ya, tambah',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        setSubmitting(true);
        showLoadingAlert(
            editingId ? 'Memperbarui Kategori' : 'Menambahkan Kategori',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
            };

            const response = editingId
                ? await api.put(`/categories/${editingId}`, payload)
                : await api.post('/categories', payload);

            closeAlert();

            setMessage(response.data.message);
            setFormData(initialForm);
            setEditingId(null);

            await fetchCategories();

            showSuccessAlert(
                editingId ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
                response.data.message
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Data kategori gagal disimpan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan', backendMessage);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (category) => {
        setMessage('');
        setErrorMessage('');

        const result = await showConfirmAlert({
            title: 'Hapus Kategori?',
            text: `${category.name} akan dihapus dari master data. Pastikan kategori ini belum digunakan produk.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menghapus Kategori', 'Mohon tunggu, data sedang dihapus.');

        try {
            const response = await api.delete(`/categories/${category.id}`);

            closeAlert();

            setMessage(response.data.message);

            if (editingId === category.id) {
                setFormData(initialForm);
                setEditingId(null);
            }

            await fetchCategories();

            showSuccessAlert('Kategori Dihapus', response.data.message);
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Kategori gagal dihapus. Kemungkinan kategori masih digunakan produk.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus', backendMessage);
            console.error(error);
        }
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
                                Data Kategori
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Kelola kategori untuk membedakan paket merchandise, barang Sekpim,
                                ATK, atau kategori lain yang digunakan dalam sistem pengajuan.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <button
                                className="btn btn-light rounded-pill fw-bold w-100"
                                type="button"
                                onClick={fetchCategories}
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

            <div className="row g-4 align-items-start">
                <div className="col-xl-4">
                    <form className="card border-0 shadow-sm rounded-5 position-sticky" style={{ top: 110 }} onSubmit={handleSubmit}>
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                                <div>
                                    <span className="text-primary small fw-bold text-uppercase">
                                        {editingId ? 'Edit Category' : 'Create Category'}
                                    </span>

                                    <h4 className="fw-black mt-1 mb-1">
                                        {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Isi data kategori untuk master produk.
                                    </p>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-tags-fill fs-4"></i>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Nama Kategori
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Contoh: Merchandise"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">
                                    Deskripsi
                                </label>

                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Tuliskan keterangan kategori."
                                    rows="5"
                                />
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
                                            ? 'Update Kategori'
                                            : 'Tambah Kategori'}
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
                                <div className="col-lg-8">
                                    <label className="form-label fw-bold">
                                        Cari Kategori
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
                                            placeholder="Cari nama, slug, atau deskripsi kategori..."
                                        />
                                    </div>
                                </div>

                                <div className="col-lg-4">
                                    <div className="bg-light border rounded-4 p-3 h-100">
                                        <span className="d-block text-muted small fw-bold text-uppercase mb-1">
                                            Total Kategori
                                        </span>

                                        <strong className="fs-4">
                                            {categories.length}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingCategories && (
                        <div className="alert alert-primary rounded-4">
                            Sedang mengambil data kategori...
                        </div>
                    )}

                    {!loadingCategories && filteredCategories.length === 0 && (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="icon-box bg-primary-subtle text-primary mx-auto mb-3">
                                    <i className="bi bi-inbox-fill fs-4"></i>
                                </div>

                                <h4 className="fw-black">
                                    Kategori tidak ditemukan
                                </h4>

                                <p className="text-muted mb-0">
                                    Belum ada kategori atau kata kunci pencarian tidak cocok.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-4 py-3 small text-muted text-uppercase">
                                            Kategori
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase">
                                            Slug
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase">
                                            Deskripsi
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase text-end">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCategories.map((category) => (
                                        <tr key={category.id}>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="icon-box bg-primary-subtle text-primary">
                                                        <i className="bi bi-tag-fill"></i>
                                                    </div>

                                                    <div>
                                                        <strong>{category.name}</strong>
                                                        <p className="text-muted small mb-0">
                                                            ID: {category.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="badge rounded-pill text-bg-light border">
                                                    {category.slug || '-'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="text-muted">
                                                    {category.description || '-'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="d-flex justify-content-end gap-2 flex-wrap">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                        type="button"
                                                        onClick={() => handleEdit(category)}
                                                    >
                                                        <i className="bi bi-pencil-square me-1"></i>
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                                        type="button"
                                                        onClick={() => handleDelete(category)}
                                                    >
                                                        <i className="bi bi-trash-fill me-1"></i>
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {!loadingCategories && filteredCategories.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted p-4">
                                                Tidak ada data kategori.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="alert alert-info rounded-4 mt-3 mb-0">
                        <strong>Catatan:</strong> kategori yang sudah digunakan oleh paket atau barang
                        sebaiknya tidak dihapus agar data pengajuan tetap aman.
                    </div>
                </div>
            </div>
        </div>
    );
}