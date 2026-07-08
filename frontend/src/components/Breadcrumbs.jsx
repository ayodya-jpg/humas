import { Link, useLocation } from 'react-router-dom';

const breadcrumbMap = [
    {
        match: (path) => path === '/admin/dashboard',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
        ],
    },

    {
        match: (path) => path === '/admin/request/merchandise',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Ajukan Merchandise', path: '/admin/request/merchandise' },
        ],
    },
    {
        match: (path) => path === '/admin/request/humas-service',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Ajukan Layanan Humas', path: '/admin/request/humas-service' },
        ],
    },
    {
        match: (path) => path === '/admin/request/sekpim-borrowing',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Ajukan Peminjaman', path: '/admin/request/sekpim-borrowing' },
        ],
    },

    {
        match: (path) => path === '/admin/my-requests',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Riwayat Saya', path: '/admin/my-requests' },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/my-requests/') && path.endsWith('/detail'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Riwayat Saya', path: '/admin/my-requests' },
            { label: 'Detail', path: null },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/my-requests/') && path.endsWith('/resubmit'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Riwayat Saya', path: '/admin/my-requests' },
            { label: 'Ajukan Ulang', path: null },
        ],
    },

    {
        match: (path) => path === '/admin/orders',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Approval Merchandise', path: '/admin/orders' },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/orders/'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Approval Merchandise', path: '/admin/orders' },
            { label: 'Detail', path: null },
        ],
    },

    {
        match: (path) => path === '/admin/borrow-requests',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Approval Peminjaman', path: '/admin/borrow-requests' },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/borrow-requests/'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Approval Peminjaman', path: '/admin/borrow-requests' },
            { label: 'Detail', path: null },
        ],
    },

    {
        match: (path) => path === '/admin/humas-services',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Approval Layanan Humas', path: '/admin/humas-services' },
        ],
    },

    {
        match: (path) => path === '/admin/categories',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data Kategori', path: '/admin/categories' },
        ],
    },
    {
        match: (path) => path === '/admin/categories/create',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data Kategori', path: '/admin/categories' },
            { label: 'Tambah', path: null },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/categories/') && path.endsWith('/edit'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data Kategori', path: '/admin/categories' },
            { label: 'Edit', path: null },
        ],
    },

    {
        match: (path) => path === '/admin/products',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Paket Merchandise', path: '/admin/products' },
        ],
    },
    {
        match: (path) => path === '/admin/products/create',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Paket Merchandise', path: '/admin/products' },
            { label: 'Tambah', path: null },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/products/') && path.endsWith('/edit'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Paket Merchandise', path: '/admin/products' },
            { label: 'Edit', path: null },
        ],
    },

    {
        match: (path) => path === '/admin/users',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data User', path: '/admin/users' },
        ],
    },
    {
        match: (path) => path === '/admin/users/create',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data User', path: '/admin/users' },
            { label: 'Tambah', path: null },
        ],
    },
    {
        match: (path) => path.startsWith('/admin/users/') && path.endsWith('/edit'),
        items: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Data User', path: '/admin/users' },
            { label: 'Edit', path: null },
        ],
    },
];

export default function Breadcrumbs() {
    const location = useLocation();

    const foundBreadcrumb = breadcrumbMap.find((breadcrumb) =>
        breadcrumb.match(location.pathname)
    );

    const items = foundBreadcrumb?.items || [
        { label: 'Dashboard', path: '/admin/dashboard' },
        { label: 'Halaman Admin', path: null },
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
                                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                                aria-current={isLast ? 'page' : undefined}
                            >
                                {item.path && !isLast ? (
                                    <Link to={item.path}>
                                        {index === 0 && (
                                            <i className="bi bi-house-door-fill me-2"></i>
                                        )}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <>
                                        {index === 0 && (
                                            <i className="bi bi-house-door-fill me-2"></i>
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