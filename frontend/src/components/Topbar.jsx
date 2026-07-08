import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Topbar({ onOpenSidebar }) {
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
        <header className="app-topbar">
            <div className="d-flex align-items-center gap-3 min-w-0">
                <button
                    type="button"
                    className="btn btn-light rounded-4 d-lg-none"
                    onClick={onOpenSidebar}
                    aria-label="Open sidebar"
                >
                    <i className="bi bi-list fs-4"></i>
                </button>

                <div className="topbar-brand">
                    <div className="topbar-logo-wrap">
                        <img
                            src="/images/logo-putih-tus.png"
                            alt="Telkom University Surabaya"
                            className="topbar-logo"
                        />
                    </div>

                    <div className="min-w-0">
                        <h1>HUMAS & SEKPIM</h1>
                        <p>Service Request System — Telkom University Surabaya</p>
                    </div>
                </div>
            </div>

            <div className="topbar-profile">
                <div className="text-end d-none d-md-block">
                    <strong>{adminUser.name || 'User'}</strong>
                    <span>{adminUser.role || 'user'}</span>
                </div>

                <div className="profile-avatar">
                    {(adminUser.name || 'U').charAt(0)}
                </div>

                <button
                    className="btn btn-danger btn-sm rounded-pill px-3"
                    type="button"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                </button>
            </div>
        </header>
    );
}