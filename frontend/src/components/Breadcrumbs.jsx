import { Link, useLocation } from 'react-router-dom';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from './ProtectedRoute';

const home = {
    label: 'Beranda',
    home: true,
};

const page = (label) => ({
    label,
    path: null,
});

const parent = (
    label,
    path,
    permission = null
) => ({
    label,
    path,
    ...(permission ? { permission } : {}),
});

const trail = (...items) => [
    home,
    ...items,
];

const createBreadcrumbMap = (basePath) => [
    // DASHBOARD
    {
        match: (path) =>
            path === `${basePath}/dashboard`,

        items: [
            page('Dashboard'),
        ],
    },

    // JADWAL DIREKTORAT - APPROVAL DETAIL
    {
        match: (path) =>
            path.startsWith(
                '/admin/director-schedule/requests/'
            ),

        items: trail(
            parent(
                'Jadwal Direktorat',
                `${basePath}/director-schedule`
            ),
            parent(
                'Approval Jadwal',
                '/admin/director-schedule/requests'
            ),
            page('Detail Pengajuan')
        ),
    },

    // JADWAL DIREKTORAT - APPROVAL
    {
        match: (path) =>
            path ===
            '/admin/director-schedule/requests',

        items: trail(
            parent(
                'Jadwal Direktorat',
                `${basePath}/director-schedule`
            ),
            page('Approval Jadwal')
        ),
    },

    // JADWAL DIREKTORAT - ACTIVITY LOG
    {
        match: (path) =>
            path ===
            '/admin/director-schedule/activity',

        items: trail(
            parent(
                'Jadwal Direktorat',
                `${basePath}/director-schedule`
            ),
            page('Riwayat Jadwal')
        ),
    },

    // JADWAL DIREKTORAT - PENGAJUAN
    {
        match: (path) =>
            path ===
            `${basePath}/request/directorate-schedule`,

        items: trail(
            parent(
                'Jadwal Direktorat',
                `${basePath}/director-schedule`
            ),
            page('Pengajuan Jadwal')
        ),
    },

    // JADWAL DIREKTORAT - KALENDER
    {
        match: (path) =>
            path ===
            `${basePath}/director-schedule`,

        items: trail(
            page('Jadwal Direktorat')
        ),
    },

    // PENGAJUAN MERCHANDISE
    {
        match: (path) =>
            path ===
            `${basePath}/request/merchandise`,

        items: trail(
            page('Pengajuan Merchandise')
        ),
    },

    // REQUEST LIPUTAN HUMAS
    {
        match: (path) =>
            path ===
            `${basePath}/request/humas-service`,

        items: trail(
            page('Request Liputan Humas')
        ),
    },

    // PEMINJAMAN SEKPiM
    {
        match: (path) =>
            path ===
            `${basePath}/request/sekpim-borrowing`,

        items: trail(
            page('Peminjaman SEKPiM')
        ),
    },

    // RIWAYAT PENGAJUAN - DETAIL
    {
        match: (path) =>
            path.startsWith(
                `${basePath}/my-requests/`
            ) &&
            path.endsWith('/detail'),

        items: trail(
            parent(
                'Riwayat Pengajuan',
                `${basePath}/my-requests`,
                'request.history.view'
            ),
            page('Detail Pengajuan')
        ),
    },

    // RIWAYAT PENGAJUAN
    {
        match: (path) =>
            path === `${basePath}/my-requests`,

        items: trail(
            page('Riwayat Pengajuan')
        ),
    },

    // APPROVAL MERCHANDISE - DETAIL
    {
        match: (path) =>
            path.startsWith('/admin/orders/'),

        items: trail(
            parent(
                'Approval Merchandise',
                '/admin/orders',
                'approval.merchandise.view'
            ),
            page('Detail Pengajuan')
        ),
    },

    // APPROVAL MERCHANDISE
    {
        match: (path) =>
            path === '/admin/orders',

        items: trail(
            page('Approval Merchandise')
        ),
    },

    // APPROVAL HUMAS - DETAIL
    {
        match: (path) =>
            path.startsWith(
                '/admin/humas-services/'
            ),

        items: trail(
            parent(
                'Approval Liputan Humas',
                '/admin/humas-services',
                'approval.humas.view'
            ),
            page('Detail Request')
        ),
    },

    // APPROVAL HUMAS
    {
        match: (path) =>
            path === '/admin/humas-services',

        items: trail(
            page('Approval Liputan Humas')
        ),
    },

    // APPROVAL SEKPiM - DETAIL
    {
        match: (path) =>
            path.startsWith(
                '/admin/borrow-requests/'
            ),

        items: trail(
            parent(
                'Approval SEKPiM',
                '/admin/borrow-requests',
                'approval.borrowing.view'
            ),
            page('Detail Pengajuan SEKPiM')
        ),
    },

    // APPROVAL SEKPiM
    {
        match: (path) =>
            path === '/admin/borrow-requests',

        items: trail(
            page('Approval SEKPiM')
        ),
    },

    // PENGATURAN LAYANAN
    {
        match: (path) =>
            path === '/admin/humas-settings',

        items: trail(
            page('Pengaturan Layanan')
        ),
    },

    // KATEGORI - TAMBAH
    {
        match: (path) =>
            path === '/admin/categories/create',

        items: trail(
            parent(
                'Data Kategori',
                '/admin/categories',
                'categories.view'
            ),
            page('Tambah Kategori')
        ),
    },

    // KATEGORI - EDIT
    {
        match: (path) =>
            path.startsWith(
                '/admin/categories/'
            ) &&
            path.endsWith('/edit'),

        items: trail(
            parent(
                'Data Kategori',
                '/admin/categories',
                'categories.view'
            ),
            page('Edit Kategori')
        ),
    },

    // KATEGORI - LIST
    {
        match: (path) =>
            path === '/admin/categories',

        items: trail(
            page('Data Kategori')
        ),
    },

    // PRODUK - TAMBAH
    {
        match: (path) =>
            path === '/admin/products/create',

        items: trail(
            parent(
                'Data Produk',
                '/admin/products',
                'products.view'
            ),
            page('Tambah Produk')
        ),
    },

    // PRODUK - EDIT
    {
        match: (path) =>
            path.startsWith(
                '/admin/products/'
            ) &&
            path.endsWith('/edit'),

        items: trail(
            parent(
                'Data Produk',
                '/admin/products',
                'products.view'
            ),
            page('Edit Produk')
        ),
    },

    // PRODUK - LIST
    {
        match: (path) =>
            path === '/admin/products',

        items: trail(
            page('Data Produk')
        ),
    },

    // USER - TAMBAH
    {
        match: (path) =>
            path === '/admin/users/create',

        items: trail(
            parent(
                'Data User',
                '/admin/users',
                [
                    'users.view',
                    'users.manage',
                ]
            ),
            page('Tambah User')
        ),
    },

    // USER - EDIT
    {
        match: (path) =>
            path.startsWith(
                '/admin/users/'
            ) &&
            path.endsWith('/edit'),

        items: trail(
            parent(
                'Data User',
                '/admin/users',
                [
                    'users.view',
                    'users.manage',
                ]
            ),
            page('Edit User')
        ),
    },

    // USER - LIST
    {
        match: (path) =>
            path === '/admin/users',

        items: trail(
            page('Data User')
        ),
    },

    // AKSES DITOLAK
    {
        match: (path) =>
            path === '/admin/unauthorized' ||
            path === '/user/unauthorized',

        items: trail(
            page('Akses Ditolak')
        ),
    },
];

export default function Breadcrumbs() {
    const location = useLocation();

    const currentUser = getStoredUser();

    const basePath =
        currentUser?.role === 'user'
            ? '/user'
            : '/admin';

    const defaultPath = getDefaultPath(
        currentUser
    );

    const foundBreadcrumb =
        createBreadcrumbMap(basePath).find(
            (breadcrumb) =>
                breadcrumb.match(
                    location.pathname
                )
        );

    if (
        location.pathname ===
        `${basePath}/dashboard`
    ) {
        return null;
    }

    const originalItems =
        foundBreadcrumb?.items ||
        trail(
            page('Halaman')
        );

    const items = originalItems.map(
        (item) => {
            if (item.home) {
                return {
                    ...item,
                    path: defaultPath,
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
                    {items.map((item, index) => {
                        const isLast =
                            index ===
                            items.length - 1;

                        const icon =
                            index === 0 ? (
                                <i className="bi bi-house-door-fill me-2" />
                            ) : null;

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
                                    <Link to={item.path}>
                                        {icon}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <>
                                        {icon}
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