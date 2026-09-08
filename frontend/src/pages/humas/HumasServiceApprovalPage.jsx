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

import {
    showErrorAlert,
} from '../../utils/sweetAlert';

const TYPE_BORROW =
    'borrow';

const TYPE_ASSET_REQUEST =
    'asset_request';

/*
|--------------------------------------------------------------------------
| FILTER TYPE
|--------------------------------------------------------------------------
*/

const requestTypeOptions = [
    {
        key:
            'all',

        label:
            'Semua Jenis',

        icon:
            'bi-grid-fill',
    },

    {
        key:
            TYPE_BORROW,

        label:
            'Peminjaman Barang',

        icon:
            'bi-box-arrow-up-right',
    },

    {
        key:
            TYPE_ASSET_REQUEST,

        label:
            'Request Barang',

        icon:
            'bi-box2-heart-fill',
    },
];

/*
|--------------------------------------------------------------------------
| FILTER STATUS
|--------------------------------------------------------------------------
*/

const statusOptions = [
    {
        key:
            'all',

        label:
            'Semua',

        icon:
            'bi-collection-fill',
    },

    {
        key:
            'pending',

        label:
            'Menunggu',

        icon:
            'bi-hourglass-split',
    },

    {
        key:
            'approved',

        label:
            'Disetujui',

        icon:
            'bi-check-circle-fill',
    },

    {
        key:
            'borrowed',

        label:
            'Dipinjam',

        icon:
            'bi-box-arrow-up-right',
    },

    {
        key:
            'returned',

        label:
            'Dikembalikan',

        icon:
            'bi-box-arrow-in-down-left',
    },

    {
        key:
            'completed',

        label:
            'Selesai',

        icon:
            'bi-check2-all',
    },

    {
        key:
            'rejected',

        label:
            'Ditolak',

        icon:
            'bi-x-circle-fill',
    },
];

/*
|--------------------------------------------------------------------------
| STATUS CONFIG
|--------------------------------------------------------------------------
*/

const STATUS_CONFIG = {
    pending: {
        label:
            'Menunggu',

        className:
            'bg-warning-subtle text-warning-emphasis',

        icon:
            'bi-hourglass-split',
    },

    approved: {
        label:
            'Disetujui',

        className:
            'bg-primary-subtle text-primary',

        icon:
            'bi-check-circle-fill',
    },

    borrowed: {
        label:
            'Sedang Dipinjam',

        className:
            'bg-info-subtle text-info-emphasis',

        icon:
            'bi-box-arrow-up-right',
    },

    returned: {
        label:
            'Dikembalikan',

        className:
            'bg-success-subtle text-success',

        icon:
            'bi-box-arrow-in-down-left',
    },

    completed: {
        label:
            'Selesai',

        className:
            'bg-success-subtle text-success',

        icon:
            'bi-check2-all',
    },

    rejected: {
        label:
            'Ditolak',

        className:
            'bg-danger-subtle text-danger',

        icon:
            'bi-x-circle-fill',
    },
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getRequestType = (
    request
) => {
    /*
     * Data lama tanpa request_type
     * dianggap sebagai Peminjaman Barang.
     */
    return (
        request
            ?.request_type ||
        TYPE_BORROW
    );
};

const getRequestTypeLabel = (
    requestType
) => {
    if (
        requestType ===
        TYPE_ASSET_REQUEST
    ) {
        return 'Request Barang';
    }

    return 'Peminjaman Barang';
};

const getRequestTypeIcon = (
    requestType
) => {
    if (
        requestType ===
        TYPE_ASSET_REQUEST
    ) {
        return 'bi-box2-heart-fill';
    }

    return 'bi-box-arrow-up-right';
};

const getRequestTypeClass = (
    requestType
) => {
    if (
        requestType ===
        TYPE_ASSET_REQUEST
    ) {
        return 'bg-primary-subtle text-primary';
    }

    return 'bg-success-subtle text-success';
};

const formatDate = (
    date
) => {
    if (
        !date
    ) {
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
        ] =
            date
                .split('-')
                .map(
                    Number
                );

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                day:
                    '2-digit',

                month:
                    'short',

                year:
                    'numeric',
            }
        );
    }

    const parsedDate =
        new Date(
            date
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
                day:
                    '2-digit',

                month:
                    'short',

                year:
                    'numeric',
            }
        );
};

const formatDateTime = (
    date
) => {
    if (
        !date
    ) {
        return '-';
    }

    const parsedDate =
        new Date(
            date
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
                day:
                    '2-digit',

                month:
                    'short',

                year:
                    'numeric',

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                hour12:
                    false,
            }
        );
};

const extractErrorMessage = (
    error
) => {
    const responseData =
        error
            ?.response
            ?.data;

    if (
        responseData
            ?.errors
    ) {
        const firstError =
            Object.values(
                responseData
                    .errors
            )
                .flat()
                .find(
                    Boolean
                );

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        responseData
            ?.message ||
        'Data approval SEKPiM gagal dimuat.'
    );
};

const StatusBadge = ({
    status,
}) => {
    const config =
        STATUS_CONFIG[
            status
        ] || {
            label:
                status ||
                '-',

            className:
                'bg-secondary-subtle text-secondary',

            icon:
                'bi-circle-fill',
        };

    return (
        <span
            className={`badge rounded-pill px-3 py-2 ${config.className}`}
        >
            <i
                className={`bi ${config.icon} me-2`}
            />

            {
                config.label
            }
        </span>
    );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function BorrowingApprovalPage() {
    const [
        borrowRequests,
        setBorrowRequests,
    ] =
        useState(
            []
        );

    const [
        selectedStatus,
        setSelectedStatus,
    ] =
        useState(
            'all'
        );

    const [
        selectedType,
        setSelectedType,
    ] =
        useState(
            'all'
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            ''
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    /*
    |--------------------------------------------------------------------------
    | LOAD DATA
    |--------------------------------------------------------------------------
    */

    const fetchBorrowRequests =
        useCallback(
            async (
                showLoader =
                    true
            ) => {
                try {
                    if (
                        showLoader
                    ) {
                        setLoading(
                            true
                        );
                    }

                    const response =
                        await api.get(
                            '/borrow-requests'
                        );

                    const responseData =
                        response
                            ?.data
                            ?.data;

                    setBorrowRequests(
                        Array.isArray(
                            responseData
                        )
                            ? responseData
                            : []
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch SEKPiM approval error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Data',
                        extractErrorMessage(
                            error
                        )
                    );
                } finally {
                    if (
                        showLoader
                    ) {
                        setLoading(
                            false
                        );
                    }
                }
            },
            []
        );

    useEffect(
        () => {
            fetchBorrowRequests();

            const intervalId =
                window.setInterval(
                    () => {
                        fetchBorrowRequests(
                            false
                        );
                    },
                    30000
                );

            return () => {
                window.clearInterval(
                    intervalId
                );
            };
        },
        [
            fetchBorrowRequests,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */

    const filteredBorrowRequests =
        useMemo(
            () => {
                const searchValue =
                    search
                        .trim()
                        .toLowerCase();

                return borrowRequests.filter(
                    (
                        request
                    ) => {
                        const requestType =
                            getRequestType(
                                request
                            );

                        const matchStatus =
                            selectedStatus ===
                                'all' ||
                            request
                                .status ===
                                selectedStatus;

                        const matchType =
                            selectedType ===
                                'all' ||
                            requestType ===
                                selectedType;

                        const searchableText = [
                            request
                                .borrow_code,

                            request
                                .purpose,

                            request
                                .pic_name,

                            request
                                .pic_phone,

                            request
                                .user
                                ?.name,

                            request
                                .user
                                ?.email,

                            request
                                .admin_note,

                            getRequestTypeLabel(
                                requestType
                            ),

                            ...(
                                Array.isArray(
                                    request
                                        .items
                                )
                                    ? request
                                          .items
                                          .map(
                                              (
                                                  item
                                              ) =>
                                                  item
                                                      ?.product
                                                      ?.name
                                          )
                                    : []
                            ),
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' '
                            )
                            .toLowerCase();

                        const matchSearch =
                            !searchValue ||
                            searchableText.includes(
                                searchValue
                            );

                        return (
                            matchStatus &&
                            matchType &&
                            matchSearch
                        );
                    }
                );
            },
            [
                borrowRequests,
                selectedStatus,
                selectedType,
                search,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    const summary =
        useMemo(
            () => {
                const statusSummary =
                    statusOptions.reduce(
                        (
                            result,
                            status
                        ) => {
                            if (
                                status
                                    .key ===
                                'all'
                            ) {
                                result[
                                    status
                                        .key
                                ] =
                                    borrowRequests
                                        .length;

                                return result;
                            }

                            result[
                                status.key
                            ] =
                                borrowRequests.filter(
                                    (
                                        request
                                    ) =>
                                        request
                                            .status ===
                                        status
                                            .key
                                ).length;

                            return result;
                        },
                        {}
                    );

                const borrowCount =
                    borrowRequests.filter(
                        (
                            request
                        ) =>
                            getRequestType(
                                request
                            ) ===
                            TYPE_BORROW
                    ).length;

                const assetRequestCount =
                    borrowRequests.filter(
                        (
                            request
                        ) =>
                            getRequestType(
                                request
                            ) ===
                            TYPE_ASSET_REQUEST
                    ).length;

                return {
                    ...statusSummary,

                    borrow:
                        borrowCount,

                    asset_request:
                        assetRequestCount,
                };
            },
            [
                borrowRequests,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | RESET FILTER
    |--------------------------------------------------------------------------
    */

    const resetFilters =
        () => {
            setSelectedStatus(
                'all'
            );

            setSelectedType(
                'all'
            );

            setSearch(
                ''
            );
        };

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* HERO */}

            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-success px-3 py-2 mb-3">
                                Approval SEKPiM
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Daftar Pengajuan SEKPiM
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
                                Kelola Peminjaman Barang dan Request Barang SEKPiM dalam satu halaman. Setiap jenis pengajuan memiliki alur proses dan pengelolaan stok yang berbeda.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.all ||
                                                0}
                                        </div>

                                        <div className="small text-white-50">
                                            Total
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.pending ||
                                                0}
                                        </div>

                                        <div className="small text-white-50">
                                            Menunggu
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.borrow ||
                                                0}
                                        </div>

                                        <div className="small text-white-50">
                                            Peminjaman
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary
                                                .asset_request ||
                                                0}
                                        </div>

                                        <div className="small text-white-50">
                                            Request Barang
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FILTER */}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-4">
                        <div className="col-xl-4">
                            <label className="form-label fw-bold">
                                Cari Pengajuan
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-light">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Kode, pemohon, PIC, barang..."
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="col-xl-8">
                            <label className="form-label fw-bold">
                                Jenis Pengajuan
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                {requestTypeOptions.map(
                                    (
                                        type
                                    ) => (
                                        <button
                                            key={
                                                type.key
                                            }
                                            type="button"
                                            className={`btn rounded-pill ${
                                                selectedType ===
                                                type.key
                                                    ? 'btn-dark'
                                                    : 'btn-outline-dark'
                                            }`}
                                            onClick={() =>
                                                setSelectedType(
                                                    type.key
                                                )
                                            }
                                        >
                                            <i
                                                className={`bi ${type.icon} me-2`}
                                            />

                                            {
                                                type.label
                                            }

                                            {type.key !==
                                                'all' && (
                                                <span className="ms-2 badge rounded-pill bg-light text-dark">
                                                    {
                                                        summary[
                                                            type
                                                                .key
                                                        ] ||
                                                        0
                                                    }
                                                </span>
                                            )}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="form-label fw-bold">
                                Status
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                {statusOptions.map(
                                    (
                                        status
                                    ) => (
                                        <button
                                            key={
                                                status.key
                                            }
                                            type="button"
                                            className={`btn rounded-pill ${
                                                selectedStatus ===
                                                status.key
                                                    ? 'btn-success'
                                                    : 'btn-outline-success'
                                            }`}
                                            onClick={() =>
                                                setSelectedStatus(
                                                    status.key
                                                )
                                            }
                                        >
                                            <i
                                                className={`bi ${status.icon} me-2`}
                                            />

                                            {
                                                status.label
                                            }

                                            <span className="ms-2 badge rounded-pill text-bg-light text-success">
                                                {
                                                    summary[
                                                        status
                                                            .key
                                                    ] ||
                                                    0
                                                }
                                            </span>
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    onClick={
                                        resetFilters
                                    }
                                >
                                    <i className="bi bi-arrow-counterclockwise me-2" />

                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTENT */}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-success mb-3" />

                        <h5 className="fw-black mb-1">
                            Memuat Pengajuan SEKPiM
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            ) : filteredBorrowRequests.length ===
              0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{
                                width:
                                    76,

                                height:
                                    76,
                            }}
                        >
                            <i className="bi bi-inbox fs-1" />
                        </div>

                        <h5 className="fw-black mb-2">
                            Data Tidak Ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Tidak ada pengajuan SEKPiM berdasarkan filter yang dipilih.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-secondary rounded-pill"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredBorrowRequests.map(
                        (
                            request
                        ) => {
                            const requestType =
                                getRequestType(
                                    request
                                );

                            const isBorrow =
                                requestType ===
                                TYPE_BORROW;

                            return (
                                <div
                                    className="col-12"
                                    key={
                                        request.id
                                    }
                                >
                                    <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                        <div className="card-body p-4">
                                            <div className="row g-4 align-items-center">
                                                <div className="col-xl-5">
                                                    <div className="d-flex gap-3">
                                                        <div
                                                            className={`icon-box ${getRequestTypeClass(
                                                                requestType
                                                            )}`}
                                                        >
                                                            <i
                                                                className={`bi ${getRequestTypeIcon(
                                                                    requestType
                                                                )} fs-4`}
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                                <span
                                                                    className={`badge rounded-pill px-3 py-2 ${getRequestTypeClass(
                                                                        requestType
                                                                    )}`}
                                                                >
                                                                    <i
                                                                        className={`bi ${getRequestTypeIcon(
                                                                            requestType
                                                                        )} me-2`}
                                                                    />

                                                                    {getRequestTypeLabel(
                                                                        requestType
                                                                    )}
                                                                </span>

                                                                <StatusBadge
                                                                    status={
                                                                        request
                                                                            .status
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="small text-muted mb-1">
                                                                {
                                                                    request
                                                                        .borrow_code ||
                                                                    `REQ-${request.id}`
                                                                }
                                                            </div>

                                                            <h5 className="fw-black mb-2">
                                                                {request
                                                                    .purpose ||
                                                                    getRequestTypeLabel(
                                                                        requestType
                                                                    )}
                                                            </h5>

                                                            <div className="text-muted">
                                                                Pemohon:{' '}

                                                                <strong className="text-dark">
                                                                    {request
                                                                        .user
                                                                        ?.name ||
                                                                        '-'}
                                                                </strong>
                                                            </div>

                                                            {request
                                                                .pic_name && (
                                                                <div className="small text-muted mt-1">
                                                                    PIC:{' '}

                                                                    <strong>
                                                                        {
                                                                            request
                                                                                .pic_name
                                                                        }
                                                                    </strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-4 col-xl-2">
                                                    <div className="small text-muted mb-1">
                                                        Tanggal Kegiatan
                                                    </div>

                                                    <div className="fw-bold">
                                                        {formatDate(
                                                            request
                                                                .activity_date
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-md-4 col-xl-2">
                                                    <div className="small text-muted mb-1">
                                                        Tanggal Pengambilan
                                                    </div>

                                                    <div className="fw-bold">
                                                        {formatDate(
                                                            request
                                                                .borrow_date
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-md-4 col-xl-1">
                                                    <div className="small text-muted mb-1">
                                                        {isBorrow
                                                            ? 'Pengembalian'
                                                            : 'Item'}
                                                    </div>

                                                    <div className="fw-bold">
                                                        {isBorrow
                                                            ? formatDate(
                                                                  request
                                                                      .return_date
                                                              )
                                                            : `${
                                                                  Array.isArray(
                                                                      request
                                                                          .items
                                                                  )
                                                                      ? request
                                                                            .items
                                                                            .length
                                                                      : 0
                                                              } item`}
                                                    </div>
                                                </div>

                                                <div className="col-xl-2 text-xl-end">
                                                    <div className="small text-muted mb-2">
                                                        {formatDateTime(
                                                            request
                                                                .submitted_at ||
                                                                request
                                                                    .created_at
                                                        )}
                                                    </div>

                                                    <Link
                                                        to={`/admin/borrow-requests/${request.id}`}
                                                        className={`btn rounded-pill ${
                                                            isBorrow
                                                                ? 'btn-success'
                                                                : 'btn-primary'
                                                        }`}
                                                    >
                                                        <i className="bi bi-eye-fill me-2" />

                                                        Detail
                                                    </Link>
                                                </div>
                                            </div>

                                            {request
                                                .admin_note && (
                                                <div
                                                    className={`mt-4 p-3 rounded-4 border ${
                                                        request
                                                            .status ===
                                                        'rejected'
                                                            ? 'bg-danger-subtle'
                                                            : 'bg-light'
                                                    }`}
                                                >
                                                    <div className="small fw-bold text-muted mb-1">
                                                        Catatan Admin
                                                    </div>

                                                    <p className="mb-0">
                                                        {
                                                            request
                                                                .admin_note
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}