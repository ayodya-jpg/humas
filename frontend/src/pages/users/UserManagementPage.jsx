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
    username: '',
    email: '',
    password: '',
    role: 'user',
};

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingUserId, setEditingUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const response = await api.get('/users');
            setUsers(response.data.data);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data user.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil User', backendMessage);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetForm = async () => {
        if (
            formData.name ||
            formData.username ||
            formData.email ||
            formData.password ||
            editingUserId
        ) {
            const result = await showConfirmAlert({
                title: 'Batalkan Form?',
                text: 'Data yang sedang diisi akan dikosongkan.',
                confirmButtonText: 'Ya, kosongkan',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setFormData(initialForm);
        setEditingUserId(null);
        setMessage('');
        setErrorMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        const payload = {
            name: formData.name,
            username: formData.username,
            email: formData.email || null,
            role: formData.role,
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        if (!editingUserId && !formData.password) {
            setErrorMessage('Password wajib diisi saat membuat user baru.');
            showWarningAlert(
                'Password Wajib Diisi',
                'Saat membuat user baru, password tidak boleh kosong.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: editingUserId ? 'Update User?' : 'Tambah User Baru?',
            text: editingUserId
                ? 'Data akun akan diperbarui sesuai input terbaru.'
                : 'Akun baru akan dibuat dan dapat digunakan untuk login.',
            confirmButtonText: editingUserId ? 'Ya, update' : 'Ya, simpan',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert(
            editingUserId ? 'Memperbarui User' : 'Menyimpan User',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            if (editingUserId) {
                const response = await api.put(`/users/${editingUserId}`, payload);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'User Berhasil Diperbarui',
                    'Data akun sudah berhasil diperbarui.'
                );
            } else {
                const response = await api.post('/users', payload);

                closeAlert();
                setMessage(response.data.message);

                await showSuccessAlert(
                    'User Berhasil Ditambahkan',
                    'Akun baru sudah berhasil dibuat.'
                );
            }

            setFormData(initialForm);
            setEditingUserId(null);
            await fetchUsers();
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menyimpan user. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan User', backendMessage);
            console.error(error);
        }
    };

    const handleEdit = (user) => {
        setEditingUserId(user.id);
        setFormData({
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: '',
            role: user.role || 'user',
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const handleDelete = async (user) => {
        if (adminUser.id === user.id) {
            showWarningAlert(
                'Tidak Bisa Menghapus Akun Sendiri',
                'Akun yang sedang login tidak dapat dihapus.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: 'Hapus User?',
            text: `Akun ${user.name} dengan username ${user.username} akan dihapus.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        setMessage('');
        setErrorMessage('');

        showLoadingAlert('Menghapus User', 'Mohon tunggu, akun sedang dihapus.');

        try {
            const response = await api.delete(`/users/${user.id}`);

            closeAlert();

            setMessage(response.data.message);
            await fetchUsers();

            showSuccessAlert(
                'User Berhasil Dihapus',
                'Akun sudah dihapus dari sistem.'
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Gagal menghapus user.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus User', backendMessage);
            console.error(error);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Data User</h2>
                    <p>Hanya superadmin yang dapat membuat dan mengelola akun pengguna.</p>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingUserId ? 'Edit User' : 'Tambah User'}</h3>
                <p>
                    Akun user tidak bisa membuat akun sendiri. Akun hanya dibuat oleh superadmin.
                </p>

                <div className="form-grid user-form-grid">
                    <div className="form-group">
                        <label>Nama Lengkap</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Contoh: Ayodya Ganas Wasesa"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Contoh: ayodya"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Opsional"
                        />
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                    </div>

                    <div className="form-group span-2">
                        <label>
                            Password {editingUserId ? '(kosongkan jika tidak ingin diganti)' : ''}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder={editingUserId ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                        {editingUserId ? 'Update User' : 'Simpan User'}
                    </button>

                    {editingUserId && (
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
                    <h3>Daftar User</h3>
                    <p>Data akun yang memiliki akses ke sistem.</p>
                </div>

                {loading && (
                    <div className="info-box">
                        Sedang mengambil data user...
                    </div>
                )}

                {!loading && users.length === 0 && (
                    <div className="info-box">
                        Belum ada user.
                    </div>
                )}

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <strong>{user.name}</strong>
                                            {adminUser.id === user.id && (
                                                <p className="table-note">Akun sedang login</p>
                                            )}
                                        </td>
                                        <td>{user.username}</td>
                                        <td>{user.email || '-'}</td>
                                        <td>
                                            <span className={`status status-${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-warning"
                                                    type="button"
                                                    onClick={() => handleEdit(user)}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn btn-danger"
                                                    type="button"
                                                    onClick={() => handleDelete(user)}
                                                    disabled={adminUser.id === user.id}
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