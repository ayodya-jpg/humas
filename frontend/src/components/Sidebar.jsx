import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useLocation,
} from 'react-router-dom';

import api from '../api/axios';

const EMPTY_BADGES = {
    merchandisePending: 0,
    humasPending: 0,
    borrowingPending: 0,
    lowStock: 0,
};

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const normalizePermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(Boolean)
        ),
    ];
};

const hasPermission = (
    currentUser,
    requiredPermission
) => {
    if (!requiredPermission) {
        return true;
    }

    if (currentUser?.role === 'superadmin') {
        return true;
    }

    const permissions = normalizePermissions(
        currentUser?.permissions
    );

    if (Array.isArray(requiredPermission)) {
        return requiredPermission.some(
            (permission) =>
                permissions.includes(permission)
        );
    }

    return permissions.includes(
        requiredPermission
    );
};

const extractResponseData = (response) => {
    const payload =
        response?.data?.data;

    if (Array.isArray(payload)) {
        return payload;
    }

    if (
        payload &&
        Array.isArray(payload.data)
    ) {
        return payload.data;
    }

    return [];
};

const getRoleLabel = (role) => {
    const roleLabels = {
        user: 'User',
        admin: 'Admin',
        admin_humas: 'Admin Humas',
        admin_sekpim: 'Admin SEKPiM',
        superadmin: 'Super Admin',
    };

    return (
        roleLabels[role] ||
        role ||
        'Pengguna'
    );
};

const createMenuGroups = (
    basePath
) => [
    {
        title: 'Utama',

        items: [
            {
                label: 'Dashboard',
                icon: 'bi-speedometer2',
                path: `${basePath}/dashboard`,
                permission: 'dashboard.view',
                badgeKey: null,
            },
        ],
    },

    {
        title: 'Pengajuan Saya',

        items: [
            {
                label:
                    'Pengajuan Merchandise',

                icon:
                    'bi-cart-plus-fill',

                path:
                    `${basePath}/request/merchandise`,

                permission:
                    'request.merchandise.create',

                badgeKey: null,
            },

            {
                label:
                    'Request Liputan Humas',

                icon:
                    'bi-camera-reels-fill',

                path:
                    `${basePath}/request/humas-service`,

                permission:
                    'request.humas.create',

                badgeKey: null,
            },

            {
                label:
                    'Peminjaman SEKPiM',

                icon:
                    'bi-box-seam-fill',

                path:
                    `${basePath}/request/sekpim-borrowing`,

                permission:
                    'request.borrowing.create',

                badgeKey: null,
            },

            {
                label:
                    'Riwayat Pengajuan',

                icon:
                    'bi-clock-history',

                path:
                    `${basePath}/my-requests`,

                permission:
                    'request.history.view',

                badgeKey: null,
            },
        ],
    },

    {
        title: 'Layanan Humas',

        items: [
            {
                label:
                    'Approval Merchandise',

                icon:
                    'bi-gift-fill',

                path:
                    '/admin/orders',

                permission:
                    'approval.merchandise.view',

                badgeKey:
                    'merchandisePending',
            },

            {
                label:
                    'Approval Liputan Humas',

                icon:
                    'bi-camera-reels-fill',

                path:
                    '/admin/humas-services',

                permission:
                    'approval.humas.view',

                badgeKey:
                    'humasPending',
            },
        ],
    },

    {
        title: 'Layanan SEKPiM',

        items: [
            {
                label:
                    'Approval Peminjaman',

                icon:
                    'bi-clipboard-check-fill',

                path:
                    '/admin/borrow-requests',

                permission:
                    'approval.borrowing.view',

                badgeKey:
                    'borrowingPending',
            },
        ],
    },

    {
        title: 'Master Data',

        items: [
            {
                label:
                    'Data Kategori',

                icon:
                    'bi-tags-fill',

                path:
                    '/admin/categories',

                permission:
                    'categories.view',

                badgeKey: null,
            },

            {
                label:
                    'Data Produk',

                icon:
                    'bi-boxes',

                path:
                    '/admin/products',

                permission:
                    'products.view',

                badgeKey:
                    'lowStock',
            },
        ],
    },

    {
        title: 'Manajemen Sistem',

        items: [
            {
                label:
                    'Data User',

                icon:
                    'bi-people-fill',

                path:
                    '/admin/users',

                permission:
                    'users.view',

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

    const [badges, setBadges] =
        useState(EMPTY_BADGES);

    const currentUser = useMemo(
        () => getCurrentUser(),
        []
    );

    const role =
        currentUser?.role || 'user';

    const basePath =
        role === 'user'
            ? '/user'
            : '/admin';

    const isOpen =
        Boolean(sidebarOpen) ||
        Boolean(isSidebarOpen);

    const menuGroups = useMemo(
        () => createMenuGroups(basePath),
        [basePath]
    );

    const canViewMerchandiseApproval =
        hasPermission(
            currentUser,
            'approval.merchandise.view'
        );

    const canViewHumasApproval =
        hasPermission(
            currentUser,
            'approval.humas.view'
        );

    const canViewBorrowingApproval =
        hasPermission(
            currentUser,
            'approval.borrowing.view'
        );

    const canViewProducts =
        hasPermission(
            currentUser,
            'products.view'
        );

    const fetchBadgeData = useCallback(
        async () => {
            const token =
                localStorage.getItem(
                    'admin_token'
                );

            if (!token) {
                setBadges(
                    EMPTY_BADGES
                );

                return;
            }

            const requests = [];
            const requestKeys = [];

            if (
                canViewMerchandiseApproval
            ) {
                requests.push(
                    api.get('/orders')
                );

                requestKeys.push(
                    'orders'
                );
            }

            if (
                canViewHumasApproval
            ) {
                requests.push(
                    api.get(
                        '/humas-service-requests'
                    )
                );

                requestKeys.push(
                    'humas'
                );
            }

            if (
                canViewBorrowingApproval
            ) {
                requests.push(
                    api.get(
                        '/borrow-requests'
                    )
                );

                requestKeys.push(
                    'borrowing'
                );
            }

            if (canViewProducts) {
                requests.push(
                    api.get('/products')
                );

                requestKeys.push(
                    'products'
                );
            }

            if (
                requests.length === 0
            ) {
                setBadges(
                    EMPTY_BADGES
                );

                return;
            }

            try {
                const responses =
                    await Promise.allSettled(
                        requests
                    );

                const resultMap = {};

                responses.forEach(
                    (
                        result,
                        index
                    ) => {
                        const key =
                            requestKeys[
                                index
                            ];

                        if (
                            result.status ===
                            'fulfilled'
                        ) {
                            resultMap[key] =
                                extractResponseData(
                                    result.value
                                );
                        } else {
                            resultMap[key] =
                                [];

                            console.error(
                                `Fetch badge ${key} error:`,
                                result.reason
                                    ?.response
                                    ?.data ||
                                    result.reason
                            );
                        }
                    }
                );

                const orders =
                    resultMap.orders || [];

                const humasRequests =
                    resultMap.humas || [];

                const borrowRequests =
                    resultMap.borrowing || [];

                const products =
                    resultMap.products || [];

                setBadges({
                    merchandisePending:
                        orders.filter(
                            (item) =>
                                item.status ===
                                'pending'
                        ).length,

                    humasPending:
                        humasRequests.filter(
                            (item) =>
                                item.status ===
                                'pending'
                        ).length,

                    borrowingPending:
                        borrowRequests.filter(
                            (item) =>
                                item.status ===
                                'pending'
                        ).length,

                    lowStock:
                        products.filter(
                            (item) =>
                                Number(
                                    item.stock || 0
                                ) <= 5
                        ).length,
                });
            } catch (error) {
                console.error(
                    'Fetch sidebar badges error:',
                    error?.response?.data ||
                        error
                );

                setBadges(
                    EMPTY_BADGES
                );
            }
        },
        [
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
            canViewProducts,
        ]
    );

    useEffect(() => {
        fetchBadgeData();
    }, [
        fetchBadgeData,
        location.pathname,
    ]);

    useEffect(() => {
        const intervalId =
            window.setInterval(
                fetchBadgeData,
                30000
            );

        return () => {
            window.clearInterval(
                intervalId
            );
        };
    }, [fetchBadgeData]);

    const allowedGroups = useMemo(
        () =>
            menuGroups
                .map((group) => ({
                    ...group,

                    items:
                        group.items.filter(
                            (item) =>
                                hasPermission(
                                    currentUser,
                                    item.permission
                                )
                        ),
                }))
                .filter(
                    (group) =>
                        group.items.length >
                        0
                ),
        [
            menuGroups,
            currentUser,
        ]
    );

    const closeSidebar = () => {
        setSidebarOpen(false);
        setIsSidebarOpen(false);
    };

    const isActiveMenu = (item) => {
        if (
            item.path ===
            `${basePath}/dashboard`
        ) {
            return (
                location.pathname ===
                item.path
            );
        }

        return (
            location.pathname ===
                item.path ||
            location.pathname.startsWith(
                `${item.path}/`
            )
        );
    };

    const getBadgeValue = (
        badgeKey
    ) => {
        if (!badgeKey) {
            return 0;
        }

        return Number(
            badges[badgeKey] || 0
        );
    };

    const getBadgeClass = (
        badgeKey
    ) => {
        if (
            badgeKey ===
            'lowStock'
        ) {
            return 'sidebar-badge-danger';
        }

        if (
            badgeKey ===
            'humasPending'
        ) {
            return 'sidebar-badge-warning';
        }

        if (
            badgeKey ===
            'borrowingPending'
        ) {
            return 'sidebar-badge-success';
        }

        return 'sidebar-badge-primary';
    };

    return (
        <>
            <aside
                className={`sidebar ${
                    isOpen
                        ? 'show'
                        : ''
                }`}
            >
                <div className="sidebar-brand">
                    <Link
                        to={`${basePath}/dashboard`}
                        className="sidebar-logo text-decoration-none"
                        onClick={
                            closeSidebar
                        }
                    >
                        <div className="sidebar-logo-mark">
                            <img
                                src="/images/logo-putih-tus.png"
                                alt="Telkom University Surabaya"
                                className="sidebar-logo-img"
                                onError={(
                                    event
                                ) => {
                                    event.currentTarget.style.display =
                                        'none';
                                }}
                            />

                            <span className="sidebar-logo-fallback">
                                T
                            </span>
                        </div>

                        <div>
                            <div className="sidebar-title">
                                HUMAS
                            </div>

                            <div className="sidebar-subtitle">
                                Tel-U Surabaya
                            </div>
                        </div>
                    </Link>

                    <button
                        type="button"
                        className="btn btn-sm btn-light d-lg-none rounded-circle"
                        onClick={
                            closeSidebar
                        }
                        aria-label="Tutup sidebar"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="sidebar-user">
                    <div className="profile-avatar bg-white text-danger">
                        {(
                            currentUser.name ||
                            'U'
                        )
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <div className="sidebar-user-name text-truncate">
                            {currentUser.name ||
                                'Pengguna'}
                        </div>

                        <div className="sidebar-user-role">
                            {getRoleLabel(
                                role
                            )}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {allowedGroups.map(
                        (group) => (
                            <div
                                className="sidebar-group"
                                key={
                                    group.title
                                }
                            >
                                <div className="sidebar-group-title">
                                    {
                                        group.title
                                    }
                                </div>

                                <div className="sidebar-menu">
                                    {group.items.map(
                                        (item) => {
                                            const active =
                                                isActiveMenu(
                                                    item
                                                );

                                            const badgeValue =
                                                getBadgeValue(
                                                    item.badgeKey
                                                );

                                            return (
                                                <Link
                                                    key={
                                                        item.path
                                                    }
                                                    to={
                                                        item.path
                                                    }
                                                    className={`sidebar-link ${
                                                        active
                                                            ? 'active'
                                                            : ''
                                                    }`}
                                                    onClick={
                                                        closeSidebar
                                                    }
                                                >
                                                    <span className="sidebar-link-icon">
                                                        <i
                                                            className={`bi ${item.icon}`}
                                                        />
                                                    </span>

                                                    <span className="sidebar-link-text">
                                                        {
                                                            item.label
                                                        }
                                                    </span>

                                                    {badgeValue >
                                                        0 && (
                                                        <span
                                                            className={`sidebar-badge ${getBadgeClass(
                                                                item.badgeKey
                                                            )}`}
                                                        >
                                                            {badgeValue >
                                                            99
                                                                ? '99+'
                                                                : badgeValue}
                                                        </span>
                                                    )}

                                                    {active &&
                                                        badgeValue ===
                                                            0 && (
                                                        <span className="sidebar-link-indicator">
                                                            <i className="bi bi-chevron-right" />
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {allowedGroups.length ===
                        0 && (
                        <div className="p-3">
                            <div className="alert alert-warning border-0 rounded-4 mb-0">
                                <div className="fw-bold mb-1">
                                    Tidak ada menu
                                </div>

                                <div className="small">
                                    Akun ini belum
                                    memiliki hak akses
                                    aktif.
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-footer-card">
                        <div className="fw-bold mb-1">
                            HUMAS & SEKPiM
                        </div>

                        <div className="small">
                            Sistem layanan
                            terpadu Telkom
                            University Surabaya.
                        </div>
                    </div>
                </div>
            </aside>

            {isOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop d-lg-none"
                    onClick={
                        closeSidebar
                    }
                    aria-label="Tutup sidebar"
                />
            )}
        </>
    );
}