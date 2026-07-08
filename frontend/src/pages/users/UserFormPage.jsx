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
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user',
};

const roleOptions = [
    { value: 'superadmin', label: 'Super Admin', description: 'Akses penuh ke semua fitur dan master data.' },
    { value: 'admin', label: 'Admin', description: 'Akses approval dan fitur pengajuan.' },
    { value: 'user', label: 'User', description: 'Akses pengajuan dan riwayat pribadi.' },
];

const createUsername = (value) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s._-]/g, '')
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.');
};

export default function UserFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = Boolean(id);
    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);

    const fetchUser = async () => {
        if (!isEdit) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await api.get(`/users/${id}`);
            const user = response.data.data;

            setForm({
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
                password: '',
                password_confirmation: '',
                role: user.role || 'user',
            });
        } catch (error) {
            console.error('Fetch user form error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Form',
                error.response?.data?.message || 'Data user gagal dimuat.'
            );

            navigate('/admin/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
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
                nextForm.username = createUsername(value);
            }

            return nextForm;
        });
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            showWarningAlert('Nama Wajib Diisi', 'Isi nama user terlebih dahulu.');
            return false;
        }

        if (!form.username.trim()) {
            showWarningAlert('Username Wajib Diisi', 'Isi username user terlebih dahulu.');
            return false;
        }

        if (!form.email.trim()) {
            showWarningAlert('Email Wajib Diisi', 'Isi email user terlebih dahulu.');
            return false;
        }

        if (!isEdit && !form.password) {
            showWarningAlert('Password Wajib Diisi', 'Password wajib diisi saat membuat user baru.');
            return false;
        }

        if (form.password && form.password.length < 6) {
            showWarningAlert('Password Terlalu Pendek', 'Password minimal 6 karakter.');
            return false;
        }

        if (form.password && form.password !== form.password_confirmation) {
            showWarningAlert('Konfirmasi Password Tidak Sama', 'Password dan konfirmasi password harus sama.');
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
                isEdit ? 'Memperbarui User' : 'Menyimpan User',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                name: form.name,
                username: form.username,
                email: form.email,
                role: form.role,
            };

            if (form.password) {
                payload.password = form.password;
                payload.password_confirmation = form.password_confirmation;
            }

            if (isEdit) {
                await api.put(`/users/${id}`, payload);

                if (currentUser.id === Number(id)) {
                    const updatedUser = {
                        ...currentUser,
                        name: form.name,
                        username: form.username,
                        email: form.email,
                        role: form.role,
                    };

                    localStorage.setItem('admin_user', JSON.stringify(updatedUser));
                }
            } else {
                await api.post('/users', payload);
            }

            closeAlert();

            await showSuccessAlert(
                isEdit ? 'User Diperbarui' : 'User Ditambahkan',
                isEdit
                    ? 'Data user berhasil diperbarui.'
                    : 'User baru berhasil ditambahkan.'
            );

            navigate('/admin/users');
        } catch (error) {
            console.error('Save user error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                isEdit ? 'Update Gagal' : 'Tambah Gagal',
                getBackendErrorMessage(error, 'Data user gagal disimpan.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />
                    <p className="text-muted mb-0">Memuat form user...</p>
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
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                {isEdit ? 'Edit User' : 'Tambah User'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit ? 'Perbarui data user.' : 'Tambahkan akun user baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Atur identitas akun, username, email, password, dan role akses
                                sesuai kebutuhan pengguna sistem.
                            </p>
                        </div>

                        <Link to="/admin/users" className="btn btn-light rounded-pill">
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
                                    Informasi Akun
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi nama, username, email, dan password user.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Nama Lengkap</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Ayodya Ganas Wasesa"
                                            value={form.name}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            className="form-control rounded-pill"
                                            placeholder="contoh: ayodya"
                                            value={form.username}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-control rounded-pill"
                                            placeholder="nama@email.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            {isEdit ? 'Password Baru' : 'Password'}
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control rounded-pill"
                                            placeholder={isEdit ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
                                            value={form.password}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required={!isEdit}
                                        />
                                        {isEdit && (
                                            <div className="form-text">
                                                Kosongkan jika password tidak ingin diganti.
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Konfirmasi Password</label>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            className="form-control rounded-pill"
                                            placeholder="Ulangi password"
                                            value={form.password_confirmation}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required={!isEdit || Boolean(form.password)}
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
                                    Role Akses
                                </h4>

                                <p className="text-muted mb-4">
                                    Tentukan hak akses user dalam sistem.
                                </p>

                                <div className="d-flex flex-column gap-3 mb-4">
                                    {roleOptions.map((role) => (
                                        <label
                                            key={role.value}
                                            className={`p-3 rounded-4 border cursor-pointer ${
                                                form.role === role.value
                                                    ? 'border-danger bg-danger-subtle'
                                                    : 'bg-white'
                                            }`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex align-items-start gap-3">
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role.value}
                                                    checked={form.role === role.value}
                                                    onChange={handleChange}
                                                    disabled={submitting}
                                                    className="form-check-input mt-1"
                                                />

                                                <div>
                                                    <div className="fw-black">
                                                        {role.label}
                                                    </div>
                                                    <div className="small text-muted">
                                                        {role.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-danger rounded-pill"
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
                                                {isEdit ? 'Update User' : 'Simpan User'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/users"
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
                                    Preview Akun
                                </h4>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="profile-avatar bg-danger text-white">
                                            {(form.name || 'U').charAt(0)}
                                        </div>

                                        <div>
                                            <h5 className="fw-black mb-1">
                                                {form.name || 'Nama User'}
                                            </h5>

                                            <p className="text-muted mb-0">
                                                @{form.username || 'username'}
                                            </p>
                                        </div>
                                    </div>

                                    <hr />

                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <span className={`status status-${form.role}`}>
                                            {form.role}
                                        </span>

                                        <span className="text-muted small text-break">
                                            {form.email || 'email belum diisi'}
                                        </span>
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