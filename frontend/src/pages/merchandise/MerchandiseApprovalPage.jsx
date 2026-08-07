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

import api from '../../api/axios';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from '../../components/ProtectedRoute';

import {
    showErrorAlert,
} from '../../utils/sweetAlert';

const STATUS_OPTIONS = [
    {
        key: 'all',
        label: 'Semua',
        icon: 'bi-collection-fill',
    },
    {
        key: 'pending',
        label: 'Menunggu',
        icon: 'bi-hourglass-split',
    },
    {
        key: 'approved',
        label: 'Disetujui',
        icon: 'bi-check-circle-fill',
    },
    {
        key: 'rejected',
        label: 'Ditolak',
        icon: 'bi-x-circle-fill',
    },
    {
        key: 'completed',
        label: 'Selesai',
        icon: 'bi-patch-check-fill',
    },
];

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        className: 'status-pending',
    },
    approved: {
        label: 'Disetujui',
        className: 'status-approved',
    },
    rejected: {
        label: 'Ditolak',
        className: 'status-rejected',
    },
    completed: {
        label: 'Selesai',
        className: 'status-completed',
    },
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

const getBackendErrorMessage = (
    error,
    fallbackMessage
) => {
    const responseData =
        error?.response?.data;

    if (responseData?.errors) {
        const firstError =
            Object.values(
                responseData.errors
            )?.[0]?.[0];

        if (firstError) {
            return firstError;
        }
    }

    return (
        responseData?.message ||
        fallbackMessage
    );
};

const formatDate = (date) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date === 'string' &&
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

const formatDateTime = (date) => {
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

const getStatusConfig = (status) => {
    return (
        STATUS_CONFIG[status] || {
            label:
                status ||
                'Tidak diketahui',
            className:
                'status-secondary',
        }
    );
};

export default function MerchandiseApprovalPage() {
    const currentUser =
        getStoredUser();

    const defaultPath =
        getDefaultPath(
            currentUser
        );

    const canView =
        hasPermission(
            currentUser,
            'approval.merchandise.view'
        );

    const [
        orders,
        setOrders,
    ] = useState([]);

    const [
        selectedStatus,
        setSelectedStatus,
    ] = useState('all');

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const fetchOrders =
        useCallback(
            async (
                refresh = false
            ) => {
                if (!canView) {
                    setLoading(false);
                    setRefreshing(false);
                    setOrders([]);

                    return;
                }

                try {
                    if (refresh) {
                        setRefreshing(true);
                    } else {
                        setLoading(true);
                    }

                    const response =
                        await api.get(
                            '/orders'
                        );

                    setOrders(
                        extractArray(
                            response
                        )
                    );
                } catch (error) {
                    console.error(
                        'Fetch merchandise approval error:',
                        error?.response?.data ||
                            error
                    );

                    setOrders([]);

                    await showErrorAlert(
                        'Gagal Memuat Data',
                        getBackendErrorMessage(
                            error,
                            'Data approval merchandise gagal dimuat.'
                        )
                    );
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [canView]
        );

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filteredOrders =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return orders.filter(
                (order) => {
                    const matchStatus =
                        selectedStatus ===
                            'all' ||
                        order.status ===
                            selectedStatus;

                    const searchableText = [
                        order.order_code,
                        order.event_name,
                        order.institution_name,
                        order.guest_name,
                        order.guest_position,
                        order.user?.name,
                        order.user?.username,
                        order.user_note,
                        order.admin_note,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();

                    const matchSearch =
                        !searchValue ||
                        searchableText.includes(
                            searchValue
                        );

                    return (
                        matchStatus &&
                        matchSearch
                    );
                }
            );
        }, [
            orders,
            selectedStatus,
            search,
        ]);

    const summary =
        useMemo(() => {
            return STATUS_OPTIONS.reduce(
                (
                    result,
                    status
                ) => {
                    result[status.key] =
                        status.key ===
                        'all'
                            ? orders.length
                            : orders.filter(
                                (order) =>
                                    order.status ===
                                    status.key
                            ).length;

                    return result;
                },
                {}
            );
        }, [orders]);

    const resetFilters = () => {
        setSearch('');
        setSelectedStatus('all');
    };

    if (!canView) {
        return (
            <Navigate
                to={defaultPath}
                replace
            />
        );
    }

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Approval Merchandise
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Daftar pengajuan merchandise.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                Periksa pengajuan, informasi tamu, lampiran,
                                item merchandise, dan status proses pada halaman detail.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.all || 0}
                                        </div>

                                        <div className="small text-white-50">
                                            Total
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.pending || 0}
                                        </div>

                                        <div className="small text-white-50">
                                            Menunggu
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.approved || 0}
                                        </div>

                                        <div className="small text-white-50">
                                            Disetujui
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.completed || 0}
                                        </div>

                                        <div className="small text-white-50">
                                            Selesai
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Cari pengajuan
                            </label>

                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Kode, kegiatan, instansi, tamu, pemohon..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="col-lg-7">
                            <label className="form-label fw-bold">
                                Filter status
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(
                                    (status) => (
                                        <button
                                            key={status.key}
                                            type="button"
                                            className={`btn rounded-pill ${
                                                selectedStatus ===
                                                status.key
                                                    ? 'btn-primary ring-active'
                                                    : 'btn-outline-primary'
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

                                            {status.label}

                                            <span className="ms-2 badge rounded-pill text-bg-light text-primary">
                                                {summary[
                                                    status.key
                                                ] || 0}
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill"
                            onClick={resetFilters}
                        >
                            <i className="bi bi-arrow-counterclockwise me-2" />

                            Reset Filter
                        </button>

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary rounded-pill"
                            onClick={() =>
                                fetchOrders(true)
                            }
                            disabled={refreshing}
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
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-primary mb-3" />

                        <p className="text-muted mb-0">
                            Memuat data approval merchandise...
                        </p>
                    </div>
                </div>
            ) : filteredOrders.length ===
              0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{
                                width: 76,
                                height: 76,
                            }}
                        >
                            <i className="bi bi-inbox fs-1" />
                        </div>

                        <h5 className="fw-black mb-2">
                            Data tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Tidak ada pengajuan berdasarkan filter yang dipilih.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-primary rounded-pill"
                            onClick={resetFilters}
                        >
                            Tampilkan Semua
                        </button>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredOrders.map(
                        (order) => {
                            const statusConfig =
                                getStatusConfig(
                                    order.status
                                );

                            return (
                                <div
                                    className="col-12"
                                    key={order.id}
                                >
                                    <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                        <div className="card-body p-4">
                                            <div className="row g-4 align-items-center">
                                                <div className="col-lg-6">
                                                    <div className="d-flex gap-3">
                                                        <div className="icon-box bg-primary-subtle text-primary flex-shrink-0">
                                                            <i className="bi bi-gift-fill fs-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                                <span className="badge rounded-pill text-bg-primary">
                                                                    {order.order_code ||
                                                                        `MER-${order.id}`}
                                                                </span>

                                                                <span
                                                                    className={`status ${statusConfig.className}`}
                                                                >
                                                                    {
                                                                        statusConfig.label
                                                                    }
                                                                </span>
                                                            </div>

                                                            <h5 className="fw-black mb-1 text-break">
                                                                {order.event_name ||
                                                                    'Pengajuan Merchandise'}
                                                            </h5>

                                                            <p className="text-muted mb-0">
                                                                Pemohon:{' '}

                                                                <strong>
                                                                    {order.user
                                                                        ?.name ||
                                                                        '-'}
                                                                </strong>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-2">
                                                    <div className="small text-muted">
                                                        Instansi
                                                    </div>

                                                    <div className="fw-bold text-break">
                                                        {order.institution_name ||
                                                            '-'}
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-2">
                                                    <div className="small text-muted">
                                                        Tanggal kegiatan
                                                    </div>

                                                    <div className="fw-bold">
                                                        {formatDate(
                                                            order.activity_date
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-lg-2 text-lg-end">
                                                    <div className="small text-muted mb-2">
                                                        {formatDateTime(
                                                            order.submitted_at ||
                                                                order.created_at
                                                        )}
                                                    </div>

                                                    <Link
                                                        to={`/admin/orders/${order.id}`}
                                                        className="btn btn-primary rounded-pill"
                                                    >
                                                        <i className="bi bi-eye-fill me-2" />

                                                        Detail
                                                    </Link>
                                                </div>
                                            </div>

                                            {order.admin_note && (
                                                <div className="mt-3 p-3 rounded-4 bg-light border">
                                                    <div className="small fw-bold text-muted mb-1">
                                                        Catatan admin terakhir
                                                    </div>

                                                    <p
                                                        className="mb-0 text-muted"
                                                        style={{
                                                            whiteSpace:
                                                                'pre-line',
                                                        }}
                                                    >
                                                        {
                                                            order.admin_note
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