import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function LoginPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: 'admin',
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
                    <div className="brand-logo">H</div>
                    <div>
                        <h1>HUMAS</h1>
                        <p>Admin Approval System</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <h2>Login Admin</h2>
                    <p>Masuk menggunakan username admin.</p>

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
                            required
                        />
                    </div>

                    <button className="btn btn-primary login-button" type="submit" disabled={loading}>
                        {loading ? 'Memproses...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}