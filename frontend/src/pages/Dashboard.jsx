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

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import api from '../api/axios';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
    normalizePermissions,
} from '../components/ProtectedRoute';

import {
    showErrorAlert,
    showWarningAlert,
} from '../utils/sweetAlert';

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin Humas',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Super Admin',
};

const SERVICE_CONFIG = {
    merchandise: {
        label: 'Merchandise',
        icon: 'bi-gift-fill',
        color: 'primary',
    },

    humas: {
        label: 'Liputan Humas',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
    },

    borrowing: {
        label: 'Peminjaman SEKPiM',
        icon: 'bi-box-seam-fill',
        color: 'success',
    },
};

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass:
            'bg-warning-subtle text-warning-emphasis',
    },

    revision: {
        label: 'Perlu Revisi',
        badgeClass:
            'bg-info-subtle text-info-emphasis',
    },

    approved: {
        label: 'Disetujui',
        badgeClass:
            'bg-primary-subtle text-primary',
    },

    rejected: {
        label: 'Ditolak',
        badgeClass:
            'bg-danger-subtle text-danger',
    },

    borrowed: {
        label: 'Dipinjam',
        badgeClass:
            'bg-info-subtle text-info-emphasis',
    },

    returned: {
        label: 'Dikembalikan',
        badgeClass:
            'bg-secondary-subtle text-secondary',
    },

    completed: {
        label: 'Selesai',
        badgeClass:
            'bg-success-subtle text-success',
    },
};

const EMPTY_ANALYTICS = {
    filters: {
        service: 'all',
        status: 'all',
        start_date: '',
        end_date: '',
        group_by: 'day',
        available_services: [],
    },

    summary: {
        total: 0,
        pending: 0,
        revision: 0,
        approved: 0,
        rejected: 0,
        borrowed: 0,
        returned: 0,
        completed: 0,
        finished: 0,
    },

    service_distribution: [],
    status_distribution: [],
    trend: [],
    recent_requests: [],
};

const PIE_COLORS = [
    '#f59e0b',
    '#0ea5e9',
    '#2563eb',
    '#dc2626',
    '#8b5cf6',
    '#64748b',
    '#16a34a',
];

const padNumber = (
    value
) => {
    return String(
        value
    ).padStart(
        2,
        '0'
    );
};

const toLocalDateString = (
    date
) => {
    return [
        date.getFullYear(),
        padNumber(
            date.getMonth() + 1
        ),
        padNumber(
            date.getDate()
        ),
    ].join('-');
};

const getDateRangeByPreset = (
    preset
) => {
    const today =
        new Date();

    const endDate =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

    let startDate =
        new Date(
            endDate
        );

    switch (
        preset
    ) {
        case 'today':
            break;

        case '7days':
            startDate.setDate(
                endDate.getDate() -
                    6
            );
            break;

        case '30days':
            startDate.setDate(
                endDate.getDate() -
                    29
            );
            break;

        case 'this_month':
            startDate =
                new Date(
                    endDate.getFullYear(),
                    endDate.getMonth(),
                    1
                );
            break;

        case 'this_year':
            startDate =
                new Date(
                    endDate.getFullYear(),
                    0,
                    1
                );
            break;

        default:
            startDate.setDate(
                endDate.getDate() -
                    29
            );
            break;
    }

    return {
        startDate:
            toLocalDateString(
                startDate
            ),

        endDate:
            toLocalDateString(
                endDate
            ),
    };
};

const formatDate = (
    dateValue
) => {
    if (
        !dateValue
    ) {
        return '-';
    }

    if (
        typeof dateValue ===
            'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            dateValue
        )
    ) {
        const [
            year,
            month,
            day,
        ] = dateValue
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
        new Date(
            dateValue
        );

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate
        .toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }
        );
};

const formatDateTime = (
    dateValue
) => {
    if (
        !dateValue
    ) {
        return '-';
    }

    const parsedDate =
        new Date(
            dateValue
        );

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate
        .toLocaleString(
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
        ROLE_LABELS[
            role
        ] ||
        role ||
        'Pengguna'
    );
};

const getStatusLabel = (
    status
) => {
    return (
        STATUS_CONFIG[
            status
        ]?.label ||
        status ||
        '-'
    );
};

const getStatusClass = (
    status
) => {
    return (
        STATUS_CONFIG[
            status
        ]?.badgeClass ||
        'bg-secondary-subtle text-secondary'
    );
};

const getServiceConfig = (
    service
) => {
    return (
        SERVICE_CONFIG[
            service
        ] || {
            label:
                service ||
                'Layanan',

            icon:
                'bi-grid-fill',

            color:
                'secondary',
        }
    );
};

const getBackendErrorMessage = (
    error,
    fallbackMessage
) => {
    const responseData =
        error?.response
            ?.data;

    if (
        responseData
            ?.errors
    ) {
        const firstError =
            Object.values(
                responseData
                    .errors
            )?.[0]?.[0];

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        responseData
            ?.message ||
        fallbackMessage
    );
};

const getDownloadFilename = (
    contentDisposition,
    fallbackFilename
) => {
    if (
        !contentDisposition
    ) {
        return fallbackFilename;
    }

    const utf8Match =
        contentDisposition.match(
            /filename\*=UTF-8''([^;]+)/i
        );

    if (
        utf8Match &&
        utf8Match[1]
    ) {
        try {
            return decodeURIComponent(
                utf8Match[1]
                    .replace(
                        /["']/g,
                        ''
                    )
                    .trim()
            );
        } catch {
            return fallbackFilename;
        }
    }

    const normalMatch =
        contentDisposition.match(
            /filename="?([^";]+)"?/i
        );

    if (
        normalMatch &&
        normalMatch[1]
    ) {
        return normalMatch[1]
            .replace(
                /["']/g,
                ''
            )
            .trim();
    }

    return fallbackFilename;
};

const getBlobErrorMessage =
    async (
        error,
        fallbackMessage
    ) => {
        const blob =
            error?.response
                ?.data;

        if (
            blob instanceof
            Blob
        ) {
            try {
                const text =
                    await blob.text();

                const parsed =
                    JSON.parse(
                        text
                    );

                if (
                    parsed?.message
                ) {
                    return parsed.message;
                }

                if (
                    parsed?.errors
                ) {
                    const firstError =
                        Object.values(
                            parsed.errors
                        )?.[0]?.[0];

                    if (
                        firstError
                    ) {
                        return firstError;
                    }
                }
            } catch {
                //
            }
        }

        return (
            error?.response
                ?.data
                ?.message ||
            error?.message ||
            fallbackMessage
        );
    };

const ChartEmptyState = ({
    title,
}) => {
    return (
        <div
            className="d-flex flex-column align-items-center justify-content-center text-center p-4"
            style={{
                minHeight:
                    320,
            }}
        >
            <div
                className="rounded-circle bg-light text-muted d-flex align-items-center justify-content-center mb-3"
                style={{
                    width:
                        72,

                    height:
                        72,
                }}
            >
                <i className="bi bi-bar-chart-line-fill fs-2" />
            </div>

            <h6 className="fw-black mb-1">
                Belum ada data grafik
            </h6>

            <p className="small text-muted mb-0">
                {
                    title
                }
            </p>
        </div>
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

    const initialRange =
        useMemo(
            () =>
                getDateRangeByPreset(
                    '30days'
                ),
            []
        );

    const [
        analytics,
        setAnalytics,
    ] = useState(
        EMPTY_ANALYTICS
    );

    const [
        serviceFilter,
        setServiceFilter,
    ] = useState(
        'all'
    );

    const [
        statusFilter,
        setStatusFilter,
    ] = useState(
        'all'
    );

    const [
        rangePreset,
        setRangePreset,
    ] = useState(
        '30days'
    );

    const [
        startDate,
        setStartDate,
    ] = useState(
        initialRange.startDate
    );

    const [
        endDate,
        setEndDate,
    ] = useState(
        initialRange.endDate
    );

    const [
        appliedFilters,
        setAppliedFilters,
    ] = useState({
        service:
            'all',

        status:
            'all',

        startDate:
            initialRange
                .startDate,

        endDate:
            initialRange
                .endDate,
    });

    const [
        loading,
        setLoading,
    ] = useState(
        true
    );

    const [
        refreshing,
        setRefreshing,
    ] = useState(
        false
    );

    const [
        exporting,
        setExporting,
    ] = useState(
        false
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState(
        ''
    );

    const availableServices =
        analytics
            .filters
            ?.available_services ||
        [];

    const fetchAnalytics =
        useCallback(
            async (
                filters,
                refresh = false
            ) => {
                if (
                    !canViewDashboard
                ) {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );

                    return;
                }

                if (
                    refresh
                ) {
                    setRefreshing(
                        true
                    );
                } else {
                    setLoading(
                        true
                    );
                }

                setErrorMessage(
                    ''
                );

                try {
                    const response =
                        await api.get(
                            '/dashboard/analytics',
                            {
                                params: {
                                    service:
                                        filters.service,

                                    status:
                                        filters.status,

                                    start_date:
                                        filters.startDate,

                                    end_date:
                                        filters.endDate,
                                },
                            }
                        );

                    setAnalytics(
                        response
                            ?.data
                            ?.data ||
                            EMPTY_ANALYTICS
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch dashboard analytics error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setAnalytics(
                        EMPTY_ANALYTICS
                    );

                    setErrorMessage(
                        getBackendErrorMessage(
                            error,
                            'Data dashboard gagal dimuat.'
                        )
                    );
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );
                }
            },
            [
                canViewDashboard,
            ]
        );

    useEffect(
        () => {
            fetchAnalytics(
                appliedFilters
            );
        },
        [
            appliedFilters,
            fetchAnalytics,
        ]
    );

    const handlePresetChange = (
        event
    ) => {
        const selectedPreset =
            event.target
                .value;

        setRangePreset(
            selectedPreset
        );

        if (
            selectedPreset ===
            'custom'
        ) {
            return;
        }

        const range =
            getDateRangeByPreset(
                selectedPreset
            );

        setStartDate(
            range.startDate
        );

        setEndDate(
            range.endDate
        );
    };

    const handleApplyFilter = async () => {
        if (
            !startDate ||
            !endDate
        ) {
            await showWarningAlert(
                'Tanggal Belum Lengkap',
                'Tanggal mulai dan tanggal selesai wajib diisi.'
            );

            return;
        }

        if (
            new Date(
                startDate
            ).getTime() >
            new Date(
                endDate
            ).getTime()
        ) {
            await showWarningAlert(
                'Rentang Tanggal Tidak Valid',
                'Tanggal mulai tidak boleh melebihi tanggal selesai.'
            );

            return;
        }

        setAppliedFilters({
            service:
                serviceFilter,

            status:
                statusFilter,

            startDate,

            endDate,
        });
    };

    const handleResetFilter = () => {
        const range =
            getDateRangeByPreset(
                '30days'
            );

        setServiceFilter(
            'all'
        );

        setStatusFilter(
            'all'
        );

        setRangePreset(
            '30days'
        );

        setStartDate(
            range.startDate
        );

        setEndDate(
            range.endDate
        );

        setAppliedFilters({
            service:
                'all',

            status:
                'all',

            startDate:
                range.startDate,

            endDate:
                range.endDate,
        });
    };

    const handleRefresh = () => {
        fetchAnalytics(
            appliedFilters,
            true
        );
    };

    const handleExport =
        async () => {
            if (
                exporting
            ) {
                return;
            }

            if (
                !appliedFilters
                    .startDate ||
                !appliedFilters
                    .endDate
            ) {
                await showWarningAlert(
                    'Periode Belum Lengkap',
                    'Tanggal mulai dan tanggal selesai wajib tersedia sebelum export.'
                );

                return;
            }

            setExporting(
                true
            );

            try {
                const response =
                    await api.get(
                        '/dashboard/export',
                        {
                            params: {
                                service:
                                    appliedFilters
                                        .service,

                                status:
                                    appliedFilters
                                        .status,

                                start_date:
                                    appliedFilters
                                        .startDate,

                                end_date:
                                    appliedFilters
                                        .endDate,
                            },

                            responseType:
                                'blob',

                            timeout:
                                120000,
                        }
                    );

                const contentType =
                    response
                        .headers[
                        'content-type'
                    ] || '';

                if (
                    contentType.includes(
                        'application/json'
                    )
                ) {
                    const responseText =
                        await response
                            .data
                            .text();

                    let parsedResponse =
                        null;

                    try {
                        parsedResponse =
                            JSON.parse(
                                responseText
                            );
                    } catch {
                        parsedResponse =
                            null;
                    }

                    throw new Error(
                        parsedResponse
                            ?.message ||
                            'Export gagal diproses.'
                    );
                }

                const blob =
                    new Blob(
                        [
                            response.data,
                        ],
                        {
                            type:
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        }
                    );

                const blobUrl =
                    window.URL
                        .createObjectURL(
                            blob
                        );

                const fallbackFilename =
                    `Laporan_Dashboard_HUMAS_SEKPIM_${appliedFilters.startDate}_sd_${appliedFilters.endDate}.xlsx`;

                const filename =
                    getDownloadFilename(
                        response
                            .headers[
                            'content-disposition'
                        ],
                        fallbackFilename
                    );

                const link =
                    document.createElement(
                        'a'
                    );

                link.href =
                    blobUrl;

                link.download =
                    filename;

                document
                    .body
                    .appendChild(
                        link
                    );

                link.click();

                link.remove();

                window.URL
                    .revokeObjectURL(
                        blobUrl
                    );
            } catch (
                error
            ) {
                console.error(
                    'Export dashboard error:',
                    error
                );

                const message =
                    error instanceof
                        Error &&
                    !error?.response
                        ? error.message
                        : await getBlobErrorMessage(
                            error,
                            'File Excel gagal dibuat.'
                        );

                await showErrorAlert(
                    'Export Gagal',
                    message
                );
            } finally {
                setExporting(
                    false
                );
            }
        };

    const resolveDetailUrl =
        useCallback(
            (
                item
            ) => {
                if (
                    item.service ===
                    'merchandise'
                ) {
                    return canViewMerchandiseApproval
                        ? `/admin/orders/${item.id}`
                        : `${basePath}/my-requests/merchandise/${item.id}/detail`;
                }

                if (
                    item.service ===
                    'humas'
                ) {
                    return canViewHumasApproval
                        ? `/admin/humas-services/${item.id}`
                        : `${basePath}/my-requests/humas/${item.id}/detail`;
                }

                if (
                    item.service ===
                    'borrowing'
                ) {
                    return canViewBorrowingApproval
                        ? `/admin/borrow-requests/${item.id}`
                        : `${basePath}/my-requests/borrowing/${item.id}/detail`;
                }

                return defaultPath;
            },
            [
                basePath,
                defaultPath,
                canViewMerchandiseApproval,
                canViewHumasApproval,
                canViewBorrowingApproval,
            ]
        );

    const summaryCards =
        useMemo(
            () => [
                {
                    title:
                        'Total Pengajuan',

                    value:
                        analytics
                            .summary
                            ?.total ||
                        0,

                    icon:
                        'bi-files',

                    color:
                        'primary',
                },

                {
                    title:
                        'Menunggu',

                    value:
                        analytics
                            .summary
                            ?.pending ||
                        0,

                    icon:
                        'bi-hourglass-split',

                    color:
                        'warning',
                },

                {
                    title:
                        'Perlu Revisi',

                    value:
                        analytics
                            .summary
                            ?.revision ||
                        0,

                    icon:
                        'bi-pencil-square',

                    color:
                        'info',
                },

                {
                    title:
                        'Disetujui',

                    value:
                        analytics
                            .summary
                            ?.approved ||
                        0,

                    icon:
                        'bi-check-circle-fill',

                    color:
                        'primary',
                },

                {
                    title:
                        'Ditolak',

                    value:
                        analytics
                            .summary
                            ?.rejected ||
                        0,

                    icon:
                        'bi-x-circle-fill',

                    color:
                        'danger',
                },

                {
                    title:
                        'Selesai',

                    value:
                        analytics
                            .summary
                            ?.finished ||
                        0,

                    icon:
                        'bi-check2-all',

                    color:
                        'success',
                },
            ],
            [
                analytics
                    .summary,
            ]
        );

    const filteredStatusDistribution =
        useMemo(
            () =>
                (
                    analytics
                        .status_distribution ||
                    []
                ).filter(
                    (
                        item
                    ) =>
                        Number(
                            item.total ||
                                0
                        ) > 0
                ),
            [
                analytics
                    .status_distribution,
            ]
        );

    const quickActions =
        useMemo(
            () => {
                const actions =
                    [];

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
                            'Pantau seluruh pengajuan pribadi.',

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
                            'Periksa request Liputan Humas.',

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

                return actions.slice(
                    0,
                    7
                );
            },
            [
                basePath,
                canCreateMerchandise,
                canCreateHumas,
                canCreateBorrowing,
                canViewHistory,
                canViewMerchandiseApproval,
                canViewHumasApproval,
                canViewBorrowingApproval,
            ]
        );

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

    if (
        loading
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat dashboard analytics
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
                        'linear-gradient(135deg, rgba(220,38,38,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Dashboard Analytics HUMAS &amp; SEKPiM
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Halo,{' '}

                                {currentUser
                                    ?.name ||
                                    'Pengguna'}
                                .
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth:
                                        760,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Pantau statistik pengajuan,
                                tren layanan, distribusi
                                status, dan aktivitas terbaru
                                berdasarkan rentang waktu yang
                                dipilih.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="profile-avatar bg-white text-danger">
                                        {(
                                            currentUser
                                                ?.name ||
                                            'U'
                                        )
                                            .charAt(
                                                0
                                            )
                                            .toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="fw-black fs-5 text-truncate">
                                            {currentUser
                                                ?.name ||
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
                                            currentUser
                                                ?.permissions
                                        )
                                            .length
                                    }{' '}
                                    hak akses aktif
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                        <div>
                            <h4 className="fw-black mb-1">
                                Filter Analytics
                            </h4>

                            <p className="text-muted mb-0">
                                Grafik dan statistik
                                menyesuaikan layanan, status,
                                serta rentang waktu.
                            </p>
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary rounded-pill"
                                onClick={
                                    handleRefresh
                                }
                                disabled={
                                    refreshing ||
                                    exporting
                                }
                            >
                                {refreshing ? (
                                    <span className="spinner-border spinner-border-sm me-2" />
                                ) : (
                                    <i className="bi bi-arrow-clockwise me-2" />
                                )}

                                Perbarui
                            </button>

                            <button
                                type="button"
                                className="btn btn-success rounded-pill"
                                onClick={
                                    handleExport
                                }
                                disabled={
                                    exporting ||
                                    refreshing
                                }
                            >
                                {exporting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />

                                        Membuat Excel...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-file-earmark-excel-fill me-2" />

                                        Export Excel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="row g-3 align-items-end">
                        <div className="col-md-6 col-xl-3">
                            <label className="form-label fw-bold">
                                Jenis Layanan
                            </label>

                            <select
                                className="form-select rounded-4"
                                value={
                                    serviceFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setServiceFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="all">
                                    Semua Layanan
                                </option>

                                {availableServices.includes(
                                    'merchandise'
                                ) && (
                                    <option value="merchandise">
                                        Merchandise
                                    </option>
                                )}

                                {availableServices.includes(
                                    'humas'
                                ) && (
                                    <option value="humas">
                                        Liputan Humas
                                    </option>
                                )}

                                {availableServices.includes(
                                    'borrowing'
                                ) && (
                                    <option value="borrowing">
                                        Peminjaman SEKPiM
                                    </option>
                                )}
                            </select>
                        </div>

                        <div className="col-md-6 col-xl-2">
                            <label className="form-label fw-bold">
                                Status
                            </label>

                            <select
                                className="form-select rounded-4"
                                value={
                                    statusFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStatusFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="all">
                                    Semua Status
                                </option>

                                <option value="pending">
                                    Menunggu
                                </option>

                                <option value="revision">
                                    Perlu Revisi
                                </option>

                                <option value="approved">
                                    Disetujui
                                </option>

                                <option value="rejected">
                                    Ditolak
                                </option>

                                <option value="borrowed">
                                    Dipinjam
                                </option>

                                <option value="returned">
                                    Dikembalikan
                                </option>

                                <option value="completed">
                                    Selesai
                                </option>
                            </select>
                        </div>

                        <div className="col-md-6 col-xl-2">
                            <label className="form-label fw-bold">
                                Rentang Cepat
                            </label>

                            <select
                                className="form-select rounded-4"
                                value={
                                    rangePreset
                                }
                                onChange={
                                    handlePresetChange
                                }
                            >
                                <option value="today">
                                    Hari Ini
                                </option>

                                <option value="7days">
                                    7 Hari Terakhir
                                </option>

                                <option value="30days">
                                    30 Hari Terakhir
                                </option>

                                <option value="this_month">
                                    Bulan Ini
                                </option>

                                <option value="this_year">
                                    Tahun Ini
                                </option>

                                <option value="custom">
                                    Custom
                                </option>
                            </select>
                        </div>

                        <div className="col-md-6 col-xl-2">
                            <label className="form-label fw-bold">
                                Tanggal Mulai
                            </label>

                            <input
                                type="date"
                                className="form-control rounded-4"
                                value={
                                    startDate
                                }
                                max={
                                    endDate
                                }
                                onChange={(
                                    event
                                ) => {
                                    setStartDate(
                                        event
                                            .target
                                            .value
                                    );

                                    setRangePreset(
                                        'custom'
                                    );
                                }}
                            />
                        </div>

                        <div className="col-md-6 col-xl-2">
                            <label className="form-label fw-bold">
                                Tanggal Selesai
                            </label>

                            <input
                                type="date"
                                className="form-control rounded-4"
                                value={
                                    endDate
                                }
                                min={
                                    startDate
                                }
                                onChange={(
                                    event
                                ) => {
                                    setEndDate(
                                        event
                                            .target
                                            .value
                                    );

                                    setRangePreset(
                                        'custom'
                                    );
                                }}
                            />
                        </div>

                        <div className="col-md-6 col-xl-1">
                            <button
                                type="button"
                                className="btn btn-primary rounded-pill w-100"
                                onClick={
                                    handleApplyFilter
                                }
                                disabled={
                                    refreshing ||
                                    exporting
                                }
                                title="Terapkan Filter"
                            >
                                <i className="bi bi-funnel-fill" />
                            </button>
                        </div>

                        <div className="col-12">
                            <button
                                type="button"
                                className="btn btn-link text-muted p-0"
                                onClick={
                                    handleResetFilter
                                }
                                disabled={
                                    refreshing ||
                                    exporting
                                }
                            >
                                <i className="bi bi-arrow-counterclockwise me-2" />

                                Reset filter
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div className="flex-grow-1">
                            <div className="fw-black mb-1">
                                Dashboard gagal dimuat
                            </div>

                            <div className="small">
                                {
                                    errorMessage
                                }
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-pill"
                            onClick={
                                handleRefresh
                            }
                            disabled={
                                refreshing
                            }
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            )}

            <div className="row g-4 mb-4">
                {summaryCards.map(
                    (
                        card
                    ) => (
                        <div
                            className="col-md-6 col-xl-2"
                            key={
                                card.title
                            }
                        >
                            <div className="card border-0 shadow-sm rounded-5 h-100">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start justify-content-between gap-3">
                                        <div>
                                            <div className="small fw-bold text-muted mb-2">
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

            <div className="row g-4 mb-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="mb-4">
                                <h4 className="fw-black mb-1">
                                    Tren Pengajuan
                                </h4>

                                <p className="text-muted mb-0">
                                    Pergerakan jumlah pengajuan
                                    pada rentang waktu yang
                                    dipilih.
                                </p>
                            </div>

                            {analytics
                                .trend
                                ?.length ===
                            0 ? (
                                <ChartEmptyState title="Belum ada pengajuan pada rentang waktu yang dipilih." />
                            ) : (
                                <div
                                    style={{
                                        width:
                                            '100%',

                                        height:
                                            360,
                                    }}
                                >
                                    <ResponsiveContainer>
                                        <LineChart
                                            data={
                                                analytics
                                                    .trend
                                            }
                                            margin={{
                                                top:
                                                    10,

                                                right:
                                                    18,

                                                left:
                                                    -18,

                                                bottom:
                                                    0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="4 4"
                                                vertical={
                                                    false
                                                }
                                                stroke="#e2e8f0"
                                            />

                                            <XAxis
                                                dataKey="label"
                                                tick={{
                                                    fontSize:
                                                        12,
                                                }}
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                            />

                                            <YAxis
                                                allowDecimals={
                                                    false
                                                }
                                                tick={{
                                                    fontSize:
                                                        12,
                                                }}
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                            />

                                            <Tooltip />

                                            <Legend />

                                            <Line
                                                type="monotone"
                                                dataKey="merchandise"
                                                name="Merchandise"
                                                stroke="#2563eb"
                                                strokeWidth={
                                                    3
                                                }
                                                dot={{
                                                    r: 3,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="humas"
                                                name="Liputan Humas"
                                                stroke="#dc2626"
                                                strokeWidth={
                                                    3
                                                }
                                                dot={{
                                                    r: 3,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="borrowing"
                                                name="Peminjaman"
                                                stroke="#16a34a"
                                                strokeWidth={
                                                    3
                                                }
                                                dot={{
                                                    r: 3,
                                                }}
                                                activeDot={{
                                                    r: 6,
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="mb-4">
                                <h4 className="fw-black mb-1">
                                    Distribusi Status
                                </h4>

                                <p className="text-muted mb-0">
                                    Komposisi pengajuan
                                    berdasarkan status.
                                </p>
                            </div>

                            {filteredStatusDistribution.length ===
                            0 ? (
                                <ChartEmptyState title="Belum ada data status pada filter ini." />
                            ) : (
                                <div
                                    style={{
                                        width:
                                            '100%',

                                        height:
                                            320,
                                    }}
                                >
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={
                                                    filteredStatusDistribution
                                                }
                                                dataKey="total"
                                                nameKey="label"
                                                cx="50%"
                                                cy="46%"
                                                outerRadius={
                                                    98
                                                }
                                                innerRadius={
                                                    54
                                                }
                                                paddingAngle={
                                                    3
                                                }
                                                label={({
                                                    label,
                                                    percent,
                                                }) =>
                                                    `${label} ${(
                                                        percent *
                                                        100
                                                    ).toFixed(
                                                        0
                                                    )}%`
                                                }
                                            >
                                                {filteredStatusDistribution.map(
                                                    (
                                                        item,
                                                        index
                                                    ) => (
                                                        <Cell
                                                            key={
                                                                item.status
                                                            }
                                                            fill={
                                                                PIE_COLORS[
                                                                    index %
                                                                        PIE_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    )
                                                )}
                                            </Pie>

                                            <Tooltip />

                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="mb-4">
                        <h4 className="fw-black mb-1">
                            Perbandingan Setiap Layanan
                        </h4>

                        <p className="text-muted mb-0">
                            Perbandingan status pada
                            Merchandise, Liputan Humas, dan
                            Peminjaman SEKPiM.
                        </p>
                    </div>

                    {analytics
                        .service_distribution
                        ?.length ===
                    0 ? (
                        <ChartEmptyState title="Belum ada data layanan pada filter ini." />
                    ) : (
                        <div
                            style={{
                                width:
                                    '100%',

                                height:
                                    380,
                            }}
                        >
                            <ResponsiveContainer>
                                <BarChart
                                    data={
                                        analytics
                                            .service_distribution
                                    }
                                    margin={{
                                        top:
                                            10,

                                        right:
                                            12,

                                        left:
                                            -14,

                                        bottom:
                                            10,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        vertical={
                                            false
                                        }
                                        stroke="#e2e8f0"
                                    />

                                    <XAxis
                                        dataKey="label"
                                        tick={{
                                            fontSize:
                                                12,
                                        }}
                                        axisLine={
                                            false
                                        }
                                        tickLine={
                                            false
                                        }
                                    />

                                    <YAxis
                                        allowDecimals={
                                            false
                                        }
                                        tick={{
                                            fontSize:
                                                12,
                                        }}
                                        axisLine={
                                            false
                                        }
                                        tickLine={
                                            false
                                        }
                                    />

                                    <Tooltip />

                                    <Legend />

                                    <Bar
                                        dataKey="pending"
                                        name="Menunggu"
                                        fill="#f59e0b"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="revision"
                                        name="Revisi"
                                        fill="#0ea5e9"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="approved"
                                        name="Disetujui"
                                        fill="#2563eb"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="rejected"
                                        name="Ditolak"
                                        fill="#dc2626"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="finished"
                                        name="Selesai"
                                        fill="#16a34a"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </section>

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
                                        Delapan pengajuan terbaru
                                        berdasarkan filter.
                                    </p>
                                </div>

                                <span className="badge rounded-pill text-bg-light px-3 py-2">
                                    {formatDate(
                                        appliedFilters
                                            .startDate
                                    )}{' '}
                                    –{' '}
                                    {formatDate(
                                        appliedFilters
                                            .endDate
                                    )}
                                </span>
                            </div>

                            {analytics
                                .recent_requests
                                ?.length ===
                            0 ? (
                                <div className="p-5 rounded-5 bg-light text-center">
                                    <i className="bi bi-inbox fs-1 text-muted" />

                                    <h5 className="fw-black mt-3 mb-2">
                                        Belum ada aktivitas
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Coba ubah filter layanan,
                                        status, atau rentang
                                        waktu.
                                    </p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {analytics
                                        .recent_requests
                                        .map(
                                            (
                                                item
                                            ) => {
                                                const serviceConfig =
                                                    getServiceConfig(
                                                        item.service
                                                    );

                                                return (
                                                    <div
                                                        key={`${item.service}-${item.id}`}
                                                        className="p-3 rounded-4 border"
                                                    >
                                                        <div className="row g-3 align-items-center">
                                                            <div className="col-lg-6">
                                                                <div className="d-flex align-items-start gap-3">
                                                                    <div
                                                                        className={`icon-box bg-${serviceConfig.color}-subtle text-${serviceConfig.color}`}
                                                                    >
                                                                        <i
                                                                            className={`bi ${serviceConfig.icon}`}
                                                                        />
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <div className="d-flex flex-wrap gap-2 mb-2">
                                                                            <span
                                                                                className={`badge rounded-pill bg-${serviceConfig.color}-subtle text-${serviceConfig.color}`}
                                                                            >
                                                                                {
                                                                                    serviceConfig.label
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
                                                                            {item.code ||
                                                                                '-'}{' '}
                                                                            •{' '}
                                                                            {item.requester ||
                                                                                '-'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="col-md-6 col-lg-3">
                                                                <div className="small text-muted">
                                                                    Dikirim
                                                                </div>

                                                                <div className="fw-bold">
                                                                    {formatDateTime(
                                                                        item.submitted_at
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="col-md-6 col-lg-3 text-lg-end">
                                                                <Link
                                                                    to={resolveDetailUrl(
                                                                        item
                                                                    )}
                                                                    className={`btn btn-sm btn-${serviceConfig.color} rounded-pill px-3`}
                                                                >
                                                                    Detail
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
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
                                    Akun belum memiliki menu
                                    tambahan.
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {quickActions.map(
                                        (
                                            action
                                        ) => (
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
        </div>
    );
}