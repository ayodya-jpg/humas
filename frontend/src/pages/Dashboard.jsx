import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    Navigate,
} from 'react-router-dom';

import api from '../api/axios';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
    normalizePermissions,
} from '../components/ProtectedRoute';

const EMPTY_DATA = {
    orders: [],
    humasRequests: [],
    borrowRequests: [],
    products: [],
    users: [],
};

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin Humas',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Super Admin',
};

const extractArray = (
    response
) => {
    const payload =
        response?.data?.data;

    if (Array.isArray(payload)) {
        return payload;
    }

    if (
        payload &&
        Array.isArray(
            payload.data
        )
    ) {
        return payload.data;
    }

    return [];
};

const formatDate = (
    date
) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date ===
            'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            date
        )
    ) {
        const [
            year,
            month,
            day,
        ] = date
            .split('-')
            .map(Number);

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }
        );
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate.toLocaleDateString(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }
    );
};

const formatDateTime = (
    date
) => {
    if (!date) {
        return '-';
    }

    const parsedDate =
        new Date(date);

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
            hour12: false,
        }
    );
};

const getRoleLabel = (
    role
) => {
    return (
        ROLE_LABELS[role] ||
        role ||
        'Pengguna'
    );
};

const getStatusLabel = (
    status
) => {
    const labels = {
        pending: 'Menunggu',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        completed: 'Selesai',
        borrowed: 'Dipinjam',
        returned: 'Dikembalikan',
    };

    return (
        labels[status] ||
        status ||
        '-'
    );
};

const getStatusClass = (
    status
) => {
    const classes = {
        pending:
            'text-bg-warning',

        approved:
            'text-bg-success',

        rejected:
            'text-bg-danger',

        completed:
            'text-bg-primary',

        borrowed:
            'text-bg-info',

        returned:
            'text-bg-secondary',
    };

    return (
        classes[status] ||
        'text-bg-secondary'
    );
};

const getCoverageLabel = (
    coverageType
) => {
    const labels = {
        'SOCIAL MEDIA':
            'Social Media',

        DOKUMENTASI:
            'Dokumentasi',

        'PUBLIKASI WEBSITE':
            'Publikasi Website',

        YOUTUBE:
            'YouTube',

        'VIDEO REELS':
            'Video Reels',
    };

    return (
        labels[coverageType] ||
        coverageType ||
        'Liputan Humas'
    );
};

export default function Dashboard() {
    const currentUser =
        getStoredUser();

    const role =
        currentUser?.role ||
        'user';

    const isUser =
        role ===
        'user';

    const basePath =
        isUser
            ? '/user'
            : '/admin';

    const defaultPath =
        getDefaultPath(
            currentUser
        );

    const canViewDashboard =
        hasPermission(
            currentUser,
            'dashboard.view'
        );

    const canCreateMerchandise =
        hasPermission(
            currentUser,
            'request.merchandise.create'
        );

    const canCreateHumas =
        hasPermission(
            currentUser,
            'request.humas.create'
        );

    const canCreateBorrowing =
        hasPermission(
            currentUser,
            'request.borrowing.create'
        );

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

    const canManageProducts =
        hasPermission(
            currentUser,
            'products.manage'
        );

    const canViewUsers =
        hasPermission(
            currentUser,
            [
                'users.view',
                'users.manage',
            ]
        );

    const [
        dashboardData,
        setDashboardData,
    ] = useState(
        EMPTY_DATA
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        endpointErrors,
        setEndpointErrors,
    ] = useState([]);

    const fetchDashboardData =
        useCallback(
            async (
                refresh = false
            ) => {
                if (
                    !canViewDashboard
                ) {
                    setDashboardData(
                        EMPTY_DATA
                    );

                    setLoading(false);
                    setRefreshing(false);

                    return;
                }

                if (refresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setEndpointErrors([]);

                try {
                    const requests =
                        [];

                    const requestKeys =
                        [];

                    if (
                        canViewHistory
                    ) {
                        requests.push(
                            api.get(
                                '/my-orders'
                            )
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

                    if (
                        canViewMerchandiseApproval
                    ) {
                        requests.push(
                            api.get(
                                '/orders'
                            )
                        );

                        requestKeys.push(
                            'approvalOrders'
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
                            'approvalHumas'
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
                            'approvalBorrowing'
                        );
                    }

                    if (
                        canViewProducts
                    ) {
                        requests.push(
                            api.get(
                                '/products'
                            )
                        );

                        requestKeys.push(
                            'products'
                        );
                    }

                    if (
                        canViewUsers
                    ) {
                        requests.push(
                            api.get(
                                '/admin/users'
                            )
                        );

                        requestKeys.push(
                            'users'
                        );
                    }

                    if (
                        requests.length ===
                        0
                    ) {
                        setDashboardData(
                            EMPTY_DATA
                        );

                        return;
                    }

                    const responses =
                        await Promise.allSettled(
                            requests
                        );

                    const resultMap =
                        {};

                    const errors = [];

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
                                    extractArray(
                                        result.value
                                    );

                                return;
                            }

                            resultMap[key] =
                                [];

                            errors.push({
                                key,

                                message:
                                    result.reason
                                        ?.response
                                        ?.data
                                        ?.message ||
                                    'Data tidak dapat dimuat.',
                            });

                            console.error(
                                `Fetch dashboard ${key} error:`,
                                result.reason
                                    ?.response
                                    ?.data ||
                                    result.reason
                            );
                        }
                    );

                    setDashboardData({
                        orders:
                            canViewMerchandiseApproval
                                ? resultMap
                                      .approvalOrders ||
                                  []
                                : resultMap
                                      .myOrders ||
                                  [],

                        humasRequests:
                            canViewHumasApproval
                                ? resultMap
                                      .approvalHumas ||
                                  []
                                : resultMap
                                      .myHumas ||
                                  [],

                        borrowRequests:
                            canViewBorrowingApproval
                                ? resultMap
                                      .approvalBorrowing ||
                                  []
                                : resultMap
                                      .myBorrowing ||
                                  [],

                        products:
                            resultMap.products ||
                            [],

                        users:
                            resultMap.users ||
                            [],
                    });

                    setEndpointErrors(
                        errors
                    );
                } catch (error) {
                    console.error(
                        'Fetch dashboard error:',
                        error?.response
                            ?.data ||
                            error
                    );

                    setDashboardData(
                        EMPTY_DATA
                    );

                    setEndpointErrors([
                        {
                            key:
                                'dashboard',

                            message:
                                error?.response
                                    ?.data
                                    ?.message ||
                                'Data dashboard gagal dimuat.',
                        },
                    ]);
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [
                canViewDashboard,
                canViewHistory,
                canViewMerchandiseApproval,
                canViewHumasApproval,
                canViewBorrowingApproval,
                canViewProducts,
                canViewUsers,
            ]
        );

    useEffect(() => {
        fetchDashboardData();
    }, [
        fetchDashboardData,
    ]);

    const {
        orders,
        humasRequests,
        borrowRequests,
        products,
        users,
    } = dashboardData;

    const histories =
        useMemo(() => {
            const merchandise =
                orders.map(
                    (item) => ({
                        ...item,

                        type:
                            'merchandise',

                        typeLabel:
                            'Merchandise',

                        icon:
                            'bi-gift-fill',

                        color:
                            'primary',

                        code:
                            item.order_code ||
                            `MER-${item.id}`,

                        title:
                            item.event_name ||
                            item.activity_name ||
                            'Pengajuan Merchandise',

                        requester:
                            item.user?.name ||
                            item.applicant_name ||
                            currentUser?.name ||
                            '-',

                        mainDate:
                            item.activity_date ||
                            item.created_at,

                        submittedDate:
                            item.submitted_at ||
                            item.created_at,

                        detailUrl:
                            canViewMerchandiseApproval
                                ? `/admin/orders/${item.id}`
                                : `${basePath}/my-requests/merchandise/${item.id}/detail`,
                    })
                );

            const humas =
                humasRequests.map(
                    (item) => ({
                        ...item,

                        type:
                            'humas',

                        typeLabel:
                            'Liputan Humas',

                        icon:
                            'bi-camera-reels-fill',

                        color:
                            'danger',

                        code:
                            item.service_code ||
                            `HMS-${item.id}`,

                        title:
                            getCoverageLabel(
                                item.coverage_type
                            ),

                        requester:
                            item.user?.name ||
                            item.applicant_name ||
                            currentUser?.name ||
                            '-',

                        mainDate:
                            item.event_date ||
                            item.created_at,

                        submittedDate:
                            item.submitted_at ||
                            item.created_at,

                        detailUrl:
                            canViewHumasApproval
                                ? `/admin/humas-services/${item.id}`
                                : `${basePath}/my-requests/humas/${item.id}/detail`,
                    })
                );

            const borrowing =
                borrowRequests.map(
                    (item) => ({
                        ...item,

                        type:
                            'borrowing',

                        typeLabel:
                            'Peminjaman',

                        icon:
                            'bi-box-seam-fill',

                        color:
                            'success',

                        code:
                            item.borrow_code ||
                            `BRW-${item.id}`,

                        title:
                            item.event_name ||
                            item.purpose ||
                            'Peminjaman SEKPiM',

                        requester:
                            item.user?.name ||
                            item.applicant_name ||
                            currentUser?.name ||
                            '-',

                        mainDate:
                            item.borrow_date ||
                            item.borrow_at ||
                            item.created_at,

                        submittedDate:
                            item.submitted_at ||
                            item.created_at,

                        detailUrl:
                            canViewBorrowingApproval
                                ? `/admin/borrow-requests/${item.id}`
                                : `${basePath}/my-requests/borrowing/${item.id}/detail`,
                    })
                );

            return [
                ...merchandise,
                ...humas,
                ...borrowing,
            ].sort(
                (
                    first,
                    second
                ) =>
                    new Date(
                        second.submittedDate ||
                            0
                    ).getTime() -
                    new Date(
                        first.submittedDate ||
                            0
                    ).getTime()
            );
        }, [
            orders,
            humasRequests,
            borrowRequests,
            currentUser?.name,
            basePath,
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
        ]);

    const summary =
        useMemo(
            () => ({
                total:
                    histories.length,

                pending:
                    histories.filter(
                        (item) =>
                            item.status ===
                            'pending'
                    ).length,

                approved:
                    histories.filter(
                        (item) =>
                            item.status ===
                            'approved'
                    ).length,

                completed:
                    histories.filter(
                        (item) =>
                            [
                                'completed',
                                'returned',
                            ].includes(
                                item.status
                            )
                    ).length,

                lowStock:
                    products.filter(
                        (item) =>
                            Number(
                                item.stock ||
                                    0
                            ) <= 5
                    ).length,

                users:
                    users.length,
            }),
            [
                histories,
                products,
                users,
            ]
        );

    const recentHistories =
        histories.slice(
            0,
            6
        );

    const lowStockProducts =
        useMemo(
            () =>
                products
                    .filter(
                        (item) =>
                            Number(
                                item.stock ||
                                    0
                            ) <= 5
                    )
                    .sort(
                        (
                            first,
                            second
                        ) =>
                            Number(
                                first.stock ||
                                    0
                            ) -
                            Number(
                                second.stock ||
                                    0
                            )
                    )
                    .slice(
                        0,
                        6
                    ),
            [products]
        );

    const quickActions =
        useMemo(() => {
            const actions = [];

            if (
                canCreateMerchandise
            ) {
                actions.push({
                    title:
                        'Ajukan Merchandise',

                    description:
                        'Buat pengajuan paket merchandise.',

                    icon:
                        'bi-cart-plus-fill',

                    color:
                        'primary',

                    path:
                        `${basePath}/request/merchandise`,
                });
            }

            if (
                canCreateHumas
            ) {
                actions.push({
                    title:
                        'Request Liputan Humas',

                    description:
                        'Ajukan kebutuhan liputan dan publikasi.',

                    icon:
                        'bi-camera-reels-fill',

                    color:
                        'danger',

                    path:
                        `${basePath}/request/humas-service`,
                });
            }

            if (
                canCreateBorrowing
            ) {
                actions.push({
                    title:
                        'Peminjaman SEKPiM',

                    description:
                        'Ajukan peminjaman perlengkapan.',

                    icon:
                        'bi-box-seam-fill',

                    color:
                        'success',

                    path:
                        `${basePath}/request/sekpim-borrowing`,
                });
            }

            if (
                canViewHistory
            ) {
                actions.push({
                    title:
                        'Riwayat Pengajuan',

                    description:
                        'Pantau pengajuan pribadi.',

                    icon:
                        'bi-clock-history',

                    color:
                        'info',

                    path:
                        `${basePath}/my-requests`,
                });
            }

            if (
                canViewMerchandiseApproval
            ) {
                actions.push({
                    title:
                        'Approval Merchandise',

                    description:
                        'Periksa pengajuan merchandise.',

                    icon:
                        'bi-gift-fill',

                    color:
                        'primary',

                    path:
                        '/admin/orders',
                });
            }

            if (
                canViewHumasApproval
            ) {
                actions.push({
                    title:
                        'Approval Liputan',

                    description:
                        'Periksa request liputan Humas.',

                    icon:
                        'bi-camera-reels-fill',

                    color:
                        'danger',

                    path:
                        '/admin/humas-services',
                });
            }

            if (
                canViewBorrowingApproval
            ) {
                actions.push({
                    title:
                        'Approval Peminjaman',

                    description:
                        'Periksa peminjaman SEKPiM.',

                    icon:
                        'bi-clipboard-check-fill',

                    color:
                        'success',

                    path:
                        '/admin/borrow-requests',
                });
            }

            if (
                canViewProducts
            ) {
                actions.push({
                    title:
                        'Data Produk',

                    description:
                        canManageProducts
                            ? 'Kelola produk dan stok.'
                            : 'Lihat produk dan stok.',

                    icon:
                        'bi-boxes',

                    color:
                        'warning',

                    path:
                        '/admin/products',
                });
            }

            if (
                canViewUsers
            ) {
                actions.push({
                    title:
                        'Data User',

                    description:
                        role ===
                        'superadmin'
                            ? 'Kelola akun dan hak akses.'
                            : 'Lihat daftar akun.',

                    icon:
                        'bi-people-fill',

                    color:
                        'dark',

                    path:
                        '/admin/users',
                });
            }

            return actions.slice(
                0,
                8
            );
        }, [
            basePath,
            role,
            canCreateMerchandise,
            canCreateHumas,
            canCreateBorrowing,
            canViewHistory,
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
            canViewProducts,
            canManageProducts,
            canViewUsers,
        ]);

    if (
        !canViewDashboard
    ) {
        return (
            <Navigate
                to={
                    defaultPath
                }
                replace
            />
        );
    }

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat dashboard
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Dashboard HUMAS &amp; SEKPiM
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Halo,{' '}
                                {currentUser?.name ||
                                    'Pengguna'}
                                .
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth:
                                        780,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Pantau pengajuan,
                                layanan Humas,
                                peminjaman SEKPiM,
                                dan menu administrasi
                                sesuai hak akses akun.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="profile-avatar bg-white text-danger">
                                        {(
                                            currentUser?.name ||
                                            'U'
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="fw-black fs-5 text-truncate">
                                            {currentUser?.name ||
                                                'Pengguna'}
                                        </div>

                                        <div className="text-white-50">
                                            {getRoleLabel(
                                                role
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-white border-opacity-25" />

                                <div className="small text-white-50">
                                    {
                                        normalizePermissions(
                                            currentUser?.permissions
                                        ).length
                                    }{' '}
                                    hak akses aktif.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {endpointErrors.length >
                0 && (
                <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex flex-wrap align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div className="flex-grow-1">
                            <div className="fw-black mb-1">
                                Sebagian data belum dapat dimuat
                            </div>

                            <div className="small">
                                Dashboard tetap menampilkan data yang berhasil diterima.
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-warning rounded-pill"
                            onClick={() =>
                                fetchDashboardData(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                        >
                            <i className="bi bi-arrow-clockwise me-1" />
                            Coba Lagi
                        </button>
                    </div>
                </div>
            )}

            <div className="row g-4 mb-4">
                {[
                    {
                        title:
                            'Total Pengajuan',

                        value:
                            summary.total,

                        icon:
                            'bi-files',

                        color:
                            'primary',
                    },

                    {
                        title:
                            'Menunggu',

                        value:
                            summary.pending,

                        icon:
                            'bi-hourglass-split',

                        color:
                            'warning',
                    },

                    {
                        title:
                            'Disetujui',

                        value:
                            summary.approved,

                        icon:
                            'bi-check-circle-fill',

                        color:
                            'success',
                    },

                    {
                        title:
                            canViewProducts
                                ? 'Stok Rendah'
                                : 'Selesai',

                        value:
                            canViewProducts
                                ? summary.lowStock
                                : summary.completed,

                        icon:
                            canViewProducts
                                ? 'bi-boxes'
                                : 'bi-check2-all',

                        color:
                            'danger',
                    },
                ].map(
                    (card) => (
                        <div
                            className="col-md-6 col-xl-3"
                            key={
                                card.title
                            }
                        >
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start justify-content-between gap-3">
                                        <div>
                                            <div className="text-muted fw-bold small mb-2">
                                                {
                                                    card.title
                                                }
                                            </div>

                                            <div className="display-6 fw-black">
                                                {
                                                    card.value
                                                }
                                            </div>
                                        </div>

                                        <div
                                            className={`icon-box bg-${card.color}-subtle text-${card.color}`}
                                        >
                                            <i
                                                className={`bi ${card.icon} fs-4`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Aktivitas Terbaru
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Data terbaru yang dapat dilihat akun ini.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={() =>
                                        fetchDashboardData(
                                            true
                                        )
                                    }
                                    disabled={
                                        refreshing
                                    }
                                >
                                    {refreshing ? (
                                        <span className="spinner-border spinner-border-sm" />
                                    ) : (
                                        <i className="bi bi-arrow-clockwise" />
                                    )}
                                </button>
                            </div>

                            {recentHistories.length ===
                            0 ? (
                                <div className="p-5 rounded-5 bg-light text-center">
                                    <i className="bi bi-inbox fs-1 text-muted" />

                                    <h5 className="fw-black mt-3 mb-2">
                                        Belum ada aktivitas
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Aktivitas akan muncul setelah terdapat pengajuan.
                                    </p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {recentHistories.map(
                                        (item) => (
                                            <div
                                                key={`${item.type}-${item.id}`}
                                                className="p-3 rounded-4 border"
                                            >
                                                <div className="row g-3 align-items-center">
                                                    <div className="col-lg-6">
                                                        <div className="d-flex align-items-start gap-3">
                                                            <div
                                                                className={`icon-box bg-${item.color}-subtle text-${item.color}`}
                                                            >
                                                                <i
                                                                    className={`bi ${item.icon}`}
                                                                />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="d-flex flex-wrap gap-2 mb-2">
                                                                    <span
                                                                        className={`badge rounded-pill bg-${item.color}-subtle text-${item.color}`}
                                                                    >
                                                                        {
                                                                            item.typeLabel
                                                                        }
                                                                    </span>

                                                                    <span
                                                                        className={`badge rounded-pill ${getStatusClass(
                                                                            item.status
                                                                        )}`}
                                                                    >
                                                                        {getStatusLabel(
                                                                            item.status
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="fw-black text-truncate">
                                                                    {
                                                                        item.title
                                                                    }
                                                                </div>

                                                                <div className="small text-muted text-truncate">
                                                                    {
                                                                        item.code
                                                                    }{' '}
                                                                    •{' '}
                                                                    {
                                                                        item.requester
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-6 col-lg-3">
                                                        <div className="small text-muted">
                                                            Tanggal
                                                        </div>

                                                        <div className="fw-bold">
                                                            {formatDate(
                                                                item.mainDate
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-6 col-lg-3 text-lg-end">
                                                        <div className="small text-muted mb-2">
                                                            {formatDateTime(
                                                                item.submittedDate
                                                            )}
                                                        </div>

                                                        <Link
                                                            to={
                                                                item.detailUrl
                                                            }
                                                            className={`btn btn-sm rounded-pill btn-${item.color}`}
                                                        >
                                                            Detail
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Akses Cepat
                            </h4>

                            <p className="text-muted mb-4">
                                Menu sesuai hak akses akun.
                            </p>

                            {quickActions.length ===
                            0 ? (
                                <div className="alert alert-warning border-0 rounded-4 mb-0">
                                    Akun belum memiliki menu tambahan.
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {quickActions.map(
                                        (action) => (
                                            <Link
                                                key={`${action.title}-${action.path}`}
                                                to={
                                                    action.path
                                                }
                                                className="text-decoration-none"
                                            >
                                                <div className="p-3 rounded-4 border action-card">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className={`icon-box bg-${action.color}-subtle text-${action.color}`}
                                                        >
                                                            <i
                                                                className={`bi ${action.icon}`}
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="fw-black text-dark">
                                                                {
                                                                    action.title
                                                                }
                                                            </div>

                                                            <div className="small text-muted">
                                                                {
                                                                    action.description
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {canViewProducts && (
                <section className="card border-0 shadow-sm rounded-5 mt-4">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h4 className="fw-black mb-1">
                                    Stok Rendah
                                </h4>

                                <p className="text-muted mb-0">
                                    Produk dengan stok lima atau kurang.
                                </p>
                            </div>

                            <Link
                                to="/admin/products"
                                className="btn btn-outline-warning rounded-pill"
                            >
                                {canManageProducts
                                    ? 'Kelola Produk'
                                    : 'Lihat Produk'}
                            </Link>
                        </div>

                        {lowStockProducts.length ===
                        0 ? (
                            <div className="p-4 rounded-4 bg-light text-center">
                                <i className="bi bi-check-circle-fill fs-1 text-success" />

                                <p className="text-muted mt-2 mb-0">
                                    Tidak ada produk dengan stok rendah.
                                </p>
                            </div>
                        ) : (
                            <div className="row g-3">
                                {lowStockProducts.map(
                                    (product) => (
                                        <div
                                            className="col-md-6 col-xl-4"
                                            key={
                                                product.id
                                            }
                                        >
                                            <div className="p-3 rounded-4 border h-100">
                                                <div className="fw-black text-truncate">
                                                    {product.name ||
                                                        'Produk'}
                                                </div>

                                                <div className="small text-muted text-truncate mb-3">
                                                    {product.category
                                                        ?.name ||
                                                        '-'}
                                                </div>

                                                <span className="badge rounded-pill text-bg-warning">
                                                    Stok{' '}
                                                    {Number(
                                                        product.stock ||
                                                            0
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {canViewUsers && (
                <div className="alert alert-light border shadow-sm rounded-4 mt-4 mb-0">
                    <i className="bi bi-people-fill me-2 text-danger" />

                    Total akun yang dapat dilihat:{' '}

                    <strong>
                        {summary.users}
                    </strong>
                </div>
            )}
        </div>
    );
}