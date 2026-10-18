import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom';

import api from '../../api/axios';
import MerchandiseRevisionForm from '../../components/MerchandiseRevisionForm';

/*
|--------------------------------------------------------------------------
| KONFIGURASI LAYANAN
|--------------------------------------------------------------------------
*/

const TYPE_CONFIG = {
    merchandise: {
        label: 'Merchandise',
        title: 'Detail Pengajuan Merchandise',
        description: 'Informasi pengajuan paket merchandise.',
        icon: 'bi-gift-fill',
        color: 'primary',
        endpoint: (id) => `/orders/${id}`,
    },
    humas: {
        label: 'Layanan Humas',
        title: 'Detail Request Layanan Humas',
        description: 'Informasi kebutuhan layanan Humas.',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
        endpoint: (id) => `/humas-service-requests/${id}`,
    },
    borrowing: {
        label: 'Layanan SEKPiM',
        title: 'Detail Pengajuan SEKPiM',
        description: 'Informasi pengajuan barang SEKPiM.',
        icon: 'bi-box-seam-fill',
        color: 'success',
        endpoint: (id) => `/borrow-requests/${id}`,
    },
    directorate_schedule: {
        label: 'Jadwal Direktorat',
        title: 'Detail Pengajuan Jadwal Direktorat',
        description: 'Informasi pengajuan agenda kepada pimpinan.',
        icon: 'bi-calendar2-check-fill',
        color: 'danger',
        endpoint: (id) => `/event-schedule-requests/${id}`,
    },
};

const DIRECTORATES = {
    direktorat: 'Direktorat',
    direktur: 'Direktur',
    wakil_direktur_1: 'Wakil Direktur I',
    wakil_direktur_2: 'Wakil Direktur II',
};

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu Persetujuan',
        shortLabel: 'Menunggu',
        badgeClass: 'text-bg-warning',
        icon: 'bi-hourglass-split',
        description: 'Pengajuan sedang menunggu pemeriksaan admin.',
    },
    revision: {
        label: 'Pengajuan Perlu Direvisi',
        shortLabel: 'Perlu Revisi',
        badgeClass: 'text-bg-info',
        icon: 'bi-pencil-square',
        description: 'Pengajuan perlu diperbaiki sesuai catatan admin.',
    },
    approved: {
        label: 'Pengajuan Disetujui',
        shortLabel: 'Disetujui',
        badgeClass: 'text-bg-success',
        icon: 'bi-check-circle-fill',
        description: 'Pengajuan telah disetujui oleh admin.',
    },
    rejected: {
        label: 'Pengajuan Ditolak',
        shortLabel: 'Ditolak',
        badgeClass: 'text-bg-danger',
        icon: 'bi-x-circle-fill',
        description: 'Pengajuan tidak dapat diproses lebih lanjut.',
    },
    completed: {
        label: 'Layanan Selesai',
        shortLabel: 'Selesai',
        badgeClass: 'text-bg-primary',
        icon: 'bi-check2-all',
        description: 'Proses pelayanan telah selesai.',
    },
    borrowed: {
        label: 'Barang Sedang Dipinjam',
        shortLabel: 'Sedang Dipinjam',
        badgeClass: 'text-bg-info',
        icon: 'bi-box-arrow-up-right',
        description: 'Barang telah diserahkan kepada pemohon.',
    },
    returned: {
        label: 'Barang Dikembalikan',
        shortLabel: 'Dikembalikan',
        badgeClass: 'text-bg-secondary',
        icon: 'bi-box-arrow-in-down-left',
        description: 'Barang sudah dikembalikan dan peminjaman selesai.',
    },
};

const COVERAGE_LABELS = {
    'REQUEST DESIGN INSTAGRAM': 'Request Design Instagram',
    DOKUMENTASI: 'Dokumentasi',
    'PUBLIKASI WEBSITE': 'Publikasi Website',
    'PUBLIKASI MEDIA MASSA': 'Publikasi Media Massa',
    YOUTUBE: 'YouTube',
    'VIDEO REELS': 'Video Reels',
    'SOCIAL MEDIA': 'Social Media (Data Lama)',
};

const TYPE_BORROW = 'borrow';
const TYPE_ASSET_REQUEST = 'asset_request';

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
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
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : '-';
}

function formatNumber(value) {
    return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

function normalizeExternalUrl(value) {
    if (!value) return null;

    const url = String(value).trim();

    if (!url) return null;

    if (/^https?:\/\//i.test(url)) return url;

    return `https://${url}`;
}

function getFileUrl(value) {
    if (!value) return null;

    const path = String(value);

    if (/^https?:\/\//i.test(path)) return path;

    const apiBase =
        import.meta.env.VITE_API_URL ||
        'http://127.0.0.1:8000/api';

    const backendBase = apiBase.replace(/\/api\/?$/, '');

    if (path.startsWith('/storage/')) {
        return `${backendBase}${path}`;
    }

    if (path.startsWith('storage/')) {
        return `${backendBase}/${path}`;
    }

    return `${backendBase}/storage/${path}`;
}

function getCoverageLabels(value) {
    if (!value) return 'Layanan Humas';

    return String(value)
        .split(/[;,]/)
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean)
        .map((part) => COVERAGE_LABELS[part] || part)
        .join('; ');
}

function getCoverageIcon(value) {
    const first = String(value || '')
        .split(/[;,]/)[0]
        .trim()
        .toUpperCase();

    const icons = {
        'REQUEST DESIGN INSTAGRAM': 'bi-instagram',
        DOKUMENTASI: 'bi-camera-fill',
        'PUBLIKASI WEBSITE': 'bi-globe2',
        'PUBLIKASI MEDIA MASSA': 'bi-newspaper',
        YOUTUBE: 'bi-youtube',
        'VIDEO REELS': 'bi-play-btn-fill',
    };

    return icons[first] || 'bi-camera-reels-fill';
}

function getResolvedUnitName(data) {
    if (data?.resolved_unit_name) {
        return data.resolved_unit_name;
    }

    if (data?.unit_name === 'Lainnya') {
        return data.other_unit_name || 'Lainnya';
    }

    return (
        data?.unit_name ||
        data?.requester_unit ||
        data?.user?.unit_name ||
        '-'
    );
}

function getRequestCode(type, data) {
    const id = String(data?.id || 0).padStart(4, '0');

    if (type === 'merchandise') {
        return data.order_code || data.code || `MER-${id}`;
    }

    if (type === 'humas') {
        return data.service_code || data.code || `HMS-${id}`;
    }

    if (type === 'directorate_schedule') {
        return `JAD-${id}`;
    }

    return (
        data.borrow_code ||
        data.code ||
        `${data.request_type === TYPE_ASSET_REQUEST ? 'REQ' : 'BRW'}-${id}`
    );
}

/*
|--------------------------------------------------------------------------
| KOMPONEN INFORMASI
|--------------------------------------------------------------------------
*/

function InfoItem({
    label,
    value,
    icon = 'bi-info-circle',
    fullWidth = false,
    isLink = false,
}) {
    const linkUrl = isLink ? normalizeExternalUrl(value) : null;

    return (
        <div className={fullWidth ? 'col-12' : 'col-md-6'}>
            <div className="p-3 rounded-4 bg-light h-100">
                <div className="d-flex align-items-start gap-3">
                    <div
                        className="rounded-circle bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                            width: 42,
                            height: 42,
                        }}
                    >
                        <i className={`bi ${icon}`} />
                    </div>

                    <div className="min-w-0 flex-grow-1">
                        <div className="small text-muted fw-bold mb-1">
                            {label}
                        </div>

                        {linkUrl ? (
                            <a
                                href={linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="fw-bold text-danger text-break text-decoration-none"
                            >
                                {value}
                                <i className="bi bi-box-arrow-up-right ms-2" />
                            </a>
                        ) : (
                            <div
                                className="fw-bold text-dark text-break"
                                style={{
                                    whiteSpace: fullWidth
                                        ? 'pre-line'
                                        : 'normal',
                                }}
                            >
                                {value === null ||
                                    value === undefined ||
                                    value === ''
                                    ? '-'
                                    : value}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| KOMPONEN FILE
|--------------------------------------------------------------------------
*/

function FileCard({
    label,
    fileName,
    fileUrl,
    icon = 'bi-file-earmark-text-fill',
    color = 'danger',
}) {
    const finalUrl = getFileUrl(fileUrl);

    return (
        <div className="col-md-6">
            <div className="p-3 rounded-4 border bg-white h-100">
                <div className="d-flex align-items-center gap-3">
                    <div
                        className={`icon-box bg-${color}-subtle text-${color}`}
                    >
                        <i className={`bi ${icon}`} />
                    </div>

                    <div className="min-w-0 flex-grow-1">
                        <div className="small text-muted fw-bold mb-1">
                            {label}
                        </div>

                        <div className="fw-bold text-truncate">
                            {fileName || 'Dokumen lampiran'}
                        </div>
                    </div>

                    {finalUrl ? (
                        <a
                            href={finalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`btn btn-sm btn-outline-${color} rounded-pill`}
                        >
                            <i className="bi bi-eye-fill me-1" />
                            Buka
                        </a>
                    ) : (
                        <span className="badge text-bg-light">
                            Tidak ada
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| RIWAYAT REVISI MERCHANDISE
|--------------------------------------------------------------------------
*/

function RevisionHistoryCard({ histories }) {
    if (!Array.isArray(histories) || histories.length === 0) {
        return null;
    }

    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-black mb-1">Riwayat Revisi</h4>

                        <p className="text-muted mb-0">
                            Catatan permintaan revisi dari admin.
                        </p>
                    </div>

                    <span className="badge text-bg-info rounded-pill px-3 py-2">
                        {histories.length} revisi
                    </span>
                </div>

                <div className="d-flex flex-column gap-3">
                    {histories.map((history, index) => (
                        <div
                            key={history.id || index}
                            className="p-4 rounded-4 border bg-light"
                        >
                            <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                                <strong className="text-info">
                                    Revisi #{histories.length - index}
                                </strong>

                                <small className="text-muted">
                                    {formatDateTime(history.requested_at)}
                                </small>
                            </div>

                            <div
                                className="mb-3"
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {history.revision_note || '-'}
                            </div>

                            <div className="row g-2">
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        Diminta oleh
                                    </small>

                                    <strong>
                                        {history.requested_by?.name ||
                                            history.requestedBy?.name ||
                                            'Admin'}
                                    </strong>
                                </div>

                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        Dikirim ulang
                                    </small>

                                    <strong>
                                        {history.resubmitted_at
                                            ? formatDateTime(
                                                history.resubmitted_at
                                            )
                                            : 'Belum dikirim ulang'}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| KOMPONEN TIMELINE
|--------------------------------------------------------------------------
*/

function Timeline({ items }) {
    return (
        <div className="request-timeline">
            {items.map((item, index) => (
                <div
                    key={`${item.label}-${index}`}
                    className={`request-timeline-item ${item.status === 'active'
                            ? 'active'
                            : item.status === 'rejected'
                                ? 'rejected'
                                : 'done'
                        }`}
                >
                    <div className="request-timeline-marker">
                        <i className={`bi ${item.icon}`} />
                    </div>

                    <div className="request-timeline-content">
                        <div className="fw-black mb-1">
                            {item.label}
                        </div>

                        <div className="small text-muted mb-1">
                            {item.description}
                        </div>

                        {item.date && (
                            <div className="small fw-bold text-danger">
                                {formatDateTime(item.date)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| HALAMAN DETAIL PENGAJUAN
|--------------------------------------------------------------------------
*/

export default function MyRequestDetailPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();

    const currentUser = useMemo(() => getCurrentUser(), []);

    const basePath =
        currentUser.role === 'user'
            ? '/user'
            : '/admin';

    const historyPath = `${basePath}/my-requests`;
    const dashboardPath = `${basePath}/dashboard`;

    const typeConfig = TYPE_CONFIG[type];

    const [requestData, setRequestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    /*
    |--------------------------------------------------------------------------
    | LOAD DETAIL
    |--------------------------------------------------------------------------
    */

    const fetchDetail = useCallback(async () => {
        if (!typeConfig || !id) {
            setErrorMessage('Jenis pengajuan tidak dikenali.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setErrorMessage('');

            const response = await api.get(
                typeConfig.endpoint(id)
            );

            setRequestData(
                response?.data?.data ||
                response?.data ||
                null
            );
        } catch (error) {
            console.error(
                'Fetch request detail:',
                error?.response?.data || error
            );

            setErrorMessage(
                error?.response?.data?.message ||
                'Detail pengajuan tidak dapat dimuat.'
            );
        } finally {
            setLoading(false);
        }
    }, [typeConfig, id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    /*
    |--------------------------------------------------------------------------
    | DATA TURUNAN
    |--------------------------------------------------------------------------
    */

    const isDirectorateSchedule =
        type === 'directorate_schedule';

    const sekpimRequestType =
        type === 'borrowing'
            ? requestData?.request_type || TYPE_BORROW
            : null;

    const isSekpimBorrow =
        type === 'borrowing' &&
        sekpimRequestType === TYPE_BORROW;

    const isSekpimAssetRequest =
        type === 'borrowing' &&
        sekpimRequestType === TYPE_ASSET_REQUEST;

    const sekpimTypeLabel = isSekpimAssetRequest
        ? 'Request Barang'
        : 'Peminjaman Barang';

    const displayTypeConfig = useMemo(() => {
        if (type !== 'borrowing') return typeConfig;

        if (isSekpimAssetRequest) {
            return {
                ...typeConfig,
                label: 'Request Barang',
                title: 'Detail Request Barang SEKPiM',
                description: 'Informasi Request Barang SEKPiM.',
                icon: 'bi-box2-heart-fill',
                color: 'info',
            };
        }

        return {
            ...typeConfig,
            label: 'Peminjaman Barang',
            title: 'Detail Peminjaman Barang SEKPiM',
            description: 'Informasi peminjaman barang SEKPiM.',
            icon: 'bi-box-arrow-up-right',
            color: 'success',
        };
    }, [type, typeConfig, isSekpimAssetRequest]);

    const statusConfig = useMemo(() => {
        const base = STATUS_CONFIG[requestData?.status] || {
            label: requestData?.status || 'Tidak diketahui',
            shortLabel: requestData?.status || 'Tidak diketahui',
            badgeClass: 'text-bg-secondary',
            icon: 'bi-info-circle-fill',
            description: 'Status pengajuan tidak diketahui.',
        };

        if (
            type === 'borrowing' &&
            isSekpimAssetRequest &&
            requestData?.status === 'completed'
        ) {
            return {
                ...base,
                label: 'Barang Telah Diserahkan',
                shortLabel: 'Selesai',
                badgeClass: 'text-bg-success',
                description:
                    'Barang telah diserahkan kepada pemohon.',
            };
        }

        if (
            isDirectorateSchedule &&
            requestData?.status === 'approved'
        ) {
            return {
                ...base,
                description:
                    'Pengajuan disetujui dan agenda telah dimasukkan ke kalender Direktorat.',
            };
        }

        if (
            isDirectorateSchedule &&
            requestData?.status === 'pending'
        ) {
            return {
                ...base,
                description:
                    'Pengajuan masih menunggu approval admin atau superadmin.',
            };
        }

        return base;
    }, [
        requestData?.status,
        type,
        isSekpimAssetRequest,
        isDirectorateSchedule,
    ]);

    const requestCode = useMemo(
        () => (requestData ? getRequestCode(type, requestData) : '-'),
        [type, requestData]
    );

    const requestTitle = useMemo(() => {
        if (!requestData) return '-';

        if (type === 'humas') {
            return getCoverageLabels(requestData.coverage_type);
        }

        if (type === 'borrowing') {
            return requestData.purpose || sekpimTypeLabel;
        }

        if (isDirectorateSchedule) {
            return requestData.title || 'Jadwal Direktorat';
        }

        return (
            requestData.title ||
            requestData.event_name ||
            requestData.activity_name ||
            'Pengajuan Merchandise'
        );
    }, [
        requestData,
        type,
        sekpimTypeLabel,
        isDirectorateSchedule,
    ]);

    const timelineItems = useMemo(() => {
        if (!requestData) return [];

        const items = [
            {
                label: 'Pengajuan Dikirim',
                description: 'Pengajuan berhasil dikirim ke sistem.',
                date:
                    requestData.submitted_at ||
                    requestData.created_at,
                icon: 'bi-send-check-fill',
                status: 'done',
            },
        ];

        if (isDirectorateSchedule) {
            if (requestData.edited_at) {
                items.push({
                    label: 'Pengajuan Disesuaikan Admin',
                    description: `Data jadwal telah disesuaikan oleh ${requestData.editor_name || 'admin'
                        }.`,
                    date: requestData.edited_at,
                    icon: 'bi-pencil-square',
                    status: 'done',
                });
            }

            if (requestData.status === 'pending') {
                items.push({
                    label: 'Menunggu Approval',
                    description:
                        'Admin atau superadmin sedang memeriksa pengajuan jadwal.',
                    date: null,
                    icon: 'bi-hourglass-split',
                    status: 'active',
                });
            }

            if (requestData.status === 'approved') {
                items.push({
                    label: 'Jadwal Disetujui',
                    description: `Disetujui oleh ${requestData.reviewer_name || 'admin'
                        } dan dimasukkan ke kalender.`,
                    date: requestData.reviewed_at,
                    icon: 'bi-calendar2-check-fill',
                    status: 'done',
                });
            }

            if (requestData.status === 'rejected') {
                items.push({
                    label: 'Pengajuan Ditolak',
                    description:
                        requestData.rejection_reason ||
                        'Pengajuan tidak disetujui.',
                    date: requestData.reviewed_at,
                    icon: 'bi-x-circle-fill',
                    status: 'rejected',
                });
            }

            return items;
        }

        if (requestData.resubmitted_at) {
            items.push({
                label: 'Perbaikan Dikirim Ulang',
                description:
                    'Pemohon telah mengirimkan data perbaikan.',
                date: requestData.resubmitted_at,
                icon: 'bi-arrow-repeat',
                status: 'done',
            });
        }

        if (requestData.status === 'pending') {
            items.push({
                label: 'Menunggu Pemeriksaan',
                description:
                    'Admin sedang memeriksa pengajuan.',
                date: null,
                icon: 'bi-hourglass-split',
                status: 'active',
            });
        }

        if (requestData.status === 'revision') {
            items.push({
                label: 'Revisi Diminta',
                description:
                    requestData.admin_note ||
                    'Admin meminta perbaikan data.',
                date:
                    requestData.revision_requested_at ||
                    requestData.updated_at,
                icon: 'bi-pencil-square',
                status: 'active',
            });
        }

        if (
            ['approved', 'completed', 'borrowed', 'returned'].includes(
                requestData.status
            )
        ) {
            items.push({
                label: 'Pengajuan Disetujui',
                description: 'Admin telah menyetujui pengajuan.',
                date:
                    requestData.approved_at ||
                    requestData.updated_at,
                icon: 'bi-check-circle-fill',
                status: 'done',
            });
        }

        if (requestData.status === 'rejected') {
            items.push({
                label: 'Pengajuan Ditolak',
                description:
                    requestData.admin_note ||
                    'Pengajuan tidak dapat diproses.',
                date:
                    requestData.rejected_at ||
                    requestData.updated_at,
                icon: 'bi-x-circle-fill',
                status: 'rejected',
            });
        }

        if (
            isSekpimBorrow &&
            ['borrowed', 'returned'].includes(requestData.status)
        ) {
            items.push({
                label: 'Barang Dipinjam',
                description:
                    'Barang telah diserahkan kepada pemohon.',
                date:
                    requestData.borrowed_at ||
                    requestData.updated_at,
                icon: 'bi-box-arrow-up-right',
                status: 'done',
            });
        }

        if (requestData.status === 'completed') {
            items.push({
                label: isSekpimAssetRequest
                    ? 'Barang Diserahkan'
                    : 'Layanan Selesai',
                description: isSekpimAssetRequest
                    ? 'Barang telah diserahkan kepada pemohon.'
                    : type === 'humas'
                        ? 'Hasil pekerjaan Humas telah tersedia.'
                        : 'Proses pelayanan telah selesai.',
                date:
                    requestData.completed_at ||
                    requestData.updated_at,
                icon: 'bi-check2-all',
                status: 'done',
            });
        }

        if (isSekpimBorrow && requestData.status === 'returned') {
            items.push({
                label: 'Barang Dikembalikan',
                description:
                    'Barang telah dikembalikan dan peminjaman selesai.',
                date:
                    requestData.returned_at ||
                    requestData.updated_at,
                icon: 'bi-box-arrow-in-down-left',
                status: 'done',
            });
        }

        return items;
    }, [
        requestData,
        isDirectorateSchedule,
        isSekpimBorrow,
        isSekpimAssetRequest,
        type,
    ]);

    /*
    |--------------------------------------------------------------------------
    | VALIDASI JENIS
    |--------------------------------------------------------------------------
    */

    if (!typeConfig) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <i className="bi bi-exclamation-triangle-fill display-4 text-warning d-block mb-3" />

                    <h4 className="fw-black mb-2">
                        Jenis pengajuan tidak dikenali
                    </h4>

                    <p className="text-muted">
                        Halaman detail tidak tersedia.
                    </p>

                    <Link
                        to={historyPath}
                        className="btn btn-danger rounded-pill px-4"
                    >
                        Kembali ke Riwayat
                    </Link>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body py-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold">
                        Memuat detail pengajuan
                    </h5>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    if (errorMessage || !requestData) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <i className="bi bi-exclamation-circle-fill display-4 text-danger d-block mb-3" />

                    <h4 className="fw-black mb-2">
                        Detail tidak dapat dimuat
                    </h4>

                    <p className="text-muted mb-4">
                        {errorMessage}
                    </p>

                    <div className="d-flex justify-content-center flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill px-4"
                            onClick={fetchDetail}
                        >
                            Coba Lagi
                        </button>

                        <Link
                            to={historyPath}
                            className="btn btn-danger rounded-pill px-4"
                        >
                            Kembali ke Riwayat
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DATA DETAIL
    |--------------------------------------------------------------------------
    */

    const userData = requestData.user || {};

    const orderItems =
        requestData.items ||
        requestData.order_items ||
        [];

    const borrowItems =
        requestData.items ||
        requestData.borrow_items ||
        requestData.borrow_request_items ||
        [];

    const revisionHistories =
        requestData.revision_histories ||
        requestData.revisionHistories ||
        [];

    const resultUrl = normalizeExternalUrl(
        requestData.result_link
    );

    const resultFileUrl =
        requestData.result_file_url ||
        requestData.result_file_path;

    const handoverEvidenceUrl =
        requestData.handover_evidence_url ||
        requestData.handover_evidence_path;

    const returnEvidenceUrl =
        requestData.return_evidence_url ||
        requestData.return_evidence_path;

    const rejectionReason = isDirectorateSchedule
        ? requestData.rejection_reason
        : requestData.admin_note;

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0 my-request-detail-page">
            {/* HEADER */}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-4">
                        <div className="d-flex align-items-start gap-3">
                            <div
                                className={`rounded-4 bg-${displayTypeConfig.color}-subtle text-${displayTypeConfig.color} d-flex align-items-center justify-content-center flex-shrink-0`}
                                style={{
                                    width: 72,
                                    height: 72,
                                }}
                            >
                                <i
                                    className={`bi ${displayTypeConfig.icon} fs-2`}
                                />
                            </div>

                            <div>
                                <span
                                    className={`badge rounded-pill bg-${displayTypeConfig.color}-subtle text-${displayTypeConfig.color} px-3 py-2 mb-3`}
                                >
                                    {displayTypeConfig.label}
                                </span>

                                <h2 className="fw-black mb-2">
                                    {requestTitle}
                                </h2>

                                <div className="text-danger fw-bold">
                                    {requestCode}
                                </div>
                            </div>
                        </div>

                        <div className="text-lg-end">
                            <span
                                className={`badge rounded-pill ${statusConfig.badgeClass} px-3 py-2 mb-3`}
                            >
                                <i className={`bi ${statusConfig.icon} me-2`} />
                                {statusConfig.shortLabel}
                            </span>

                            <div className="small text-muted">
                                Diperbarui
                            </div>

                            <div className="fw-bold">
                                {formatDateTime(requestData.updated_at)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PENOLAKAN */}

            {requestData.status === 'rejected' && (
                <section className="alert alert-danger border-0 rounded-5 shadow-sm p-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <div className="icon-box bg-white text-danger">
                            <i className="bi bi-x-circle-fill" />
                        </div>

                        <div>
                            <h5 className="fw-black mb-2">
                                Pengajuan Ditolak
                            </h5>

                            <p
                                className="mb-0"
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {rejectionReason ||
                                    'Admin tidak memberikan alasan tambahan.'}
                            </p>

                            {isDirectorateSchedule &&
                                requestData.reviewer_name && (
                                    <div className="small mt-3">
                                        Diproses oleh{' '}
                                        <strong>
                                            {requestData.reviewer_name}
                                        </strong>
                                        {' • '}
                                        {formatDateTime(
                                            requestData.reviewed_at
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </section>
            )}

            {/* APPROVAL JADWAL DIREKTORAT */}

            {isDirectorateSchedule &&
                requestData.status === 'approved' && (
                    <section className="alert alert-success border-0 rounded-5 shadow-sm p-4 mb-4">
                        <div className="d-flex align-items-start gap-3">
                            <div className="icon-box bg-white text-success">
                                <i className="bi bi-calendar2-check-fill" />
                            </div>

                            <div>
                                <h5 className="fw-black mb-2">
                                    Jadwal Direktorat Disetujui
                                </h5>

                                <p className="mb-2">
                                    Pengajuan telah disetujui dan dimasukkan
                                    ke kalender Direktorat.
                                </p>

                                {requestData.reviewer_name && (
                                    <div className="small mb-2">
                                        Disetujui oleh{' '}
                                        <strong>
                                            {requestData.reviewer_name}
                                        </strong>
                                        {' • '}
                                        {formatDateTime(
                                            requestData.reviewed_at
                                        )}
                                    </div>
                                )}

                                <Link
                                    to={`${basePath}/director-schedule`}
                                    className="btn btn-sm btn-success rounded-pill px-3"
                                >
                                    <i className="bi bi-calendar3 me-2" />
                                    Lihat Kalender
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

            {/* REVISI MERCHANDISE */}

            {type === 'merchandise' &&
                requestData.status === 'revision' && (
                    <>
                        <section className="alert alert-info border-0 rounded-5 shadow-sm p-4 mb-4">
                            <h5 className="fw-black mb-2">
                                <i className="bi bi-pencil-square me-2" />
                                Pengajuan Perlu Direvisi
                            </h5>

                            <p
                                className="mb-0"
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {requestData.admin_note ||
                                    'Silakan perbaiki kembali data pengajuan.'}
                            </p>
                        </section>

                        <MerchandiseRevisionForm
                            order={requestData}
                            onSuccess={fetchDetail}
                        />
                    </>
                )}

            {/* HASIL LAYANAN HUMAS */}

            {type === 'humas' &&
                requestData.status === 'completed' && (
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Hasil Pekerjaan Humas
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Hasil layanan yang telah diselesaikan admin.
                                    </p>
                                </div>

                                {resultUrl && (
                                    <a
                                        href={resultUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-success rounded-pill px-4"
                                    >
                                        <i className="bi bi-box-arrow-up-right me-2" />
                                        Buka Link Hasil
                                    </a>
                                )}
                            </div>

                            <div className="row g-3">
                                <FileCard
                                    label="File Hasil Admin"
                                    fileName={requestData.result_file_name}
                                    fileUrl={resultFileUrl}
                                    icon="bi-file-earmark-check-fill"
                                    color="success"
                                />

                                <InfoItem
                                    label="Link Hasil"
                                    value={resultUrl}
                                    icon="bi-link-45deg"
                                    isLink
                                />

                                {requestData.result_note && (
                                    <InfoItem
                                        label="Catatan Hasil"
                                        value={requestData.result_note}
                                        icon="bi-chat-left-text-fill"
                                        fullWidth
                                    />
                                )}
                            </div>
                        </div>
                    </section>
                )}

            {/* BUKTI SEKPiM */}

            {type === 'borrowing' &&
                (handoverEvidenceUrl ||
                    (isSekpimBorrow && returnEvidenceUrl)) && (
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                {isSekpimBorrow
                                    ? 'Bukti Proses Peminjaman'
                                    : 'Bukti Penyerahan Barang'}
                            </h4>

                            <p className="text-muted mb-4">
                                Dokumen serah terima dan pengembalian barang.
                            </p>

                            <div className="row g-3">
                                <FileCard
                                    label={
                                        isSekpimBorrow
                                            ? 'Bukti Serah Terima'
                                            : 'Bukti Penyerahan Barang'
                                    }
                                    fileName={requestData.handover_evidence_name}
                                    fileUrl={handoverEvidenceUrl}
                                    color={isSekpimBorrow ? 'success' : 'info'}
                                />

                                {isSekpimBorrow && (
                                    <FileCard
                                        label="Bukti Pengembalian"
                                        fileName={requestData.return_evidence_name}
                                        fileUrl={returnEvidenceUrl}
                                        icon="bi-box-arrow-in-down-left"
                                        color="success"
                                    />
                                )}
                            </div>
                        </div>
                    </section>
                )}

            <div className="row g-4">
                {/* KOLOM KIRI */}

                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Informasi Pengajuan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Detail informasi pengajuan yang dikirim.
                                    </p>
                                </div>

                                <div
                                    className={`icon-box bg-${displayTypeConfig.color}-subtle text-${displayTypeConfig.color}`}
                                >
                                    <i
                                        className={`bi ${displayTypeConfig.icon}`}
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                {/* NAMA PEMOHON */}

                                <InfoItem
                                    label="Nama Pemohon"
                                    value={
                                        requestData.applicant_name ||
                                        userData.name ||
                                        requestData.requester_name ||
                                        (Number(requestData.requested_by) ===
                                            Number(currentUser.id)
                                            ? currentUser.name
                                            : null)
                                    }
                                    icon="bi-person-fill"
                                />

                                {/* JADWAL DIREKTORAT */}

                                {isDirectorateSchedule && (
                                    <>
                                        <InfoItem
                                            label="Unit Pengaju"
                                            value={requestData.requester_unit}
                                            icon="bi-building-fill"
                                        />

                                        <InfoItem
                                            label="Nama PIC"
                                            value={requestData.pic_name}
                                            icon="bi-person-check-fill"
                                        />
                                        
                                        <InfoItem
                                            label="Agenda Untuk"
                                            value={
                                                DIRECTORATES[
                                                requestData.directorate
                                                ] ||
                                                requestData.directorate
                                            }
                                            icon="bi-person-vcard-fill"
                                        />

                                        <InfoItem
                                            label="Judul Agenda"
                                            value={requestData.title}
                                            icon="bi-calendar2-event-fill"
                                            fullWidth
                                        />

                                        <InfoItem
                                            label="Tanggal Agenda"
                                            value={formatDate(
                                                requestData.event_date
                                            )}
                                            icon="bi-calendar-date-fill"
                                        />

                                        <InfoItem
                                            label="Waktu Agenda"
                                            value={
                                                requestData.all_day
                                                    ? 'Sepanjang Hari'
                                                    : `${formatTime(
                                                        requestData.start_time
                                                    )} - ${formatTime(
                                                        requestData.end_time
                                                    )} WIB`
                                            }
                                            icon="bi-clock-fill"
                                        />

                                        <InfoItem
                                            label="Kategori Agenda"
                                            value={requestData.agenda_type}
                                            icon="bi-tag-fill"
                                        />

                                        <InfoItem
                                            label="Lokasi Agenda"
                                            value={requestData.location}
                                            icon="bi-geo-alt-fill"
                                        />

                                        <InfoItem
                                            label="Visibilitas"
                                            value={
                                                requestData.is_public
                                                    ? 'Publik'
                                                    : 'Internal'
                                            }
                                            icon={
                                                requestData.is_public
                                                    ? 'bi-globe2'
                                                    : 'bi-lock-fill'
                                            }
                                        />

                                        <InfoItem
                                            label="Tanggal Pengajuan"
                                            value={formatDateTime(
                                                requestData.created_at
                                            )}
                                            icon="bi-send-check-fill"
                                        />

                                        <InfoItem
                                            label="Deskripsi / Keperluan"
                                            value={requestData.description}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />

                                        {requestData.edited_by && (
                                            <InfoItem
                                                label="Terakhir Disesuaikan Admin"
                                                value={`${requestData.editor_name ||
                                                    'Admin'
                                                    } • ${formatDateTime(
                                                        requestData.edited_at
                                                    )}`}
                                                icon="bi-pencil-square"
                                                fullWidth
                                            />
                                        )}

                                        {requestData.reviewed_by && (
                                            <InfoItem
                                                label="Keputusan Admin"
                                                value={`${requestData.reviewer_name ||
                                                    'Admin'
                                                    } • ${formatDateTime(
                                                        requestData.reviewed_at
                                                    )}`}
                                                icon="bi-person-check-fill"
                                                fullWidth
                                            />
                                        )}
                                    </>
                                )}

                                {/* MERCHANDISE */}

                                {type === 'merchandise' && (
                                    <>
                                        <InfoItem
                                            label="Nama Kegiatan"
                                            value={
                                                requestData.event_name ||
                                                requestData.activity_name
                                            }
                                            icon="bi-calendar-event-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(
                                                requestData.activity_date
                                            )}
                                            icon="bi-calendar-date-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Pengambilan Merchandise"
                                            value={formatDate(
                                                requestData.pickup_date
                                            )}
                                            icon="bi-calendar-check-fill"
                                        />

                                        <InfoItem
                                            label="Nama PIC"
                                            value={requestData.pic_name}
                                            icon="bi-person-check-fill"
                                        />

                                        <InfoItem
                                            label="Nomor PIC"
                                            value={requestData.pic_phone}
                                            icon="bi-whatsapp"
                                        />

                                        <InfoItem
                                            label="Instansi Tamu"
                                            value={requestData.institution_name}
                                            icon="bi-buildings-fill"
                                        />

                                        <InfoItem
                                            label="Nama Tamu"
                                            value={requestData.guest_name}
                                            icon="bi-person-badge-fill"
                                        />

                                        <InfoItem
                                            label="Jabatan Tamu"
                                            value={requestData.guest_position}
                                            icon="bi-briefcase-fill"
                                        />

                                        <InfoItem
                                            label="Alasan / Catatan Pengajuan"
                                            value={requestData.user_note}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {/* HUMAS */}

                                {type === 'humas' && (
                                    <>
                                        <InfoItem
                                            label="Unit / Bagian"
                                            value={getResolvedUnitName(
                                                requestData
                                            )}
                                            icon="bi-building-fill"
                                        />

                                        <InfoItem
                                            label="Nomor WhatsApp PIC"
                                            value={requestData.pic_whatsapp}
                                            icon="bi-whatsapp"
                                        />

                                        <InfoItem
                                            label="Jenis Layanan Humas"
                                            value={getCoverageLabels(
                                                requestData.coverage_type
                                            )}
                                            icon={getCoverageIcon(
                                                requestData.coverage_type
                                            )}
                                        />

                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(
                                                requestData.event_date
                                            )}
                                            icon="bi-calendar-date-fill"
                                        />

                                        <InfoItem
                                            label="Lokasi Kegiatan"
                                            value={requestData.event_location}
                                            icon="bi-geo-alt-fill"
                                        />

                                        <InfoItem
                                            label="Link Referensi"
                                            value={requestData.reference_link}
                                            icon="bi-link-45deg"
                                            fullWidth
                                            isLink
                                        />

                                        <InfoItem
                                            label="Detail Kegiatan"
                                            value={requestData.activity_detail}
                                            icon="bi-file-earmark-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {/* SEKPiM */}

                                {type === 'borrowing' && (
                                    <>
                                        <InfoItem
                                            label="Jenis Pengajuan"
                                            value={sekpimTypeLabel}
                                            icon={
                                                isSekpimAssetRequest
                                                    ? 'bi-box2-heart-fill'
                                                    : 'bi-box-arrow-up-right'
                                            }
                                        />

                                        <InfoItem
                                            label="Nama PIC"
                                            value={requestData.pic_name}
                                            icon="bi-person-badge-fill"
                                        />

                                        <InfoItem
                                            label="Nomor PIC"
                                            value={requestData.pic_phone}
                                            icon="bi-whatsapp"
                                        />

                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(
                                                requestData.activity_date
                                            )}
                                            icon="bi-calendar-event-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Pengambilan"
                                            value={formatDate(
                                                requestData.borrow_date
                                            )}
                                            icon="bi-calendar-check-fill"
                                        />

                                        {isSekpimBorrow && (
                                            <InfoItem
                                                label="Tanggal Pengembalian"
                                                value={formatDate(
                                                    requestData.return_date
                                                )}
                                                icon="bi-calendar-minus-fill"
                                            />
                                        )}

                                        <InfoItem
                                            label={
                                                isSekpimBorrow
                                                    ? 'Keperluan Peminjaman'
                                                    : 'Keperluan Request Barang'
                                            }
                                            value={requestData.purpose}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* RIWAYAT REVISI MERCHANDISE */}

                    {type === 'merchandise' && (
                        <RevisionHistoryCard
                            histories={revisionHistories}
                        />
                    )}

                    {/* DAFTAR MERCHANDISE */}

                    {type === 'merchandise' &&
                        Array.isArray(orderItems) &&
                        orderItems.length > 0 && (
                            <section className="card border-0 shadow-sm rounded-5 mb-4">
                                <div className="card-body p-4">
                                    <h4 className="fw-black mb-4">
                                        Paket Merchandise
                                    </h4>

                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Produk</th>
                                                    <th className="text-center">
                                                        Jumlah
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {orderItems.map(
                                                    (item, index) => (
                                                        <tr
                                                            key={
                                                                item.id ||
                                                                index
                                                            }
                                                        >
                                                            <td className="fw-bold">
                                                                {item.product?.name ||
                                                                    item.product_name ||
                                                                    item.name ||
                                                                    'Produk'}
                                                            </td>

                                                            <td className="text-center fw-black">
                                                                {formatNumber(
                                                                    item.quantity
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        )}

                    {/* DAFTAR BARANG SEKPiM */}

                    {type === 'borrowing' &&
                        Array.isArray(borrowItems) &&
                        borrowItems.length > 0 && (
                            <section className="card border-0 shadow-sm rounded-5 mb-4">
                                <div className="card-body p-4">
                                    <h4 className="fw-black mb-2">
                                        {isSekpimBorrow
                                            ? 'Barang Dipinjam'
                                            : 'Barang yang Diminta'}
                                    </h4>

                                    <p className="text-muted mb-4">
                                        Daftar barang yang diajukan.
                                    </p>

                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Barang</th>
                                                    <th className="text-center">
                                                        Jumlah
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {borrowItems.map(
                                                    (item, index) => (
                                                        <tr
                                                            key={
                                                                item.id ||
                                                                index
                                                            }
                                                        >
                                                            <td className="fw-bold">
                                                                {item.product?.name ||
                                                                    item.product_name ||
                                                                    item.name ||
                                                                    'Barang'}
                                                            </td>

                                                            <td className="text-center fw-black">
                                                                {formatNumber(
                                                                    item.quantity
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        )}

                    {/* DOKUMEN PENDUKUNG */}

                    {!isDirectorateSchedule && (
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Dokumen Pendukung
                                </h4>

                                <p className="text-muted mb-4">
                                    Lampiran dan dokumen proses pengajuan.
                                </p>

                                <div className="row g-3">
                                    {type === 'merchandise' && (
                                        <FileCard
                                            label="Bukti Undangan / Dokumen"
                                            fileName={
                                                requestData.proof_file_name
                                            }
                                            fileUrl={
                                                requestData.proof_file_url ||
                                                requestData.proof_file_path
                                            }
                                            color="primary"
                                        />
                                    )}

                                    {type === 'humas' && (
                                        <FileCard
                                            label="Lampiran / Brief Kegiatan"
                                            fileName={
                                                requestData.article_draft_name ||
                                                'Lampiran / Brief Kegiatan'
                                            }
                                            fileUrl={
                                                requestData.article_draft_url ||
                                                requestData.article_draft_path
                                            }
                                            icon="bi-file-earmark-arrow-up-fill"
                                            color="danger"
                                        />
                                    )}

                                    {type === 'borrowing' && (
                                        <>
                                            <FileCard
                                                label={
                                                    isSekpimBorrow
                                                        ? 'Bukti Serah Terima'
                                                        : 'Bukti Penyerahan Barang'
                                                }
                                                fileName={
                                                    requestData.handover_evidence_name
                                                }
                                                fileUrl={handoverEvidenceUrl}
                                                color={
                                                    isSekpimBorrow
                                                        ? 'success'
                                                        : 'info'
                                                }
                                            />

                                            {isSekpimBorrow && (
                                                <FileCard
                                                    label="Bukti Pengembalian"
                                                    fileName={
                                                        requestData.return_evidence_name
                                                    }
                                                    fileUrl={returnEvidenceUrl}
                                                    color="success"
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* KOLOM KANAN */}

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Status Pengajuan
                            </h4>

                            <p className="text-muted mb-4">
                                Perkembangan proses pengajuan.
                            </p>

                            <div className="text-center p-4 rounded-4 bg-light mb-4">
                                <div
                                    className={`mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center ${statusConfig.badgeClass}`}
                                    style={{
                                        width: 70,
                                        height: 70,
                                    }}
                                >
                                    <i
                                        className={`bi ${statusConfig.icon} fs-3`}
                                    />
                                </div>

                                <h5 className="fw-black">
                                    {statusConfig.label}
                                </h5>

                                <p className="text-muted small mb-0">
                                    {statusConfig.description}
                                </p>
                            </div>

                            {/* PENGAMBILAN MERCHANDISE */}

                            {type === 'merchandise' &&
                                requestData.pickup_date && (
                                    <div className="p-3 rounded-4 bg-primary-subtle mb-4">
                                        <div className="small text-muted mb-1">
                                            Jadwal Pengambilan Merchandise
                                        </div>

                                        <div className="fw-black text-primary">
                                            <i className="bi bi-calendar-check-fill me-2" />
                                            {formatDate(
                                                requestData.pickup_date
                                            )}
                                        </div>
                                    </div>
                                )}

                            {/* PENGAMBILAN SEKPiM */}

                            {type === 'borrowing' &&
                                requestData.borrow_date && (
                                    <div
                                        className={`p-3 rounded-4 mb-4 ${isSekpimBorrow
                                                ? 'bg-success-subtle'
                                                : 'bg-info-subtle'
                                            }`}
                                    >
                                        <div className="small text-muted mb-1">
                                            Jadwal Pengambilan Barang
                                        </div>

                                        <div className="fw-black">
                                            {formatDate(
                                                requestData.borrow_date
                                            )}
                                        </div>

                                        {isSekpimBorrow &&
                                            requestData.return_date && (
                                                <>
                                                    <hr />

                                                    <div className="small text-muted mb-1">
                                                        Jadwal Pengembalian
                                                    </div>

                                                    <div className="fw-black text-success">
                                                        {formatDate(
                                                            requestData.return_date
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                    </div>
                                )}

                            {/* JADWAL DIREKTORAT */}

                            {isDirectorateSchedule && (
                                <div className="p-3 rounded-4 bg-danger-subtle mb-4">
                                    <div className="small text-muted mb-1">
                                        Jadwal yang Diajukan
                                    </div>

                                    <div className="fw-black text-danger">
                                        <i className="bi bi-calendar-event me-2" />
                                        {formatDate(
                                            requestData.event_date
                                        )}
                                    </div>

                                    <div className="small mt-2">
                                        <i className="bi bi-clock me-2" />
                                        {requestData.all_day
                                            ? 'Sepanjang hari'
                                            : `${formatTime(
                                                requestData.start_time
                                            )} - ${formatTime(
                                                requestData.end_time
                                            )} WIB`}
                                    </div>
                                </div>
                            )}

                            <Timeline items={timelineItems} />
                        </div>
                    </section>

                    {/* NAVIGASI */}

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <div className="d-grid gap-2">
                                <Link
                                    to={historyPath}
                                    className="btn btn-danger rounded-pill"
                                >
                                    <i className="bi bi-arrow-left me-2" />
                                    Kembali ke Riwayat
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={() =>
                                        navigate(dashboardPath)
                                    }
                                >
                                    <i className="bi bi-house-door-fill me-2" />
                                    Dashboard
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .my-request-detail-page {
                    min-width: 0;
                }

                .my-request-detail-page .fw-black {
                    font-weight: 900 !important;
                }

                .my-request-detail-page .text-break {
                    overflow-wrap: anywhere;
                }

                .my-request-detail-page .request-timeline {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .my-request-detail-page .request-timeline-item {
                    position: relative;
                    display: grid;
                    grid-template-columns: 40px minmax(0, 1fr);
                    gap: 10px;
                    padding-bottom: 24px;
                }

                .my-request-detail-page .request-timeline-item::before {
                    content: '';
                    position: absolute;
                    left: 19px;
                    top: 40px;
                    bottom: 0;
                    width: 2px;
                    background: #e2e8f0;
                }

                .my-request-detail-page
                .request-timeline-item:last-child::before {
                    display: none;
                }

                .my-request-detail-page .request-timeline-marker {
                    position: relative;
                    z-index: 1;
                    display: grid;
                    place-items: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 13px;
                    background: #ecfdf5;
                    color: #047857;
                }

                .my-request-detail-page
                .request-timeline-item.active
                .request-timeline-marker {
                    background: #fef3c7;
                    color: #b45309;
                }

                .my-request-detail-page
                .request-timeline-item.rejected
                .request-timeline-marker {
                    background: #fef2f2;
                    color: #dc2626;
                }

                .my-request-detail-page .request-timeline-content {
                    min-width: 0;
                    padding-top: 3px;
                }

                @media (max-width: 767px) {
                    .my-request-detail-page h2 {
                        font-size: 1.45rem;
                    }

                    .my-request-detail-page .card-body {
                        padding: 18px !important;
                    }

                    .my-request-detail-page .row {
                        --bs-gutter-x: 12px;
                    }
                }
            `}</style>
        </div>
    );
}