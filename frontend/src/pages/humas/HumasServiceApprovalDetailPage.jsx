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

import {
    closeAlert,
    showCompletionAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showTextareaAlert,
} from '../../utils/sweetAlert';

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass:
            'bg-warning-subtle text-warning-emphasis',
        icon:
            'bi-hourglass-split',
    },

    approved: {
        label: 'Disetujui',
        badgeClass:
            'bg-primary-subtle text-primary',
        icon:
            'bi-check-circle-fill',
    },

    rejected: {
        label: 'Ditolak',
        badgeClass:
            'bg-danger-subtle text-danger',
        icon:
            'bi-x-circle-fill',
    },

    completed: {
        label: 'Selesai',
        badgeClass:
            'bg-success-subtle text-success',
        icon:
            'bi-check2-all',
    },
};

const COVERAGE_CONFIG = {
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

const normalizePermissions = (
    permissions
) => {
    if (
        !Array.isArray(
            permissions
        )
    ) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(
                Boolean
            )
        ),
    ];
};

const hasPermission = (
    currentUser,
    permission
) => {
    if (
        currentUser?.role ===
        'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(
        permission
    );
};

const formatDate = (
    dateValue
) => {
    if (!dateValue) {
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
                month: 'long',
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
                month: 'long',
                year: 'numeric',
            }
        );
};

const formatDateTime = (
    dateValue
) => {
    if (!dateValue) {
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
                month: 'long',
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
        String(
            value
        ).trim();

    if (
        !normalizedValue
    ) {
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

const extractErrorMessage = (
    error
) => {
    const responseData =
        error?.response?.data;

    if (
        responseData?.errors
    ) {
        const firstError =
            Object.values(
                responseData.errors
            )?.[0]?.[0];

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        responseData?.message ||
        'Terjadi kesalahan ketika memproses request.'
    );
};

const DetailItem = ({
    label,
    value,
    icon =
        'bi-info-circle',
    children,
}) => {
    return (
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
                    <div className="small text-muted mb-1">
                        {label}
                    </div>

                    {children || (
                        <div className="fw-bold text-break">
                            {value || '-'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TimelineItem = ({
    label,
    value,
    icon,
    active = false,
    rejected = false,
}) => {
    let statusClass =
        'done';

    if (active) {
        statusClass =
            'active';
    }

    if (rejected) {
        statusClass =
            'rejected';
    }

    return (
        <div
            className={`request-timeline-item ${statusClass}`}
        >
            <div className="request-timeline-marker">
                <i
                    className={`bi ${icon}`}
                />
            </div>

            <div className="request-timeline-content">
                <div className="fw-black mb-1">
                    {label}
                </div>

                <div className="small text-muted">
                    {value || '-'}
                </div>
            </div>
        </div>
    );
};

export default function HumasServiceApprovalDetailPage() {
    const {
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

    const canProcess =
        hasPermission(
            currentUser,
            'approval.humas.process'
        );

    const [
        requestData,
        setRequestData,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        processing,
        setProcessing,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const loadDetail =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setErrorMessage(
                        ''
                    );

                    const response =
                        await api.get(
                            `/humas-service-requests/${id}`
                        );

                    setRequestData(
                        response
                            ?.data
                            ?.data ||
                        null
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch Humas detail error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setErrorMessage(
                        extractErrorMessage(
                            error
                        )
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                id,
            ]
        );

    useEffect(() => {
        loadDetail();
    }, [
        loadDetail,
    ]);

    const statusConfig =
        useMemo(() => {
            return (
                STATUS_CONFIG[
                    requestData
                        ?.status
                ] || {
                    label:
                        requestData
                            ?.status ||
                        'Tidak diketahui',

                    badgeClass:
                        'bg-secondary-subtle text-secondary',

                    icon:
                        'bi-info-circle-fill',
                }
            );
        }, [
            requestData
                ?.status,
        ]);

    const coverageConfig =
        useMemo(() => {
            return (
                COVERAGE_CONFIG[
                    requestData
                        ?.coverage_type
                ] || {
                    label:
                        requestData
                            ?.coverage_type ||
                        '-',

                    icon:
                        'bi-camera-reels-fill',
                }
            );
        }, [
            requestData
                ?.coverage_type,
        ]);

    const resolvedUnitName =
        useMemo(() => {
            if (
                !requestData
            ) {
                return '-';
            }

            if (
                requestData
                    .resolved_unit_name
            ) {
                return requestData
                    .resolved_unit_name;
            }

            if (
                requestData
                    .unit_name ===
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
                    .unit_name ||
                requestData
                    .requester_unit ||
                requestData
                    .user
                    ?.unit_name ||
                '-'
            );
        }, [
            requestData,
        ]);

    const referenceUrl =
        useMemo(
            () =>
                normalizeExternalUrl(
                    requestData
                        ?.reference_link
                ),
            [
                requestData
                    ?.reference_link,
            ]
        );

    const resultUrl =
        useMemo(
            () =>
                normalizeExternalUrl(
                    requestData
                        ?.result_link
                ),
            [
                requestData
                    ?.result_link,
            ]
        );

    const ensureProcessAccess =
        async () => {
            if (
                canProcess
            ) {
                return true;
            }

            await showErrorAlert(
                'Akses Ditolak',
                'Akun hanya memiliki izin melihat approval dan tidak dapat memproses request liputan.'
            );

            return false;
        };

    const processAction =
        async (
            action,
            payload,
            successTitle
        ) => {
            if (
                !(await ensureProcessAccess())
            ) {
                return;
            }

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Memproses Request',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.put(
                        `/humas-service-requests/${id}/${action}`,
                        payload
                    );

                closeAlert();

                await showSuccessAlert(
                    successTitle,
                    response
                        ?.data
                        ?.message ||
                        'Request berhasil diproses.'
                );

                if (
                    response
                        ?.data
                        ?.data
                ) {
                    setRequestData(
                        response
                            .data
                            .data
                    );
                } else {
                    await loadDetail();
                }
            } catch (
                error
            ) {
                console.error(
                    `Process Humas ${action} error:`,
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Proses Gagal',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    const handleApprove =
        async () => {
            if (
                !(await ensureProcessAccess())
            ) {
                return;
            }

            if (
                requestData
                    ?.status !==
                'pending'
            ) {
                await showErrorAlert(
                    'Status Tidak Sesuai',
                    'Hanya request berstatus menunggu yang dapat disetujui.'
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Setujui Request Liputan?',

                    text:
                        'Request akan diteruskan kepada tim Humas untuk diproses.',

                    confirmButtonText:
                        'Ya, setujui',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#2563eb',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            await processAction(
                'approve',
                {},
                'Request Disetujui'
            );
        };

    const handleReject =
        async () => {
            if (
                !(await ensureProcessAccess())
            ) {
                return;
            }

            if (
                requestData
                    ?.status !==
                'pending'
            ) {
                await showErrorAlert(
                    'Status Tidak Sesuai',
                    'Hanya request berstatus menunggu yang dapat ditolak.'
                );

                return;
            }

            const result =
                await showTextareaAlert({
                    title:
                        'Tolak Request Liputan?',

                    text:
                        'Masukkan alasan penolakan untuk ditampilkan kepada pemohon.',

                    inputLabel:
                        'Alasan Penolakan',

                    inputPlaceholder:
                        'Tuliskan alasan penolakan...',

                    confirmButtonText:
                        'Ya, tolak request',

                    cancelButtonText:
                        'Batal',

                    confirmButtonColor:
                        '#dc2626',

                    minimumLength:
                        5,

                    maximumLength:
                        2000,
                });

            if (
                !result
                    .isConfirmed ||
                !result.value
            ) {
                return;
            }

            await processAction(
                'reject',
                {
                    admin_note:
                        result
                            .value
                            .trim(),
                },
                'Request Ditolak'
            );
        };

    const handleComplete =
        async () => {
            if (
                !(await ensureProcessAccess())
            ) {
                return;
            }

            if (
                requestData
                    ?.status !==
                'approved'
            ) {
                await showErrorAlert(
                    'Status Tidak Sesuai',
                    'Request hanya dapat diselesaikan setelah disetujui.'
                );

                return;
            }

            const result =
                await showCompletionAlert({
                    title:
                        'Selesaikan Request Liputan?',

                    text:
                        'Masukkan link hasil pekerjaan yang dapat dibuka oleh pemohon.',

                    confirmButtonText:
                        'Simpan dan Selesaikan',

                    cancelButtonText:
                        'Batal',
                });

            if (
                !result
                    .isConfirmed ||
                !result.value
            ) {
                return;
            }

            await processAction(
                'complete',
                {
                    result_link:
                        result
                            .value
                            .result_link,

                    result_note:
                        result
                            .value
                            .result_note,
                },
                'Request Selesai'
            );
        };

    if (
        loading
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat detail request
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    if (
        errorMessage ||
        !requestData
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                        style={{
                            width: 84,
                            height: 84,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h4 className="fw-black mb-2">
                        Detail gagal dimuat
                    </h4>

                    <p className="text-muted mb-4">
                        {errorMessage ||
                            'Data request tidak ditemukan.'}
                    </p>

                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill"
                            onClick={
                                loadDetail
                            }
                        >
                            <i className="bi bi-arrow-clockwise me-2" />

                            Coba Lagi
                        </button>

                        <button
                            type="button"
                            className="btn btn-danger rounded-pill"
                            onClick={() =>
                                navigate(
                                    '/admin/humas-services'
                                )
                            }
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali ke Approval Humas
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <header className="approval-detail-header mb-4">
                <div className="approval-detail-heading">
                    <Link
                        to="/admin/humas-services"
                        className="approval-detail-back-link"
                    >
                        <i className="bi bi-arrow-left" />

                        <span>
                            Kembali ke Approval Liputan Humas
                        </span>
                    </Link>

                    <h2 className="approval-detail-title">
                        Detail Request Liputan
                    </h2>

                    <div className="approval-detail-meta">
                        <span className="fw-bold text-muted">
                            {requestData
                                .service_code ||
                                `HMS-${requestData.id}`}
                        </span>

                        <span
                            className={`badge rounded-pill px-3 py-2 ${statusConfig.badgeClass}`}
                        >
                            <i
                                className={`bi ${statusConfig.icon} me-2`}
                            />

                            {
                                statusConfig.label
                            }
                        </span>
                    </div>
                </div>

                <div className="approval-detail-date">
                    <span className="small text-muted">
                        Dikirim
                    </span>

                    <strong>
                        {formatDateTime(
                            requestData
                                .submitted_at ||
                            requestData
                                .created_at
                        )}
                    </strong>
                </div>
            </header>

            {!canProcess && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-eye-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Mode hanya lihat
                            </div>

                            <div className="small">
                                Akun dapat melihat detail request, tetapi tidak dapat menyetujui, menolak, atau menyelesaikannya.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Informasi Pemohon
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Informasi akun, unit, dan kontak pemohon.
                                    </p>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i className="bi bi-person-vcard-fill" />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <DetailItem
                                        label="Nama Lengkap"
                                        value={
                                            requestData
                                                .applicant_name ||
                                            requestData
                                                .user
                                                ?.name ||
                                            '-'
                                        }
                                        icon="bi-person-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="Unit/Program Studi"
                                        value={
                                            resolvedUnitName
                                        }
                                        icon="bi-building-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="WhatsApp PIC Acara"
                                        icon="bi-whatsapp"
                                    >
                                        {requestData
                                            .pic_whatsapp ? (
                                            <a
                                                href={`https://wa.me/62${String(
                                                    requestData
                                                        .pic_whatsapp
                                                )
                                                    .replace(
                                                        /\D/g,
                                                        ''
                                                    )
                                                    .replace(
                                                        /^0/,
                                                        ''
                                                    )}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="fw-bold text-success text-decoration-none"
                                            >
                                                {
                                                    requestData
                                                        .pic_whatsapp
                                                }

                                                <i className="bi bi-box-arrow-up-right ms-2" />
                                            </a>
                                        ) : (
                                            <div className="fw-bold">
                                                -
                                            </div>
                                        )}
                                    </DetailItem>
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="Email Akun"
                                        value={
                                            requestData
                                                .user
                                                ?.email ||
                                            '-'
                                        }
                                        icon="bi-envelope-fill"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Detail Kegiatan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Informasi jenis liputan, jadwal, lokasi, dan kebutuhan kegiatan.
                                    </p>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i
                                        className={`bi ${coverageConfig.icon}`}
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <DetailItem
                                        label="Jenis Liputan"
                                        icon={
                                            coverageConfig
                                                .icon
                                        }
                                        value={
                                            coverageConfig
                                                .label
                                        }
                                    />
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="Tanggal Pelaksanaan"
                                        icon="bi-calendar-event-fill"
                                        value={formatDate(
                                            requestData
                                                .event_date
                                        )}
                                    />
                                </div>

                                <div className="col-12">
                                    <DetailItem
                                        label="Lokasi Acara"
                                        icon="bi-geo-alt-fill"
                                        value={
                                            requestData
                                                .event_location ||
                                            '-'
                                        }
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="p-4 rounded-4 bg-light border">
                                        <div className="small text-muted fw-bold mb-2">
                                            <i className="bi bi-card-text me-2" />

                                            Detail Kegiatan
                                        </div>

                                        <div
                                            style={{
                                                whiteSpace:
                                                    'pre-wrap',

                                                lineHeight:
                                                    1.8,
                                            }}
                                        >
                                            {requestData
                                                .activity_detail ||
                                                '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="p-4 rounded-4 bg-light border">
                                        <div className="small text-muted fw-bold mb-3">
                                            <i className="bi bi-link-45deg me-2" />

                                            Link Referensi
                                        </div>

                                        {referenceUrl ? (
                                            <a
                                                href={
                                                    referenceUrl
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-outline-danger rounded-pill"
                                            >
                                                <i className="bi bi-box-arrow-up-right me-2" />

                                                Buka Link Referensi
                                            </a>
                                        ) : (
                                            <div className="fw-bold text-muted">
                                                Tidak tersedia
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Draft Artikel Kegiatan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Dokumen pendukung yang dikirim oleh pemohon.
                                    </p>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i className="bi bi-file-earmark-richtext-fill" />
                                </div>
                            </div>

                            {requestData
                                .article_draft_url ? (
                                <div className="border rounded-4 p-3 bg-light">
                                    <div className="d-flex align-items-center gap-3 flex-wrap">
                                        <div
                                            className="rounded-4 bg-white text-danger d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                            style={{
                                                width: 54,
                                                height: 54,
                                            }}
                                        >
                                            <i className="bi bi-file-earmark-text-fill fs-4" />
                                        </div>

                                        <div className="flex-grow-1 min-w-0">
                                            <div className="fw-black text-truncate">
                                                {requestData
                                                    .article_draft_name ||
                                                    'Draft Artikel'}
                                            </div>

                                            <div className="small text-muted">
                                                {requestData
                                                    .article_draft_mime ||
                                                    'Dokumen pendukung'}
                                            </div>
                                        </div>

                                        <a
                                            href={
                                                requestData
                                                    .article_draft_url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-danger rounded-pill"
                                        >
                                            <i className="bi bi-eye-fill me-2" />

                                            Buka Dokumen
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-warning rounded-4 mb-0">
                                    Draft artikel tidak tersedia.
                                </div>
                            )}
                        </div>
                    </section>

                    {requestData
                        .status ===
                        'completed' && (
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4 p-lg-5">
                                <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Hasil Pekerjaan
                                        </h4>

                                        <p className="text-muted mb-0">
                                            Link hasil yang diberikan kepada pemohon.
                                        </p>
                                    </div>

                                    <div className="icon-box bg-success-subtle text-success">
                                        <i className="bi bi-cloud-check-fill" />
                                    </div>
                                </div>

                                {resultUrl ? (
                                    <div className="border rounded-4 p-4 bg-success-subtle">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                            <div className="min-w-0">
                                                <div className="small text-muted mb-1">
                                                    Link Hasil
                                                </div>

                                                <div
                                                    className="fw-bold text-truncate"
                                                    style={{
                                                        maxWidth:
                                                            600,
                                                    }}
                                                >
                                                    {
                                                        requestData
                                                            .result_link
                                                    }
                                                </div>
                                            </div>

                                            <a
                                                href={
                                                    resultUrl
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-success rounded-pill"
                                            >
                                                <i className="bi bi-box-arrow-up-right me-2" />

                                                Buka Hasil
                                            </a>
                                        </div>

                                        {requestData
                                            .result_note && (
                                            <div className="bg-white border rounded-4 p-3 mt-3">
                                                <div className="small text-muted fw-bold mb-1">
                                                    Catatan Hasil
                                                </div>

                                                <div
                                                    style={{
                                                        whiteSpace:
                                                            'pre-wrap',

                                                        lineHeight:
                                                            1.7,
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
                                ) : (
                                    <div className="alert alert-warning rounded-4 mb-0">
                                        Request sudah selesai, tetapi link hasil belum tersedia.
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{
                            top: 110,
                        }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Status
                                </h4>

                                <p className="text-muted mb-4">
                                    Perkembangan proses request liputan.
                                </p>

                                <div className="request-timeline">
                                    <TimelineItem
                                        label="Dikirim"
                                        value={formatDateTime(
                                            requestData
                                                .submitted_at ||
                                            requestData
                                                .created_at
                                        )}
                                        icon="bi-send-check-fill"
                                    />

                                    {requestData
                                        .approved_at && (
                                        <TimelineItem
                                            label="Disetujui"
                                            value={formatDateTime(
                                                requestData
                                                    .approved_at
                                            )}
                                            icon="bi-check-circle-fill"
                                        />
                                    )}

                                    {requestData
                                        .rejected_at && (
                                        <TimelineItem
                                            label="Ditolak"
                                            value={formatDateTime(
                                                requestData
                                                    .rejected_at
                                            )}
                                            icon="bi-x-circle-fill"
                                            rejected
                                        />
                                    )}

                                    {requestData
                                        .completed_at && (
                                        <TimelineItem
                                            label="Selesai"
                                            value={formatDateTime(
                                                requestData
                                                    .completed_at
                                            )}
                                            icon="bi-check2-all"
                                        />
                                    )}

                                    {requestData
                                        .status ===
                                        'pending' && (
                                        <TimelineItem
                                            label="Menunggu Pemeriksaan"
                                            value="Admin sedang memeriksa request liputan."
                                            icon="bi-hourglass-split"
                                            active
                                        />
                                    )}

                                    {requestData
                                        .status ===
                                        'approved' && (
                                        <TimelineItem
                                            label="Dalam Proses"
                                            value="Request sedang dikerjakan oleh tim Humas."
                                            icon="bi-camera-reels-fill"
                                            active
                                        />
                                    )}
                                </div>

                                {requestData
                                    .admin_note && (
                                    <div className="alert alert-danger rounded-4 mt-4 mb-0">
                                        <div className="fw-black mb-2">
                                            Catatan Admin
                                        </div>

                                        <div
                                            className="small"
                                            style={{
                                                whiteSpace:
                                                    'pre-wrap',
                                            }}
                                        >
                                            {
                                                requestData
                                                    .admin_note
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Tindakan Admin
                                </h4>

                                <p className="text-muted mb-4">
                                    Proses request berdasarkan status saat ini.
                                </p>

                                {!canProcess ? (
                                    <div className="p-4 rounded-4 bg-light border text-center">
                                        <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                        <h6 className="fw-black mt-3 mb-2">
                                            Mode hanya lihat
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Akun tidak memiliki permission proses approval Liputan Humas.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {requestData
                                            .status ===
                                            'pending' && (
                                            <div className="d-grid gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary rounded-pill"
                                                    onClick={
                                                        handleApprove
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-check-lg me-2" />

                                                    Setujui Request
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={
                                                        handleReject
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-x-lg me-2" />

                                                    Tolak Request
                                                </button>
                                            </div>
                                        )}

                                        {requestData
                                            .status ===
                                            'approved' && (
                                            <>
                                                <div className="p-3 rounded-4 bg-primary-subtle mb-3">
                                                    <div className="fw-black text-primary mb-1">
                                                        Request Disetujui
                                                    </div>

                                                    <div className="small text-muted">
                                                        Tandai selesai setelah hasil pekerjaan tersedia.
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill w-100"
                                                    onClick={
                                                        handleComplete
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-check2-all me-2" />

                                                    Tandai Selesai
                                                </button>
                                            </>
                                        )}

                                        {[
                                            'rejected',
                                            'completed',
                                        ].includes(
                                            requestData
                                                .status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Request berstatus{' '}

                                                <strong>
                                                    {
                                                        statusConfig.label
                                                    }
                                                </strong>{' '}

                                                dan tidak memiliki tindakan lanjutan.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}