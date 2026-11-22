import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function PasswordRecoveryForm() {
    const location = useLocation();
    const navigate = useNavigate();

    const params = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );

    const isReset = params.get('mode') === 'reset';
    const token = params.get('token') || '';
    const emailFromLink = params.get('email') || '';

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(emailFromLink);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setEmail(emailFromLink);
        setError('');
        setSuccess('');
    }, [emailFromLink, isReset]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (isReset && (!token || !email)) {
            setError('Tautan reset password tidak lengkap.');
            return;
        }

        if (!isReset && !username.trim()) {
            setError('Username wajib diisi.');
            return;
        }

        if (isReset) {
            if (password.length < 8) {
                setError('Password minimal 8 karakter.');
                return;
            }

            if (
                !/[a-z]/.test(password) ||
                !/[A-Z]/.test(password) ||
                !/[0-9]/.test(password)
            ) {
                setError(
                    'Password harus mengandung huruf besar, huruf kecil, dan angka.'
                );
                return;
            }

            if (password !== confirmation) {
                setError('Konfirmasi password tidak sesuai.');
                return;
            }
        }

        try {
            setLoading(true);

            const response = isReset
                ? await api.post('/admin/reset-password', {
                    token,
                    email,
                    password,
                    password_confirmation: confirmation,
                })
                : await api.post('/admin/forgot-password', {
                    username: username.trim(),
                });

            setSuccess(
                response?.data?.message ||
                    (isReset
                        ? 'Password berhasil diperbarui.'
                        : 'Permintaan reset password sudah diproses.')
            );

            if (isReset) {
                setPassword('');
                setConfirmation('');

                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
            }
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    'Permintaan gagal diproses. Silakan coba lagi.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="card border-0 shadow-lg rounded-5 director-login-card">
            <div className="card-body p-4 p-lg-5">
                <div className="text-center mb-4">
                    <div className="login-icon mx-auto mb-3">
                        <i
                            className={
                                isReset
                                    ? 'bi bi-key-fill'
                                    : 'bi bi-envelope-lock-fill'
                            }
                        />
                    </div>

                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-3">
                        Keamanan Akun
                    </span>

                    <h2 className="fw-black mb-2">
                        {isReset ? 'Password Baru' : 'Lupa Password?'}
                    </h2>

                    <p className="text-muted mb-0">
                        {isReset
                            ? 'Buat password baru untuk mengamankan akun.'
                            : 'Masukkan username akun Anda. Tautan pemulihan akan dikirim ke email yang terdaftar.'}
                    </p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="alert alert-success rounded-4">
                            <i className="bi bi-check-circle-fill me-2" />
                            {success}
                        </div>

                        {!isReset && (
                            <p className="text-muted small">
                                Periksa kotak masuk dan folder spam email
                                yang didaftarkan oleh admin.
                            </p>
                        )}

                        <button
                            type="button"
                            className="btn btn-danger rounded-pill px-4 w-100"
                            onClick={() => navigate('/login', {
                                replace: true,
                            })}
                        >
                            Kembali ke Login
                        </button>
                    </div>
                ) : isReset && (!token || !emailFromLink) ? (
                    <div className="text-center">
                        <div className="alert alert-warning rounded-4">
                            Tautan pemulihan tidak lengkap atau tidak valid.
                            Silakan meminta tautan baru.
                        </div>

                        <Link
                            to="/login?mode=forgot"
                            className="btn btn-danger rounded-pill w-100"
                        >
                            Minta Tautan Baru
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div
                                className="alert alert-danger rounded-4"
                                role="alert"
                            >
                                <i className="bi bi-exclamation-circle me-2" />
                                {error}
                            </div>
                        )}

                        {!isReset ? (
                            <div className="mb-4">
                                <label
                                    htmlFor="recoveryUsername"
                                    className="form-label fw-semibold"
                                >
                                    Username Akun
                                </label>

                                <div className="input-group input-group-lg">
                                    <span className="input-group-text bg-light">
                                        <i className="bi bi-person text-danger" />
                                    </span>

                                    <input
                                        id="recoveryUsername"
                                        className="form-control"
                                        type="text"
                                        value={username}
                                        onChange={(event) =>
                                            setUsername(event.target.value)
                                        }
                                        placeholder="Masukkan username"
                                        autoComplete="username"
                                        maxLength={100}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <p className="form-text mt-2">
                                    Email pemulihan menggunakan alamat yang
                                    tercatat pada akun Anda.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">
                                        Email Akun
                                    </label>

                                    <input
                                        className="form-control"
                                        type="email"
                                        value={email}
                                        readOnly
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        htmlFor="newPassword"
                                        className="form-label fw-semibold"
                                    >
                                        Password Baru
                                    </label>

                                    <div className="input-group">
                                        <input
                                            id="newPassword"
                                            className="form-control"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            placeholder="Masukkan password baru"
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            disabled={loading}
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                        >
                                            <i className={`bi ${
                                                showPassword
                                                    ? 'bi-eye-slash'
                                                    : 'bi-eye'
                                            }`} />
                                        </button>
                                    </div>

                                    <div className="form-text">
                                        Minimal 8 karakter, dengan huruf
                                        besar, huruf kecil, dan angka.
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label
                                        htmlFor="confirmPassword"
                                        className="form-label fw-semibold"
                                    >
                                        Konfirmasi Password
                                    </label>

                                    <input
                                        id="confirmPassword"
                                        className="form-control"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={confirmation}
                                        onChange={(event) =>
                                            setConfirmation(event.target.value)
                                        }
                                        placeholder="Ulangi password baru"
                                        autoComplete="new-password"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="btn btn-danger btn-lg rounded-pill w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Memproses...
                                </>
                            ) : isReset ? (
                                'Simpan Password Baru'
                            ) : (
                                'Kirim Tautan Pemulihan'
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <Link
                        to="/login"
                        className="text-danger fw-semibold text-decoration-none"
                    >
                        <i className="bi bi-arrow-left me-2" />
                        Kembali ke Halaman Login
                    </Link>
                </div>

                <div className="alert alert-light border rounded-4 small mt-4 mb-0">
                    <i className="bi bi-shield-check text-success me-2" />
                    Tautan pemulihan berlaku 60 menit dan hanya dapat
                    digunakan satu kali.
                </div>
            </div>
        </section>
    );
}
