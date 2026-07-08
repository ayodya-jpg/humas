import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';

const menuGroups = [
    {
        title: 'Utama',
        items: [
            {
                label: 'Dashboard',
                icon: 'bi-speedometer2',
                path: '/admin/dashboard',
                activePaths: ['/admin/dashboard'],
                roles: ['user', 'admin', 'superadmin'],
                badgeKey: null,
            },
        ],
    },
    {
        title: 'Pengajuan Saya',
        items: [
            {
                label: 'Ajukan Merchandise',
                icon: 'bi-cart-plus-fill',
                path: '/admin/request/merchandise',
                activePaths: ['/admin/request/merchandise'],
                roles: ['user', 'admin', 'superadmin'],
                badgeKey: null,
            },
            {
                label: 'Ajukan Layanan Humas',
                icon: 'bi-megaphone-fill',
                path: '/admin/request/humas-service',
                activePaths: ['/admin/request/humas-service'],
                roles: ['user', 'admin', 'superadmin'],
                badgeKey: null,
            },
            {
                label: 'Ajukan Peminjaman',
                icon: 'bi-box-seam-fill',
                path: '/admin/request/sekpim-borrowing',
                activePaths: ['/admin/request/sekpim-borrowing'],
                roles: ['user', 'admin', 'superadmin'],
                badgeKey: null,
            },
            {
                label: 'Riwayat Saya',
                icon: 'bi-clock-history',
                path: '/admin/my-requests',
                activePaths: ['/admin/my-requests'],
                roles: ['user', 'admin', 'superadmin'],
                badgeKey: 'myRevision',
            },
        ],
    },
    {
        title: 'Approval',
        items: [
            {
                label: 'Approval Merchandise',
                icon: 'bi-gift-fill',
                path: '/admin/orders',
                activePaths: ['/admin/orders'],
                roles: ['admin', 'superadmin'],
                badgeKey: 'merchandisePending',
            },
            {
                label: 'Approval Layanan Humas',
                icon: 'bi-headset',
                path: '/admin/humas-services',
                activePaths: ['/admin/humas-services'],
                roles: ['admin', 'superadmin'],
                badgeKey: null,
            },
            {
                label: 'Approval Peminjaman',
                icon: 'bi-clipboard-check-fill',
                path: '/admin/borrow-requests',
                activePaths: ['/admin/borrow-requests'],
                roles: ['admin', 'superadmin'],
                badgeKey: 'borrowingPending',
            },
        ],
    },
    {
        title: 'Master Data',
        items: [
            {
                label: 'Data Kategori',
                icon: 'bi-tags-fill',
                path: '/admin/categories',
                activePaths: ['/admin/categories'],
                roles: ['superadmin'],
                badgeKey: null,
            },
            {
                label: 'Paket Merchandise',
                icon: 'bi-boxes',
                path: '/admin/products',
                activePaths: ['/admin/products'],
                roles: ['superadmin'],
                badgeKey: 'lowStock',
            },
        ],
    },
    {
        title: 'Manajemen User',
        items: [
            {
                label: 'Data User',
                icon: 'bi-people-fill',
                path: '/admin/users',
                activePaths: ['/admin/users'],
                roles: ['superadmin'],
                badgeKey: null,
            },
        ],
    },
];

export default function Sidebar({
    sidebarOpen = false,
    setSidebarOpen = () => {},
    isSidebarOpen = false,
    setIsSidebarOpen = () => {},
}) {
    const location = useLocation();

    const [badges, setBadges] = useState({
        merchandisePending: 0,
        borrowingPending: 0,
        myRevision: 0,
        lowStock: 0,
    });

    let currentUser = {};

    try {
        currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        currentUser = {};
    }

    const role = currentUser.role || 'user';
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isSuperadmin = role === 'superadmin';
    const isOpen = sidebarOpen || isSidebarOpen;

    const fetchBadgeData = useCallback(async () => {
        const token = localStorage.getItem('admin_token');

        if (!token) return;

        try {
            const requests = [];

            if (isAdmin) {
                requests.push(api.get('/orders'));
                requests.push(api.get('/borrow-requests'));
            } else {
                requests.push(api.get('/my-orders'));
                requests.push(api.get('/my-borrow-requests'));
            }

            if (isSuperadmin) {
                requests.push(api.get('/products'));
            }

            const responses = await Promise.all(requests);

            const orders = responses[0]?.data?.data || [];
            const borrowRequests = responses[1]?.data?.data || [];
            const products = isSuperadmin ? responses[2]?.data?.data || [] : [];

            setBadges({
                merchandisePending: isAdmin
                    ? orders.filter((order) => order.status === 'pending').length
                    : 0,

                borrowingPending: isAdmin
                    ? borrowRequests.filter((request) => request.status === 'pending').length
                    : 0,

                myRevision: [
                    ...orders,
                    ...borrowRequests,
                ].filter((item) => item.status === 'revision').length,

                lowStock: isSuperadmin
                    ? products.filter((product) => Number(product.stock) <= 5).length
                    : 0,
            });
        } catch (error) {
            console.error('Fetch sidebar badge error:', error.response?.data || error);
        }
    }, [isAdmin, isSuperadmin]);

    useEffect(() => {
        fetchBadgeData();
    }, [fetchBadgeData, location.pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchBadgeData();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchBadgeData]);

    const closeSidebar = () => {
        setSidebarOpen(false);
        setIsSidebarOpen(false);
    };

    const isActiveMenu = (item) => {
        return item.activePaths.some((activePath) => {
            if (activePath === '/admin/dashboard') {
                return location.pathname === activePath;
            }

            return location.pathname === activePath || location.pathname.startsWith(`${activePath}/`);
        });
    };

    const allowedGroups = useMemo(() => {
        return menuGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.roles.includes(role)),
            }))
            .filter((group) => group.items.length > 0);
    }, [role]);

    const getBadgeValue = (badgeKey) => {
        if (!badgeKey) return 0;
        return badges[badgeKey] || 0;
    };

    const getBadgeClass = (badgeKey) => {
        if (badgeKey === 'myRevision') return 'sidebar-badge-warning';
        if (badgeKey === 'lowStock') return 'sidebar-badge-danger';

        return 'sidebar-badge-primary';
    };

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'show' : ''}`}>
                <div className="sidebar-brand">
                    <Link
                        to="/admin/dashboard"
                        className="sidebar-logo text-decoration-none"
                        onClick={closeSidebar}
                    >
                        <div className="sidebar-logo-mark">
                            <img
                                src="/images/logo-putih-tus.png"
                                alt="Telkom University Surabaya"
                                className="sidebar-logo-img"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />

                            <span className="sidebar-logo-fallback">T</span>
                        </div>

                        <div>
                            <div className="sidebar-title">HUMAS</div>
                            <div className="sidebar-subtitle">Tel-U Surabaya</div>
                        </div>
                    </Link>

                    <button
                        type="button"
                        className="btn btn-sm btn-light d-lg-none rounded-circle"
                        onClick={closeSidebar}
                        aria-label="Tutup sidebar"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="sidebar-user">
                    <div className="profile-avatar bg-white text-danger">
                        {(currentUser.name || 'U').charAt(0)}
                    </div>

                    <div className="min-w-0">
                        <div className="sidebar-user-name text-truncate">
                            {currentUser.name || 'User'}
                        </div>

                        <div className="sidebar-user-role text-capitalize">
                            {role}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {allowedGroups.map((group) => (
                        <div className="sidebar-group" key={group.title}>
                            <div className="sidebar-group-title">
                                {group.title}
                            </div>

                            <div className="sidebar-menu">
                                {group.items.map((item) => {
                                    const active = isActiveMenu(item);
                                    const badgeValue = getBadgeValue(item.badgeKey);

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`sidebar-link ${active ? 'active' : ''}`}
                                            onClick={closeSidebar}
                                        >
                                            <span className="sidebar-link-icon">
                                                <i className={`bi ${item.icon}`}></i>
                                            </span>

                                            <span className="sidebar-link-text">
                                                {item.label}
                                            </span>

                                            {badgeValue > 0 && (
                                                <span className={`sidebar-badge ${getBadgeClass(item.badgeKey)}`}>
                                                    {badgeValue > 99 ? '99+' : badgeValue}
                                                </span>
                                            )}

                                            {active && badgeValue === 0 && (
                                                <span className="sidebar-link-indicator">
                                                    <i className="bi bi-chevron-right"></i>
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-footer-card">
                        <div className="fw-bold mb-1">
                            HUMAS & SEKPIM
                        </div>

                        <div className="small">
                            Sistem pengajuan internal berbasis role.
                        </div>
                    </div>
                </div>
            </aside>

            {isOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop d-lg-none"
                    onClick={closeSidebar}
                    aria-label="Tutup sidebar"
                />
            )}
        </>
    );
}