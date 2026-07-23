import { Link, useLocation } from 'react-router-dom';

const breadcrumbMap = [
    {
        match: (path) => path === '/admin/dashboard',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
        ],
    },

    {
        match: (path) => path === '/admin/request/merchandise',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Ajukan Merchandise',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/request/humas-service',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Layanan Humas',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/request/sekpim-borrowing',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Peminjaman SEKPiM',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/my-requests',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Riwayat Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith('/admin/my-requests/') &&
            path.endsWith('/detail'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Riwayat Pengajuan',
                path: '/admin/my-requests',
            },
            {
                label: 'Detail Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/orders',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Approval Merchandise',
                path: null,
            },
        ],
    },

    {
        match: (path) => path.startsWith('/admin/orders/'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Approval Merchandise',
                path: '/admin/orders',
            },
            {
                label: 'Detail Pengajuan',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/borrow-requests',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Approval Peminjaman',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith('/admin/borrow-requests/'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Approval Peminjaman',
                path: '/admin/borrow-requests',
            },
            {
                label: 'Detail Peminjaman',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/humas-services',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Approval Layanan Humas',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/categories',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/categories/create',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Kategori',
                path: '/admin/categories',
            },
            {
                label: 'Tambah Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith('/admin/categories/') &&
            path.endsWith('/edit'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Kategori',
                path: '/admin/categories',
            },
            {
                label: 'Edit Kategori',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/products',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/products/create',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Produk',
                path: '/admin/products',
            },
            {
                label: 'Tambah Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith('/admin/products/') &&
            path.endsWith('/edit'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data Produk',
                path: '/admin/products',
            },
            {
                label: 'Edit Produk',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/users',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data User',
                path: null,
            },
        ],
    },

    {
        match: (path) => path === '/admin/users/create',
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data User',
                path: '/admin/users',
            },
            {
                label: 'Tambah User',
                path: null,
            },
        ],
    },

    {
        match: (path) =>
            path.startsWith('/admin/users/') &&
            path.endsWith('/edit'),
        items: [
            {
                label: 'Dashboard',
                path: '/admin/dashboard',
            },
            {
                label: 'Data User',
                path: '/admin/users',
            },
            {
                label: 'Edit User',
                path: null,
            },
        ],
    },
];

export default function Breadcrumbs() {
    const location = useLocation();

    const foundBreadcrumb = breadcrumbMap.find((breadcrumb) =>
        breadcrumb.match(location.pathname)
    );

    const items = foundBreadcrumb?.items || [
        {
            label: 'Dashboard',
            path: '/admin/dashboard',
        },
        {
            label: 'Halaman',
            path: null,
        },
    ];

    if (location.pathname === '/admin/dashboard') {
        return null;
    }

    return (
        <div className="breadcrumb-wrapper">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb custom-breadcrumb mb-0">
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;

                        return (
                            <li
                                key={`${item.label}-${index}`}
                                className={`breadcrumb-item ${
                                    isLast ? 'active' : ''
                                }`}
                                aria-current={
                                    isLast ? 'page' : undefined
                                }
                            >
                                {item.path && !isLast ? (
                                    <Link to={item.path}>
                                        {index === 0 && (
                                            <i className="bi bi-house-door-fill me-2" />
                                        )}

                                        {item.label}
                                    </Link>
                                ) : (
                                    <>
                                        {index === 0 && (
                                            <i className="bi bi-house-door-fill me-2" />
                                        )}

                                        {item.label}
                                    </>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}