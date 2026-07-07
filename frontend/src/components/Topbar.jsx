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
            <div>
                <h1>Admin HUMAS & SEKPIM</h1>
                <p>Kelola merchandise, layanan humas, dan peminjaman alat Sekpim.</p>
            </div>

            <div className="topbar-user">
                <div className="user-info">
                    <strong>{adminUser.name || 'Administrator'}</strong>
                    <span>{adminUser.role || 'admin'}</span>
                </div>

                <div className="avatar">
                    {(adminUser.name || 'A').charAt(0)}
                </div>

                <button className="btn btn-danger" type="button" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}