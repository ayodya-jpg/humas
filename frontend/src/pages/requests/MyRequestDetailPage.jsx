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

const TYPE_CONFIG = {
    merchandise: {
        label: 'Merchandise',
        title: 'Detail Pengajuan Merchandise',
        description:
            'Informasi lengkap pengajuan paket merchandise.',
        icon: 'bi-gift-fill',
        color: 'primary',
        endpoint: (id) =>
            `/orders/${id}`,
    },

    humas: {
        label: 'Layanan Humas',
        title: 'Detail Request Layanan Humas',
        description:
            'Informasi lengkap kebutuhan layanan Humas.',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
        endpoint: (id) =>
            `/humas-service-requests/${id}`,
    },

    borrowing: {
        label: 'Peminjaman SEKPiM',
        title: 'Detail Peminjaman SEKPiM',
        description:
            'Informasi lengkap pengajuan peminjaman perlengkapan.',
        icon: 'bi-box-seam-fill',
        color: 'success',
        endpoint: (id) =>
            `/borrow-requests/${id}`,
    },
};

const STATUS_CONFIG = {
    pending: {
        label:
            'Menunggu Persetujuan',

        shortLabel:
            'Menunggu',

        badgeClass:
            'text-bg-warning',

        icon:
            'bi-hourglass-split',

        description:
            'Pengajuan sedang menunggu pemeriksaan admin.',
    },

    revision: {
        label:
            'Pengajuan Perlu Direvisi',

        shortLabel:
            'Perlu Revisi',

        badgeClass:
            'text-bg-info',

        icon:
            'bi-pencil-square',

        description:
            'Admin meminta data pengajuan diperbaiki sebelum dapat diproses kembali.',
    },

    approved: {
        label:
            'Pengajuan Disetujui',

        shortLabel:
            'Disetujui',

        badgeClass:
            'text-bg-success',

        icon:
            'bi-check-circle-fill',

        description:
            'Pengajuan telah disetujui dan masuk proses pelayanan.',
    },

    rejected: {
        label:
            'Pengajuan Ditolak',

        shortLabel:
            'Ditolak',

        badgeClass:
            'text-bg-danger',

        icon:
            'bi-x-circle-fill',

        description:
            'Pengajuan tidak dapat diproses lebih lanjut.',
    },

    completed: {
        label:
            'Layanan Selesai',

        shortLabel:
            'Selesai',

        badgeClass:
            'text-bg-primary',

        icon:
            'bi-check2-all',

        description:
            'Seluruh proses pelayanan telah selesai.',
    },

    borrowed: {
        label:
            'Barang Sedang Dipinjam',

        shortLabel:
            'Sedang Dipinjam',

        badgeClass:
            'text-bg-info',

        icon:
            'bi-box-arrow-up-right',

        description:
            'Barang telah diserahkan dan sedang digunakan.',
    },

    returned: {
        label:
            'Barang Dikembalikan',

        shortLabel:
            'Dikembalikan',

        badgeClass:
            'text-bg-secondary',

        icon:
            'bi-box-arrow-in-down-left',

        description:
            'Barang telah dikembalikan kepada petugas.',
    },
};

const COVERAGE_TYPE_CONFIG = {
    'REQUEST DESIGN INSTAGRAM': {
        label:
            'Request Design Instagram',

        icon:
            'bi-instagram',
    },

    DOKUMENTASI: {
        label:
            'Dokumentasi',

        icon:
            'bi-camera-fill',
    },

    'PUBLIKASI WEBSITE': {
        label:
            'Publikasi Website',

        icon:
            'bi-globe2',
    },

    'PUBLIKASI MEDIA MASSA': {
        label:
            'Publikasi Media Massa',

        icon:
            'bi-newspaper',
    },

    YOUTUBE: {
        label:
            'YouTube',

        icon:
            'bi-youtube',
    },

    'VIDEO REELS': {
        label:
            'Video Reels',

        icon:
            'bi-play-btn-fill',
    },

    /*
     * Data lama.
     */
    'SOCIAL MEDIA': {
        label:
            'Social Media (Data Lama)',

        icon:
            'bi-instagram',
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
                month: 'long',
                year: 'numeric',
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
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }
        );
};

const formatNumber = (
    value
) => {
    return new Intl.NumberFormat(
        'id-ID'
    ).format(
        Number(
            value || 0
        )
    );
};

const normalizeExternalUrl = (
    value
) => {
    if (!value) {
        return null;
    }

    const normalizedValue =
        String(
            value
        ).trim();

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

const getFileUrl = (
    value
) => {
    if (!value) {
        return null;
    }

    if (
        value.startsWith(
            'http://'
        ) ||
        value.startsWith(
            'https://'
        )
    ) {
        return value;
    }

    const apiBaseUrl =
        import.meta.env
            .VITE_API_URL ||
        'http://127.0.0.1:8000/api';

    const backendBaseUrl =
        apiBaseUrl.replace(
            /\/api\/?$/,
            ''
        );

    if (
        value.startsWith(
            '/storage/'
        )
    ) {
        return `${backendBaseUrl}${value}`;
    }

    if (
        value.startsWith(
            'storage/'
        )
    ) {
        return `${backendBaseUrl}/${value}`;
    }

    return `${backendBaseUrl}/storage/${value}`;
};

const getResolvedUnitName = (
    requestData
) => {
    if (
        requestData
            ?.resolved_unit_name
    ) {
        return requestData
            .resolved_unit_name;
    }

    if (
        requestData
            ?.unit_name ===
        'Lainnya'
    ) {
        return (
            requestData
                .other_unit_name ||
            'Lainnya'
        );
    }

    return (
        requestData
            ?.unit_name ||
        requestData
            ?.requester_unit ||
        requestData
            ?.user
            ?.unit_name ||
        '-'
    );
};

const getCoverageParts = (
    coverageType
) => {
    if (!coverageType) {
        return [];
    }

    return String(
        coverageType
    )
        .split(
            /[;,]/
        )
        .map(
            (item) =>
                item
                    .trim()
                    .toUpperCase()
        )
        .filter(Boolean);
};

const getCoverageLabels = (
    coverageType
) => {
    const parts =
        getCoverageParts(
            coverageType
        );

    if (
        parts.length ===
        0
    ) {
        return '-';
    }

    return parts
        .map(
            (item) =>
                COVERAGE_TYPE_CONFIG[
                    item
                ]?.label ||
                item
        )
        .join(
            '; '
        );
};

const getCoverageIcon = (
    coverageType
) => {
    const firstPart =
        getCoverageParts(
            coverageType
        )[0];

    return (
        COVERAGE_TYPE_CONFIG[
            firstPart
        ]?.icon ||
        'bi-camera-reels-fill'
    );
};

const InfoItem = ({
    label,
    value,
    icon =
        'bi-info-circle',
    fullWidth =
        false,
    isLink =
        false,
}) => {
    const linkUrl =
        isLink
            ? normalizeExternalUrl(
                  value
              )
            : null;

    return (
        <div
            className={
                fullWidth
                    ? 'col-12'
                    : 'col-md-6'
            }
        >
            <div className="p-3 rounded-4 bg-light h-100">
                <div className="d-flex align-items-start gap-3">
                    <div
                        className="rounded-circle bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                            width: 42,
                            height: 42,
                        }}
                    >
                        <i
                            className={`bi ${icon}`}
                        />
                    </div>

                    <div className="min-w-0 flex-grow-1">
                        <div className="small text-muted fw-bold mb-1">
                            {label}
                        </div>

                        {linkUrl ? (
                            <a
                                href={
                                    linkUrl
                                }
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
                                    whiteSpace:
                                        fullWidth
                                            ? 'pre-line'
                                            : 'normal',
                                }}
                            >
                                {value ||
                                    '-'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FileCard = ({
    label,
    fileName,
    fileUrl,
    icon =
        'bi-file-earmark-text-fill',
    color =
        'danger',
}) => {
    const finalUrl =
        getFileUrl(
            fileUrl
        );

    return (
        <div className="col-md-6">
            <div className="p-3 rounded-4 border bg-white h-100">
                <div className="d-flex align-items-center gap-3">
                    <div
                        className={`icon-box bg-${color}-subtle text-${color}`}
                    >
                        <i
                            className={`bi ${icon}`}
                        />
                    </div>

                    <div className="min-w-0 flex-grow-1">
                        <div className="small text-muted fw-bold mb-1">
                            {label}
                        </div>

                        <div className="fw-bold text-truncate">
                            {fileName ||
                                'Dokumen lampiran'}
                        </div>
                    </div>

                    {finalUrl ? (
                        <a
                            href={
                                finalUrl
                            }
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
};

const RevisionHistoryCard = ({
    histories,
}) => {
    if (
        !Array.isArray(
            histories
        ) ||
        histories.length ===
            0
    ) {
        return null;
    }

    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h4 className="fw-black mb-1">
                            Riwayat Revisi
                        </h4>

                        <p className="text-muted mb-0">
                            Seluruh permintaan revisi yang pernah diberikan admin.
                        </p>
                    </div>

                    <span className="badge rounded-pill text-bg-info px-3 py-2">
                        {histories.length}{' '}
                        revisi
                    </span>
                </div>

                <div className="d-flex flex-column gap-3">
                    {histories.map(
                        (
                            history,
                            index
                        ) => (
                            <div
                                key={
                                    history.id ||
                                    index
                                }
                                className="p-4 rounded-4 border bg-light"
                            >
                                <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                                    <div className="fw-black text-info">
                                        Revisi #
                                        {histories.length -
                                            index}
                                    </div>

                                    <div className="small text-muted">
                                        {formatDateTime(
                                            history.requested_at
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="text-dark mb-3"
                                    style={{
                                        whiteSpace:
                                            'pre-line',
                                        lineHeight:
                                            1.7,
                                    }}
                                >
                                    {history.revision_note ||
                                        '-'}
                                </div>

                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <div className="small text-muted">
                                            Diminta oleh
                                        </div>

                                        <div className="fw-bold">
                                            {history
                                                .requested_by
                                                ?.name ||
                                                history
                                                    .requestedBy
                                                    ?.name ||
                                                'Admin'}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="small text-muted">
                                            Dikirim ulang
                                        </div>

                                        <div className="fw-bold">
                                            {history.resubmitted_at
                                                ? formatDateTime(
                                                      history.resubmitted_at
                                                  )
                                                : 'Belum dikirim ulang'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
};

export default function MyRequestDetailPage() {
    const {
        type,
        id,
    } = useParams();

    const navigate =
        useNavigate();

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

    const historyPath =
        `${basePath}/my-requests`;

    const dashboardPath =
        `${basePath}/dashboard`;

    const [
        requestData,
        setRequestData,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const typeConfig =
        TYPE_CONFIG[
            type
        ];

    const fetchDetail =
        useCallback(
            async () => {
                if (
                    !typeConfig ||
                    !id
                ) {
                    setErrorMessage(
                        'Jenis pengajuan tidak dikenali.'
                    );

                    setLoading(
                        false
                    );

                    return;
                }

                try {
                    setLoading(
                        true
                    );

                    setErrorMessage(
                        ''
                    );

                    const response =
                        await api.get(
                            typeConfig.endpoint(
                                id
                            )
                        );

                    setRequestData(
                        response
                            ?.data
                            ?.data ||
                            response
                                ?.data ||
                            null
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch request detail error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setErrorMessage(
                        error
                            ?.response
                            ?.data
                            ?.message ||
                            'Detail pengajuan tidak dapat dimuat.'
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                id,
                typeConfig,
            ]
        );

    useEffect(
        () => {
            fetchDetail();
        },
        [
            fetchDetail,
        ]
    );

    const statusConfig =
        useMemo(
            () => {
                return (
                    STATUS_CONFIG[
                        requestData
                            ?.status
                    ] || {
                        label:
                            requestData
                                ?.status ||
                            'Tidak diketahui',

                        shortLabel:
                            requestData
                                ?.status ||
                            'Tidak diketahui',

                        badgeClass:
                            'text-bg-secondary',

                        icon:
                            'bi-info-circle-fill',

                        description:
                            'Status pengajuan tidak diketahui.',
                    }
                );
            },
            [
                requestData
                    ?.status,
            ]
        );

    const requestCode =
        useMemo(
            () => {
                if (
                    !requestData
                ) {
                    return '-';
                }

                if (
                    type ===
                    'merchandise'
                ) {
                    return (
                        requestData
                            .order_code ||
                        requestData
                            .code ||
                        `MER-${String(
                            requestData.id
                        ).padStart(
                            4,
                            '0'
                        )}`
                    );
                }

                if (
                    type ===
                    'humas'
                ) {
                    return (
                        requestData
                            .service_code ||
                        requestData
                            .code ||
                        `HMS-${String(
                            requestData.id
                        ).padStart(
                            4,
                            '0'
                        )}`
                    );
                }

                return (
                    requestData
                        .borrow_code ||
                    requestData
                        .code ||
                    `BRW-${String(
                        requestData.id
                    ).padStart(
                        4,
                        '0'
                    )}`
                );
            },
            [
                requestData,
                type,
            ]
        );

    const requestTitle =
        useMemo(
            () => {
                if (
                    !requestData
                ) {
                    return '-';
                }

                if (
                    type ===
                    'humas'
                ) {
                    return (
                        getCoverageLabels(
                            requestData
                                .coverage_type
                        ) ||
                        'Layanan Humas'
                    );
                }

                return (
                    requestData
                        .title ||
                    requestData
                        .event_name ||
                    requestData
                        .activity_name ||
                    requestData
                        .purpose ||
                    typeConfig
                        ?.label ||
                    'Pengajuan'
                );
            },
            [
                requestData,
                type,
                typeConfig,
            ]
        );

    const timelineItems =
        useMemo(
            () => {
                if (
                    !requestData
                ) {
                    return [];
                }

                const items =
                    [];

                items.push({
                    label:
                        'Pengajuan Dikirim',

                    description:
                        'Pengajuan berhasil dikirim ke sistem.',

                    date:
                        requestData
                            .submitted_at ||
                        requestData
                            .created_at,

                    icon:
                        'bi-send-check-fill',

                    status:
                        'done',
                });

                if (
                    requestData
                        .status ===
                    'pending'
                ) {
                    if (
                        requestData
                            .resubmitted_at
                    ) {
                        items.push({
                            label:
                                'Perbaikan Dikirim Ulang',

                            description:
                                'Pemohon telah mengirimkan data hasil perbaikan.',

                            date:
                                requestData
                                    .resubmitted_at,

                            icon:
                                'bi-arrow-repeat',

                            status:
                                'done',
                        });
                    }

                    items.push({
                        label:
                            'Menunggu Pemeriksaan',

                        description:
                            'Admin sedang memeriksa data pengajuan.',

                        date:
                            null,

                        icon:
                            'bi-hourglass-split',

                        status:
                            'active',
                    });
                }

                if (
                    requestData
                        .status ===
                    'revision'
                ) {
                    items.push({
                        label:
                            'Revisi Diminta',

                        description:
                            requestData
                                .admin_note ||
                            'Admin meminta pengajuan diperbaiki.',

                        date:
                            requestData
                                .revision_requested_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-pencil-square',

                        status:
                            'active',
                    });
                }

                if (
                    [
                        'approved',
                        'completed',
                        'borrowed',
                        'returned',
                    ].includes(
                        requestData
                            .status
                    )
                ) {
                    items.push({
                        label:
                            'Pengajuan Disetujui',

                        description:
                            'Admin telah menyetujui pengajuan.',

                        date:
                            requestData
                                .approved_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-check-circle-fill',

                        status:
                            'done',
                    });
                }

                if (
                    requestData
                        .status ===
                    'rejected'
                ) {
                    items.push({
                        label:
                            'Pengajuan Ditolak',

                        description:
                            requestData
                                .admin_note ||
                            'Pengajuan tidak dapat diproses.',

                        date:
                            requestData
                                .rejected_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-x-circle-fill',

                        status:
                            'rejected',
                    });
                }

                if (
                    [
                        'borrowed',
                        'returned',
                    ].includes(
                        requestData
                            .status
                    )
                ) {
                    items.push({
                        label:
                            'Barang Diserahkan',

                        description:
                            'Barang telah diserahkan kepada pemohon.',

                        date:
                            requestData
                                .borrowed_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-box-arrow-up-right',

                        status:
                            'done',
                    });
                }

                if (
                    requestData
                        .status ===
                    'completed'
                ) {
                    items.push({
                        label:
                            'Layanan Selesai',

                        description:
                            type ===
                            'humas'
                                ? 'Hasil pekerjaan Humas telah tersedia.'
                                : 'Seluruh proses pelayanan telah diselesaikan.',

                        date:
                            requestData
                                .completed_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-check2-all',

                        status:
                            'done',
                    });
                }

                if (
                    requestData
                        .status ===
                    'returned'
                ) {
                    items.push({
                        label:
                            'Barang Dikembalikan',

                        description:
                            'Barang telah dikembalikan kepada petugas.',

                        date:
                            requestData
                                .returned_at ||
                            requestData
                                .updated_at,

                        icon:
                            'bi-box-arrow-in-down-left',

                        status:
                            'done',
                    });
                }

                return items;
            },
            [
                requestData,
                type,
            ]
        );

    if (
        !typeConfig
    ) {
        return (
            <div className="container-fluid px-0">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <i className="bi bi-exclamation-triangle-fill display-4 text-warning mb-3" />

                        <h4 className="fw-black">
                            Jenis pengajuan tidak dikenali
                        </h4>

                        <p className="text-muted">
                            Halaman detail yang kamu buka tidak tersedia.
                        </p>

                        <Link
                            to={
                                historyPath
                            }
                            className="btn btn-danger rounded-pill px-4"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali ke Riwayat
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (
        loading
    ) {
        return (
            <div className="container-fluid px-0">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body py-5 text-center">
                        <div className="spinner-border text-danger mb-3" />

                        <h5 className="fw-bold mb-1">
                            Memuat detail pengajuan
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (
        errorMessage ||
        !requestData
    ) {
        return (
            <div className="container-fluid px-0">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                            style={{
                                width: 86,
                                height: 86,
                            }}
                        >
                            <i className="bi bi-exclamation-circle-fill fs-1" />
                        </div>

                        <h4 className="fw-black mb-2">
                            Detail tidak dapat dimuat
                        </h4>

                        <p className="text-muted mb-4">
                            {
                                errorMessage
                            }
                        </p>

                        <div className="d-flex flex-wrap justify-content-center gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-danger rounded-pill px-4"
                                onClick={
                                    fetchDetail
                                }
                            >
                                <i className="bi bi-arrow-clockwise me-2" />

                                Coba Lagi
                            </button>

                            <Link
                                to={
                                    historyPath
                                }
                                className="btn btn-danger rounded-pill px-4"
                            >
                                <i className="bi bi-arrow-left me-2" />

                                Kembali ke Riwayat
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const userData =
        requestData.user ||
        {};

    const orderItems =
        requestData.items ||
        requestData
            .order_items ||
        [];

    const borrowItems =
        requestData.items ||
        requestData
            .borrow_items ||
        requestData
            .borrow_request_items ||
        [];

    const revisionHistories =
        requestData
            .revision_histories ||
        requestData
            .revisionHistories ||
        [];

    const resolvedUnitName =
        getResolvedUnitName(
            requestData
        );

    const resultUrl =
        normalizeExternalUrl(
            requestData
                .result_link
        );

    const resultFileUrl =
        requestData
            .result_file_url ||
        requestData
            .result_file_path ||
        null;

    const handoverEvidenceUrl =
        requestData
            .handover_evidence_url ||
        requestData
            .handover_evidence_path ||
        null;

    const returnEvidenceUrl =
        requestData
            .return_evidence_url ||
        requestData
            .return_evidence_path ||
        null;

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-4">
                        <div className="d-flex align-items-start gap-3">
                            <div
                                className={`rounded-4 bg-${typeConfig.color}-subtle text-${typeConfig.color} d-flex align-items-center justify-content-center flex-shrink-0`}
                                style={{
                                    width: 72,
                                    height: 72,
                                }}
                            >
                                <i
                                    className={`bi ${typeConfig.icon} fs-2`}
                                />
                            </div>

                            <div>
                                <span
                                    className={`badge rounded-pill bg-${typeConfig.color}-subtle text-${typeConfig.color} px-3 py-2 mb-3`}
                                >
                                    {
                                        typeConfig.label
                                    }
                                </span>

                                <h2 className="fw-black mb-2">
                                    {
                                        requestTitle
                                    }
                                </h2>

                                <div className="text-danger fw-bold">
                                    {
                                        requestCode
                                    }
                                </div>
                            </div>
                        </div>

                        <div className="text-lg-end">
                            <span
                                className={`badge rounded-pill ${statusConfig.badgeClass} px-3 py-2 mb-3`}
                            >
                                <i
                                    className={`bi ${statusConfig.icon} me-2`}
                                />

                                {
                                    statusConfig.shortLabel
                                }
                            </span>

                            <div className="small text-muted">
                                Diperbarui
                            </div>

                            <div className="fw-bold">
                                {formatDateTime(
                                    requestData
                                        .updated_at
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {requestData.status ===
                'rejected' && (
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
                                style={{
                                    whiteSpace:
                                        'pre-line',
                                }}
                            >
                                {requestData
                                    .admin_note ||
                                    'Admin tidak memberikan alasan tambahan.'}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {type ===
                'merchandise' &&
                requestData.status ===
                    'revision' && (
                <section className="alert alert-info border-0 rounded-5 shadow-sm p-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <div className="icon-box bg-white text-info">
                            <i className="bi bi-pencil-square" />
                        </div>

                        <div>
                            <h5 className="fw-black mb-2">
                                Pengajuan Perlu Direvisi
                            </h5>

                            <p
                                className="mb-0"
                                style={{
                                    whiteSpace:
                                        'pre-line',
                                }}
                            >
                                {requestData
                                    .admin_note ||
                                    'Silakan periksa dan perbaiki kembali data pengajuan.'}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {type ===
                'merchandise' &&
                requestData.status ===
                    'revision' && (
                <MerchandiseRevisionForm
                    order={
                        requestData
                    }
                    onSuccess={
                        fetchDetail
                    }
                />
            )}

            {type ===
                'humas' &&
                requestData.status ===
                    'completed' && (
                <section className="card border-0 shadow-sm rounded-5 mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-4 mb-4">
                            <div className="d-flex align-items-start gap-3">
                                <div className="icon-box bg-success-subtle text-success">
                                    <i className="bi bi-cloud-check-fill" />
                                </div>

                                <div>
                                    <h4 className="fw-black mb-1">
                                        Hasil Pekerjaan Humas
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Request layanan Humas telah selesai diproses.
                                    </p>
                                </div>
                            </div>

                            {resultUrl && (
                                <a
                                    href={
                                        resultUrl
                                    }
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
                                fileName={
                                    requestData
                                        .result_file_name
                                }
                                fileUrl={
                                    resultFileUrl
                                }
                                icon="bi-file-earmark-check-fill"
                                color="success"
                            />

                            <div className="col-md-6">
                                <div className="p-3 rounded-4 border bg-white h-100">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="icon-box bg-success-subtle text-success">
                                            <i className="bi-link-45deg" />
                                        </div>

                                        <div className="flex-grow-1">
                                            <div className="small text-muted fw-bold mb-1">
                                                Link Hasil
                                            </div>

                                            {resultUrl ? (
                                                <a
                                                    href={
                                                        resultUrl
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="fw-bold text-success text-decoration-none"
                                                >
                                                    Buka hasil

                                                    <i className="bi bi-box-arrow-up-right ms-2" />
                                                </a>
                                            ) : (
                                                <div className="fw-bold">
                                                    Tidak tersedia
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {requestData
                            .result_note && (
                            <div className="mt-4 p-3 rounded-4 bg-light border">
                                <div className="small fw-bold text-muted mb-1">
                                    Catatan Hasil
                                </div>

                                <div
                                    className="text-dark"
                                    style={{
                                        whiteSpace:
                                            'pre-line',
                                    }}
                                >
                                    {
                                        requestData
                                            .result_note
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {type ===
                'borrowing' &&
                (
                    handoverEvidenceUrl ||
                    returnEvidenceUrl
                ) && (
                <section className="card border-0 shadow-sm rounded-5 mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h4 className="fw-black mb-1">
                                    Bukti Proses Peminjaman
                                </h4>

                                <p className="text-muted mb-0">
                                    Bukti serah terima dan pengembalian yang diunggah admin.
                                </p>
                            </div>

                            <div className="icon-box bg-success-subtle text-success">
                                <i className="bi bi-folder-check" />
                            </div>
                        </div>

                        <div className="row g-3">
                            <FileCard
                                label="Bukti Serah Terima"
                                fileName={
                                    requestData
                                        .handover_evidence_name
                                }
                                fileUrl={
                                    handoverEvidenceUrl
                                }
                                icon="bi-box-arrow-up-right"
                                color="success"
                            />

                            <FileCard
                                label="Bukti Pengembalian"
                                fileName={
                                    requestData
                                        .return_evidence_name
                                }
                                fileUrl={
                                    returnEvidenceUrl
                                }
                                icon="bi-box-arrow-in-down-left"
                                color="success"
                            />
                        </div>
                    </div>
                </section>
            )}

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Informasi Pengajuan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Data utama pengajuan yang dikirim.
                                    </p>
                                </div>

                                <div
                                    className={`icon-box bg-${typeConfig.color}-subtle text-${typeConfig.color}`}
                                >
                                    <i
                                        className={`bi ${typeConfig.icon}`}
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                <InfoItem
                                    label="Nama Pemohon"
                                    value={
                                        requestData
                                            .applicant_name ||
                                        userData
                                            .name ||
                                        requestData
                                            .requester_name ||
                                        '-'
                                    }
                                    icon="bi-person-fill"
                                />

                                {type !==
                                    'merchandise' && (
                                    <InfoItem
                                        label="Unit / Bagian"
                                        value={
                                            resolvedUnitName
                                        }
                                        icon="bi-building-fill"
                                    />
                                )}

                                {type ===
                                    'merchandise' && (
                                    <>
                                        <InfoItem
                                            label="Nama Kegiatan"
                                            value={
                                                requestData
                                                    .event_name ||
                                                requestData
                                                    .activity_name
                                            }
                                            icon="bi-calendar-event-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(
                                                requestData
                                                    .activity_date
                                            )}
                                            icon="bi-calendar-date-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Pengambilan Merchandise"
                                            value={formatDate(
                                                requestData
                                                    .pickup_date
                                            )}
                                            icon="bi-calendar-check-fill"
                                        />

                                        <InfoItem
                                            label="Nama PIC"
                                            value={
                                                requestData
                                                    .pic_name
                                            }
                                            icon="bi-person-check-fill"
                                        />

                                        <InfoItem
                                            label="Nomor PIC"
                                            value={
                                                requestData
                                                    .pic_phone
                                            }
                                            icon="bi-whatsapp"
                                        />

                                        <InfoItem
                                            label="Instansi Tamu"
                                            value={
                                                requestData
                                                    .institution_name
                                            }
                                            icon="bi-buildings-fill"
                                        />

                                        <InfoItem
                                            label="Nama Tamu"
                                            value={
                                                requestData
                                                    .guest_name
                                            }
                                            icon="bi-person-badge-fill"
                                        />

                                        <InfoItem
                                            label="Jabatan Tamu"
                                            value={
                                                requestData
                                                    .guest_position
                                            }
                                            icon="bi-briefcase-fill"
                                        />

                                        <InfoItem
                                            label="Alasan / Catatan Pengajuan"
                                            value={
                                                requestData
                                                    .user_note
                                            }
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {type ===
                                    'humas' && (
                                    <>
                                        <InfoItem
                                            label="Nomor WhatsApp PIC"
                                            value={
                                                requestData
                                                    .pic_whatsapp
                                            }
                                            icon="bi-whatsapp"
                                        />

                                        <InfoItem
                                            label="Jenis Layanan Humas"
                                            value={getCoverageLabels(
                                                requestData
                                                    .coverage_type
                                            )}
                                            icon={getCoverageIcon(
                                                requestData
                                                    .coverage_type
                                            )}
                                        />

                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(
                                                requestData
                                                    .event_date
                                            )}
                                            icon="bi-calendar-date-fill"
                                        />

                                        <InfoItem
                                            label="Lokasi Kegiatan"
                                            value={
                                                requestData
                                                    .event_location
                                            }
                                            icon="bi-geo-alt-fill"
                                        />

                                        <InfoItem
                                            label="Link Referensi"
                                            value={
                                                requestData
                                                    .reference_link
                                            }
                                            icon="bi-link-45deg"
                                            isLink
                                            fullWidth
                                        />

                                        <InfoItem
                                            label="Detail Kegiatan"
                                            value={
                                                requestData
                                                    .activity_detail
                                            }
                                            icon="bi-file-earmark-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {type ===
                                    'borrowing' && (
                                    <>
                                        <InfoItem
                                            label="Tanggal Pengambilan"
                                            value={formatDate(
                                                requestData
                                                    .borrow_date
                                            )}
                                            icon="bi-calendar-plus-fill"
                                        />

                                        <InfoItem
                                            label="Tanggal Pengembalian"
                                            value={formatDate(
                                                requestData
                                                    .return_date
                                            )}
                                            icon="bi-calendar-minus-fill"
                                        />

                                        <InfoItem
                                            label="Tujuan Peminjaman"
                                            value={
                                                requestData
                                                    .purpose
                                            }
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {type ===
                        'merchandise' &&
                        revisionHistories.length >
                            0 && (
                        <RevisionHistoryCard
                            histories={
                                revisionHistories
                            }
                        />
                    )}

                    {type ===
                        'merchandise' &&
                        orderItems.length >
                            0 && (
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-4">
                                    Paket Merchandise
                                </h4>

                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>
                                                    Produk
                                                </th>

                                                <th className="text-center">
                                                    Jumlah
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {orderItems.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.id ||
                                                            index
                                                        }
                                                    >
                                                        <td>
                                                            <div className="fw-bold">
                                                                {item
                                                                    .product
                                                                    ?.name ||
                                                                    item
                                                                        .product_name ||
                                                                    item
                                                                        .name ||
                                                                    'Produk'}
                                                            </div>
                                                        </td>

                                                        <td className="text-center fw-black">
                                                            {formatNumber(
                                                                item
                                                                    .quantity
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

                    {type ===
                        'borrowing' &&
                        borrowItems.length >
                            0 && (
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-4">
                                    Perlengkapan Dipinjam
                                </h4>

                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>
                                                    Perlengkapan
                                                </th>

                                                <th className="text-center">
                                                    Jumlah
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {borrowItems.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.id ||
                                                            index
                                                        }
                                                    >
                                                        <td>
                                                            <div className="fw-bold">
                                                                {item
                                                                    .product
                                                                    ?.name ||
                                                                    item
                                                                        .product_name ||
                                                                    item
                                                                        .name ||
                                                                    'Perlengkapan'}
                                                            </div>
                                                        </td>

                                                        <td className="text-center fw-black">
                                                            {formatNumber(
                                                                item
                                                                    .quantity
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

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Dokumen Pendukung
                            </h4>

                            <p className="text-muted mb-4">
                                Lampiran yang dikirim bersama pengajuan.
                            </p>

                            <div className="row g-3">
                                {type ===
                                    'merchandise' && (
                                    <FileCard
                                        label="Bukti Undangan / Dokumen"
                                        fileName={
                                            requestData
                                                .proof_file_name
                                        }
                                        fileUrl={
                                            requestData
                                                .proof_file_url ||
                                            requestData
                                                .proof_file_path
                                        }
                                        color="primary"
                                    />
                                )}

                                {type ===
                                    'humas' && (
                                    <FileCard
                                        label="Lampiran / Brief Kegiatan"
                                        fileName={
                                            requestData
                                                .article_draft_name ||
                                            'Lampiran / Brief Kegiatan'
                                        }
                                        fileUrl={
                                            requestData
                                                .article_draft_url ||
                                            requestData
                                                .article_draft_path
                                        }
                                        icon="bi-file-earmark-arrow-up-fill"
                                        color="danger"
                                    />
                                )}

                                {type ===
                                    'borrowing' && (
                                    <>
                                        <FileCard
                                            label="Bukti Serah Terima"
                                            fileName={
                                                requestData
                                                    .handover_evidence_name
                                            }
                                            fileUrl={
                                                handoverEvidenceUrl
                                            }
                                            icon="bi-box-arrow-up-right"
                                            color="success"
                                        />

                                        <FileCard
                                            label="Bukti Pengembalian"
                                            fileName={
                                                requestData
                                                    .return_evidence_name
                                            }
                                            fileUrl={
                                                returnEvidenceUrl
                                            }
                                            icon="bi-box-arrow-in-down-left"
                                            color="success"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Status Pengajuan
                            </h4>

                            <p className="text-muted mb-4">
                                Perkembangan proses pelayanan.
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
                                    {
                                        statusConfig.label
                                    }
                                </h5>

                                <p className="text-muted small mb-0">
                                    {
                                        statusConfig.description
                                    }
                                </p>
                            </div>

                            {type ===
                                'merchandise' &&
                                requestData
                                    .pickup_date && (
                                <div className="p-3 rounded-4 bg-primary-subtle mb-4">
                                    <div className="small text-muted mb-1">
                                        Jadwal Pengambilan Merchandise
                                    </div>

                                    <div className="fw-black text-primary">
                                        <i className="bi bi-calendar-check-fill me-2" />

                                        {formatDate(
                                            requestData
                                                .pickup_date
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="request-timeline">
                                {timelineItems.map(
                                    (
                                        item,
                                        index
                                    ) => (
                                        <div
                                            className={`request-timeline-item ${
                                                item.status ===
                                                'active'
                                                    ? 'active'
                                                    : item.status ===
                                                        'rejected'
                                                      ? 'rejected'
                                                      : 'done'
                                            }`}
                                            key={`${item.label}-${index}`}
                                        >
                                            <div className="request-timeline-marker">
                                                <i
                                                    className={`bi ${item.icon}`}
                                                />
                                            </div>

                                            <div className="request-timeline-content">
                                                <div className="fw-black mb-1">
                                                    {
                                                        item.label
                                                    }
                                                </div>

                                                <div className="small text-muted mb-1">
                                                    {
                                                        item.description
                                                    }
                                                </div>

                                                {item.date && (
                                                    <div className="small fw-bold text-danger">
                                                        {formatDateTime(
                                                            item.date
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <div className="d-grid gap-2">
                                <Link
                                    to={
                                        historyPath
                                    }
                                    className="btn btn-danger rounded-pill"
                                >
                                    <i className="bi bi-arrow-left me-2" />

                                    Kembali ke Riwayat
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={() =>
                                        navigate(
                                            dashboardPath
                                        )
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
        </div>
    );
}