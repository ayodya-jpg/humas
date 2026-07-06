import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar() {
    const [openMenu, setOpenMenu] = useState({
        ecommerce: true,
        borrowing: true,
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
                    <p>Approval System</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/dashboard"
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
                        onClick={() => toggleMenu('ecommerce')}
                    >
                        <span>
                            <span className="nav-icon">□</span>
                            E-Commerce
                        </span>
                        <span>{openMenu.ecommerce ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.ecommerce && (
                        <div className="nav-children">
                            <NavLink
                                to="/ecommerce/catalog"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Katalog Checkout
                            </NavLink>

                            <NavLink
                                to="/ecommerce/approval"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Approval Checkout
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="nav-group">
                    <button
                        type="button"
                        className="nav-parent"
                        onClick={() => toggleMenu('borrowing')}
                    >
                        <span>
                            <span className="nav-icon">◇</span>
                            Peminjaman
                        </span>
                        <span>{openMenu.borrowing ? '▾' : '▸'}</span>
                    </button>

                    {openMenu.borrowing && (
                        <div className="nav-children">
                            <NavLink
                                to="/borrowing/request"
                                className={({ isActive }) =>
                                    isActive ? 'nav-child active' : 'nav-child'
                                }
                            >
                                Pengajuan Peminjaman
                            </NavLink>

                            <NavLink
                                to="/borrowing/approval"
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