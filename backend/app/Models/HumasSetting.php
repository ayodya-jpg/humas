import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const SERVICE_CONFIG = {
    'REQUEST DESIGN INSTAGRAM': {
        label:
            'Request Design Instagram',

        icon:
            'bi-instagram',

        description:
            'Pembuatan desain konten Instagram untuk kebutuhan publikasi resmi.',
    },

    DOKUMENTASI: {
        label:
            'Dokumentasi',

        icon:
            'bi-camera-fill',

        description:
            'Dokumentasi foto atau video selama pelaksanaan kegiatan.',
    },

    'PUBLIKASI WEBSITE': {
        label:
            'Publikasi Website',

        icon:
            'bi-globe2',

        description:
            'Publikasi artikel melalui website resmi.',
    },

    'PUBLIKASI MEDIA MASSA': {
        label:
            'Publikasi Media Massa',

        icon:
            'bi-newspaper',

        description:
            'Publikasi berita atau kegiatan melalui media massa.',
    },

    YOUTUBE: {
        label:
            'YouTube',

        icon:
            'bi-youtube',

        description:
            'Publikasi video melalui kanal YouTube resmi.',
    },

    'VIDEO REELS': {
        label:
            'Video Reels',

        icon:
            'bi-play-btn-fill',

        description:
            'Pembuatan video pendek atau reels kegiatan.',
    },
};

const SUBMISSION_CONFIG = {
    merchandise: {
        label:
            'Merchandise',

        icon:
            'bi-gift-fill',

        description:
            'Batas minimal pengajuan paket merchandise sebelum kegiatan.',
    },

    humas: {
        label:
            'Layanan Humas',

        icon:
            'bi-camera-reels-fill',

        description:
            'Batas minimal pengajuan seluruh jenis layanan Humas.',
    },

    sekpim_borrow: {
        label:
            'Peminjaman Barang',

        icon:
            'bi-box-seam-fill',

        description:
            'Batas minimal pengajuan peminjaman barang SEKPiM.',
    },

    sekpim_asset_request: {
        label:
            'Request Barang / Aset',

        icon:
            'bi-box2-heart-fill',

        description:
            'Batas minimal pengajuan barang yang tidak perlu dikembalikan.',
    },
};

const getStoredUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem(
                'admin_user'
            ) ||
                '{}'
        );
    } catch {
        return {};
    }
};

const extractErrorMessage = (
    error
) => {
    const data =
        error
            ?.response
            ?.data;

    if (
        data?.errors
    ) {
        const firstError =
            Object.values(
                data.errors
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
        data?.message ||
        'Terjadi kesalahan saat memproses pengaturan layanan.'
    );
};

const formatDate = (
    value
) => {
    if (
        !value
    ) {
        return '-';
    }

    const [
        year,
        month,
        day,
    ] =
        String(
            value
        )
            .split('-')
            .map(Number);

    if (
        !year ||
        !month ||
        !day
    ) {
        return value;
    }

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
                'long',

            year:
                'numeric',
        }
    );
};

const getRuleLabel = (
    days
) => {
    const value =
        Number(
            days ||
                0
        );

    return `H-${value}`;
};

export default function HumasSettingsPage() {
    const currentUser =
        useMemo(
            () =>
                getStoredUser(),
            []
        );

    const isSuperadmin =
        currentUser
            ?.role ===
        'superadmin';

    const [
        settings,
        setSettings,
    ] = useState({
        submission_settings:
            {},

        services:
            [],

        access: {
            can_manage_services:
                false,

            can_manage_submission_rule:
                false,
        },
    });

    const [
        submissionDrafts,
        setSubmissionDrafts,
    ] = useState(
        {}
    );

    const [
        loading,
        setLoading,
    ] = useState(
        true
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState(
        ''
    );

    const [
        processingService,
        setProcessingService,
    ] = useState(
        null
    );

    const [
        savingRule,
        setSavingRule,
    ] = useState(
        null
    );

    const loadSettings =
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
                            '/humas-settings'
                        );

                    const data =
                        response
                            ?.data
                            ?.data ||
                        {};

                    const submissionSettings =
                        data
                            ?.submission_settings &&
                        typeof data
                                .submission_settings ===
                            'object'
                            ? data
                                .submission_settings
                            : {};

                    setSettings({
                        submission_settings:
                            submissionSettings,

                        services:
                            Array.isArray(
                                data
                                    ?.services
                            )
                                ? data.services
                                : [],

                        access: {
                            can_manage_services:
                                Boolean(
                                    data
                                        ?.access
                                        ?.can_manage_services
                                ),

                            can_manage_submission_rule:
                                Boolean(
                                    data
                                        ?.access
                                        ?.can_manage_submission_rule
                                ),
                        },
                    });

                    const drafts =
                        {};

                    Object.entries(
                        submissionSettings
                    ).forEach(
                        ([
                            serviceKey,
                            setting,
                        ]) => {
                            drafts[
                                serviceKey
                            ] =
                                Number(
                                    setting
                                        ?.min_submission_days ??
                                        4
                                );
                        }
                    );

                    setSubmissionDrafts(
                        drafts
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Load settings error:',
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
            []
        );

    useEffect(
        () => {
            loadSettings();
        },
        [
            loadSettings,
        ]
    );

    const activeCount =
        settings
            .services
            .filter(
                (
                    item
                ) =>
                    Boolean(
                        item
                            .is_active
                    )
            )
            .length;

    const closedCount =
        settings
            .services
            .length -
        activeCount;

    const handleToggleService =
        async (
            service
        ) => {
            if (
                !settings
                    .access
                    .can_manage_services
            ) {
                await showErrorAlert(
                    'Akses Ditolak',
                    'Akun tidak memiliki izin mengubah ketersediaan layanan Humas.'
                );

                return;
            }

            const currentActive =
                Boolean(
                    service
                        .is_active
                );

            const nextActive =
                !currentActive;

            const config =
                SERVICE_CONFIG[
                    service
                        .coverage_type
                ];

            const label =
                config
                    ?.label ||
                service
                    .coverage_type;

            const confirmation =
                await showConfirmAlert({
                    title:
                        nextActive
                            ? `Buka ${label}?`
                            : `Tutup ${label}?`,

                    text:
                        nextActive
                            ? 'User dapat kembali membuat pengajuan layanan ini.'
                            : 'User tidak dapat membuat pengajuan baru untuk layanan ini sampai dibuka kembali.',

                    confirmButtonText:
                        nextActive
                            ? 'Ya, buka'
                            : 'Ya, tutup',

                    cancelButtonText:
                        'Batal',

                    icon:
                        nextActive
                            ? 'question'
                            : 'warning',

                    confirmButtonColor:
                        nextActive
                            ? '#16a34a'
                            : '#dc2626',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setProcessingService(
                    service
                        .coverage_type
                );

                showLoadingAlert(
                    'Memperbarui Layanan',
                    'Status layanan sedang diperbarui.'
                );

                const response =
                    await api.put(
                        '/humas-settings/service',
                        {
                            coverage_type:
                                service
                                    .coverage_type,

                            is_active:
                                nextActive,
                        }
                    );

                closeAlert();

                await showSuccessAlert(
                    nextActive
                        ? 'Layanan Dibuka'
                        : 'Layanan Ditutup',

                    response
                        ?.data
                        ?.message ||
                        'Status layanan berhasil diperbarui.'
                );

                await loadSettings();
            } catch (
                error
            ) {
                closeAlert();

                await showErrorAlert(
                    'Perubahan Gagal',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setProcessingService(
                    null
                );
            }
        };

    const handleDraftChange =
        (
            serviceKey,
            value
        ) => {
            setSubmissionDrafts(
                (
                    previous
                ) => ({
                    ...previous,

                    [serviceKey]:
                        value,
                })
            );
        };

    const handleSaveSubmissionRule =
        async (
            serviceKey
        ) => {
            if (
                !isSuperadmin ||
                !settings
                    .access
                    .can_manage_submission_rule
            ) {
                await showErrorAlert(
                    'Akses Ditolak',
                    'Hanya Super Administrator yang dapat mengubah aturan batas pengajuan.'
                );

                return;
            }

            const numericDays =
                Number(
                    submissionDrafts[
                        serviceKey
                    ]
                );

            if (
                !Number.isInteger(
                    numericDays
                ) ||
                numericDays <
                    0 ||
                numericDays >
                    365
            ) {
                await showWarningAlert(
                    'Nilai Tidak Valid',
                    'Minimal hari pengajuan harus berupa angka bulat antara 0 sampai 365.'
                );

                return;
            }

            const config =
                SUBMISSION_CONFIG[
                    serviceKey
                ];

            const label =
                config
                    ?.label ||
                serviceKey;

            const confirmation =
                await showConfirmAlert({
                    title:
                        `Ubah ${label} menjadi H-${numericDays}?`,

                    text:
                        numericDays ===
                        0
                            ? 'Pengajuan dapat dilakukan untuk kegiatan pada hari yang sama.'
                            : `Pengajuan wajib dilakukan minimal ${numericDays} hari sebelum kegiatan.`,

                    confirmButtonText:
                        'Ya, simpan',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setSavingRule(
                    serviceKey
                );

                showLoadingAlert(
                    'Menyimpan Aturan',
                    `Aturan ${label} sedang diperbarui.`
                );

                const response =
                    await api.put(
                        '/humas-settings/submission-rule',
                        {
                            service_key:
                                serviceKey,

                            min_submission_days:
                                numericDays,
                        }
                    );

                closeAlert();

                await showSuccessAlert(
                    'Aturan Berhasil Diubah',
                    response
                        ?.data
                        ?.message ||
                        'Aturan pengajuan berhasil diperbarui.'
                );

                await loadSettings();
            } catch (
                error
            ) {
                closeAlert();

                await showErrorAlert(
                    'Perubahan Gagal',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSavingRule(
                    null
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
                        Memuat Pengaturan Layanan
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    if (
        errorMessage
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <i className="bi bi-exclamation-triangle-fill fs-1 text-danger" />

                    <h5 className="fw-bold mt-3">
                        Pengaturan gagal dimuat
                    </h5>

                    <p className="text-muted">
                        {errorMessage}
                    </p>

                    <button
                        type="button"
                        className="btn btn-danger rounded-pill"
                        onClick={
                            loadSettings
                        }
                    >
                        <i className="bi bi-arrow-clockwise me-2" />

                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.18), transparent 30%), linear-gradient(135deg, #111827 0%, #7f1d1d 55%, #dc2626 120%)',
                    }}
                >
                    <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                        PENGATURAN SISTEM
                    </span>

                    <h1 className="display-6 fw-bold mb-3">
                        Pengaturan Layanan
                    </h1>

                    <p
                        className="text-white-50 mb-0"
                        style={{
                            maxWidth:
                                850,
                        }}
                    >
                        Kelola ketersediaan layanan Humas dan batas minimal pengajuan seluruh layanan.
                    </p>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="mb-4">
                        <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-2 mb-3">
                            KHUSUS SUPERADMIN
                        </span>

                        <h4 className="fw-bold mb-1">
                            Batas Minimal Pengajuan
                        </h4>

                        <p className="text-muted mb-0">
                            Setiap layanan dapat memiliki aturan H-n yang berbeda.
                        </p>
                    </div>

                    <div className="row g-3">
                        {Object.entries(
                            SUBMISSION_CONFIG
                        ).map(
                            ([
                                serviceKey,
                                config,
                            ]) => {
                                const current =
                                    settings
                                        .submission_settings[
                                        serviceKey
                                    ];

                                const currentDays =
                                    Number(
                                        current
                                            ?.min_submission_days ??
                                            4
                                    );

                                const draft =
                                    submissionDrafts[
                                        serviceKey
                                    ] ??
                                    currentDays;

                                return (
                                    <div
                                        className="col-12 col-md-6"
                                        key={
                                            serviceKey
                                        }
                                    >
                                        <div className="border rounded-5 p-4 h-100">
                                            <div className="d-flex align-items-start gap-3 mb-4">
                                                <div
                                                    className="rounded-4 bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                                                    style={{
                                                        width:
                                                            52,

                                                        height:
                                                            52,
                                                    }}
                                                >
                                                    <i
                                                        className={`bi ${config.icon} fs-4`}
                                                    />
                                                </div>

                                                <div>
                                                    <h5 className="fw-bold mb-1">
                                                        {config.label}
                                                    </h5>

                                                    <p className="small text-muted mb-0">
                                                        {config.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        H-
                                                    </span>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="365"
                                                        step="1"
                                                        className="form-control"
                                                        value={
                                                            draft
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleDraftChange(
                                                                serviceKey,
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        disabled={
                                                            !isSuperadmin ||
                                                            savingRule ===
                                                                serviceKey
                                                        }
                                                    />

                                                    <span className="input-group-text">
                                                        hari
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill px-4"
                                                    onClick={() =>
                                                        handleSaveSubmissionRule(
                                                            serviceKey
                                                        )
                                                    }
                                                    disabled={
                                                        !isSuperadmin ||
                                                        savingRule ===
                                                            serviceKey
                                                    }
                                                >
                                                    {savingRule ===
                                                    serviceKey ? (
                                                        <span className="spinner-border spinner-border-sm" />
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-floppy-fill me-2" />

                                                            Simpan
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="small text-muted">
                                                Aturan tersimpan:{' '}

                                                <strong>
                                                    {getRuleLabel(
                                                        currentDays
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="small text-muted mt-1">
                                                Tanggal paling cepat saat ini:{' '}

                                                <strong>
                                                    {formatDate(
                                                        current
                                                            ?.minimum_date
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>

                    {!isSuperadmin && (
                        <div className="alert alert-warning rounded-4 mt-4 mb-0">
                            <i className="bi bi-lock-fill me-2" />

                            Hanya Super Administrator yang dapat mengubah batas minimal pengajuan.
                        </div>
                    )}
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-4">
                        <div>
                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-3">
                                ADMIN &amp; SUPERADMIN
                            </span>

                            <h4 className="fw-bold mb-1">
                                Ketersediaan Layanan Humas
                            </h4>

                            <p className="text-muted mb-0">
                                Layanan yang ditutup tidak dapat dipilih oleh user.
                            </p>
                        </div>

                        <div className="d-flex gap-2">
                            <span className="badge bg-success-subtle text-success rounded-pill px-3 py-2">
                                {activeCount} Dibuka
                            </span>

                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2">
                                {closedCount} Ditutup
                            </span>
                        </div>
                    </div>

                    <div className="row g-3">
                        {settings
                            .services
                            .map(
                                (
                                    service
                                ) => {
                                    const config =
                                        SERVICE_CONFIG[
                                            service
                                                .coverage_type
                                        ] || {
                                            label:
                                                service
                                                    .coverage_type,

                                            icon:
                                                'bi-grid-fill',

                                            description:
                                                'Layanan Humas.',
                                        };

                                    const isActive =
                                        Boolean(
                                            service
                                                .is_active
                                        );

                                    const processing =
                                        processingService ===
                                        service
                                            .coverage_type;

                                    return (
                                        <div
                                            className="col-12 col-lg-6"
                                            key={
                                                service
                                                    .coverage_type
                                            }
                                        >
                                            <div className="border rounded-5 p-4 h-100">
                                                <div className="d-flex align-items-start gap-3">
                                                    <div
                                                        className={`rounded-4 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                                            isActive
                                                                ? 'bg-success-subtle text-success'
                                                                : 'bg-danger-subtle text-danger'
                                                        }`}
                                                        style={{
                                                            width:
                                                                52,

                                                            height:
                                                                52,
                                                        }}
                                                    >
                                                        <i
                                                            className={`bi ${config.icon} fs-4`}
                                                        />
                                                    </div>

                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between gap-2">
                                                            <div>
                                                                <h5 className="fw-bold mb-1">
                                                                    {config.label}
                                                                </h5>

                                                                <p className="small text-muted">
                                                                    {config.description}
                                                                </p>
                                                            </div>

                                                            <span
                                                                className={`badge rounded-pill align-self-start ${
                                                                    isActive
                                                                        ? 'bg-success-subtle text-success'
                                                                        : 'bg-danger-subtle text-danger'
                                                                }`}
                                                            >
                                                                {isActive
                                                                    ? 'Dibuka'
                                                                    : 'Ditutup'}
                                                            </span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className={`btn rounded-pill ${
                                                                isActive
                                                                    ? 'btn-outline-danger'
                                                                    : 'btn-success'
                                                            }`}
                                                            onClick={() =>
                                                                handleToggleService(
                                                                    service
                                                                )
                                                            }
                                                            disabled={
                                                                processing ||
                                                                !settings
                                                                    .access
                                                                    .can_manage_services
                                                            }
                                                        >
                                                            {processing ? (
                                                                <span className="spinner-border spinner-border-sm" />
                                                            ) : isActive ? (
                                                                <>
                                                                    <i className="bi bi-toggle-off me-2" />

                                                                    Tutup Layanan
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-toggle-on me-2" />

                                                                    Buka Layanan
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                    </div>
                </div>
            </section>
        </div>
    );
}