import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const SERVICE_TYPES = {
    merchandise: {
        label: 'Merchandise',
        icon: 'bi-gift-fill',
        color: 'primary',
    },
    humas: {
        label: 'Layanan Humas',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
    },
    sekpim_borrow: {
        label: 'Peminjaman Barang',
        icon: 'bi-box-arrow-up-right',
        color: 'success',
    },
    sekpim_asset_request: {
        label: 'Request Barang',
        icon: 'bi-box2-heart-fill',
        color: 'info',
    },
    directorate_schedule: {
        label: 'Jadwal Direktorat',
        icon: 'bi-calendar2-check-fill',
        color: 'danger',
    },
};

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        className: 'text-bg-warning',
        icon: 'bi-hourglass-split',
    },
    revision: {
        label: 'Perlu Revisi',
        className: 'text-bg-info',
        icon: 'bi-pencil-square',
    },
    approved: {
        label: 'Disetujui',
        className: 'text-bg-success',
        icon: 'bi-check-circle-fill',
    },
    rejected: {
        label: 'Ditolak',
        className: 'text-bg-danger',
        icon: 'bi-x-circle-fill',
    },
    completed: {
        label: 'Selesai',
        className: 'text-bg-primary',
        icon: 'bi-check2-all',
    },
    borrowed: {
        label: 'Sedang Dipinjam',
        className: 'text-bg-info',
        icon: 'bi-box-arrow-up-right',
    },
    returned: {
        label: 'Dikembalikan',
        className: 'text-bg-secondary',
        icon: 'bi-box-arrow-in-down-left',
    },
};

const STATUS_OPTIONS = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'revision', label: 'Perlu Revisi' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'borrowed', label: 'Sedang Dipinjam' },
    { value: 'returned', label: 'Dikembalikan' },
    { value: 'completed', label: 'Selesai' },
    { value: 'rejected', label: 'Ditolak' },
];

const COVERAGE_LABELS = {
    'REQUEST DESIGN INSTAGRAM': 'Request Design Instagram',
    DOKUMENTASI: 'Dokumentasi',
    'PUBLIKASI WEBSITE': 'Publikasi Website',
    'PUBLIKASI MEDIA MASSA': 'Publikasi Media Massa',
    YOUTUBE: 'YouTube',
    'VIDEO REELS': 'Video Reels',
    'SOCIAL MEDIA': 'Social Media (Data Lama)',
};

const DIRECTORATE_LABELS = {
    direktorat: 'Direktorat',
    direktur: 'Direktur',
    wakil_direktur_1: 'Wakil Direktur I',
    wakil_direktur_2: 'Wakil Direktur II',
};

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
}

function extractArray(response) {
    const data = response?.data?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function formatDate(value) {
    if (!value) return '-';

    let date;

    if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [year, month, day] = value.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateTime(value) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : '-';
}

function getCoverageLabel(value) {
    const types = String(value || '')
        .split(/[;,]/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);

    if (!types.length) return 'Layanan Humas';

    return types
        .map((type) => COVERAGE_LABELS[type] || type)
        .join('; ');
}

function getResolvedUnitName(item) {
    if (item.resolved_unit_name) {
        return item.resolved_unit_name;
    }

    if (item.unit_name === 'Lainnya') {
        return item.other_unit_name || 'Lainnya';
    }

    return (
        item.unit_name ||
        item.requester_unit ||
        item.user?.unit_name ||
        '-'
    );
}

function normalizeExternalUrl(value) {
    if (!value) return null;

    const url = String(value).trim();

    if (!url) return null;

    if (/^https?:\/\//i.test(url)) return url;

    return `https://${url}`;
}

function normalizeMerchandise(item) {
    return {
        ...item,
        requestType: 'merchandise',
        filterType: 'merchandise',
        serviceLabel: 'Merchandise',
        serviceIcon: SERVICE_TYPES.merchandise.icon,
        serviceColor: 'primary',

        requestCode:
            item.order_code ||
            item.code ||
            `MER-${String(item.id).padStart(4, '0')}`,

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

        requestMeta: item.activity_date
            ? `Kegiatan: ${formatDate(item.activity_date)}`
            : '',

        requestDate:
            item.activity_date ||
            item.submitted_at ||
            item.created_at,

        updatedDate:
            item.updated_at ||
            item.resubmitted_at ||
            item.submitted_at ||
            item.created_at,
    };
}

function normalizeHumas(item) {
    const coverageLabel = getCoverageLabel(item.coverage_type);

    return {
        ...item,
        requestType: 'humas',
        filterType: 'humas',
        serviceLabel: coverageLabel,
        serviceIcon: SERVICE_TYPES.humas.icon,
        serviceColor: 'danger',

        requestCode:
            item.service_code ||
            item.code ||
            `LIP-${String(item.id).padStart(4, '0')}`,

        requestTitle: coverageLabel,

        requestDescription:
            item.activity_detail ||
            item.event_location ||
            'Request layanan Humas',

        requestMeta: [
            getResolvedUnitName(item),
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

        resultUrl: normalizeExternalUrl(item.result_link),
    };
}

function normalizeBorrowing(item) {
    const isAssetRequest =
        (item.request_type || 'borrow') === 'asset_request';

    const filterType = isAssetRequest
        ? 'sekpim_asset_request'
        : 'sekpim_borrow';

    const config = SERVICE_TYPES[filterType];

    const products = Array.isArray(item.items)
        ? item.items
              .map((entry) => entry.product?.name)
              .filter(Boolean)
        : [];

    return {
        ...item,

        // Tetap borrowing agar URL detail layanan lama tidak berubah.
        requestType: 'borrowing',
        filterType,

        sekpimRequestType: isAssetRequest
            ? 'asset_request'
            : 'borrow',

        serviceLabel: config.label,
        serviceIcon: config.icon,
        serviceColor: config.color,

        requestCode:
            item.borrow_code ||
            item.code ||
            `${isAssetRequest ? 'REQ' : 'BRW'}-${String(
                item.id
            ).padStart(4, '0')}`,

        requestTitle:
            item.purpose ||
            config.label,

        requestDescription:
            products.join(', ') ||
            item.purpose ||
            config.label,

        requestMeta: [
            item.activity_date
                ? `Kegiatan: ${formatDate(item.activity_date)}`
                : null,

            item.borrow_date
                ? `Pengambilan: ${formatDate(item.borrow_date)}`
                : null,

            !isAssetRequest && item.return_date
                ? `Pengembalian: ${formatDate(item.return_date)}`
                : null,
        ]
            .filter(Boolean)
            .join(' • '),

        requestDate:
            item.activity_date ||
            item.borrow_date ||
            item.submitted_at ||
            item.created_at,

        updatedDate:
            item.updated_at ||
            item.completed_at ||
            item.returned_at ||
            item.borrowed_at ||
            item.approved_at ||
            item.created_at,
    };
}

function normalizeDirectorateSchedule(item) {
    const directorate =
        DIRECTORATE_LABELS[item.directorate] ||
        'Direktorat';

    return {
        ...item,

        requestType: 'directorate_schedule',
        filterType: 'directorate_schedule',

        serviceLabel: 'Jadwal Direktorat',
        serviceIcon: SERVICE_TYPES.directorate_schedule.icon,
        serviceColor: 'danger',

        requestCode: `JAD-${String(item.id).padStart(4, '0')}`,

        requestTitle:
            item.title ||
            'Pengajuan Jadwal Direktorat',

        requestDescription:
            item.description ||
            `Pengajuan agenda untuk ${directorate}`,

        requestMeta: [
            directorate,
            item.event_date
                ? `Tanggal: ${formatDate(item.event_date)}`
                : null,
            item.all_day
                ? 'Sepanjang hari'
                : `${formatTime(item.start_time)} - ${formatTime(
                      item.end_time
                  )}`,
        ]
            .filter(Boolean)
            .join(' • '),

        requestDate:
            item.event_date ||
            item.created_at,

        updatedDate:
            item.updated_at ||
            item.reviewed_at ||
            item.created_at,
    };
}

function StatisticCard({ label, value, icon, className }) {
    return (
        <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-3 p-lg-4">
                    <div className="d-flex align-items-center justify-content-between gap-3">
                        <div>
                            <div className="small text-muted fw-bold mb-1">
                                {label}
                            </div>
                            <div className="fs-2 fw-black">{value}</div>
                        </div>

                        <div className={`icon-box ${className}`}>
                            <i className={`bi ${icon}`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MyRequestsPage() {
    const currentUser = useMemo(() => getCurrentUser(), []);

    const basePath =
        currentUser.role === 'user'
            ? '/user'
            : '/admin';

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeType, setActiveType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const [endpointErrors, setEndpointErrors] = useState([]);

    const fetchRequests = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setEndpointErrors([]);

            const endpoints = [
                {
                    name: 'Merchandise',
                    url: '/my-orders',
                    normalize: normalizeMerchandise,
                },
                {
                    name: 'Layanan Humas',
                    url: '/my-humas-service-requests',
                    normalize: normalizeHumas,
                },
                {
                    name: 'Layanan SEKPiM',
                    url: '/my-borrow-requests',
                    normalize: normalizeBorrowing,
                },
                {
                    name: 'Jadwal Direktorat',
                    url: '/my-event-schedule-requests',
                    normalize: normalizeDirectorateSchedule,
                },
            ];

            const responses = await Promise.allSettled(
                endpoints.map((endpoint) => api.get(endpoint.url))
            );

            const errors = [];
            const combined = [];

            responses.forEach((result, index) => {
                const endpoint = endpoints[index];

                if (result.status === 'rejected') {
                    errors.push(endpoint.name);

                    console.error(
                        `Gagal memuat ${endpoint.name}:`,
                        result.reason?.response?.data || result.reason
                    );

                    return;
                }

                const data = extractArray(result.value);

                combined.push(
                    ...data.map(endpoint.normalize)
                );
            });

            combined.sort((first, second) => {
                const firstTime = new Date(
                    first.updatedDate || first.created_at || 0
                ).getTime();

                const secondTime = new Date(
                    second.updatedDate || second.created_at || 0
                ).getTime();

                return (
                    (Number.isFinite(secondTime) ? secondTime : 0) -
                    (Number.isFinite(firstTime) ? firstTime : 0)
                );
            });

            setRequests(combined);
            setEndpointErrors(errors);
        } catch (error) {
            console.error(
                'Fetch requests error:',
                error?.response?.data || error
            );

            setRequests([]);
            setEndpointErrors([
                'Sistem Riwayat Pengajuan',
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const requestCounts = useMemo(() => {
        const counts = { all: requests.length };

        Object.keys(SERVICE_TYPES).forEach((key) => {
            counts[key] = requests.filter(
                (item) => item.filterType === key
            ).length;
        });

        return counts;
    }, [requests]);

    const statusCounts = useMemo(() => ({
        pending: requests.filter(
            (item) => item.status === 'pending'
        ).length,

        revision: requests.filter(
            (item) =>
                item.requestType === 'merchandise' &&
                item.status === 'revision'
        ).length,

        approved: requests.filter(
            (item) => item.status === 'approved'
        ).length,

        borrowed: requests.filter(
            (item) => item.status === 'borrowed'
        ).length,

        rejected: requests.filter(
            (item) => item.status === 'rejected'
        ).length,

        completed: requests.filter(
            (item) =>
                item.status === 'completed' ||
                item.status === 'returned'
        ).length,
    }), [requests]);

    const filteredRequests = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        return requests.filter((item) => {
            if (
                activeType !== 'all' &&
                item.filterType !== activeType
            ) {
                return false;
            }

            if (
                statusFilter !== 'all' &&
                item.status !== statusFilter
            ) {
                return false;
            }

            if (!keyword) return true;

            const productNames = Array.isArray(item.items)
                ? item.items.map(
                      (entry) => entry.product?.name || entry.product_name
                  )
                : [];

            const searchText = [
                item.requestCode,
                item.requestTitle,
                item.requestDescription,
                item.requestMeta,
                item.serviceLabel,
                item.status,
                item.admin_note,
                item.rejection_reason,
                item.applicant_name,
                item.unit_name,
                item.other_unit_name,
                item.pic_name,
                item.pic_phone,
                item.pic_whatsapp,
                item.coverage_type,
                item.event_location,
                item.activity_detail,
                item.purpose,
                item.result_note,
                item.location,
                item.directorate,
                item.requester_name,
                ...productNames,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchText.includes(keyword);
        });
    }, [
        requests,
        activeType,
        statusFilter,
        searchKeyword,
    ]);

    const resetFilters = () => {
        setActiveType('all');
        setStatusFilter('all');
        setSearchKeyword('');
    };

    const getDetailPath = (item) =>
        `${basePath}/my-requests/${item.requestType}/${item.id}/detail`;

    if (loading) {
        return (
            <div className="container-fluid px-0">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body py-5 text-center">
                        <div className="spinner-border text-danger mb-3" />

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
        <div className="container-fluid px-0 my-requests-page">
            {/* HEADER */}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                        <div>
                            <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-3">
                                Riwayat Pengajuan
                            </span>

                            <h2 className="fw-black mb-2">
                                Pantau Seluruh Pengajuan
                            </h2>

                            <p className="text-muted mb-0">
                                Pantau Merchandise, layanan Humas,
                                Peminjaman Barang, Request Barang SEKPiM,
                                dan Jadwal Direktorat dalam satu halaman.
                            </p>
                        </div>

                        <div className="text-end">
                            <div className="small text-muted">
                                Total Pengajuan
                            </div>

                            <div className="display-5 fw-black text-danger">
                                {requests.length}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PERINGATAN ENDPOINT */}

            {endpointErrors.length > 0 && (
                <div className="alert alert-warning border-0 rounded-4 shadow-sm mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div>
                            <div className="fw-bold mb-1">
                                Sebagian data belum dapat dimuat
                            </div>

                            <div className="small">
                                Modul yang belum tersedia:{' '}
                                <strong>
                                    {endpointErrors.join(', ')}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RINGKASAN STATUS */}

            <section className="row g-3 mb-4">
                <StatisticCard
                    label="Menunggu"
                    value={statusCounts.pending}
                    icon="bi-hourglass-split"
                    className="bg-warning-subtle text-warning"
                />

                <StatisticCard
                    label="Perlu Revisi"
                    value={statusCounts.revision}
                    icon="bi-pencil-square"
                    className="bg-info-subtle text-info"
                />

                <StatisticCard
                    label="Disetujui"
                    value={statusCounts.approved}
                    icon="bi-check-circle-fill"
                    className="bg-success-subtle text-success"
                />

                <StatisticCard
                    label="Sedang Dipinjam"
                    value={statusCounts.borrowed}
                    icon="bi-box-arrow-up-right"
                    className="bg-info-subtle text-info"
                />

                <StatisticCard
                    label="Ditolak"
                    value={statusCounts.rejected}
                    icon="bi-x-circle-fill"
                    className="bg-danger-subtle text-danger"
                />

                <StatisticCard
                    label="Selesai"
                    value={statusCounts.completed}
                    icon="bi-check2-all"
                    className="bg-primary-subtle text-primary"
                />
            </section>

            {/* PENCARIAN DAN FILTER */}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Cari Pengajuan
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-white">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Cari kode, layanan, agenda, PIC, lokasi..."
                                    value={searchKeyword}
                                    onChange={(event) =>
                                        setSearchKeyword(event.target.value)
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
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                {STATUS_OPTIONS.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6 col-lg-4">
                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={resetFilters}
                                >
                                    <i className="bi bi-arrow-counterclockwise me-2" />
                                    Reset
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger rounded-pill"
                                    onClick={() => fetchRequests(true)}
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
                    </div>
                </div>
            </section>

            {/* DAFTAR PENGAJUAN */}

            <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="card-header bg-white border-0 p-3 p-lg-4">
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={`btn rounded-pill ${
                                activeType === 'all'
                                    ? 'btn-dark'
                                    : 'btn-light border'
                            }`}
                            onClick={() => setActiveType('all')}
                        >
                            <i className="bi bi-grid-fill me-2" />
                            Semua
                            <span className="badge bg-white text-dark ms-2">
                                {requestCounts.all}
                            </span>
                        </button>

                        {Object.entries(SERVICE_TYPES).map(
                            ([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`btn rounded-pill ${
                                        activeType === key
                                            ? `btn-${config.color}`
                                            : 'btn-light border'
                                    }`}
                                    onClick={() => setActiveType(key)}
                                >
                                    <i className={`bi ${config.icon} me-2`} />

                                    {config.label}

                                    <span
                                        className={`badge ms-2 ${
                                            activeType === key
                                                ? 'bg-white text-dark'
                                                : 'text-bg-secondary'
                                        }`}
                                    >
                                        {requestCounts[key] || 0}
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className="card-body p-0">
                    {filteredRequests.length === 0 ? (
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
                                onClick={resetFilters}
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
                                    {filteredRequests.map((item) => {
                                        const service =
                                            SERVICE_TYPES[item.filterType] || {
                                                label: item.serviceLabel || '-',
                                                icon: item.serviceIcon ||
                                                    'bi-grid-fill',
                                                color: item.serviceColor ||
                                                    'secondary',
                                            };

                                        const status =
                                            STATUS_CONFIG[item.status] || {
                                                label: item.status ||
                                                    'Tidak diketahui',
                                                className:
                                                    'text-bg-secondary',
                                                icon:
                                                    'bi-info-circle-fill',
                                            };

                                        const hasHumasResult =
                                            item.requestType === 'humas' &&
                                            item.status === 'completed' &&
                                            Boolean(item.resultUrl);

                                        const merchandiseRevision =
                                            item.requestType === 'merchandise' &&
                                            item.status === 'revision';

                                        const rejectionReason =
                                            item.requestType ===
                                            'directorate_schedule'
                                                ? item.rejection_reason
                                                : item.admin_note;

                                        return (
                                            <tr
                                                key={`${item.requestType}-${item.id}`}
                                            >
                                                <td className="ps-4 py-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className={`icon-box bg-${service.color}-subtle text-${service.color}`}
                                                        >
                                                            <i
                                                                className={`bi ${
                                                                    item.serviceIcon ||
                                                                    service.icon
                                                                }`}
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="fw-black text-dark mb-1">
                                                                {item.requestTitle}
                                                            </div>

                                                            <div
                                                                className="small text-muted text-truncate"
                                                                style={{
                                                                    maxWidth: 340,
                                                                }}
                                                                title={
                                                                    item.requestDescription
                                                                }
                                                            >
                                                                {item.requestDescription}
                                                            </div>

                                                            {item.requestMeta && (
                                                                <div className="small text-muted mt-1">
                                                                    <i className="bi bi-info-circle me-1" />
                                                                    {item.requestMeta}
                                                                </div>
                                                            )}

                                                            <div className="small text-danger fw-bold mt-1">
                                                                {item.requestCode}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3">
                                                    <span
                                                        className={`badge rounded-pill bg-${service.color}-subtle text-${service.color} px-3 py-2`}
                                                    >
                                                        <i
                                                            className={`bi ${
                                                                item.serviceIcon ||
                                                                service.icon
                                                            } me-2`}
                                                        />

                                                        {item.serviceLabel}
                                                    </span>

                                                    {item.requestType ===
                                                        'borrowing' && (
                                                        <div className="small text-muted mt-2">
                                                            <i
                                                                className={`bi ${
                                                                    item.sekpimRequestType ===
                                                                    'asset_request'
                                                                        ? 'bi-box2-heart-fill'
                                                                        : 'bi-arrow-return-left'
                                                                } me-1`}
                                                            />

                                                            {item.sekpimRequestType ===
                                                            'asset_request'
                                                                ? 'Tidak perlu dikembalikan'
                                                                : 'Barang wajib dikembalikan'}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3">
                                                    <div className="fw-bold">
                                                        {formatDate(item.requestDate)}
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
                                                        className={`badge rounded-pill ${status.className} px-3 py-2`}
                                                    >
                                                        <i
                                                            className={`bi ${status.icon} me-2`}
                                                        />
                                                        {status.label}
                                                    </span>

                                                    {hasHumasResult && (
                                                        <div className="mt-2">
                                                            <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2">
                                                                <i className="bi bi-cloud-check-fill me-2" />
                                                                Hasil Tersedia
                                                            </span>
                                                        </div>
                                                    )}

                                                    {item.status === 'rejected' &&
                                                        rejectionReason && (
                                                            <div
                                                                className="small text-danger mt-2 text-truncate"
                                                                style={{
                                                                    maxWidth: 220,
                                                                }}
                                                                title={rejectionReason}
                                                            >
                                                                {rejectionReason}
                                                            </div>
                                                        )}

                                                    {merchandiseRevision && (
                                                        <div className="small text-info-emphasis mt-2">
                                                            {item.admin_note ||
                                                                'Pengajuan perlu diperbaiki.'}
                                                        </div>
                                                    )}

                                                    {item.filterType ===
                                                        'sekpim_borrow' &&
                                                        item.status ===
                                                            'borrowed' && (
                                                            <div className="small text-info-emphasis mt-2">
                                                                <i className="bi bi-clock-history me-1" />
                                                                Menunggu pengembalian barang
                                                            </div>
                                                        )}

                                                    {item.filterType ===
                                                        'sekpim_borrow' &&
                                                        item.status ===
                                                            'returned' && (
                                                            <div className="small text-success mt-2">
                                                                <i className="bi bi-check-circle-fill me-1" />
                                                                Peminjaman telah selesai
                                                            </div>
                                                        )}

                                                    {item.filterType ===
                                                        'sekpim_asset_request' &&
                                                        item.status ===
                                                            'completed' && (
                                                            <div className="small text-success mt-2">
                                                                <i className="bi bi-check-circle-fill me-1" />
                                                                Barang telah diserahkan
                                                            </div>
                                                        )}
                                                </td>

                                                <td className="text-end pe-4 py-3">
                                                    <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                                                        {hasHumasResult && (
                                                            <a
                                                                href={item.resultUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-sm btn-success rounded-pill px-3"
                                                            >
                                                                <i className="bi bi-box-arrow-up-right me-2" />
                                                                Buka Hasil
                                                            </a>
                                                        )}

                                                        <Link
                                                            to={getDetailPath(item)}
                                                            className={`btn btn-sm rounded-pill px-3 ${
                                                                merchandiseRevision
                                                                    ? 'btn-info text-white'
                                                                    : 'btn-outline-danger'
                                                            }`}
                                                        >
                                                            <i
                                                                className={`bi ${
                                                                    merchandiseRevision
                                                                        ? 'bi-pencil-square'
                                                                        : 'bi-eye-fill'
                                                                } me-2`}
                                                            />

                                                            {merchandiseRevision
                                                                ? 'Perbaiki'
                                                                : 'Detail'}
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card-footer bg-white border-0 p-3 p-lg-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="small text-muted">
                            Menampilkan{' '}
                            <strong>{filteredRequests.length}</strong>{' '}
                            dari{' '}
                            <strong>{requests.length}</strong>{' '}
                            pengajuan.
                        </div>

                        <div className="small text-muted">
                            Pengajuan ditampilkan dari yang terbaru.
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
                .my-requests-page .fw-black {
                    font-weight: 900 !important;
                }

                .my-requests-page .table > :not(caption) > * > * {
                    vertical-align: middle;
                }

                .my-requests-page .table tbody tr:hover {
                    background-color: #fffafa;
                }

                .my-requests-page .icon-box {
                    flex-shrink: 0;
                }

                @media (max-width: 768px) {
                    .my-requests-page .card-body {
                        padding-left: 15px;
                        padding-right: 15px;
                    }

                    .my-requests-page .table-responsive {
                        overflow-x: auto;
                    }

                    .my-requests-page .table {
                        min-width: 780px;
                    }
                }
            `}</style>
        </div>
    );
}