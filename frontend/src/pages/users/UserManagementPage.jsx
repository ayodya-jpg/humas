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

const roleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
];

export default function UserManagementPage() {
    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            const response = await api.get('/users');
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Fetch users error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data user gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const searchValue = search.toLowerCase();

            const matchSearch =
                user.name?.toLowerCase().includes(searchValue) ||
                user.username?.toLowerCase().includes(searchValue) ||
                user.email?.toLowerCase().includes(searchValue) ||
                user.role?.toLowerCase().includes(searchValue);

            const matchRole =
                selectedRole === 'all' || user.role === selectedRole;

            return matchSearch && matchRole;
        });
    }, [users, search, selectedRole]);

    const summary = useMemo(() => {
        return {
            total: users.length,
            superadmin: users.filter((user) => user.role === 'superadmin').length,
            admin: users.filter((user) => user.role === 'admin').length,
            user: users.filter((user) => user.role === 'user').length,
        };
    }, [users]);

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

    const handleDelete = async (user) => {
        if (currentUser.id === user.id) {
            showErrorAlert(
                'Tidak Bisa Dihapus',
                'Akun yang sedang digunakan tidak bisa dihapus dari halaman ini.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Hapus User?',
            text: `Akun "${user.name}" akan dihapus dari sistem.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            showLoadingAlert('Menghapus User', 'Mohon tunggu sebentar.');

            await api.delete(`/users/${user.id}`);

            closeAlert();

            await showSuccessAlert(
                'User Dihapus',
                'Data user berhasil dihapus.'
            );

            fetchUsers();
        } catch (error) {
            console.error('Delete user error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Hapus Gagal',
                getBackendErrorMessage(error, 'User gagal dihapus.')
            );
        }
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Manajemen User
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Kelola akun pengguna sistem.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Halaman ini hanya menampilkan daftar user. Tambah dan edit
                                user dilakukan di halaman khusus agar tampilan tetap bersih.
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
                                        <div className="fs-3 fw-black">{summary.superadmin}</div>
                                        <div className="small text-white-50">Super Admin</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.admin}</div>
                                        <div className="small text-white-50">Admin</div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.user}</div>
                                        <div className="small text-white-50">User</div>
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
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">Cari user</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nama, username, email, role..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Filter role</label>
                            <select
                                className="form-select"
                                value={selectedRole}
                                onChange={(event) => setSelectedRole(event.target.value)}
                            >
                                <option value="all">Semua Role</option>
                                {roleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-lg-3">
                            <Link
                                to="/admin/users/create"
                                className="btn btn-danger rounded-pill w-100"
                            >
                                <i className="bi bi-person-plus-fill me-2"></i>
                                Tambah User
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-danger mb-3" />
                        <p className="text-muted mb-0">Memuat data user...</p>
                    </div>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{ width: 76, height: 76 }}
                        >
                            <i className="bi bi-inbox fs-1"></i>
                        </div>

                        <h5 className="fw-black mb-2">User tidak ditemukan</h5>

                        <p className="text-muted mb-0">
                            Tidak ada user berdasarkan filter yang dipilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredUsers.map((user) => (
                        <div className="col-12" key={user.id}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-lg-6">
                                            <div className="d-flex gap-3">
                                                <div className="profile-avatar bg-danger text-white">
                                                    {(user.name || 'U').charAt(0)}
                                                </div>

                                                <div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        <span className={`status status-${user.role}`}>
                                                            {user.role}
                                                        </span>

                                                        {currentUser.id === user.id && (
                                                            <span className="badge rounded-pill text-bg-warning">
                                                                Akun Saat Ini
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h5 className="fw-black mb-1">
                                                        {user.name}
                                                    </h5>

                                                    <p className="text-muted mb-0">
                                                        @{user.username || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-3">
                                            <div className="small text-muted">Email</div>
                                            <div className="fw-bold text-break">
                                                {user.email || '-'}
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-1">
                                            <div className="small text-muted">ID</div>
                                            <div className="fw-bold">
                                                #{user.id}
                                            </div>
                                        </div>

                                        <div className="col-lg-2 text-lg-end">
                                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                                <Link
                                                    to={`/admin/users/${user.id}/edit`}
                                                    className="btn btn-outline-primary rounded-pill"
                                                >
                                                    <i className="bi bi-pencil-square me-2"></i>
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={() => handleDelete(user)}
                                                    disabled={currentUser.id === user.id}
                                                >
                                                    <i className="bi bi-trash me-2"></i>
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {currentUser.id === user.id && (
                                        <div className="mt-3 p-3 rounded-4 bg-warning-subtle border border-warning-subtle">
                                            <div className="fw-bold text-warning-emphasis">
                                                Ini akun yang sedang kamu gunakan.
                                            </div>
                                            <div className="small text-muted">
                                                Tombol hapus dinonaktifkan untuk mencegah akun utama terhapus.
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