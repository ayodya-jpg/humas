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
        className:
            'bg-warning-subtle text-warning-emphasis',
        icon:
            'bi-hourglass-split',
    },

    approved: {
        label: 'Disetujui',
        className:
            'bg-primary-subtle text-primary',
        icon:
            'bi-check-circle-fill',
    },

    rejected: {
        label: 'Ditolak',
        className:
            'bg-danger-subtle text-danger',
        icon:
            'bi-x-circle-fill',
    },

    completed: {
        label: 'Selesai',
        className:
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
    if (
        currentUser?.role ===
        'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
};

const formatDate = (
    dateValue,
    includeTime = false
) => {
    if (!dateValue) {
        return '-';
    }

    const parsedDate =
        new Date(dateValue);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return dateValue;
    }

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            day: '2-digit',
            month: 'long',
            year: 'numeric',

            ...(includeTime
                ? {
                      hour: '2-digit',
                      minute: '2-digit',
                  }
                : {}),
        }
    ).format(parsedDate);
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

const extractErrorMessage = (
    error
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
        'Terjadi kesalahan ketika memproses request.'
    );
};

const DetailItem = ({
    label,
    value,
    icon,
    children,
}) => {
    return (
        <div className="border-bottom pb-3 h-100">
            <div className="small text-muted mb-1">
                {icon && (
                    <i
                        className={`bi ${icon} me-2`}
                    />
                )}

                {label}
            </div>

            {children || (
                <div className="fw-semibold text-break">
                    {value || '-'}
                </div>
            )}
        </div>
    );
};

export default function HumasServiceApprovalDetailPage() {
    const { id } = useParams();

    const navigate =
        useNavigate();

    const currentUser =
        useMemo(
            () => getCurrentUser(),
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
                    setLoading(true);
                    setErrorMessage('');

                    const response =
                        await api.get(
                            `/humas-service-requests/${id}`
                        );

                    setRequestData(
                        response?.data?.data ||
                            null
                    );
                } catch (error) {
                    console.error(
                        'Fetch Humas detail error:',
                        error?.response
                            ?.data ||
                            error
                    );

                    setErrorMessage(
                        extractErrorMessage(
                            error
                        )
                    );
                } finally {
                    setLoading(false);
                }
            },
            [id]
        );

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const statusConfig =
        useMemo(() => {
            return (
                STATUS_CONFIG[
                    requestData?.status
                ] || {
                    label:
                        requestData
                            ?.status ||
                        '-',

                    className:
                        'bg-secondary-subtle text-secondary',

                    icon:
                        'bi-circle-fill',
                }
            );
        }, [
            requestData?.status,
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
            requestData?.coverage_type,
        ]);

    const resolvedUnitName =
        useMemo(() => {
            if (!requestData) {
                return '-';
            }

            if (
                requestData.resolved_unit_name
            ) {
                return requestData.resolved_unit_name;
            }

            if (
                requestData.unit_name ===
                'Lainnya'
            ) {
                return (
                    requestData.other_unit_name ||
                    'Lainnya'
                );
            }

            return (
                requestData.unit_name ||
                '-'
            );
        }, [requestData]);

    const referenceUrl =
        useMemo(
            () =>
                normalizeExternalUrl(
                    requestData?.reference_link
                ),
            [
                requestData?.reference_link,
            ]
        );

    const resultUrl =
        useMemo(
            () =>
                normalizeExternalUrl(
                    requestData?.result_link
                ),
            [
                requestData?.result_link,
            ]
        );

    const ensureProcessAccess =
        () => {
            if (canProcess) {
                return true;
            }

            showErrorAlert(
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
                !ensureProcessAccess()
            ) {
                return;
            }

            try {
                setProcessing(true);

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
                    response?.data
                        ?.message ||
                        'Request berhasil diproses.'
                );

                if (
                    response?.data?.data
                ) {
                    setRequestData(
                        response.data.data
                    );
                } else {
                    await loadDetail();
                }
            } catch (error) {
                console.error(
                    `Process Humas ${action} error:`,
                    error?.response
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
                setProcessing(false);
            }
        };

    const handleApprove =
        async () => {
            if (
                !ensureProcessAccess()
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Setujui request liputan?',

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
                !confirmation.isConfirmed
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
                !ensureProcessAccess()
            ) {
                return;
            }

            const result =
                await showTextareaAlert({
                    title:
                        'Tolak request liputan?',

                    text:
                        'Masukkan alasan penolakan untuk ditampilkan kepada pemohon.',

                    inputLabel:
                        'Alasan penolakan',

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
                !result.isConfirmed ||
                !result.value
            ) {
                return;
            }

            await processAction(
                'reject',
                {
                    admin_note:
                        result.value.trim(),
                },
                'Request Ditolak'
            );
        };

    const handleComplete =
        async () => {
            if (
                !ensureProcessAccess()
            ) {
                return;
            }

            const result =
                await showCompletionAlert({
                    title:
                        'Selesaikan request liputan?',

                    text:
                        'Masukkan link hasil pekerjaan yang nantinya dapat dibuka oleh pemohon.',

                    confirmButtonText:
                        'Simpan dan Selesaikan',

                    cancelButtonText:
                        'Batal',
                });

            if (
                !result.isConfirmed ||
                !result.value
            ) {
                return;
            }

            await processAction(
                'complete',
                {
                    result_link:
                        result.value
                            .result_link,

                    result_note:
                        result.value
                            .result_note,
                },
                'Request Selesai'
            );
        };

    if (loading) {
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

                    <h4 className="fw-bold mt-3">
                        Detail gagal dimuat
                    </h4>

                    <p className="text-muted">
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

                            Kembali
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                    <Link
                        to="/admin/humas-services"
                        className="text-decoration-none text-muted small"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Approval
                        Liputan Humas
                    </Link>

                    <h2 className="fw-bold mt-2 mb-1">
                        Detail Request Liputan
                    </h2>

                    <p className="text-muted mb-0">
                        {requestData.service_code ||
                            `HMS-${requestData.id}`}
                    </p>
                </div>

                <span
                    className={`badge rounded-pill px-3 py-2 ${statusConfig.className}`}
                >
                    <i
                        className={`bi ${statusConfig.icon} me-2`}
                    />

                    {statusConfig.label}
                </span>
            </div>

            {!canProcess && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-eye-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Mode hanya lihat
                            </div>

                            <div className="small">
                                Akun dapat melihat detail request, tetapi tidak memiliki izin untuk menyetujui, menolak, atau menyelesaikannya.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <h5 className="fw-bold mb-4">
                                Informasi Pemohon
                            </h5>

                            <div className="row g-4">
                                <div className="col-md-6">
                                    <DetailItem
                                        label="Nama Lengkap"
                                        value={
                                            requestData.applicant_name
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
                                        {requestData.pic_whatsapp ? (
                                            <a
                                                href={`https://wa.me/62${String(
                                                    requestData.pic_whatsapp
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
                                                className="fw-semibold text-success text-decoration-none"
                                            >
                                                {
                                                    requestData.pic_whatsapp
                                                }

                                                <i className="bi bi-box-arrow-up-right ms-2" />
                                            </a>
                                        ) : (
                                            <div className="fw-semibold">
                                                -
                                            </div>
                                        )}
                                    </DetailItem>
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="Email Akun"
                                        value={
                                            requestData.user
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
                            <h5 className="fw-bold mb-4">
                                Detail Kegiatan
                            </h5>

                            <div className="row g-4">
                                <div className="col-md-6">
                                    <DetailItem
                                        label="Jenis Liputan"
                                        icon={
                                            coverageConfig.icon
                                        }
                                        value={
                                            coverageConfig.label
                                        }
                                    />
                                </div>

                                <div className="col-md-6">
                                    <DetailItem
                                        label="Tanggal Pelaksanaan"
                                        icon="bi-calendar-event-fill"
                                        value={formatDate(
                                            requestData.event_date
                                        )}
                                    />
                                </div>

                                <div className="col-12">
                                    <DetailItem
                                        label="Lokasi Acara"
                                        icon="bi-geo-alt-fill"
                                        value={
                                            requestData.event_location
                                        }
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="small text-muted mb-2">
                                        <i className="bi bi-card-text me-2" />

                                        Detail Kegiatan
                                    </div>

                                    <div
                                        className="bg-light border rounded-4 p-4"
                                        style={{
                                            whiteSpace:
                                                'pre-wrap',

                                            lineHeight:
                                                1.8,
                                        }}
                                    >
                                        {requestData.activity_detail ||
                                            '-'}
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="small text-muted mb-2">
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
                                        <div className="p-3 rounded-4 bg-light border fw-semibold">
                                            Tidak tersedia
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <h5 className="fw-bold mb-4">
                                Draft Artikel Kegiatan
                            </h5>

                            {requestData.article_draft_url ? (
                                <div className="border rounded-4 p-3 bg-light">
                                    <div className="d-flex align-items-center gap-3 flex-wrap">
                                        <div
                                            className="rounded-4 bg-white text-danger d-flex align-items-center justify-content-center shadow-sm"
                                            style={{
                                                width: 54,
                                                height: 54,
                                            }}
                                        >
                                            <i className="bi bi-file-earmark-text-fill fs-4" />
                                        </div>

                                        <div className="flex-grow-1 min-w-0">
                                            <div className="fw-bold text-truncate">
                                                {requestData.article_draft_name ||
                                                    'Draft Artikel'}
                                            </div>

                                            <div className="small text-muted">
                                                {requestData.article_draft_mime ||
                                                    'Dokumen pendukung'}
                                            </div>
                                        </div>

                                        <a
                                            href={
                                                requestData.article_draft_url
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

                    {requestData.status ===
                        'completed' && (
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4 p-lg-5">
                                <div className="d-flex align-items-start gap-3 mb-4">
                                    <div
                                        className="rounded-4 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width: 52,
                                            height: 52,
                                        }}
                                    >
                                        <i className="bi bi-check2-circle fs-4" />
                                    </div>

                                    <div>
                                        <h5 className="fw-bold mb-1">
                                            Hasil Pekerjaan
                                        </h5>

                                        <p className="text-muted mb-0">
                                            Link hasil yang diberikan kepada pemohon.
                                        </p>
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
                                                    className="fw-semibold text-truncate"
                                                    style={{
                                                        maxWidth: 600,
                                                    }}
                                                >
                                                    {
                                                        requestData.result_link
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

                                        {requestData.result_note && (
                                            <div className="bg-white border rounded-4 p-3 mt-3">
                                                <div className="small text-muted mb-1">
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
                                                        requestData.result_note
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
                                <h5 className="fw-bold mb-4">
                                    Informasi Status
                                </h5>

                                <div className="d-grid gap-3">
                                    <DetailItem
                                        label="Dikirim"
                                        value={formatDate(
                                            requestData.submitted_at ||
                                                requestData.created_at,
                                            true
                                        )}
                                    />

                                    <DetailItem
                                        label="Disetujui"
                                        value={formatDate(
                                            requestData.approved_at,
                                            true
                                        )}
                                    />

                                    <DetailItem
                                        label="Ditolak"
                                        value={formatDate(
                                            requestData.rejected_at,
                                            true
                                        )}
                                    />

                                    <DetailItem
                                        label="Selesai"
                                        value={formatDate(
                                            requestData.completed_at,
                                            true
                                        )}
                                    />
                                </div>

                                {requestData.admin_note && (
                                    <div className="alert alert-danger rounded-4 mt-4 mb-0">
                                        <strong>
                                            Catatan Admin
                                        </strong>

                                        <div
                                            className="small mt-2"
                                            style={{
                                                whiteSpace:
                                                    'pre-wrap',
                                            }}
                                        >
                                            {
                                                requestData.admin_note
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-3">
                                    Tindakan Admin
                                </h5>

                                {!canProcess ? (
                                    <div className="p-4 rounded-4 bg-light border text-center">
                                        <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                        <h6 className="fw-black mt-3 mb-2">
                                            Tidak memiliki akses proses
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Hubungi superadmin untuk mendapatkan permission proses approval liputan Humas.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {requestData.status ===
                                            'pending' && (
                                            <div className="d-grid gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-lg rounded-pill"
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

                                        {requestData.status ===
                                            'approved' && (
                                            <button
                                                type="button"
                                                className="btn btn-success btn-lg rounded-pill w-100"
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
                                        )}

                                        {[
                                            'rejected',
                                            'completed',
                                        ].includes(
                                            requestData.status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Request ini sudah tidak memiliki tindakan lanjutan.
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