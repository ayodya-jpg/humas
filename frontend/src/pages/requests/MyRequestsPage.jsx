import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
} from 'react-router-dom';

import api from '../../api/axios';

const REQUEST_TYPES = {
    merchandise: {
        label: 'Merchandise',
        singularLabel: 'Merchandise',
        icon: 'bi-gift-fill',
        color: 'primary',
    },

    humas: {
        label: 'Liputan Humas',
        singularLabel: 'Liputan Humas',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
    },

    borrowing: {
        label: 'Peminjaman SEKPiM',
        singularLabel: 'Peminjaman',
        icon: 'bi-box-seam-fill',
        color: 'success',
    },
};

const STATUS_OPTIONS = [
    {
        value: 'all',
        label: 'Semua Status',
    },
    {
        value: 'pending',
        label: 'Menunggu',
    },
    {
        value: 'revision',
        label: 'Perlu Revisi',
    },
    {
        value: 'approved',
        label: 'Disetujui',
    },
    {
        value: 'rejected',
        label: 'Ditolak',
    },
    {
        value: 'completed',
        label: 'Selesai',
    },
    {
        value: 'borrowed',
        label: 'Sedang Dipinjam',
    },
    {
        value: 'returned',
        label: 'Dikembalikan',
    },
];

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass: 'text-bg-warning',
        icon: 'bi-hourglass-split',
    },

    revision: {
        label: 'Perlu Revisi',
        badgeClass: 'text-bg-info',
        icon: 'bi-pencil-square',
    },

    approved: {
        label: 'Disetujui',
        badgeClass: 'text-bg-success',
        icon: 'bi-check-circle-fill',
    },

    rejected: {
        label: 'Ditolak',
        badgeClass: 'text-bg-danger',
        icon: 'bi-x-circle-fill',
    },

    completed: {
        label: 'Selesai',
        badgeClass: 'text-bg-primary',
        icon: 'bi-check2-all',
    },

    borrowed: {
        label: 'Sedang Dipinjam',
        badgeClass: 'text-bg-info',
        icon: 'bi-box-arrow-up-right',
    },

    returned: {
        label: 'Dikembalikan',
        badgeClass: 'text-bg-secondary',
        icon: 'bi-box-arrow-in-down-left',
    },
};

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
            localStorage.getItem(
                'admin_user'
            ) || '{}'
        );
    } catch {
        return {};
    }
};

const extractArray = (
    response
) => {
    const payload =
        response?.data?.data;

    if (
        Array.isArray(
            payload
        )
    ) {
        return payload;
    }

    if (
        Array.isArray(
            payload?.data
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

        const parsedDate =
            new Date(
                year,
                month - 1,
                day
            );

        return parsedDate
            .toLocaleDateString(
                'id-ID',
                {
                    day: '2-digit',
                    month: 'long',
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

    return parsedDate
        .toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'long',
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

const normalizeExternalUrl = (
    value
) => {
    if (!value) {
        return null;
    }

    const normalizedValue =
        String(value).trim();

    if (!normalizedValue) {
        return null;
    }

    if (
        /^https?:\/\//i.test(
            normalizedValue
        )
    ) {
        return normalizedValue;
    }

    return `https://${normalizedValue}`;
};

const getResolvedUnitName = (
    item
) => {
    if (
        item?.resolved_unit_name
    ) {
        return item.resolved_unit_name;
    }

    if (
        item?.unit_name ===
        'Lainnya'
    ) {
        return (
            item.other_unit_name ||
            'Lainnya'
        );
    }

    return (
        item?.unit_name ||
        item?.requester_unit ||
        item?.user?.unit_name ||
        '-'
    );
};

const normalizeMerchandise = (
    item
) => ({
    ...item,

    requestType:
        'merchandise',

    requestCode:
        item.order_code ||
        item.code ||
        `MER-${String(
            item.id
        ).padStart(
            4,
            '0'
        )}`,

    requestTitle:
        item.event_name ||
        item.activity_name ||
        item.title ||
        'Pengajuan Merchandise',

    requestDescription:
        item.institution_name ||
        item.requester_unit ||
        item.guest_name ||
        item.user_note ||
        'Pengajuan paket merchandise',

    requestMeta:
        item.activity_date
            ? `Kegiatan: ${formatDate(
                item.activity_date
            )}`
            : null,

    requestDate:
        item.activity_date ||
        item.submitted_at ||
        item.created_at,

    updatedDate:
        item.updated_at ||
        item.resubmitted_at ||
        item.submitted_at ||
        item.created_at,
});

const normalizeHumas = (
    item
) => {
    const coverageConfig =
        COVERAGE_TYPE_CONFIG[
            item.coverage_type
        ];

    const resolvedUnitName =
        getResolvedUnitName(
            item
        );

    return {
        ...item,

        requestType:
            'humas',

        requestCode:
            item.service_code ||
            item.code ||
            `LIP-${String(
                item.id
            ).padStart(
                4,
                '0'
            )}`,

        requestTitle:
            coverageConfig
                ?.label ||
            item.coverage_type ||
            'Request Liputan Humas',

        requestDescription:
            item.activity_detail ||
            item.event_location ||
            'Request liputan Humas',

        requestMeta: [
            resolvedUnitName,
            item.event_location,
        ]
            .filter(Boolean)
            .join(' • '),

        requestDate:
            item.event_date ||
            item.submitted_at ||
            item.created_at,

        updatedDate:
            item.updated_at ||
            item.submitted_at ||
            item.created_at,

        coverageLabel:
            coverageConfig
                ?.label ||
            item.coverage_type ||
            'Liputan Humas',

        coverageIcon:
            coverageConfig
                ?.icon ||
            'bi-camera-reels-fill',

        resultUrl:
            normalizeExternalUrl(
                item.result_link
            ),
    };
};

const normalizeBorrowing = (
    item
) => ({
    ...item,

    requestType:
        'borrowing',

    requestCode:
        item.borrow_code ||
        item.code ||
        `BRW-${String(
            item.id
        ).padStart(
            4,
            '0'
        )}`,

    requestTitle:
        item.event_name ||
        item.activity_name ||
        item.purpose ||
        'Peminjaman Perlengkapan',

    requestDescription:
        item.requester_unit ||
        item.location ||
        item.person_in_charge ||
        item.purpose ||
        'Pengajuan peminjaman SEKPiM',

    requestMeta:
        item.return_date
            ? `Kembali: ${formatDate(
                item.return_date
            )}`
            : null,

    requestDate:
        item.borrow_at ||
        item.borrow_date ||
        item.submitted_at ||
        item.created_at,

    updatedDate:
        item.updated_at ||
        item.submitted_at ||
        item.created_at,
});

export default function MyRequestsPage() {
    const currentUser =
        useMemo(
            () =>
                getCurrentUser(),
            []
        );

    const basePath =
        currentUser.role ===
        'user'
            ? '/user'
            : '/admin';

    const [
        requests,
        setRequests,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        activeType,
        setActiveType,
    ] = useState('all');

    const [
        statusFilter,
        setStatusFilter,
    ] = useState('all');

    const [
        searchKeyword,
        setSearchKeyword,
    ] = useState('');

    const [
        endpointErrors,
        setEndpointErrors,
    ] = useState([]);

    const fetchRequests =
        useCallback(
            async (
                isRefresh = false
            ) => {
                try {
                    if (
                        isRefresh
                    ) {
                        setRefreshing(
                            true
                        );
                    } else {
                        setLoading(
                            true
                        );
                    }

                    setEndpointErrors(
                        []
                    );

                    const results =
                        await Promise.allSettled(
                            [
                                api.get(
                                    '/my-orders'
                                ),

                                api.get(
                                    '/my-humas-service-requests'
                                ),

                                api.get(
                                    '/my-borrow-requests'
                                ),
                            ]
                        );

                    const nextErrors =
                        [];

                    const merchandiseData =
                        results[0]
                            .status ===
                        'fulfilled'
                            ? extractArray(
                                results[0]
                                    .value
                            )
                            : [];

                    const humasData =
                        results[1]
                            .status ===
                        'fulfilled'
                            ? extractArray(
                                results[1]
                                    .value
                            )
                            : [];

                    const borrowingData =
                        results[2]
                            .status ===
                        'fulfilled'
                            ? extractArray(
                                results[2]
                                    .value
                            )
                            : [];

                    if (
                        results[0]
                            .status ===
                        'rejected'
                    ) {
                        nextErrors.push(
                            'Merchandise'
                        );

                        console.error(
                            'Fetch my merchandise error:',
                            results[0]
                                .reason
                                ?.response
                                ?.data ||
                                results[0]
                                    .reason
                        );
                    }

                    if (
                        results[1]
                            .status ===
                        'rejected'
                    ) {
                        nextErrors.push(
                            'Liputan Humas'
                        );

                        console.error(
                            'Fetch my Humas request error:',
                            results[1]
                                .reason
                                ?.response
                                ?.data ||
                                results[1]
                                    .reason
                        );
                    }

                    if (
                        results[2]
                            .status ===
                        'rejected'
                    ) {
                        nextErrors.push(
                            'Peminjaman SEKPiM'
                        );

                        console.error(
                            'Fetch my borrowing error:',
                            results[2]
                                .reason
                                ?.response
                                ?.data ||
                                results[2]
                                    .reason
                        );
                    }

                    const normalizedRequests =
                        [
                            ...merchandiseData.map(
                                normalizeMerchandise
                            ),

                            ...humasData.map(
                                normalizeHumas
                            ),

                            ...borrowingData.map(
                                normalizeBorrowing
                            ),
                        ];

                    normalizedRequests.sort(
                        (
                            firstItem,
                            secondItem
                        ) => {
                            const firstDate =
                                new Date(
                                    firstItem.updatedDate ||
                                    0
                                ).getTime();

                            const secondDate =
                                new Date(
                                    secondItem.updatedDate ||
                                    0
                                ).getTime();

                            return (
                                secondDate -
                                firstDate
                            );
                        }
                    );

                    setRequests(
                        normalizedRequests
                    );

                    setEndpointErrors(
                        nextErrors
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch my requests error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setRequests(
                        []
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
            []
        );

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const requestCounts =
        useMemo(() => {
            return {
                all:
                    requests.length,

                merchandise:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.requestType ===
                            'merchandise'
                    ).length,

                humas:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.requestType ===
                            'humas'
                    ).length,

                borrowing:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.requestType ===
                            'borrowing'
                    ).length,
            };
        }, [requests]);

    const statusCounts =
        useMemo(() => {
            return {
                pending:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.status ===
                            'pending'
                    ).length,

                revision:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.requestType ===
                                'merchandise' &&
                            item.status ===
                                'revision'
                    ).length,

                approved:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.status ===
                            'approved'
                    ).length,

                rejected:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.status ===
                            'rejected'
                    ).length,

                completed:
                    requests.filter(
                        (
                            item
                        ) =>
                            item.status ===
                                'completed' ||
                            item.status ===
                                'returned'
                    ).length,
            };
        }, [requests]);

    const filteredRequests =
        useMemo(() => {
            const keyword =
                searchKeyword
                    .trim()
                    .toLowerCase();

            return requests.filter(
                (item) => {
                    const matchesType =
                        activeType ===
                            'all' ||
                        item.requestType ===
                            activeType;

                    const matchesStatus =
                        statusFilter ===
                            'all' ||
                        item.status ===
                            statusFilter;

                    const searchableText =
                        [
                            item.requestCode,
                            item.requestTitle,
                            item.requestDescription,
                            item.requestMeta,
                            item.status,
                            item.admin_note,
                            item.applicant_name,
                            item.unit_name,
                            item.other_unit_name,
                            item.pic_whatsapp,
                            item.coverage_type,
                            item.event_location,
                            item.activity_detail,
                            item.result_note,
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' '
                            )
                            .toLowerCase();

                    const matchesKeyword =
                        !keyword ||
                        searchableText
                            .includes(
                                keyword
                            );

                    return (
                        matchesType &&
                        matchesStatus &&
                        matchesKeyword
                    );
                }
            );
        }, [
            requests,
            activeType,
            statusFilter,
            searchKeyword,
        ]);

    const resetFilters =
        () => {
            setActiveType(
                'all'
            );

            setStatusFilter(
                'all'
            );

            setSearchKeyword(
                ''
            );
        };

    const getStatusConfig =
        (
            status
        ) => {
            return (
                STATUS_CONFIG[
                    status
                ] || {
                    label:
                        status ||
                        'Tidak diketahui',

                    badgeClass:
                        'text-bg-secondary',

                    icon:
                        'bi-info-circle-fill',
                }
            );
        };

    const getDetailPath =
        (
            item
        ) => {
            return `${basePath}/my-requests/${item.requestType}/${item.id}/detail`;
        };

    if (loading) {
        return (
            <div className="container-fluid px-0">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body py-5 text-center">
                        <div
                            className="spinner-border text-danger mb-3"
                            role="status"
                        />

                        <h5 className="fw-bold mb-1">
                            Memuat riwayat pengajuan
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                        <div>
                            <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-3">
                                Riwayat Pengajuan
                            </span>

                            <h2 className="fw-black mb-2">
                                Pantau seluruh pengajuan
                            </h2>

                            <p className="text-muted mb-0">
                                Lihat status merchandise, liputan Humas,
                                dan peminjaman SEKPiM dalam satu halaman.
                            </p>
                        </div>

                        <div className="text-end">
                            <div className="small text-muted">
                                Total Pengajuan
                            </div>

                            <div className="display-5 fw-black text-danger">
                                {
                                    requests.length
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {endpointErrors.length >
                0 && (
                <div className="alert alert-warning border-0 rounded-4 shadow-sm mb-4">
                    <div className="d-flex gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div>
                            <div className="fw-bold mb-1">
                                Sebagian data belum dapat dimuat
                            </div>

                            <div className="small">
                                Modul yang belum tersedia:{' '}

                                <strong>
                                    {endpointErrors.join(
                                        ', '
                                    )}
                                </strong>
                                .
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="row g-3 mb-4">
                {[
                    {
                        label:
                            'Menunggu',

                        value:
                            statusCounts.pending,

                        icon:
                            'bi-hourglass-split',

                        className:
                            'bg-warning-subtle text-warning',
                    },

                    {
                        label:
                            'Perlu Revisi',

                        value:
                            statusCounts.revision,

                        icon:
                            'bi-pencil-square',

                        className:
                            'bg-info-subtle text-info',
                    },

                    {
                        label:
                            'Disetujui',

                        value:
                            statusCounts.approved,

                        icon:
                            'bi-check-circle-fill',

                        className:
                            'bg-success-subtle text-success',
                    },

                    {
                        label:
                            'Ditolak',

                        value:
                            statusCounts.rejected,

                        icon:
                            'bi-x-circle-fill',

                        className:
                            'bg-danger-subtle text-danger',
                    },

                    {
                        label:
                            'Selesai',

                        value:
                            statusCounts.completed,

                        icon:
                            'bi-check2-all',

                        className:
                            'bg-primary-subtle text-primary',
                    },
                ].map(
                    (
                        statistic
                    ) => (
                        <div
                            className="col-6 col-lg-4 col-xl"
                            key={
                                statistic.label
                            }
                        >
                            <div className="card border-0 shadow-sm rounded-4 h-100">
                                <div className="card-body p-3 p-lg-4">
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <div>
                                            <div className="small text-muted fw-bold mb-1">
                                                {
                                                    statistic.label
                                                }
                                            </div>

                                            <div className="fs-2 fw-black">
                                                {
                                                    statistic.value
                                                }
                                            </div>
                                        </div>

                                        <div
                                            className={`icon-box ${statistic.className}`}
                                        >
                                            <i
                                                className={`bi ${statistic.icon}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Cari pengajuan
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-white">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Cari kode, unit, liputan, lokasi..."
                                    value={
                                        searchKeyword
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearchKeyword(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <label className="form-label fw-bold">
                                Status
                            </label>

                            <select
                                className="form-select"
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
                                {STATUS_OPTIONS.map(
                                    (
                                        option
                                    ) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="col-md-6 col-lg-4">
                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={
                                        resetFilters
                                    }
                                >
                                    <i className="bi bi-arrow-counterclockwise me-2" />

                                    Reset
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger rounded-pill"
                                    onClick={() =>
                                        fetchRequests(
                                            true
                                        )
                                    }
                                    disabled={
                                        refreshing
                                    }
                                >
                                    {refreshing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />

                                            Memuat...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-arrow-clockwise me-2" />

                                            Refresh
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="card-header bg-white border-0 p-3 p-lg-4">
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={`btn rounded-pill ${
                                activeType ===
                                'all'
                                    ? 'btn-dark'
                                    : 'btn-light border'
                            }`}
                            onClick={() =>
                                setActiveType(
                                    'all'
                                )
                            }
                        >
                            <i className="bi bi-grid-fill me-2" />

                            Semua

                            <span className="badge bg-white text-dark ms-2">
                                {
                                    requestCounts.all
                                }
                            </span>
                        </button>

                        {Object.entries(
                            REQUEST_TYPES
                        ).map(
                            ([
                                typeKey,
                                typeConfig,
                            ]) => (
                                <button
                                    key={
                                        typeKey
                                    }
                                    type="button"
                                    className={`btn rounded-pill ${
                                        activeType ===
                                        typeKey
                                            ? `btn-${typeConfig.color}`
                                            : 'btn-light border'
                                    }`}
                                    onClick={() =>
                                        setActiveType(
                                            typeKey
                                        )
                                    }
                                >
                                    <i
                                        className={`bi ${typeConfig.icon} me-2`}
                                    />

                                    {
                                        typeConfig.label
                                    }

                                    <span
                                        className={`badge ms-2 ${
                                            activeType ===
                                            typeKey
                                                ? 'bg-white text-dark'
                                                : 'text-bg-secondary'
                                        }`}
                                    >
                                        {
                                            requestCounts[
                                                typeKey
                                            ]
                                        }
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className="card-body p-0">
                    {filteredRequests.length ===
                    0 ? (
                        <div className="text-center py-5 px-4">
                            <div
                                className="mx-auto mb-3 rounded-circle bg-light d-flex align-items-center justify-content-center"
                                style={{
                                    width: 82,
                                    height: 82,
                                }}
                            >
                                <i className="bi bi-inbox-fill fs-1 text-muted" />
                            </div>

                            <h5 className="fw-black mb-2">
                                Pengajuan tidak ditemukan
                            </h5>

                            <p className="text-muted mb-3">
                                Belum ada data yang sesuai dengan filter.
                            </p>

                            <button
                                type="button"
                                className="btn btn-outline-danger rounded-pill"
                                onClick={
                                    resetFilters
                                }
                            >
                                Tampilkan Semua
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-4 py-3">
                                            Pengajuan
                                        </th>

                                        <th className="py-3">
                                            Jenis Layanan
                                        </th>

                                        <th className="py-3">
                                            Tanggal
                                        </th>

                                        <th className="py-3">
                                            Status
                                        </th>

                                        <th className="text-end pe-4 py-3">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRequests.map(
                                        (
                                            item
                                        ) => {
                                            const typeConfig =
                                                REQUEST_TYPES[
                                                    item.requestType
                                                ];

                                            const statusConfig =
                                                getStatusConfig(
                                                    item.status
                                                );

                                            const hasHumasResult =
                                                item.requestType ===
                                                    'humas' &&
                                                item.status ===
                                                    'completed' &&
                                                Boolean(
                                                    item.resultUrl
                                                );

                                            return (
                                                <tr
                                                    key={`${item.requestType}-${item.id}`}
                                                >
                                                    <td className="ps-4 py-3">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div
                                                                className={`icon-box bg-${typeConfig.color}-subtle text-${typeConfig.color}`}
                                                            >
                                                                <i
                                                                    className={`bi ${
                                                                        item.requestType ===
                                                                        'humas'
                                                                            ? item.coverageIcon
                                                                            : typeConfig.icon
                                                                    }`}
                                                                />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="fw-black text-dark mb-1">
                                                                    {
                                                                        item.requestTitle
                                                                    }
                                                                </div>

                                                                <div
                                                                    className="small text-muted text-truncate"
                                                                    style={{
                                                                        maxWidth: 340,
                                                                    }}
                                                                >
                                                                    {
                                                                        item.requestDescription
                                                                    }
                                                                </div>

                                                                {item.requestMeta && (
                                                                    <div className="small text-muted mt-1">
                                                                        <i className="bi bi-info-circle me-1" />

                                                                        {
                                                                            item.requestMeta
                                                                        }
                                                                    </div>
                                                                )}

                                                                <div className="small text-danger fw-bold mt-1">
                                                                    {
                                                                        item.requestCode
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3">
                                                        <span
                                                            className={`badge rounded-pill bg-${typeConfig.color}-subtle text-${typeConfig.color} px-3 py-2`}
                                                        >
                                                            {item.requestType ===
                                                            'humas'
                                                                ? item.coverageLabel
                                                                : typeConfig.singularLabel}
                                                        </span>
                                                    </td>

                                                    <td className="py-3">
                                                        <div className="fw-bold">
                                                            {formatDate(
                                                                item.requestDate
                                                            )}
                                                        </div>

                                                        <div className="small text-muted">
                                                            Diperbarui:{' '}

                                                            {formatDateTime(
                                                                item.updatedDate
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-3">
                                                        <span
                                                            className={`badge rounded-pill ${statusConfig.badgeClass} px-3 py-2`}
                                                        >
                                                            <i
                                                                className={`bi ${statusConfig.icon} me-2`}
                                                            />

                                                            {
                                                                statusConfig.label
                                                            }
                                                        </span>

                                                        {hasHumasResult && (
                                                            <div className="mt-2">
                                                                <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">
                                                                    <i className="bi bi-cloud-check-fill me-2" />

                                                                    Hasil Tersedia
                                                                </span>
                                                            </div>
                                                        )}

                                                        {item.status ===
                                                            'rejected' &&
                                                            item.admin_note && (
                                                                <div
                                                                    className="small text-danger mt-2 text-truncate"
                                                                    style={{
                                                                        maxWidth: 220,
                                                                    }}
                                                                    title={
                                                                        item.admin_note
                                                                    }
                                                                >
                                                                    {
                                                                        item.admin_note
                                                                    }
                                                                </div>
                                                            )}

                                                        {item.requestType ===
                                                            'merchandise' &&
                                                            item.status ===
                                                                'revision' && (
                                                                <div
                                                                    className="small text-info-emphasis mt-2 text-truncate"
                                                                    style={{
                                                                        maxWidth: 220,
                                                                    }}
                                                                    title={
                                                                        item.admin_note
                                                                    }
                                                                >
                                                                    {item.admin_note ||
                                                                        'Pengajuan perlu diperbaiki.'}
                                                                </div>
                                                            )}
                                                    </td>

                                                    <td className="text-end pe-4 py-3">
                                                        <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                                                            {hasHumasResult && (
                                                                <a
                                                                    href={
                                                                        item.resultUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="btn btn-sm btn-success rounded-pill px-3"
                                                                >
                                                                    <i className="bi bi-box-arrow-up-right me-2" />

                                                                    Buka Hasil
                                                                </a>
                                                            )}

                                                            <Link
                                                                to={getDetailPath(
                                                                    item
                                                                )}
                                                                className={`btn btn-sm rounded-pill px-3 ${
                                                                    item.requestType ===
                                                                        'merchandise' &&
                                                                    item.status ===
                                                                        'revision'
                                                                        ? 'btn-info text-white'
                                                                        : 'btn-outline-danger'
                                                                }`}
                                                            >
                                                                <i
                                                                    className={`bi ${
                                                                        item.requestType ===
                                                                            'merchandise' &&
                                                                        item.status ===
                                                                            'revision'
                                                                            ? 'bi-pencil-square'
                                                                            : 'bi-eye-fill'
                                                                    } me-2`}
                                                                />

                                                                {item.requestType ===
                                                                    'merchandise' &&
                                                                item.status ===
                                                                    'revision'
                                                                    ? 'Perbaiki'
                                                                    : 'Detail'}
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card-footer bg-white border-0 p-3 p-lg-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="small text-muted">
                            Menampilkan{' '}

                            <strong>
                                {
                                    filteredRequests.length
                                }
                            </strong>{' '}

                            dari{' '}

                            <strong>
                                {
                                    requests.length
                                }
                            </strong>{' '}

                            pengajuan.
                        </div>

                        <div className="small text-muted">
                            Pengajuan ditampilkan dari yang terbaru.
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}