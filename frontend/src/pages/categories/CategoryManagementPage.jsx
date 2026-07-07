import { useEffect, useState } from 'react';
import api from '../../api/axios';

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
            const response = await api.get('/categories');
            setCategories(response.data.data);
        } catch (error) {
            setErrorMessage('Gagal mengambil data kategori.');
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

    const resetForm = () => {
        setFormData(initialForm);
        setEditingCategoryId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        try {
            if (editingCategoryId) {
                const response = await api.put(`/categories/${editingCategoryId}`, formData);
                setMessage(response.data.message);
            } else {
                const response = await api.post('/categories', formData);
                setMessage(response.data.message);
            }

            resetForm();
            await fetchCategories();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyimpan kategori. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
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

    const handleDelete = async (categoryId) => {
        const confirmed = window.confirm('Yakin ingin menghapus kategori ini?');

        if (!confirmed) {
            return;
        }

        setMessage('');
        setErrorMessage('');

        try {
            const response = await api.delete(`/categories/${categoryId}`);
            setMessage(response.data.message);
            await fetchCategories();
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal menghapus kategori.';

            setErrorMessage(backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Data Kategori</h2>
                    <p>Admin dapat mengelola kategori produk untuk katalog dan peminjaman.</p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingCategoryId ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                <p>Kategori digunakan untuk mengelompokkan produk.</p>

                <div className="form-grid category-form-grid">
                    <div className="form-group">
                        <label>Nama Kategori</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Contoh: Peralatan Kantor"
                            required
                        />
                    </div>

                    <div className="form-group span-2">
                        <label>Deskripsi</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Masukkan deskripsi kategori"
                            rows="4"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                        {editingCategoryId ? 'Update Kategori' : 'Simpan Kategori'}
                    </button>

                    {editingCategoryId && (
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
                    <h3>Daftar Kategori</h3>
                    <p>Data kategori yang tersimpan di backend Laravel.</p>
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
                                        <td>{category.slug}</td>
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
                                                    onClick={() => handleDelete(category.id)}
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