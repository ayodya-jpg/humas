import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar() {
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const role = adminUser.role || 'user';

    const isUser = role === 'user';
    const isAdmin = role === 'admin';
    const isSuperadmin = role === 'superadmin';

    const canApprove = isAdmin || isSuperadmin;
    const canManageMaster = isSuperadmin;
    const canManageUser = isSuperadmin;

    const [openMenu, setOpenMenu] = useState({
        myRequest: true,
        approval: true,
        masterData: true,
        userManagement: true,
    });

    const toggleMenu = (menuName) => {
        setOpenMenu((prev) => ({
            ...prev,
            [menuName]: !prev[menuName],
        }));
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo-box">
                    <img
                        src="/images/logo-putih-tus.png"
                        alt="Telkom University Surabaya"
                        className="sidebar-logo-image"
                    />
                </div>

                <div>
                    <h2>HUMAS</h2>
                    <p>Telkom University Surabaya</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                    <span className="nav-icon">⌂</span>
                    <span>Dashboard</span>
                </NavLink>

                <div className="nav-group">
                    <button type="button" className="nav-parent" onClick={() => toggleMenu('myRequest')}>
                        <span>
                            <span className="nav-icon">✦</span>
                            Pengajuan Saya
                        </span>
                        <span>{openMenu.myRequest ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.myRequest && (
                        <div className="nav-children">
                            <NavLink
                                to="/admin/request/merchandise"
                                className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                            >
                                Ajukan Merchandise
                            </NavLink>

                            <NavLink
                                to="/admin/request/humas-service"
                                className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                            >
                                Ajukan Layanan Humas
                            </NavLink>

                            <NavLink
                                to="/admin/request/sekpim-borrowing"
                                className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                            >
                                Ajukan Peminjaman
                            </NavLink>

                            <NavLink
                                to="/admin/my-requests"
                                className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                            >
                                Riwayat Saya
                            </NavLink>
                        </div>
                    )}
                </div>

                {canApprove && (
                    <div className="nav-group">
                        <button type="button" className="nav-parent" onClick={() => toggleMenu('approval')}>
                            <span>
                                <span className="nav-icon">◇</span>
                                Approval
                            </span>
                            <span>{openMenu.approval ? '▾' : '▸'}</span>
                        </button>

                        {openMenu.approval && (
                            <div className="nav-children">
                                <NavLink
                                    to="/admin/orders"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Approval Merchandise
                                </NavLink>

                                <NavLink
                                    to="/admin/humas-services"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Approval Layanan Humas
                                </NavLink>

                                <NavLink
                                    to="/admin/borrow-requests"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Approval Peminjaman
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {canManageMaster && (
                    <div className="nav-group">
                        <button type="button" className="nav-parent" onClick={() => toggleMenu('masterData')}>
                            <span>
                                <span className="nav-icon">▣</span>
                                Master Data
                            </span>
                            <span>{openMenu.masterData ? '▾' : '▸'}</span>
                        </button>

                        {openMenu.masterData && (
                            <div className="nav-children">
                                <NavLink
                                    to="/admin/categories"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Data Kategori
                                </NavLink>

                                <NavLink
                                    to="/admin/products"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Paket Merchandise
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {canManageUser && (
                    <div className="nav-group">
                        <button type="button" className="nav-parent" onClick={() => toggleMenu('userManagement')}>
                            <span>
                                <span className="nav-icon">◉</span>
                                Manajemen User
                            </span>
                            <span>{openMenu.userManagement ? '▾' : '▸'}</span>
                        </button>

                        {openMenu.userManagement && (
                            <div className="nav-children">
                                <NavLink
                                    to="/admin/users"
                                    className={({ isActive }) => isActive ? 'nav-child active' : 'nav-child'}
                                >
                                    Data User
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {isUser && (
                    <div className="sidebar-note">
                        <strong>Akses User</strong>
                        <p>Kamu dapat membuat pengajuan dan memantau status request.</p>
                    </div>
                )}

                {isAdmin && (
                    <div className="sidebar-note">
                        <strong>Akses Admin</strong>
                        <p>Kamu dapat membuat pengajuan dan memproses approval.</p>
                    </div>
                )}

                {isSuperadmin && (
                    <div className="sidebar-note">
                        <strong>Akses Superadmin</strong>
                        <p>Kamu memiliki akses penuh ke sistem.</p>
                    </div>
                )}
            </nav>
        </aside>
    );
}