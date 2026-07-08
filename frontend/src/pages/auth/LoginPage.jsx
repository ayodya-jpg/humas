import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function LoginPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: 'superadmin',
        password: 'password123',
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);
        setErrorMessage('');

        try {
            const response = await api.post('/admin/login', formData);

            localStorage.setItem('admin_token', response.data.data.token);
            localStorage.setItem('admin_user', JSON.stringify(response.data.data.user));

            navigate('/admin/dashboard');
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Login gagal. Periksa username dan password.';

            setErrorMessage(backendMessage);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="container">
                <div className="row min-vh-100 align-items-center justify-content-center">
                    <div className="col-12 col-md-10 col-lg-8 col-xl-7">
                        <div className="login-panel">
                            <div className="row g-0">
                                <div className="col-lg-5 login-left">
                                    <div className="login-logo-wrap">
                                        <img
                                            src="/images/logo-putih-tus.png"
                                            alt="Telkom University Surabaya"
                                            className="login-logo"
                                        />
                                    </div>

                                    <h1>HUMAS & SEKPIM</h1>
                                    <p>
                                        Sistem layanan pengajuan merchandise, layanan humas,
                                        dan peminjaman Sekpim.
                                    </p>
                                </div>

                                <div className="col-lg-7 login-right">
                                    <form onSubmit={handleSubmit}>
                                        <span className="section-kicker">Welcome Back</span>
                                        <h2>Login Sistem</h2>
                                        <p className="text-muted mb-4">
                                            Masuk menggunakan akun yang sudah dibuat oleh superadmin.
                                        </p>

                                        {errorMessage && (
                                            <div className="alert alert-danger rounded-4">
                                                {errorMessage}
                                            </div>
                                        )}

                                        <div className="mb-3">
                                            <label className="form-label">Username</label>
                                            <div className="input-group input-group-modern">
                                                <span className="input-group-text">
                                                    <i className="bi bi-person-fill"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    className="form-control"
                                                    placeholder="Masukkan username"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label">Password</label>
                                            <div className="input-group input-group-modern">
                                                <span className="input-group-text">
                                                    <i className="bi bi-lock-fill"></i>
                                                </span>
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="form-control"
                                                    placeholder="Masukkan password"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <button
                                            className="btn btn-primary w-100 rounded-pill py-2 fw-bold"
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading ? 'Memproses...' : 'Login'}
                                        </button>

                                        <div className="login-demo-box">
                                            <span>Demo akun</span>
                                            <p>superadmin / admin / user</p>
                                            <p>Password: password123</p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}