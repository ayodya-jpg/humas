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
     * Legacy.
     * Hanya untuk membaca request lama.
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
    if (
        !value
    ) {
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

const getCoverageParts = (
    coverageType
) => {
    if (
        !coverageType
    ) {
        return [];
    }

    return String(
        coverageType
    )
        .split(
            /[;,]/
        )
        .map(
            (
                item
            ) =>
                item
                    .trim()
                    .toUpperCase()
        )
        .filter(
            Boolean
        );
};

const getCoverageLabel = (
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
            (
                item
            ) =>
                COVERAGE_CONFIG[
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
    const firstCoverage =
        getCoverageParts(
            coverageType
        )[0];

    return (
        COVERAGE_CONFIG[
            firstCoverage
        ]?.icon ||
        'bi-camera-reels-fill'
    );
};

const formatFileSize = (
    bytes
) => {
    if (
        !Number.isFinite(
            bytes
        ) ||
        bytes <= 0
    ) {
        return '-';
    }

    const units = [
        'B',
        'KB',
        'MB',
        'GB',
    ];

    const unitIndex =
        Math.min(
            Math.floor(
                Math.log(
                    bytes
                ) /
                    Math.log(
                        1024
                    )
            ),
            units.length -
                1
        );

    const size =
        bytes /
        1024 **
            unitIndex;

    return `${size.toFixed(
        unitIndex === 0
            ? 0
            : 2
    )} ${units[unitIndex]}`;
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

    if (
        active
    ) {
        statusClass =
            'active';
    }

    if (
        rejected
    ) {
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
    ] = useState(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(
        true
    );

    const [
        processing,
        setProcessing,
    ] = useState(
        false
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState(
        ''
    );

    const [
        resultLink,
        setResultLink,
    ] = useState(
        ''
    );

    const [
        resultNote,
        setResultNote,
    ] = useState(
        ''
    );

    const [
        resultFile,
        setResultFile,
    ] = useState(
        null
    );

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

                    const data =
                        response
                            ?.data
                            ?.data ||
                        null;

                    setRequestData(
                        data
                    );

                    setResultLink(
                        data?.result_link ||
                            ''
                    );

                    setResultNote(
                        data?.result_note ||
                            ''
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

    useEffect(
        () => {
            loadDetail();
        },
        [
            loadDetail,
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

                        badgeClass:
                            'bg-secondary-subtle text-secondary',

                        icon:
                            'bi-info-circle-fill',
                    }
                );
            },
            [
                requestData
                    ?.status,
            ]
        );

    const coverageLabel =
        useMemo(
            () =>
                getCoverageLabel(
                    requestData
                        ?.coverage_type
                ),
            [
                requestData
                    ?.coverage_type,
            ]
        );

    const coverageIcon =
        useMemo(
            () =>
                getCoverageIcon(
                    requestData
                        ?.coverage_type
                ),
            [
                requestData
                    ?.coverage_type,
            ]
        );

    const resolvedUnitName =
        useMemo(
            () => {
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
            },
            [
                requestData,
            ]
        );

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
                'Akun hanya memiliki izin melihat approval dan tidak dapat memproses request Humas.'
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
                        'Setujui Request Humas?',

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
                        'Tolak Request Humas?',

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

    const handleResultFileChange =
        async (
            event
        ) => {
            const file =
                event
                    .target
                    .files?.[0] ||
                null;

            if (
                !file
            ) {
                setResultFile(
                    null
                );

                return;
            }

            const allowedExtensions = [
                'pdf',
                'doc',
                'docx',
                'jpg',
                'jpeg',
                'png',
                'zip',
            ];

            const extension =
                file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase();

            if (
                !extension ||
                !allowedExtensions.includes(
                    extension
                )
            ) {
                event.target.value =
                    '';

                setResultFile(
                    null
                );

                await showErrorAlert(
                    'Format File Tidak Didukung',
                    'File hasil harus berformat PDF, DOC, DOCX, JPG, JPEG, PNG, atau ZIP.'
                );

                return;
            }

            const maxFileSize =
                20 *
                1024 *
                1024;

            if (
                file.size >
                maxFileSize
            ) {
                event.target.value =
                    '';

                setResultFile(
                    null
                );

                await showErrorAlert(
                    'File Terlalu Besar',
                    'Ukuran file hasil maksimal 20 MB.'
                );

                return;
            }

            setResultFile(
                file
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

            const normalizedLink =
                resultLink
                    .trim();

            if (
                !normalizedLink &&
                !resultFile
            ) {
                await showErrorAlert(
                    'Hasil Belum Lengkap',
                    'Masukkan link hasil atau unggah file hasil pekerjaan.'
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Selesaikan Request Humas?',

                    text:
                        'Hasil pekerjaan akan disimpan dan request ditandai selesai.',

                    confirmButtonText:
                        'Ya, selesaikan',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#16a34a',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            const formData =
                new FormData();

            formData.append(
                '_method',
                'PUT'
            );

            if (
                normalizedLink
            ) {
                formData.append(
                    'result_link',
                    normalizeExternalUrl(
                        normalizedLink
                    )
                );
            }

            if (
                resultNote
                    .trim()
            ) {
                formData.append(
                    'result_note',
                    resultNote
                        .trim()
                );
            }

            if (
                resultFile
            ) {
                formData.append(
                    'result_file',
                    resultFile
                );
            }

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Menyimpan Hasil',
                    'Hasil pekerjaan sedang disimpan.'
                );

                const response =
                    await api.post(
                        `/humas-service-requests/${id}/complete`,
                        formData
                    );

                closeAlert();

                await showSuccessAlert(
                    'Request Selesai',
                    response
                        ?.data
                        ?.message ||
                        'Request berhasil diselesaikan.'
                );

                setResultLink(
                    ''
                );

                setResultNote(
                    ''
                );

                setResultFile(
                    null
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
                    'Complete Humas error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Penyelesaian Gagal',
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
                            width:
                                84,

                            height:
                                84,
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
                            Kembali ke Approval Humas
                        </span>
                    </Link>

                    <h2 className="approval-detail-title">
                        Detail Request Humas
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
                                        Informasi jenis layanan, jadwal, lokasi, dan kebutuhan kegiatan.
                                    </p>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i
                                        className={`bi ${coverageIcon}`}
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <DetailItem
                                        label="Jenis Layanan"
                                        icon={
                                            coverageIcon
                                        }
                                        value={
                                            coverageLabel
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
                                        Lampiran / Brief Kegiatan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Brief, TOR, rundown, draft artikel, referensi desain, script, atau dokumen pendukung dari pemohon.
                                    </p>
                                </div>

                                <div className="icon-box bg-danger-subtle text-danger">
                                    <i className="bi bi-file-earmark-arrow-up-fill" />
                                </div>
                            </div>

                            {requestData
                                .article_draft_url ? (
                                <div className="border rounded-4 p-3 bg-light">
                                    <div className="d-flex align-items-center gap-3 flex-wrap">
                                        <div
                                            className="rounded-4 bg-white text-danger d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                            style={{
                                                width:
                                                    54,

                                                height:
                                                    54,
                                            }}
                                        >
                                            <i className="bi bi-file-earmark-check-fill fs-4" />
                                        </div>

                                        <div className="flex-grow-1 min-w-0">
                                            <div className="fw-black text-truncate">
                                                {requestData
                                                    .article_draft_name ||
                                                    'Lampiran / Brief Kegiatan'}
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

                                            Buka Lampiran
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-warning rounded-4 mb-0">
                                    Lampiran / brief kegiatan tidak tersedia.
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
                                            Hasil pekerjaan yang diberikan oleh tim Humas.
                                        </p>
                                    </div>

                                    <div className="icon-box bg-success-subtle text-success">
                                        <i className="bi bi-cloud-check-fill" />
                                    </div>
                                </div>

                                {!resultUrl &&
                                !requestData
                                    .result_file_url ? (
                                    <div className="alert alert-warning rounded-4 mb-0">
                                        Request sudah selesai, tetapi hasil pekerjaan belum tersedia.
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {resultUrl && (
                                            <div className="border rounded-4 p-4 bg-success-subtle">
                                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                                    <div className="min-w-0 flex-grow-1">
                                                        <div className="small text-muted mb-1">
                                                            Link Hasil
                                                        </div>

                                                        <div
                                                            className="fw-bold text-break"
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
                                            </div>
                                        )}

                                        {requestData
                                            .result_file_url && (
                                            <div className="border rounded-4 p-4 bg-light">
                                                <div className="d-flex align-items-center gap-3 flex-wrap">
                                                    <div
                                                        className="rounded-4 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                                                        style={{
                                                            width:
                                                                54,

                                                            height:
                                                                54,
                                                        }}
                                                    >
                                                        <i className="bi bi-file-earmark-check-fill fs-4" />
                                                    </div>

                                                    <div className="flex-grow-1 min-w-0">
                                                        <div className="small text-muted mb-1">
                                                            File Hasil
                                                        </div>

                                                        <div className="fw-black text-break">
                                                            {requestData
                                                                .result_file_name ||
                                                                'File Hasil Humas'}
                                                        </div>

                                                        {requestData
                                                            .result_file_mime && (
                                                            <div className="small text-muted mt-1">
                                                                {
                                                                    requestData
                                                                        .result_file_mime
                                                                }
                                                            </div>
                                                        )}
                                                    </div>

                                                    <a
                                                        href={
                                                            requestData
                                                                .result_file_url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-outline-success rounded-pill"
                                                    >
                                                        <i className="bi bi-eye-fill me-2" />

                                                        Buka File
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {requestData
                                            .result_note && (
                                            <div className="bg-white border rounded-4 p-4">
                                                <div className="small text-muted fw-bold mb-2">
                                                    <i className="bi bi-chat-left-text-fill me-2" />

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
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{
                            top:
                                110,
                        }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Status
                                </h4>

                                <p className="text-muted mb-4">
                                    Perkembangan proses request Humas.
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
                                            value="Admin sedang memeriksa request Humas."
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
                                            Akun tidak memiliki permission proses approval Humas.
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
                                                <div className="p-3 rounded-4 bg-primary-subtle mb-4">
                                                    <div className="d-flex gap-3">
                                                        <i className="bi bi-info-circle-fill text-primary fs-5" />

                                                        <div>
                                                            <div className="fw-black text-primary mb-1">
                                                                Request Sedang Diproses
                                                            </div>

                                                            <div className="small text-muted">
                                                                Masukkan link hasil atau unggah file hasil sebelum request ditandai selesai.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">
                                                        Link Hasil
                                                    </label>

                                                    <input
                                                        type="text"
                                                        className="form-control rounded-4"
                                                        placeholder="https://drive.google.com/... atau link hasil"
                                                        value={
                                                            resultLink
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setResultLink(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    />

                                                    <div className="form-text">
                                                        Opsional jika file hasil sudah diunggah.
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">
                                                        File Hasil
                                                    </label>

                                                    <input
                                                        type="file"
                                                        className="form-control rounded-4"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                                                        onChange={
                                                            handleResultFileChange
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    />

                                                    <div className="form-text">
                                                        PDF, DOC, DOCX, JPG, JPEG, PNG atau ZIP. Maksimal 20 MB.
                                                    </div>

                                                    {resultFile && (
                                                        <div className="mt-3 p-3 border rounded-4 bg-light">
                                                            <div className="d-flex align-items-start gap-3">
                                                                <div
                                                                    className="rounded-circle bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                                                                    style={{
                                                                        width:
                                                                            42,

                                                                        height:
                                                                            42,
                                                                    }}
                                                                >
                                                                    <i className="bi bi-paperclip" />
                                                                </div>

                                                                <div className="min-w-0 flex-grow-1">
                                                                    <div className="small text-muted">
                                                                        File dipilih
                                                                    </div>

                                                                    <div className="fw-black text-break">
                                                                        {
                                                                            resultFile
                                                                                .name
                                                                        }
                                                                    </div>

                                                                    <div className="small text-muted mt-1">
                                                                        {formatFileSize(
                                                                            resultFile
                                                                                .size
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger rounded-circle flex-shrink-0"
                                                                    onClick={() =>
                                                                        setResultFile(
                                                                            null
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    title="Hapus file"
                                                                >
                                                                    <i className="bi bi-x-lg" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mb-4">
                                                    <label className="form-label fw-bold">
                                                        Catatan Hasil
                                                    </label>

                                                    <textarea
                                                        className="form-control rounded-4"
                                                        rows={
                                                            4
                                                        }
                                                        maxLength={
                                                            3000
                                                        }
                                                        placeholder="Tambahkan catatan hasil pekerjaan jika diperlukan..."
                                                        value={
                                                            resultNote
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setResultNote(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    />

                                                    <div className="form-text text-end">
                                                        {
                                                            resultNote
                                                                .length
                                                        }
                                                        /3000
                                                    </div>
                                                </div>

                                                <div className="alert alert-light border rounded-4 small">
                                                    <i className="bi bi-info-circle me-2 text-primary" />

                                                    Minimal isi{' '}

                                                    <strong>
                                                        Link Hasil
                                                    </strong>{' '}

                                                    atau{' '}

                                                    <strong>
                                                        File Hasil
                                                    </strong>
                                                    .
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
                                                    {processing ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" />

                                                            Menyimpan...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-check2-all me-2" />

                                                            Simpan Hasil &amp; Tandai Selesai
                                                        </>
                                                    )}
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