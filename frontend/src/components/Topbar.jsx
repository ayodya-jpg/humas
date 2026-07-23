import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import api from '../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../utils/sweetAlert';

const COVERAGE_TYPE_CONFIG = {
    'SOCIAL MEDIA': {
        label: 'Social Media',
        icon: 'bi-instagram',
    },

    DOKUMENTASI: {
        label: 'Dokumentasi',
        icon: 'bi-camera-fill',
    },

    'PUBLIKASI WEBSITE': {
        label: 'Publikasi Website',
        icon: 'bi-globe2',
    },

    YOUTUBE: {
        label: 'YouTube',
        icon: 'bi-youtube',
    },

    'VIDEO REELS': {
        label: 'Video Reels',
        icon: 'bi-play-btn-fill',
    },
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
    permission
) => {
    if (!permission) {
        return true;
    }

    if (
        currentUser?.role ===
        'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
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

const formatDateTime = (date) => {
    if (!date) {
        return '-';
    }

    const parsedDate = new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate.toLocaleString(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    );
};

const getRoleLabel = (role) => {
    const labels = {
        user: 'User',
        admin: 'Admin',
        admin_humas: 'Admin Humas',
        admin_sekpim: 'Admin SEKPiM',
        superadmin: 'Super Admin',
    };

    return (
        labels[role] ||
        role ||
        'Pengguna'
    );
};

const getCoverageConfig = (
    coverageType
) => {
    return (
        COVERAGE_TYPE_CONFIG[
            coverageType
        ] || {
            label:
                coverageType ||
                'Liputan Humas',

            icon:
                'bi-camera-reels-fill',
        }
    );
};

const getHumasDescription = (item) => {
    const coverageConfig =
        getCoverageConfig(
            item.coverage_type
        );

    return [
        coverageConfig.label,
        item.event_location,
        item.applicant_name,
    ]
        .filter(Boolean)
        .join(' • ');
};

const getStatusNotification = (
    status,
    requestType,
    item = {}
) => {
    if (
        requestType === 'humas'
    ) {
        const statusMap = {
            approved: {
                title:
                    'Request Liputan Disetujui',

                icon:
                    'bi-check-circle-fill',

                color:
                    'success',
            },

            rejected: {
                title:
                    'Request Liputan Ditolak',

                icon:
                    'bi-x-circle-fill',

                color:
                    'danger',
            },

            completed: {
                title:
                    'Hasil Liputan Tersedia',

                icon:
                    'bi-cloud-check-fill',

                color:
                    'success',
            },
        };

        return (
            statusMap[status] || {
                title:
                    'Request Liputan Diperbarui',

                icon:
                    getCoverageConfig(
                        item.coverage_type
                    ).icon,

                color:
                    'danger',
            }
        );
    }

    const typeLabels = {
        merchandise:
            'Merchandise',

        borrowing:
            'Peminjaman',
    };

    const typeLabel =
        typeLabels[
            requestType
        ] || 'Pengajuan';

    const statusMap = {
        approved: {
            title:
                `${typeLabel} disetujui`,

            icon:
                'bi-check-circle-fill',

            color:
                'success',
        },

        rejected: {
            title:
                `${typeLabel} ditolak`,

            icon:
                'bi-x-circle-fill',

            color:
                'danger',
        },

        completed: {
            title:
                `${typeLabel} selesai`,

            icon:
                'bi-check2-all',

            color:
                'primary',
        },

        borrowed: {
            title:
                'Barang sedang dipinjam',

            icon:
                'bi-box-arrow-up-right',

            color:
                'warning',
        },

        returned: {
            title:
                'Barang telah dikembalikan',

            icon:
                'bi-box-arrow-in-down-left',

            color:
                'info',
        },
    };

    return (
        statusMap[status] || {
            title:
                `${typeLabel} diperbarui`,

            icon:
                'bi-info-circle-fill',

            color:
                'secondary',
        }
    );
};

const createPageMap = (
    basePath
) => [
    {
        match: (path) =>
            path ===
            `${basePath}/dashboard`,

        title: 'Dashboard',

        subtitle:
            'Ringkasan aktivitas layanan HUMAS dan SEKPiM.',

        icon:
            'bi-speedometer2',
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/merchandise`,

        title:
            'Pengajuan Merchandise',

        subtitle:
            'Pilih paket merchandise dan lengkapi data kegiatan.',

        icon:
            'bi-cart-plus-fill',
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/humas-service`,

        title:
            'Request Liputan Humas',

        subtitle:
            'Ajukan kebutuhan liputan, dokumentasi, publikasi, atau video.',

        icon:
            'bi-camera-reels-fill',
    },

    {
        match: (path) =>
            path ===
            `${basePath}/request/sekpim-borrowing`,

        title:
            'Peminjaman SEKPiM',

        subtitle:
            'Ajukan peminjaman perlengkapan untuk kegiatan.',

        icon:
            'bi-box-seam-fill',
    },

    {
        match: (path) =>
            path ===
            `${basePath}/my-requests`,

        title:
            'Riwayat Pengajuan',

        subtitle:
            'Pantau seluruh pengajuan dan hasil pelayanan.',

        icon:
            'bi-clock-history',
    },

    {
        match: (path) =>
            path.startsWith(
                `${basePath}/my-requests/`
            ) &&
            path.endsWith(
                '/detail'
            ),

        title:
            'Detail Pengajuan',

        subtitle:
            'Lihat informasi dan perkembangan status pengajuan.',

        icon:
            'bi-file-earmark-text-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/orders',

        title:
            'Approval Merchandise',

        subtitle:
            'Periksa dan proses pengajuan merchandise.',

        icon:
            'bi-gift-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/orders/'
            ),

        title:
            'Detail Merchandise',

        subtitle:
            'Periksa detail pengajuan sebelum memberikan keputusan.',

        icon:
            'bi-gift-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/humas-services',

        title:
            'Approval Liputan Humas',

        subtitle:
            'Periksa dan proses request liputan yang masuk.',

        icon:
            'bi-camera-reels-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/humas-services/'
            ),

        title:
            'Detail Request Liputan',

        subtitle:
            'Periksa informasi kegiatan dan dokumen pendukung.',

        icon:
            'bi-camera-reels-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/borrow-requests',

        title:
            'Approval Peminjaman',

        subtitle:
            'Periksa dan proses peminjaman perlengkapan SEKPiM.',

        icon:
            'bi-clipboard-check-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/borrow-requests/'
            ),

        title:
            'Detail Peminjaman',

        subtitle:
            'Periksa detail barang dan jadwal peminjaman.',

        icon:
            'bi-clipboard-check-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/categories',

        title:
            'Data Kategori',

        subtitle:
            'Kelola kategori merchandise dan perlengkapan.',

        icon:
            'bi-tags-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/categories/create',

        title:
            'Tambah Kategori',

        subtitle:
            'Tambahkan kategori baru ke dalam sistem.',

        icon:
            'bi-plus-circle-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/categories/'
            ) &&
            path.endsWith('/edit'),

        title:
            'Edit Kategori',

        subtitle:
            'Perbarui informasi kategori.',

        icon:
            'bi-pencil-square',
    },

    {
        match: (path) =>
            path ===
            '/admin/products',

        title:
            'Data Produk',

        subtitle:
            'Kelola merchandise dan perlengkapan peminjaman.',

        icon:
            'bi-boxes',
    },

    {
        match: (path) =>
            path ===
            '/admin/products/create',

        title:
            'Tambah Produk',

        subtitle:
            'Tambahkan merchandise atau perlengkapan baru.',

        icon:
            'bi-plus-circle-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/products/'
            ) &&
            path.endsWith('/edit'),

        title:
            'Edit Produk',

        subtitle:
            'Perbarui informasi produk dan stok.',

        icon:
            'bi-pencil-square',
    },

    {
        match: (path) =>
            path ===
            '/admin/users',

        title:
            'Data User',

        subtitle:
            'Kelola akun, role, dan hak akses pengguna.',

        icon:
            'bi-people-fill',
    },

    {
        match: (path) =>
            path ===
            '/admin/users/create',

        title:
            'Tambah User',

        subtitle:
            'Tambahkan akun dan atur hak aksesnya.',

        icon:
            'bi-person-plus-fill',
    },

    {
        match: (path) =>
            path.startsWith(
                '/admin/users/'
            ) &&
            path.endsWith('/edit'),

        title:
            'Edit User',

        subtitle:
            'Perbarui data, role, dan hak akses pengguna.',

        icon:
            'bi-pencil-square',
    },

    {
        match: (path) =>
            path ===
                '/admin/unauthorized' ||
            path ===
                '/user/unauthorized',

        title:
            'Akses Ditolak',

        subtitle:
            'Akun tidak memiliki izin membuka halaman ini.',

        icon:
            'bi-shield-lock-fill',
    },
];

export default function Topbar({
    sidebarOpen = false,
    setSidebarOpen = () => {},
    isSidebarOpen = false,
    setIsSidebarOpen = () => {},
}) {
    const location =
        useLocation();

    const navigate =
        useNavigate();

    const notificationRef =
        useRef(null);

    const [
        notificationOpen,
        setNotificationOpen,
    ] = useState(false);

    const [
        notificationLoading,
        setNotificationLoading,
    ] = useState(false);

    const [
        notifications,
        setNotifications,
    ] = useState([]);

    const currentUser =
        useMemo(
            () => getCurrentUser(),
            []
        );

    const role =
        currentUser?.role ||
        'user';

    const basePath =
        role === 'user'
            ? '/user'
            : '/admin';

    const canViewHistory =
        hasPermission(
            currentUser,
            'request.history.view'
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

    const pageMap =
        useMemo(
            () =>
                createPageMap(
                    basePath
                ),
            [basePath]
        );

    const pageInfo =
        useMemo(() => {
            const foundPage =
                pageMap.find(
                    (page) =>
                        page.match(
                            location.pathname
                        )
                );

            return (
                foundPage || {
                    title:
                        'Sistem Layanan',

                    subtitle:
                        'Kelola kebutuhan HUMAS dan SEKPiM.',

                    icon:
                        'bi-grid-fill',
                }
            );
        }, [
            pageMap,
            location.pathname,
        ]);

    const addUserNotifications =
        useCallback(
            (
                target,
                data,
                requestType
            ) => {
                const allowedStatuses = [
                    'approved',
                    'rejected',
                    'completed',
                    'borrowed',
                    'returned',
                ];

                data
                    .filter(
                        (item) =>
                            allowedStatuses.includes(
                                item.status
                            )
                    )
                    .forEach(
                        (item) => {
                            const statusInfo =
                                getStatusNotification(
                                    item.status,
                                    requestType,
                                    item
                                );

                            let description =
                                item.title ||
                                item.event_name ||
                                item.purpose ||
                                item.service_code ||
                                item.order_code ||
                                item.borrow_code ||
                                'Pengajuan';

                            if (
                                requestType ===
                                'humas'
                            ) {
                                description =
                                    getHumasDescription(
                                        item
                                    ) ||
                                    item.service_code ||
                                    'Request Liputan Humas';
                            }

                            let meta =
                                formatDateTime(
                                    item.updated_at ||
                                        item.created_at
                                );

                            if (
                                item.status ===
                                    'rejected' &&
                                item.admin_note
                            ) {
                                meta =
                                    item.admin_note;
                            }

                            if (
                                requestType ===
                                    'humas' &&
                                item.status ===
                                    'approved'
                            ) {
                                meta =
                                    'Request sedang diproses oleh tim Humas.';
                            }

                            if (
                                requestType ===
                                    'humas' &&
                                item.status ===
                                    'completed'
                            ) {
                                meta =
                                    item.result_link
                                        ? 'Klik untuk melihat hasil pekerjaan.'
                                        : 'Request telah selesai diproses.';
                            }

                            target.push({
                                id:
                                    `${requestType}-${item.id}-${item.status}`,

                                title:
                                    statusInfo.title,

                                description,

                                meta,

                                icon:
                                    statusInfo.icon,

                                color:
                                    statusInfo.color,

                                path:
                                    `${basePath}/my-requests/${requestType}/${item.id}/detail`,

                                sortDate:
                                    item.completed_at ||
                                    item.rejected_at ||
                                    item.approved_at ||
                                    item.updated_at ||
                                    item.created_at,
                            });
                        }
                    );
            },
            [basePath]
        );

    const fetchNotifications =
        useCallback(async () => {
            const token =
                localStorage.getItem(
                    'admin_token'
                );

            if (!token) {
                setNotifications([]);
                return;
            }

            try {
                setNotificationLoading(
                    true
                );

                const requests = [];
                const requestKeys = [];

                /*
                |--------------------------------------------------------------------------
                | Notifikasi riwayat pribadi
                |--------------------------------------------------------------------------
                */

                if (canViewHistory) {
                    requests.push(
                        api.get('/my-orders')
                    );

                    requestKeys.push(
                        'myOrders'
                    );

                    requests.push(
                        api.get(
                            '/my-humas-service-requests'
                        )
                    );

                    requestKeys.push(
                        'myHumas'
                    );

                    requests.push(
                        api.get(
                            '/my-borrow-requests'
                        )
                    );

                    requestKeys.push(
                        'myBorrowing'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Notifikasi approval
                |--------------------------------------------------------------------------
                */

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
                    setNotifications([]);
                    return;
                }

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
                            requestKeys[index];

                        if (
                            result.status ===
                            'fulfilled'
                        ) {
                            resultMap[key] =
                                extractResponseData(
                                    result.value
                                );

                            return;
                        }

                        resultMap[key] = [];

                        console.error(
                            `Fetch topbar notification ${key} error:`,
                            result.reason
                                ?.response
                                ?.data ||
                                result.reason
                        );
                    }
                );

                const nextNotifications = [];

                if (canViewHistory) {
                    addUserNotifications(
                        nextNotifications,
                        resultMap.myOrders ||
                            [],
                        'merchandise'
                    );

                    addUserNotifications(
                        nextNotifications,
                        resultMap.myHumas ||
                            [],
                        'humas'
                    );

                    addUserNotifications(
                        nextNotifications,
                        resultMap.myBorrowing ||
                            [],
                        'borrowing'
                    );
                }

                const orders =
                    resultMap.orders || [];

                const humasRequests =
                    resultMap.humas || [];

                const borrowRequests =
                    resultMap.borrowing || [];

                const products =
                    resultMap.products || [];

                orders
                    .filter(
                        (order) =>
                            order.status ===
                            'pending'
                    )
                    .forEach(
                        (order) => {
                            nextNotifications.push({
                                id:
                                    `order-pending-${order.id}`,

                                title:
                                    'Merchandise menunggu approval',

                                description:
                                    order.event_name ||
                                    order.order_code ||
                                    'Pengajuan merchandise',

                                meta:
                                    formatDateTime(
                                        order.submitted_at ||
                                            order.created_at
                                    ),

                                icon:
                                    'bi-gift-fill',

                                color:
                                    'primary',

                                path:
                                    `/admin/orders/${order.id}`,

                                sortDate:
                                    order.submitted_at ||
                                    order.created_at,
                            });
                        }
                    );

                humasRequests
                    .filter(
                        (request) =>
                            request.status ===
                            'pending'
                    )
                    .forEach(
                        (request) => {
                            const coverageConfig =
                                getCoverageConfig(
                                    request.coverage_type
                                );

                            nextNotifications.push({
                                id:
                                    `humas-pending-${request.id}`,

                                title:
                                    'Request Liputan Menunggu Approval',

                                description:
                                    getHumasDescription(
                                        request
                                    ) ||
                                    request.service_code ||
                                    'Request Liputan Humas',

                                meta:
                                    formatDateTime(
                                        request.submitted_at ||
                                            request.created_at
                                    ),

                                icon:
                                    coverageConfig.icon,

                                color:
                                    'danger',

                                path:
                                    `/admin/humas-services/${request.id}`,

                                sortDate:
                                    request.submitted_at ||
                                    request.created_at,
                            });
                        }
                    );

                borrowRequests
                    .filter(
                        (request) =>
                            request.status ===
                            'pending'
                    )
                    .forEach(
                        (request) => {
                            nextNotifications.push({
                                id:
                                    `borrowing-pending-${request.id}`,

                                title:
                                    'Peminjaman menunggu approval',

                                description:
                                    request.event_name ||
                                    request.purpose ||
                                    request.borrow_code ||
                                    'Pengajuan peminjaman',

                                meta:
                                    formatDateTime(
                                        request.submitted_at ||
                                            request.created_at
                                    ),

                                icon:
                                    'bi-box-seam-fill',

                                color:
                                    'success',

                                path:
                                    `/admin/borrow-requests/${request.id}`,

                                sortDate:
                                    request.submitted_at ||
                                    request.created_at,
                            });
                        }
                    );

                products
                    .filter(
                        (product) =>
                            Number(
                                product.stock ||
                                    0
                            ) <= 5
                    )
                    .forEach(
                        (product) => {
                            nextNotifications.push({
                                id:
                                    `stock-${product.id}`,

                                title:
                                    'Stok produk rendah',

                                description:
                                    product.name ||
                                    'Produk',

                                meta:
                                    `Stok tersisa ${Number(
                                        product.stock ||
                                            0
                                    )}`,

                                icon:
                                    'bi-boxes',

                                color:
                                    'danger',

                                path:
                                    '/admin/products',

                                sortDate:
                                    product.updated_at ||
                                    product.created_at,
                            });
                        }
                    );

                const uniqueNotifications =
                    Array.from(
                        new Map(
                            nextNotifications.map(
                                (notification) => [
                                    notification.id,
                                    notification,
                                ]
                            )
                        ).values()
                    );

                uniqueNotifications.sort(
                    (
                        firstNotification,
                        secondNotification
                    ) => {
                        const firstDate =
                            new Date(
                                firstNotification.sortDate ||
                                    0
                            ).getTime();

                        const secondDate =
                            new Date(
                                secondNotification.sortDate ||
                                    0
                            ).getTime();

                        return (
                            secondDate -
                            firstDate
                        );
                    }
                );

                setNotifications(
                    uniqueNotifications.slice(
                        0,
                        10
                    )
                );
            } catch (error) {
                console.error(
                    'Fetch topbar notification error:',
                    error?.response?.data ||
                        error
                );

                setNotifications([]);
            } finally {
                setNotificationLoading(
                    false
                );
            }
        }, [
            canViewHistory,
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
            canViewProducts,
            addUserNotifications,
        ]);

    useEffect(() => {
        fetchNotifications();
        setNotificationOpen(false);
    }, [
        fetchNotifications,
        location.pathname,
    ]);

    useEffect(() => {
        const intervalId =
            window.setInterval(
                fetchNotifications,
                30000
            );

        return () => {
            window.clearInterval(
                intervalId
            );
        };
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (
            event
        ) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(
                    event.target
                )
            ) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, []);

    const notificationCount =
        notifications.length;

    const openSidebar = () => {
        setSidebarOpen(true);
        setIsSidebarOpen(true);
    };

    const getNotificationFooterPath = () => {
        if (canViewHistory) {
            return `${basePath}/my-requests`;
        }

        if (
            canViewMerchandiseApproval
        ) {
            return '/admin/orders';
        }

        if (
            canViewHumasApproval
        ) {
            return '/admin/humas-services';
        }

        if (
            canViewBorrowingApproval
        ) {
            return '/admin/borrow-requests';
        }

        if (canViewProducts) {
            return '/admin/products';
        }

        return `${basePath}/dashboard`;
    };

    const handleLogout = async () => {
        const confirmation =
            await showConfirmAlert({
                title:
                    'Logout dari sistem?',

                text:
                    'Sesi login kamu akan diakhiri.',

                confirmButtonText:
                    'Ya, logout',

                icon:
                    'question',

                confirmButtonColor:
                    '#dc2626',
            });

        if (
            !confirmation.isConfirmed
        ) {
            return;
        }

        try {
            showLoadingAlert(
                'Logout',
                'Mengakhiri sesi login...'
            );

            await api.post(
                '/admin/logout'
            );

            closeAlert();

            localStorage.removeItem(
                'admin_token'
            );

            localStorage.removeItem(
                'admin_user'
            );

            await showSuccessAlert(
                'Logout Berhasil',
                'Kamu berhasil keluar dari sistem.'
            );

            navigate(
                '/login',
                {
                    replace: true,
                }
            );
        } catch (error) {
            console.error(
                'Logout error:',
                error?.response?.data ||
                    error
            );

            closeAlert();

            localStorage.removeItem(
                'admin_token'
            );

            localStorage.removeItem(
                'admin_user'
            );

            await showErrorAlert(
                'Logout Bermasalah',
                error?.response?.data
                    ?.message ||
                    'Sesi lokal sudah dihapus. Silakan login kembali.'
            );

            navigate(
                '/login',
                {
                    replace: true,
                }
            );
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    type="button"
                    className="btn btn-light rounded-circle d-lg-none topbar-menu-button"
                    onClick={openSidebar}
                    aria-label="Buka sidebar"
                >
                    <i className="bi bi-list fs-4" />
                </button>

                <div className="topbar-page-icon">
                    <i
                        className={`bi ${pageInfo.icon}`}
                    />
                </div>

                <div className="min-w-0">
                    <h1 className="topbar-title">
                        {pageInfo.title}
                    </h1>

                    <p className="topbar-subtitle">
                        {pageInfo.subtitle}
                    </p>
                </div>
            </div>

            <div className="topbar-right">
                <div
                    className="topbar-notification"
                    ref={notificationRef}
                >
                    <button
                        type="button"
                        className="topbar-notification-button"
                        onClick={() =>
                            setNotificationOpen(
                                (previousState) =>
                                    !previousState
                            )
                        }
                        aria-label="Buka notifikasi"
                    >
                        {notificationLoading ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <i className="bi bi-bell-fill" />
                        )}

                        {notificationCount >
                            0 && (
                            <span className="topbar-notification-count">
                                {notificationCount >
                                99
                                    ? '99+'
                                    : notificationCount}
                            </span>
                        )}
                    </button>

                    {notificationOpen && (
                        <div className="topbar-notification-panel">
                            <div className="topbar-notification-header">
                                <div>
                                    <div className="fw-black">
                                        Notifikasi
                                    </div>

                                    <div className="small text-muted">
                                        Diperbarui otomatis setiap 30 detik.
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                    onClick={
                                        fetchNotifications
                                    }
                                    disabled={
                                        notificationLoading
                                    }
                                >
                                    <i className="bi bi-arrow-clockwise me-1" />
                                    Refresh
                                </button>
                            </div>

                            {notifications.length ===
                            0 ? (
                                <div className="topbar-notification-empty">
                                    <i className="bi bi-check-circle-fill fs-2 text-success mb-2" />

                                    <div className="fw-bold">
                                        Tidak ada notifikasi
                                    </div>

                                    <div className="small text-muted">
                                        Semua informasi penting sudah diperiksa.
                                    </div>
                                </div>
                            ) : (
                                <div className="topbar-notification-list">
                                    {notifications.map(
                                        (
                                            notification
                                        ) => (
                                            <Link
                                                key={
                                                    notification.id
                                                }
                                                to={
                                                    notification.path
                                                }
                                                className="topbar-notification-item"
                                                onClick={() =>
                                                    setNotificationOpen(
                                                        false
                                                    )
                                                }
                                            >
                                                <div
                                                    className={`icon-box bg-${notification.color}-subtle text-${notification.color}`}
                                                >
                                                    <i
                                                        className={`bi ${notification.icon}`}
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="topbar-notification-title">
                                                        {
                                                            notification.title
                                                        }
                                                    </div>

                                                    <div className="topbar-notification-description text-truncate">
                                                        {
                                                            notification.description
                                                        }
                                                    </div>

                                                    <div className="topbar-notification-meta text-truncate">
                                                        {
                                                            notification.meta
                                                        }
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}

                            <div className="topbar-notification-footer">
                                <Link
                                    to={getNotificationFooterPath()}
                                    onClick={() =>
                                        setNotificationOpen(
                                            false
                                        )
                                    }
                                >
                                    Buka halaman terkait
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-user d-none d-md-flex">
                    <div className="profile-avatar bg-danger text-white">
                        {(
                            currentUser.name ||
                            'U'
                        )
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <div className="topbar-user-name text-truncate">
                            {currentUser.name ||
                                'Pengguna'}
                        </div>

                        <div className="topbar-user-role">
                            {getRoleLabel(
                                role
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-danger rounded-pill"
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right me-lg-2" />

                    <span className="d-none d-lg-inline">
                        Logout
                    </span>
                </button>
            </div>
        </header>
    );
}