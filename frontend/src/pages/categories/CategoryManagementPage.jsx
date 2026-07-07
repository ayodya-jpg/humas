import { useEffect, useState } from 'react';
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
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const response = await api.get('/categories');
            setCategories(response.data.data);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data kategori.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Kategori', backendMessage);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetForm = async () => {
        if (formData.name || formData.description || editingCategoryId) {
            const result = await showConfirmAlert({
                title: 'Batalkan Form?',
                text: 'Data kategori yang sedang diisi akan dikosongkan.',
                confirmButtonText: 'Ya, kosongkan',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setFormData(initialForm);
        setEditingCategoryId(null);
        setMessage('');
        setErrorMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        if (!formData.name.trim()) {
            showWarningAlert(
                'Nama Kategori Wajib Diisi',
                'Isi nama kategori terlebih dahulu sebelum menyimpan.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: editingCategoryId ? 'Update Kategori?' : 'Tambah Kategori?',
            text: editingCategoryId
                ? 'Data kategori akan diperbarui.'
                : 'Kategori baru akan ditambahkan ke master data.',
            confirmButtonText: editingCategoryId ? 'Ya, update' : 'Ya, simpan',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert(
            editingCategoryId ? 'Memperbarui Kategori' : 'Menyimpan Kategori',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            if (editingCategoryId) {
                const response = await api.put(`/categories/${editingCategoryId}`, formData);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'Kategori Berhasil Diperbarui',
                    'Data kategori sudah diperbarui.'
                );
            } else {
                const response = await api.post('/categories', formData);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'Kategori Berhasil Ditambahkan',
                    'Kategori baru sudah masuk ke master data.'
                );
            }

            setFormData(initialForm);
            setEditingCategoryId(null);
            await fetchCategories();
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyimpan kategori. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan Kategori', backendMessage);
            console.error(error);
        }
    };

    const handleEdit = (category) => {
        setEditingCategoryId(category.id);
        setFormData({
            name: category.name || '',
            description: category.description || '',
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleDelete = async (category) => {
        const result = await showConfirmAlert({
            title: 'Hapus Kategori?',
            text: `Kategori "${category.name}" akan dihapus dari master data.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        setMessage('');
        setErrorMessage('');

        showLoadingAlert('Menghapus Kategori', 'Mohon tunggu, kategori sedang dihapus.');

        try {
            const response = await api.delete(`/categories/${category.id}`);

            closeAlert();
            setMessage(response.data.message);

            await fetchCategories();

            showSuccessAlert(
                'Kategori Berhasil Dihapus',
                'Data kategori sudah dihapus dari sistem.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menghapus kategori. Pastikan kategori tidak sedang digunakan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus Kategori', backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Data Kategori</h2>
                    <p>
                        Kelola kategori master untuk merchandise, alat Sekpim,
                        dan kebutuhan pendukung lainnya.
                    </p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingCategoryId ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                <p>
                    Kategori digunakan untuk mengelompokkan paket merchandise atau barang.
                </p>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Nama Kategori</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Contoh: Merchandise"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Deskripsi</label>
                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Contoh: Paket merchandise untuk tamu eksternal"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                        {editingCategoryId ? 'Update Kategori' : 'Simpan Kategori'}
                    </button>

                    {(editingCategoryId || formData.name || formData.description) && (
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
                    <h3>Daftar Kategori</h3>
                    <p>Master kategori yang tersedia di sistem.</p>
                </div>

                {loading && (
                    <div className="info-box">
                        Sedang mengambil data kategori...
                    </div>
                )}

                {!loading && categories.length === 0 && (
                    <div className="info-box">
                        Belum ada kategori.
                    </div>
                )}

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nama Kategori</th>
                                    <th>Slug</th>
                                    <th>Deskripsi</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id}>
                                        <td>
                                            <strong>{category.name}</strong>
                                        </td>
                                        <td>{category.slug || '-'}</td>
                                        <td>{category.description || '-'}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-warning"
                                                    type="button"
                                                    onClick={() => handleEdit(category)}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn btn-danger"
                                                    type="button"
                                                    onClick={() => handleDelete(category)}
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