import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar() {
    const [openMenu, setOpenMenu] = useState({
        userManagement: true,
        masterData: true,
        merchandise: true,
        humasService: true,
        sekpimBorrowing: true,
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
                <div className="brand-logo">H</div>
                <div>
                    <h2>HUMAS</h2>
                    <p>Service Request System</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) =>
                        isActive ? 'nav-link active' : 'nav-link'
                    }
                >
                    <span className="nav-icon">⌂</span>
                    <span>Dashboard</span>
                </NavLink>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('userManagement')}
                    >
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
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Data User
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('masterData')}
                    >
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
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Data Kategori
                            </NavLink>

                            <NavLink
                                to="/admin/products"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Paket Merchandise
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('merchandise')}
                    >
                        <span>
                            <span className="nav-icon">◇</span>
                            Merchandise
                        </span>
                        <span>{openMenu.merchandise ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.merchandise && (
                        <div className="nav-children">
                            <NavLink
                                to="/admin/orders"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Approval Merchandise
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('humasService')}
                    >
                        <span>
                            <span className="nav-icon">✦</span>
                            Layanan Humas
                        </span>
                        <span>{openMenu.humasService ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.humasService && (
                        <div className="nav-children">
                            <NavLink
                                to="/admin/humas-services"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Approval Layanan
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('sekpimBorrowing')}
                    >
                        <span>
                            <span className="nav-icon">□</span>
                            Peminjaman Sekpim
                        </span>
                        <span>{openMenu.sekpimBorrowing ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.sekpimBorrowing && (
                        <div className="nav-children">
                            <NavLink
                                to="/admin/borrow-requests"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Approval Peminjaman
                            </NavLink>
                        </div>
                    )}
                </div>
            </nav>
        </aside>
    );
}