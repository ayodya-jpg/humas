import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Topbar() {
    const navigate = useNavigate();
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    const handleLogout = async () => {
        try {
            await api.post('/admin/logout');
        } catch (error) {
            console.error(error);
        } finally {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            navigate('/login');
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="topbar-logo-box">
                    <img
                        src="/images/logo-putih-tus.png"
                        alt="Telkom University Surabaya"
                        className="topbar-logo-image"
                    />
                </div>

                <div>
                    <h1>HUMAS & SEKPIM</h1>
                    <p>Service Request System — Telkom University Surabaya</p>
                </div>
            </div>

            <div className="topbar-user">
                <div className="user-info">
                    <strong>{adminUser.name || 'User'}</strong>
                    <span>{adminUser.role || 'user'}</span>
                </div>

                <div className="avatar">
                    {(adminUser.name || 'U').charAt(0)}
                </div>

                <button className="btn btn-danger" type="button" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}