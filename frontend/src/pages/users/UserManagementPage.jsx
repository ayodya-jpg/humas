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
    username: '',
    email: '',
    password: '',
    role: 'user',
};

const roleOptions = [
    { value: 'superadmin', label: 'Superadmin' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
];

export default function UserManagementPage() {
    const authUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const [loadingUsers, setLoadingUsers] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            setErrorMessage('');

            const response = await api.get('/users');
            setUsers(response.data.data || []);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data user.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil User', backendMessage);
            console.error(error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return users.filter((user) => {
            const matchKeyword =
                user.name?.toLowerCase().includes(keyword) ||
                user.username?.toLowerCase().includes(keyword) ||
                user.email?.toLowerCase().includes(keyword) ||
                user.role?.toLowerCase().includes(keyword);

            const matchRole =
                selectedRole === 'all' || user.role === selectedRole;

            return matchKeyword && matchRole;
        });
    }, [users, searchKeyword, selectedRole]);

    const summary = useMemo(() => {
        return {
            total: users.length,
            superadmin: users.filter((item) => item.role === 'superadmin').length,
            admin: users.filter((item) => item.role === 'admin').length,
            user: users.filter((item) => item.role === 'user').length,
        };
    }, [users]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEdit = (user) => {
        setEditingId(user.id);

        setFormData({
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            password: '',
            role: user.role || 'user',
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
            formData.name ||
            formData.username ||
            formData.email ||
            formData.password ||
            editingId;

        if (hasData) {
            const result = await showConfirmAlert({
                title: 'Reset Form?',
                text: 'Data user yang sedang diisi akan dikosongkan.',
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
        if (!formData.name.trim()) {
            setErrorMessage('Nama user wajib diisi.');
            showWarningAlert('Nama Wajib Diisi', 'Isi nama user terlebih dahulu.');
            return false;
        }

        if (!formData.username.trim()) {
            setErrorMessage('Username wajib diisi.');
            showWarningAlert('Username Wajib Diisi', 'Isi username terlebih dahulu.');
            return false;
        }

        if (!formData.email.trim()) {
            setErrorMessage('Email wajib diisi.');
            showWarningAlert('Email Wajib Diisi', 'Isi email user terlebih dahulu.');
            return false;
        }

        if (!editingId && !formData.password.trim()) {
            setErrorMessage('Password wajib diisi untuk user baru.');
            showWarningAlert(
                'Password Wajib Diisi',
                'Password wajib diisi saat menambahkan user baru.'
            );
            return false;
        }

        if (formData.password && formData.password.length < 6) {
            setErrorMessage('Password minimal 6 karakter.');
            showWarningAlert('Password Terlalu Pendek', 'Gunakan password minimal 6 karakter.');
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
            title: editingId ? 'Update User?' : 'Tambah User?',
            text: editingId
                ? 'Data user akan diperbarui.'
                : 'User baru akan ditambahkan ke sistem.',
            confirmButtonText: editingId ? 'Ya, update' : 'Ya, tambah',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        setSubmitting(true);
        showLoadingAlert(
            editingId ? 'Memperbarui User' : 'Menambahkan User',
            'Mohon tunggu, data sedang diproses.'
        );

        try {
            const payload = {
                name: formData.name,
                username: formData.username,
                email: formData.email,
                role: formData.role,
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            const response = editingId
                ? await api.put(`/users/${editingId}`, payload)
                : await api.post('/users', payload);

            closeAlert();

            setMessage(response.data.message);
            setFormData(initialForm);
            setEditingId(null);

            await fetchUsers();

            showSuccessAlert(
                editingId ? 'User Diperbarui' : 'User Ditambahkan',
                response.data.message
            );
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Data user gagal disimpan.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menyimpan', backendMessage);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (user) => {
        setMessage('');
        setErrorMessage('');

        if (authUser.id === user.id) {
            setErrorMessage('Kamu tidak bisa menghapus akun yang sedang digunakan.');
            showWarningAlert(
                'Aksi Tidak Diizinkan',
                'Kamu tidak bisa menghapus akun yang sedang login.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: 'Hapus User?',
            text: `${user.name} akan dihapus dari sistem.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        showLoadingAlert('Menghapus User', 'Mohon tunggu, user sedang dihapus.');

        try {
            const response = await api.delete(`/users/${user.id}`);

            closeAlert();

            setMessage(response.data.message);

            if (editingId === user.id) {
                setFormData(initialForm);
                setEditingId(null);
            }

            await fetchUsers();

            showSuccessAlert('User Dihapus', response.data.message);
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'User gagal dihapus.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Menghapus', backendMessage);
            console.error(error);
        }
    };

    const getRoleLabel = (role) => {
        return roleOptions.find((item) => item.value === role)?.label || role;
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
                                User Management
                            </span>

                            <h2 className="display-5 fw-black mt-2 mb-3">
                                Manajemen User
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Kelola akun superadmin, admin, dan user yang dapat mengakses
                                sistem HUMAS & SEKPIM Telkom University Surabaya.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <button
                                className="btn btn-light rounded-pill fw-bold w-100"
                                type="button"
                                onClick={fetchUsers}
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
                <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Total User
                            </p>
                            <h3 className="fw-black mb-0">{summary.total}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Superadmin
                            </p>
                            <h3 className="fw-black mb-0">{summary.superadmin}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                Admin
                            </p>
                            <h3 className="fw-black mb-0">{summary.admin}</h3>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-3 p-lg-4">
                            <p className="text-muted small fw-bold text-uppercase mb-2">
                                User
                            </p>
                            <h3 className="fw-black mb-0">{summary.user}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 align-items-start">
                <div className="col-xl-4">
                    <form
                        className="card border-0 shadow-sm rounded-5 position-sticky"
                        style={{ top: 110 }}
                        onSubmit={handleSubmit}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                                <div>
                                    <span className="text-primary small fw-bold text-uppercase">
                                        {editingId ? 'Edit User' : 'Create User'}
                                    </span>

                                    <h4 className="fw-black mt-1 mb-1">
                                        {editingId ? 'Edit User' : 'Tambah User'}
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Buat akun untuk user, admin, atau superadmin.
                                    </p>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-person-plus-fill fs-4"></i>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Nama Lengkap
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Contoh: Ahmad Naufalianto"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Username
                                </label>

                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="Contoh: ahmad"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="form-control rounded-4"
                                    placeholder="nama@email.com"
                                    required
                                />
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6 col-xl-12">
                                    <label className="form-label fw-bold">
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="form-control rounded-4"
                                        placeholder={editingId ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
                                        required={!editingId}
                                    />

                                    {editingId && (
                                        <small className="text-muted">
                                            Kosongkan password jika tidak ingin mengubahnya.
                                        </small>
                                    )}
                                </div>

                                <div className="col-md-6 col-xl-12">
                                    <label className="form-label fw-bold">
                                        Role
                                    </label>

                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="form-select rounded-4"
                                        required
                                    >
                                        {roleOptions.map((option) => (
                                            <option value={option.value} key={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="d-grid gap-2 mt-4">
                                <button
                                    className="btn btn-primary rounded-pill fw-bold"
                                    type="submit"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? 'Menyimpan...'
                                        : editingId
                                            ? 'Update User'
                                            : 'Tambah User'}
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
                                        Cari User
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
                                            placeholder="Cari nama, username, email, atau role..."
                                        />
                                    </div>
                                </div>

                                <div className="col-lg-4">
                                    <label className="form-label fw-bold">
                                        Role
                                    </label>

                                    <select
                                        value={selectedRole}
                                        onChange={(event) => setSelectedRole(event.target.value)}
                                        className="form-select rounded-4"
                                    >
                                        <option value="all">Semua Role</option>

                                        {roleOptions.map((option) => (
                                            <option value={option.value} key={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingUsers && (
                        <div className="alert alert-primary rounded-4">
                            Sedang mengambil data user...
                        </div>
                    )}

                    {!loadingUsers && filteredUsers.length === 0 && (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="icon-box bg-primary-subtle text-primary mx-auto mb-3">
                                    <i className="bi bi-inbox-fill fs-4"></i>
                                </div>

                                <h4 className="fw-black">
                                    User tidak ditemukan
                                </h4>

                                <p className="text-muted mb-0">
                                    Belum ada user atau kata kunci pencarian tidak cocok.
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
                                            User
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase">
                                            Username
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase">
                                            Role
                                        </th>
                                        <th className="px-4 py-3 small text-muted text-uppercase text-end">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="icon-box bg-primary-subtle text-primary">
                                                        <strong>
                                                            {(user.name || 'U').charAt(0)}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <strong>{user.name}</strong>
                                                        <p className="text-muted small mb-0">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="badge rounded-pill text-bg-light border">
                                                    {user.username}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`status status-${user.role}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="d-flex justify-content-end gap-2 flex-wrap">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                        type="button"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        <i className="bi bi-pencil-square me-1"></i>
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                                        type="button"
                                                        onClick={() => handleDelete(user)}
                                                        disabled={authUser.id === user.id}
                                                    >
                                                        <i className="bi bi-trash-fill me-1"></i>
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {!loadingUsers && filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted p-4">
                                                Tidak ada data user.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="alert alert-info rounded-4 mt-3 mb-0">
                        <strong>Catatan:</strong> akun yang sedang login tidak bisa dihapus
                        untuk mencegah superadmin kehilangan akses sistem.
                    </div>
                </div>
            </div>
        </div>
    );
}