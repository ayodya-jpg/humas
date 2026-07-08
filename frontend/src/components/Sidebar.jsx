import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar({ isOpen = false, onClose }) {
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

    const handleNavigate = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    const navClass = ({ isActive }) =>
        isActive ? 'sidebar-link active' : 'sidebar-link';

    const childClass = ({ isActive }) =>
        isActive ? 'sidebar-child active' : 'sidebar-child';

    return (
        <aside className={`app-sidebar ${isOpen ? 'show' : ''}`}>
            <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                <div className="sidebar-brand mb-0">
                    <div className="sidebar-logo-wrap">
                        <img
                            src="/images/logo-putih-tus.png"
                            alt="Telkom University Surabaya"
                            className="sidebar-logo"
                        />
                    </div>

                    <div>
                        <h2>HUMAS</h2>
                        <p>Telkom University Surabaya</p>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-sm btn-light rounded-4 d-lg-none"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <nav className="sidebar-menu">
                <NavLink
                    to="/admin/dashboard"
                    className={navClass}
                    onClick={handleNavigate}
                >
                    <i className="bi bi-grid-1x2-fill"></i>
                    <span>Dashboard</span>
                </NavLink>

                <div className="sidebar-group">
                    <button
                        type="button"
                        className="sidebar-parent"
                        onClick={() => toggleMenu('myRequest')}
                    >
                        <span>
                            <i className="bi bi-send-check-fill"></i>
                            Pengajuan Saya
                        </span>

                        <i className={openMenu.myRequest ? 'bi bi-chevron-down' : 'bi bi-chevron-right'}></i>
                    </button>

                    {openMenu.myRequest && (
                        <div className="sidebar-children">
                            <NavLink
                                to="/admin/request/merchandise"
                                className={childClass}
                                onClick={handleNavigate}
                            >
                                Ajukan Merchandise
                            </NavLink>

                            <NavLink
                                to="/admin/request/humas-service"
                                className={childClass}
                                onClick={handleNavigate}
                            >
                                Ajukan Layanan Humas
                            </NavLink>

                            <NavLink
                                to="/admin/request/sekpim-borrowing"
                                className={childClass}
                                onClick={handleNavigate}
                            >
                                Ajukan Peminjaman
                            </NavLink>

                            <NavLink
                                to="/admin/my-requests"
                                className={childClass}
                                onClick={handleNavigate}
                            >
                                Riwayat Saya
                            </NavLink>
                        </div>
                    )}
                </div>

                {canApprove && (
                    <div className="sidebar-group">
                        <button
                            type="button"
                            className="sidebar-parent"
                            onClick={() => toggleMenu('approval')}
                        >
                            <span>
                                <i className="bi bi-patch-check-fill"></i>
                                Approval
                            </span>

                            <i className={openMenu.approval ? 'bi bi-chevron-down' : 'bi bi-chevron-right'}></i>
                        </button>

                        {openMenu.approval && (
                            <div className="sidebar-children">
                                <NavLink
                                    to="/admin/orders"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Approval Merchandise
                                </NavLink>

                                <NavLink
                                    to="/admin/humas-services"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Approval Layanan Humas
                                </NavLink>

                                <NavLink
                                    to="/admin/borrow-requests"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Approval Peminjaman
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {canManageMaster && (
                    <div className="sidebar-group">
                        <button
                            type="button"
                            className="sidebar-parent"
                            onClick={() => toggleMenu('masterData')}
                        >
                            <span>
                                <i className="bi bi-archive-fill"></i>
                                Master Data
                            </span>

                            <i className={openMenu.masterData ? 'bi bi-chevron-down' : 'bi bi-chevron-right'}></i>
                        </button>

                        {openMenu.masterData && (
                            <div className="sidebar-children">
                                <NavLink
                                    to="/admin/categories"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Data Kategori
                                </NavLink>

                                <NavLink
                                    to="/admin/products"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Paket Merchandise
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {canManageUser && (
                    <div className="sidebar-group">
                        <button
                            type="button"
                            className="sidebar-parent"
                            onClick={() => toggleMenu('userManagement')}
                        >
                            <span>
                                <i className="bi bi-people-fill"></i>
                                Manajemen User
                            </span>

                            <i className={openMenu.userManagement ? 'bi bi-chevron-down' : 'bi bi-chevron-right'}></i>
                        </button>

                        {openMenu.userManagement && (
                            <div className="sidebar-children">
                                <NavLink
                                    to="/admin/users"
                                    className={childClass}
                                    onClick={handleNavigate}
                                >
                                    Data User
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                <div className="sidebar-role-card">
                    <span>
                        {isSuperadmin && 'Akses Superadmin'}
                        {isAdmin && 'Akses Admin'}
                        {isUser && 'Akses User'}
                    </span>

                    <p>
                        {isSuperadmin && 'Memiliki akses penuh ke seluruh fitur sistem.'}
                        {isAdmin && 'Dapat membuat pengajuan dan memproses approval.'}
                        {isUser && 'Dapat membuat pengajuan dan memantau status request.'}
                    </p>
                </div>
            </nav>
        </aside>
    );
}