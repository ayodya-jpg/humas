import {
    Link,
    useLocation,
} from 'react-router-dom';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from './ProtectedRoute';

const createBreadcrumbMap = (
    basePath
) => [
    {
        match: (path) =>
            path === `${basePath}/dashboard`,

        items: [
            {
                label: 'Dashboard',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/merchandise`,

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Pengajuan Merchandise',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/humas-service`,

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Request Liputan Humas',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/sekpim-borrowing`,

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Peminjaman SEKPiM',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            `${basePath}/my-requests`,

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Riwayat Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                `${basePath}/my-requests/`
            ) &&
            path.endsWith('/detail'),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Riwayat Pengajuan',
                path:
                    `${basePath}/my-requests`,

                permission:
                    'request.history.view',
            },
            {
                label: 'Detail Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path === '/admin/orders',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Merchandise',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/orders/'
            ),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Merchandise',
                path: '/admin/orders',
                permission:
                    'approval.merchandise.view',
            },
            {
                label: 'Detail Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/humas-services',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Liputan Humas',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/humas-services/'
            ),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Liputan Humas',
                path:
                    '/admin/humas-services',

                permission:
                    'approval.humas.view',
            },
            {
                label: 'Detail Request',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/borrow-requests',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Peminjaman',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/borrow-requests/'
            ),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Approval Peminjaman',
                path:
                    '/admin/borrow-requests',

                permission:
                    'approval.borrowing.view',
            },
            {
                label: 'Detail Peminjaman',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/categories',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/categories/create',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Kategori',
                path:
                    '/admin/categories',

                permission:
                    'categories.view',
            },
            {
                label: 'Tambah Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/categories/'
            ) &&
            path.endsWith('/edit'),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Kategori',
                path:
                    '/admin/categories',

                permission:
                    'categories.view',
            },
            {
                label: 'Edit Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/products',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/products/create',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Produk',
                path:
                    '/admin/products',

                permission:
                    'products.view',
            },
            {
                label: 'Tambah Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/products/'
            ) &&
            path.endsWith('/edit'),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data Produk',
                path:
                    '/admin/products',

                permission:
                    'products.view',
            },
            {
                label: 'Edit Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/users',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data User',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
            '/admin/users/create',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data User',
                path:
                    '/admin/users',

                permission: [
                    'users.view',
                    'users.manage',
                ],
            },
            {
                label: 'Tambah User',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/users/'
            ) &&
            path.endsWith('/edit'),

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Data User',
                path:
                    '/admin/users',

                permission: [
                    'users.view',
                    'users.manage',
                ],
            },
            {
                label: 'Edit User',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path ===
                '/admin/unauthorized' ||
            path ===
                '/user/unauthorized',

        items: [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Akses Ditolak',
                path: null,
            },
        ],
    },
];

export default function Breadcrumbs() {
    const location =
        useLocation();

    const currentUser =
        getStoredUser();

    const basePath =
        currentUser?.role ===
        'user'
            ? '/user'
            : '/admin';

    const defaultPath =
        getDefaultPath(
            currentUser
        );

    const breadcrumbMap =
        createBreadcrumbMap(
            basePath
        );

    const foundBreadcrumb =
        breadcrumbMap.find(
            (breadcrumb) =>
                breadcrumb.match(
                    location.pathname
                )
        );

    const isDefaultPage =
        location.pathname ===
        defaultPath;

    if (
        isDefaultPage ||
        location.pathname ===
            `${basePath}/dashboard`
    ) {
        return null;
    }

    const originalItems =
        foundBreadcrumb?.items || [
            {
                label: 'Beranda',
                home: true,
            },
            {
                label: 'Halaman',
                path: null,
            },
        ];

    const items =
        originalItems.map(
            (item) => {
                if (item.home) {
                    return {
                        ...item,
                        path:
                            defaultPath,
                    };
                }

                if (
                    item.permission &&
                    !hasPermission(
                        currentUser,
                        item.permission
                    )
                ) {
                    return {
                        ...item,
                        path: null,
                    };
                }

                return item;
            }
        );

    return (
        <div className="breadcrumb-wrapper">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb custom-breadcrumb mb-0">
                    {items.map(
                        (
                            item,
                            index
                        ) => {
                            const isLast =
                                index ===
                                items.length -
                                    1;

                            const icon =
                                index === 0
                                    ? (
                                        <i className="bi bi-house-door-fill me-2" />
                                    )
                                    : null;

                            return (
                                <li
                                    key={`${item.label}-${index}`}
                                    className={`breadcrumb-item ${
                                        isLast
                                            ? 'active'
                                            : ''
                                    }`}
                                    aria-current={
                                        isLast
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {item.path &&
                                    !isLast ? (
                                        <Link
                                            to={
                                                item.path
                                            }
                                        >
                                            {icon}

                                            {
                                                item.label
                                            }
                                        </Link>
                                    ) : (
                                        <>
                                            {icon}

                                            {
                                                item.label
                                            }
                                        </>
                                    )}
                                </li>
                            );
                        }
                    )}
                </ol>
            </nav>
        </div>
    );
}