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
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="login-logo-box">
                        <img
                            src="/images/logo-putih-tus.png"
                            alt="Telkom University Surabaya"
                            className="login-logo-image"
                        />
                    </div>

                    <div>
                        <h1>HUMAS & SEKPIM</h1>
                        <p>Telkom University Surabaya</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <h2>Login Sistem</h2>
                    <p>Masuk untuk mengajukan atau mengelola layanan HUMAS & SEKPIM.</p>

                    {errorMessage && (
                        <div className="error-box">
                            {errorMessage}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Masukkan username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Masukkan password"
                            required
                        />
                    </div>

                    <button className="btn btn-primary login-button" type="submit" disabled={loading}>
                        {loading ? 'Memproses...' : 'Login'}
                    </button>

                    <div className="login-helper">
                        <span>Demo akun:</span>
                        <p>superadmin / admin / user</p>
                        <p>Password: password123</p>
                    </div>
                </form>
            </div>
        </div>
    );
}