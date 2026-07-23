import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import api from '../api/axios';

const EMPTY_DATA = {
    orders: [],
    humasRequests: [],
    borrowRequests: [],
    products: [],
    users: [],
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

    const permissions =
        normalizePermissions(
            currentUser?.permissions
        );

    return permissions.includes(
        permission
    );
};

const extractArray = (response) => {
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

const formatDate = (date) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        const [
            year,
            month,
            day,
        ] = date
            .split('-')
            .map(Number);

        const parsedDate = new Date(
            year,
            month - 1,
            day
        );

        return parsedDate.toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }
        );
    }

    const parsedDate = new Date(date);

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

const getStatusLabel = (status) => {
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

const getStatusClass = (status) => {
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
        useMemo(
            () => getCurrentUser(),
            []
        );

    const role =
        currentUser?.role ||
        'user';

    const isUser =
        role === 'user';

    const basePath =
        isUser
            ? '/user'
            : '/admin';

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
            'users.view'
        );

    const canManageUsers =
        hasPermission(
            currentUser,
            'users.manage'
        );

    const [
        dashboardData,
        setDashboardData,
    ] = useState(EMPTY_DATA);

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
                isRefresh = false
            ) => {
                if (!canViewDashboard) {
                    setDashboardData(
                        EMPTY_DATA
                    );

                    setLoading(false);
                    setRefreshing(false);

                    return;
                }

                try {
                    if (isRefresh) {
                        setRefreshing(true);
                    } else {
                        setLoading(true);
                    }

                    setEndpointErrors([]);

                    const requests = [];
                    const requestKeys = [];

                    /*
                    |--------------------------------------------------------------------------
                    | Pengajuan pribadi
                    |--------------------------------------------------------------------------
                    */

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

                    /*
                    |--------------------------------------------------------------------------
                    | Data approval
                    |--------------------------------------------------------------------------
                    */

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

                    /*
                    |--------------------------------------------------------------------------
                    | Master data
                    |--------------------------------------------------------------------------
                    */

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

                    const resultMap = {};
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

                            const message =
                                result.reason
                                    ?.response
                                    ?.data
                                    ?.message ||
                                'Data tidak dapat dimuat.';

                            errors.push({
                                key,
                                message,
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

                    /*
                    |--------------------------------------------------------------------------
                    | Prioritaskan data approval ketika user mempunyai akses approval.
                    | Jika tidak, gunakan riwayat pengajuan pribadi.
                    |--------------------------------------------------------------------------
                    */

                    const orders =
                        canViewMerchandiseApproval
                            ? resultMap
                                  .approvalOrders ||
                              []
                            : resultMap
                                  .myOrders ||
                              [];

                    const humasRequests =
                        canViewHumasApproval
                            ? resultMap
                                  .approvalHumas ||
                              []
                            : resultMap
                                  .myHumas ||
                              [];

                    const borrowRequests =
                        canViewBorrowingApproval
                            ? resultMap
                                  .approvalBorrowing ||
                              []
                            : resultMap
                                  .myBorrowing ||
                              [];

                    setDashboardData({
                        orders,
                        humasRequests,
                        borrowRequests,

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
                                error
                                    ?.response
                                    ?.data
                                    ?.message ||
                                'Data dashboard gagal dimuat dari server.',
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
    }, [fetchDashboardData]);

    const {
        orders,
        humasRequests,
        borrowRequests,
        products,
        users,
    } = dashboardData;

    const histories =
        useMemo(() => {
            const merchandiseHistories =
                orders.map(
                    (order) => ({
                        ...order,

                        history_type:
                            'merchandise',

                        history_label:
                            'Merchandise',

                        history_icon:
                            'bi-gift-fill',

                        history_color:
                            'primary',

                        code:
                            order.order_code ||
                            `MER-${order.id}`,

                        title:
                            order.event_name ||
                            order.activity_name ||
                            'Pengajuan Merchandise',

                        subtitle:
                            order.institution_name ||
                            order.requester_unit ||
                            '-',

                        requester:
                            order.user
                                ?.name ||
                            order
                                .applicant_name ||
                            currentUser.name ||
                            '-',

                        main_date:
                            order.activity_date ||
                            order.created_at,

                        submitted_date:
                            order.submitted_at ||
                            order.created_at,

                        detail_url:
                            canViewMerchandiseApproval
                                ? `/admin/orders/${order.id}`
                                : `${basePath}/my-requests/merchandise/${order.id}/detail`,
                    })
                );

            const humasHistories =
                humasRequests.map(
                    (request) => ({
                        ...request,

                        history_type:
                            'humas',

                        history_label:
                            'Liputan Humas',

                        history_icon:
                            'bi-camera-reels-fill',

                        history_color:
                            'danger',

                        code:
                            request.service_code ||
                            `HMS-${request.id}`,

                        title:
                            getCoverageLabel(
                                request.coverage_type
                            ),

                        subtitle:
                            request.event_location ||
                            request.activity_detail ||
                            '-',

                        requester:
                            request.user
                                ?.name ||
                            request
                                .applicant_name ||
                            currentUser.name ||
                            '-',

                        main_date:
                            request.event_date ||
                            request.created_at,

                        submitted_date:
                            request.submitted_at ||
                            request.created_at,

                        detail_url:
                            canViewHumasApproval
                                ? `/admin/humas-services/${request.id}`
                                : `${basePath}/my-requests/humas/${request.id}/detail`,
                    })
                );

            const borrowingHistories =
                borrowRequests.map(
                    (request) => ({
                        ...request,

                        history_type:
                            'borrowing',

                        history_label:
                            'Peminjaman',

                        history_icon:
                            'bi-box-seam-fill',

                        history_color:
                            'success',

                        code:
                            request.borrow_code ||
                            `BRW-${request.id}`,

                        title:
                            request.event_name ||
                            request.purpose ||
                            'Peminjaman SEKPiM',

                        subtitle: [
                            formatDate(
                                request.borrow_date ||
                                    request.borrow_at
                            ),

                            formatDate(
                                request.return_date ||
                                    request.return_at
                            ),
                        ].join(' - '),

                        requester:
                            request.user
                                ?.name ||
                            request
                                .applicant_name ||
                            currentUser.name ||
                            '-',

                        main_date:
                            request.borrow_date ||
                            request.borrow_at ||
                            request.created_at,

                        submitted_date:
                            request.submitted_at ||
                            request.created_at,

                        detail_url:
                            canViewBorrowingApproval
                                ? `/admin/borrow-requests/${request.id}`
                                : `${basePath}/my-requests/borrowing/${request.id}/detail`,
                    })
                );

            return [
                ...merchandiseHistories,
                ...humasHistories,
                ...borrowingHistories,
            ].sort(
                (
                    firstItem,
                    secondItem
                ) => {
                    const firstDate =
                        new Date(
                            firstItem.submitted_date ||
                                firstItem.created_at ||
                                0
                        ).getTime();

                    const secondDate =
                        new Date(
                            secondItem.submitted_date ||
                                secondItem.created_at ||
                                0
                        ).getTime();

                    return (
                        secondDate -
                        firstDate
                    );
                }
            );
        }, [
            orders,
            humasRequests,
            borrowRequests,
            currentUser.name,
            basePath,
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
        ]);

    const summary =
        useMemo(() => {
            return {
                totalRequests:
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

                rejected:
                    histories.filter(
                        (item) =>
                            item.status ===
                            'rejected'
                    ).length,

                merchandise:
                    histories.filter(
                        (item) =>
                            item.history_type ===
                            'merchandise'
                    ).length,

                humas:
                    histories.filter(
                        (item) =>
                            item.history_type ===
                            'humas'
                    ).length,

                borrowing:
                    histories.filter(
                        (item) =>
                            item.history_type ===
                            'borrowing'
                    ).length,

                productTotal:
                    products.length,

                lowStock:
                    products.filter(
                        (product) =>
                            Number(
                                product.stock ||
                                    0
                            ) <= 5
                    ).length,

                activeProducts:
                    products.filter(
                        (product) =>
                            product.status ===
                            'active'
                    ).length,

                userTotal:
                    users.length,
            };
        }, [
            histories,
            products,
            users,
        ]);

    const recentHistories =
        useMemo(
            () =>
                histories.slice(
                    0,
                    6
                ),
            [histories]
        );

    const lowStockProducts =
        useMemo(() => {
            return products
                .filter(
                    (product) =>
                        Number(
                            product.stock ||
                                0
                        ) <= 5
                )
                .sort(
                    (
                        firstProduct,
                        secondProduct
                    ) =>
                        Number(
                            firstProduct.stock ||
                                0
                        ) -
                        Number(
                            secondProduct.stock ||
                                0
                        )
                )
                .slice(
                    0,
                    6
                );
        }, [products]);

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

                    url:
                        `${basePath}/request/merchandise`,
                });
            }

            if (canCreateHumas) {
                actions.push({
                    title:
                        'Request Liputan Humas',

                    description:
                        'Ajukan kebutuhan liputan dan publikasi.',

                    icon:
                        'bi-camera-reels-fill',

                    color:
                        'danger',

                    url:
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

                    url:
                        `${basePath}/request/sekpim-borrowing`,
                });
            }

            if (canViewHistory) {
                actions.push({
                    title:
                        'Riwayat Saya',

                    description:
                        'Pantau seluruh pengajuan pribadi.',

                    icon:
                        'bi-clock-history',

                    color:
                        'info',

                    url:
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

                    url:
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

                    url:
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

                    url:
                        '/admin/borrow-requests',
                });
            }

            if (canViewProducts) {
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

                    url:
                        '/admin/products',
                });
            }

            if (canViewUsers) {
                actions.push({
                    title:
                        'Manajemen User',

                    description:
                        canManageUsers
                            ? 'Kelola akun dan hak akses.'
                            : 'Lihat daftar akun.',

                    icon:
                        'bi-people-fill',

                    color:
                        'dark',

                    url:
                        '/admin/users',
                });
            }

            return actions.slice(
                0,
                8
            );
        }, [
            basePath,
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
            canManageUsers,
        ]);

    const activityListPath =
        useMemo(() => {
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

            if (canViewHistory) {
                return `${basePath}/my-requests`;
            }

            return `${basePath}/dashboard`;
        }, [
            basePath,
            canViewMerchandiseApproval,
            canViewHumasApproval,
            canViewBorrowingApproval,
            canViewHistory,
        ]);

    const showAdministrativeSummary =
        canViewMerchandiseApproval ||
        canViewHumasApproval ||
        canViewBorrowingApproval ||
        canViewProducts ||
        canViewUsers;

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
                                Dashboard HUMAS & SEKPiM
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Halo,{' '}
                                {currentUser.name ||
                                    'Pengguna'}
                                .
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 780,
                                    lineHeight: 1.8,
                                }}
                            >
                                Pantau pengajuan, layanan
                                Humas, peminjaman SEKPiM,
                                dan menu administrasi sesuai
                                hak akses akun kamu.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="profile-avatar bg-white text-danger">
                                        {(
                                            currentUser.name ||
                                            'U'
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="fw-black fs-5 text-truncate">
                                            {currentUser.name ||
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
                                            currentUser.permissions
                                        ).length
                                    }{' '}
                                    hak akses aktif.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {endpointErrors.length > 0 && (
                <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div className="flex-grow-1">
                            <div className="fw-black mb-1">
                                Sebagian data belum dapat dimuat
                            </div>

                            <div className="small mb-2">
                                Dashboard tetap ditampilkan menggunakan data yang berhasil diambil.
                            </div>

                            <ul className="small mb-0 ps-3">
                                {endpointErrors.map(
                                    (
                                        error,
                                        index
                                    ) => (
                                        <li
                                            key={`${error.key}-${index}`}
                                        >
                                            {error.message}
                                        </li>
                                    )
                                )}
                            </ul>
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
                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Total Pengajuan
                                    </div>

                                    <div className="display-6 fw-black">
                                        {
                                            summary.totalRequests
                                        }
                                    </div>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-files fs-4" />
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Seluruh layanan yang dapat dilihat.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Menunggu
                                    </div>

                                    <div className="display-6 fw-black">
                                        {summary.pending}
                                    </div>
                                </div>

                                <div className="icon-box bg-warning-subtle text-warning">
                                    <i className="bi bi-hourglass-split fs-4" />
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Pengajuan berstatus pending.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        Disetujui
                                    </div>

                                    <div className="display-6 fw-black">
                                        {summary.approved}
                                    </div>
                                </div>

                                <div className="icon-box bg-success-subtle text-success">
                                    <i className="bi bi-check-circle-fill fs-4" />
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                Pengajuan yang telah disetujui.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div>
                                    <div className="text-muted fw-bold small mb-2">
                                        {canViewProducts
                                            ? 'Stok Rendah'
                                            : 'Selesai'}
                                    </div>

                                    <div className="display-6 fw-black">
                                        {canViewProducts
                                            ? summary.lowStock
                                            : summary.completed}
                                    </div>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i
                                        className={`bi ${
                                            canViewProducts
                                                ? 'bi-boxes'
                                                : 'bi-check2-all'
                                        } fs-4`}
                                    />
                                </div>
                            </div>

                            <p className="text-muted mb-0 mt-3">
                                {canViewProducts
                                    ? 'Produk dengan stok lima atau kurang.'
                                    : 'Pengajuan yang telah selesai.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Aktivitas Terbaru
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Pengajuan terbaru yang dapat dilihat akun ini.
                                    </p>
                                </div>

                                <div className="d-flex gap-2">
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

                                    <Link
                                        to={
                                            activityListPath
                                        }
                                        className="btn btn-outline-danger rounded-pill"
                                    >
                                        Lihat Semua
                                    </Link>
                                </div>
                            </div>

                            {recentHistories.length ===
                            0 ? (
                                <div className="p-5 rounded-5 bg-light text-center">
                                    <i className="bi bi-inbox fs-1 text-muted" />

                                    <h5 className="fw-black mt-3 mb-2">
                                        Belum ada aktivitas
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Data pengajuan akan muncul setelah ada aktivitas.
                                    </p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {recentHistories.map(
                                        (item) => (
                                            <div
                                                key={`${item.history_type}-${item.id}`}
                                                className="p-3 rounded-4 border"
                                            >
                                                <div className="row g-3 align-items-center">
                                                    <div className="col-lg-6">
                                                        <div className="d-flex align-items-start gap-3">
                                                            <div
                                                                className={`icon-box bg-${item.history_color}-subtle text-${item.history_color}`}
                                                            >
                                                                <i
                                                                    className={`bi ${item.history_icon} fs-5`}
                                                                />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="d-flex flex-wrap gap-2 mb-2">
                                                                    <span
                                                                        className={`badge rounded-pill bg-${item.history_color}-subtle text-${item.history_color}`}
                                                                    >
                                                                        {
                                                                            item.history_label
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
                                                                    {item.title ||
                                                                        '-'}
                                                                </div>

                                                                <div className="text-muted small text-truncate">
                                                                    {item.code ||
                                                                        '-'}{' '}
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
                                                            Tanggal utama
                                                        </div>

                                                        <div className="fw-bold">
                                                            {formatDate(
                                                                item.main_date
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-6 col-lg-3 text-lg-end">
                                                        <div className="small text-muted mb-2">
                                                            {formatDateTime(
                                                                item.submitted_date
                                                            )}
                                                        </div>

                                                        <Link
                                                            to={
                                                                item.detail_url
                                                            }
                                                            className={`btn btn-sm rounded-pill btn-${item.history_color}`}
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
                                Menu sesuai permission akun.
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
                                                key={`${action.title}-${action.url}`}
                                                to={
                                                    action.url
                                                }
                                                className="text-decoration-none"
                                            >
                                                <div className="p-3 rounded-4 border action-card">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className={`icon-box bg-${action.color}-subtle text-${action.color}`}
                                                        >
                                                            <i
                                                                className={`bi ${action.icon} fs-5`}
                                                            />
                                                        </div>

                                                        <div>
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

            {showAdministrativeSummary && (
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="mb-4">
                                    <h4 className="fw-black mb-1">
                                        Ringkasan Layanan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Komposisi pengajuan berdasarkan jenis layanan.
                                    </p>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <div className="p-4 rounded-5 bg-primary-subtle h-100">
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div>
                                                    <div className="text-primary fw-bold mb-1">
                                                        Merchandise
                                                    </div>

                                                    <div className="display-6 fw-black">
                                                        {
                                                            summary.merchandise
                                                        }
                                                    </div>
                                                </div>

                                                <i className="bi bi-gift-fill fs-1 text-primary" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <div className="p-4 rounded-5 bg-danger-subtle h-100">
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div>
                                                    <div className="text-danger fw-bold mb-1">
                                                        Liputan Humas
                                                    </div>

                                                    <div className="display-6 fw-black">
                                                        {
                                                            summary.humas
                                                        }
                                                    </div>
                                                </div>

                                                <i className="bi bi-camera-reels-fill fs-1 text-danger" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <div className="p-4 rounded-5 bg-success-subtle h-100">
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div>
                                                    <div className="text-success fw-bold mb-1">
                                                        Peminjaman
                                                    </div>

                                                    <div className="display-6 fw-black">
                                                        {
                                                            summary.borrowing
                                                        }
                                                    </div>
                                                </div>

                                                <i className="bi bi-box-seam-fill fs-1 text-success" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            {canViewProducts
                                                ? 'Stok Rendah'
                                                : 'Informasi Sistem'}
                                        </h4>

                                        <p className="text-muted mb-0">
                                            {canViewProducts
                                                ? 'Produk dengan stok lima atau kurang.'
                                                : 'Ringkasan akses administrasi.'}
                                        </p>
                                    </div>

                                    {canViewProducts && (
                                        <Link
                                            to="/admin/products"
                                            className="btn btn-outline-warning rounded-pill btn-sm"
                                        >
                                            {canManageProducts
                                                ? 'Kelola'
                                                : 'Lihat'}
                                        </Link>
                                    )}
                                </div>

                                {canViewProducts ? (
                                    lowStockProducts.length ===
                                    0 ? (
                                        <div className="p-4 rounded-4 bg-light text-center">
                                            <i className="bi bi-check-circle-fill fs-1 text-success" />

                                            <p className="text-muted mt-2 mb-0">
                                                Tidak ada stok rendah.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {lowStockProducts.map(
                                                (
                                                    product
                                                ) => (
                                                    <div
                                                        key={
                                                            product.id
                                                        }
                                                        className="p-3 rounded-4 border d-flex align-items-center justify-content-between gap-3"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="fw-bold text-truncate">
                                                                {
                                                                    product.name
                                                                }
                                                            </div>

                                                            <div className="small text-muted text-truncate">
                                                                {product
                                                                    .category
                                                                    ?.name ||
                                                                    '-'}
                                                            </div>
                                                        </div>

                                                        <span className="badge rounded-pill text-bg-warning flex-shrink-0">
                                                            Stok{' '}
                                                            {product.stock ||
                                                                0}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="row g-3">
                                        {canViewUsers && (
                                            <div className="col-12">
                                                <div className="p-3 rounded-4 bg-light">
                                                    <div className="small text-muted">
                                                        Total User
                                                    </div>

                                                    <div className="fs-3 fw-black">
                                                        {
                                                            summary.userTotal
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-12">
                                            <div className="p-3 rounded-4 bg-light">
                                                <div className="small text-muted">
                                                    Hak Akses Aktif
                                                </div>

                                                <div className="fs-3 fw-black">
                                                    {
                                                        normalizePermissions(
                                                            currentUser.permissions
                                                        ).length
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}