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

/*
|--------------------------------------------------------------------------
| HUMAS SERVICE CONFIG
|--------------------------------------------------------------------------
*/

const HUMAS_SERVICE_CONFIG = {
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
            'Pembuatan atau publikasi artikel pada website resmi.',
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
            'Publikasi atau pengelolaan konten melalui kanal YouTube.',
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

/*
|--------------------------------------------------------------------------
| SUBMISSION SERVICE CONFIG
|--------------------------------------------------------------------------
*/

const SUBMISSION_SERVICE_CONFIG = {
    merchandise: {
        label:
            'Merchandise',

        shortLabel:
            'Merchandise',

        icon:
            'bi-gift-fill',

        description:
            'Batas minimal pengajuan merchandise sebelum tanggal kegiatan.',

        className:
            'text-primary',

        backgroundClass:
            'bg-primary-subtle',
    },

    humas: {
        label:
            'Layanan Humas',

        shortLabel:
            'Humas',

        icon:
            'bi-camera-reels-fill',

        description:
            'Batas minimal request layanan Humas sebelum tanggal kegiatan.',

        className:
            'text-danger',

        backgroundClass:
            'bg-danger-subtle',
    },

    sekpim_borrow: {
        label:
            'Peminjaman Barang SEKPiM',

        shortLabel:
            'Peminjaman',

        icon:
            'bi-box-arrow-up-right',

        description:
            'Batas minimal pengajuan peminjaman barang SEKPiM.',

        className:
            'text-success',

        backgroundClass:
            'bg-success-subtle',
    },

    sekpim_asset_request: {
        label:
            'Request Barang SEKPiM',

        shortLabel:
            'Request Barang',

        icon:
            'bi-box2-heart-fill',

        description:
            'Batas minimal request barang yang tidak perlu dikembalikan.',

        className:
            'text-info',

        backgroundClass:
            'bg-info-subtle',
    },
};

const SUBMISSION_SERVICE_KEYS = [
    'merchandise',
    'humas',
    'sekpim_borrow',
    'sekpim_asset_request',
];

/*
|--------------------------------------------------------------------------
| USER
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| ERROR
|--------------------------------------------------------------------------
*/

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
        'Terjadi kesalahan pada server.'
    );
};

/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

const formatDate = (
    value
) => {
    if (
        !value
    ) {
        return '-';
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return value;
    }

    const [
        year,
        month,
        day,
    ] =
        value
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
                'long',

            year:
                'numeric',
        }
    );
};

/*
|--------------------------------------------------------------------------
| RULE
|--------------------------------------------------------------------------
*/

const getRuleLabel = (
    days
) => {
    const value =
        Number(
            days ??
                0
        );

    return `H-${value}`;
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

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

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [
        settings,
        setSettings,
    ] = useState({
        server_date:
            '',

        timezone:
            '',

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
        submissionInputs,
        setSubmissionInputs,
    ] = useState({});

    const [
        loading,
        setLoading,
    ] = useState(
        true
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

    const [
        errorMessage,
        setErrorMessage,
    ] = useState(
        ''
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD SETTINGS
    |--------------------------------------------------------------------------
    */

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
                            ?.submission_settings ||
                        {};

                    const normalizedInputs =
                        {};

                    SUBMISSION_SERVICE_KEYS.forEach(
                        (
                            serviceKey
                        ) => {
                            normalizedInputs[
                                serviceKey
                            ] =
                                Number(
                                    submissionSettings[
                                        serviceKey
                                    ]
                                        ?.min_submission_days ??
                                        4
                                );
                        }
                    );

                    setSettings({
                        server_date:
                            data
                                ?.server_date ||
                            '',

                        timezone:
                            data
                                ?.timezone ||
                            '',

                        submission_settings:
                            submissionSettings,

                        services:
                            Array.isArray(
                                data
                                    ?.services
                            )
                                ? data
                                      .services
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

                    setSubmissionInputs(
                        normalizedInputs
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Load service settings error:',
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

    /*
    |--------------------------------------------------------------------------
    | HUMAS COUNTERS
    |--------------------------------------------------------------------------
    */

    const activeCount =
        useMemo(
            () =>
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
                    .length,
            [
                settings.services,
            ]
        );

    const closedCount =
        settings
            .services
            .length -
        activeCount;

    /*
    |--------------------------------------------------------------------------
    | HUMAS AVAILABILITY
    |--------------------------------------------------------------------------
    */

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

            const serviceConfig =
                HUMAS_SERVICE_CONFIG[
                    service
                        .coverage_type
                ];

            const serviceLabel =
                serviceConfig
                    ?.label ||
                service
                    .coverage_type;

            const confirmation =
                await showConfirmAlert({
                    title:
                        nextActive
                            ? `Buka ${serviceLabel}?`
                            : `Tutup ${serviceLabel}?`,

                    text:
                        nextActive
                            ? 'User dapat kembali membuat pengajuan untuk layanan ini.'
                            : 'User tidak dapat membuat pengajuan baru untuk layanan ini sampai layanan dibuka kembali.',

                    confirmButtonText:
                        nextActive
                            ? 'Ya, buka layanan'
                            : 'Ya, tutup layanan',

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
                    'Status layanan Humas sedang diperbarui.'
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
                console.error(
                    'Toggle Humas service error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

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

    /*
    |--------------------------------------------------------------------------
    | INPUT H-N
    |--------------------------------------------------------------------------
    */

    const handleSubmissionInputChange =
        (
            serviceKey,
            value
        ) => {
            setSubmissionInputs(
                (
                    previous
                ) => ({
                    ...previous,

                    [serviceKey]:
                        value,
                })
            );
        };

    /*
    |--------------------------------------------------------------------------
    | SAVE H-N
    |--------------------------------------------------------------------------
    */

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
                    'Hanya Super Administrator yang dapat mengubah aturan batas waktu pengajuan.'
                );

                return;
            }

            const numericDays =
                Number(
                    submissionInputs[
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
                SUBMISSION_SERVICE_CONFIG[
                    serviceKey
                ];

            const serviceLabel =
                config
                    ?.label ||
                serviceKey;

            const confirmation =
                await showConfirmAlert({
                    title:
                        `Ubah ${serviceLabel} menjadi ${getRuleLabel(
                            numericDays
                        )}?`,

                    text:
                        numericDays ===
                        0
                            ? 'User dapat mengajukan kegiatan pada hari yang sama.'
                            : `User wajib mengajukan minimal ${numericDays} hari sebelum tanggal kegiatan.`,

                    confirmButtonText:
                        'Ya, simpan aturan',

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
                    `Batas waktu ${serviceLabel} sedang diperbarui.`
                );

                /*
                 * PENTING:
                 *
                 * Backend sekarang membutuhkan:
                 * - service_key
                 * - min_submission_days
                 */
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
                        `Aturan ${serviceLabel} berhasil diperbarui.`
                );

                await loadSettings();
            } catch (
                error
            ) {
                console.error(
                    'Save submission rule error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

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

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    if (
        errorMessage
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-3"
                        style={{
                            width:
                                72,

                            height:
                                72,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-3" />
                    </div>

                    <h5 className="fw-bold mb-2">
                        Pengaturan gagal dimuat
                    </h5>

                    <p className="text-muted mb-4">
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

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* HERO */}

            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.18), transparent 30%), linear-gradient(135deg, #111827 0%, #7f1d1d 55%, #dc2626 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                                PENGATURAN LAYANAN
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                Pengaturan Layanan Sistem
                            </h1>

                            <p
                                className="text-white-50 mb-0"
                                style={{
                                    maxWidth:
                                        820,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Atur ketersediaan layanan Humas serta batas minimal waktu pengajuan Merchandise, Humas, Peminjaman SEKPiM, dan Request Barang.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-5 p-4">
                                <div className="small text-white-50 mb-2">
                                    Tanggal Server
                                </div>

                                <div className="fs-4 fw-bold">
                                    {formatDate(
                                        settings
                                            .server_date
                                    )}
                                </div>

                                {settings
                                    .timezone && (
                                    <div className="small text-white-50 mt-2">
                                        Timezone:{' '}

                                        <strong className="text-white">
                                            {
                                                settings
                                                    .timezone
                                            }
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HUMAS COUNTER */}

            <section className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Total Layanan Humas
                            </div>

                            <div className="fs-2 fw-bold">
                                {
                                    settings
                                        .services
                                        .length
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Dibuka
                            </div>

                            <div className="fs-2 fw-bold text-success">
                                {activeCount}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Ditutup
                            </div>

                            <div className="fs-2 fw-bold text-danger">
                                {closedCount}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HUMAS AVAILABILITY */}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-4">
                        <div>
                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-2">
                                ADMIN &amp; SUPERADMIN
                            </span>

                            <h4 className="fw-bold mb-1">
                                Ketersediaan Layanan Humas
                            </h4>

                            <p className="text-muted mb-0">
                                Layanan yang ditutup tidak dapat dipilih pada form pengajuan user.
                            </p>
                        </div>

                        <div className="small text-muted">
                            <i className="bi bi-shield-check me-2" />

                            Perubahan langsung berlaku
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
                                        HUMAS_SERVICE_CONFIG[
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

                                    const isProcessing =
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
                                            <div
                                                className={`border rounded-5 p-4 h-100 ${
                                                    isActive
                                                        ? 'bg-white'
                                                        : 'bg-light'
                                                }`}
                                            >
                                                <div className="d-flex align-items-start gap-3">
                                                    <div
                                                        className={`rounded-4 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                                            isActive
                                                                ? 'bg-success-subtle text-success'
                                                                : 'bg-danger-subtle text-danger'
                                                        }`}
                                                        style={{
                                                            width:
                                                                54,

                                                            height:
                                                                54,
                                                        }}
                                                    >
                                                        <i
                                                            className={`bi ${config.icon} fs-4`}
                                                        />
                                                    </div>

                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-start gap-3">
                                                            <div>
                                                                <h5 className="fw-bold mb-1">
                                                                    {
                                                                        config
                                                                            .label
                                                                    }
                                                                </h5>

                                                                <p className="small text-muted mb-3">
                                                                    {
                                                                        config
                                                                            .description
                                                                    }
                                                                </p>
                                                            </div>

                                                            <span
                                                                className={`badge rounded-pill px-3 py-2 ${
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

                                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                                            <div className="small text-muted">
                                                                {isActive
                                                                    ? 'User dapat membuat pengajuan.'
                                                                    : 'Pengajuan baru sedang dinonaktifkan.'}
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
                                                                    isProcessing ||
                                                                    !settings
                                                                        .access
                                                                        .can_manage_services
                                                                }
                                                            >
                                                                {isProcessing ? (
                                                                    <span className="spinner-border spinner-border-sm" />
                                                                ) : isActive ? (
                                                                    <>
                                                                        <i className="bi bi-toggle-off me-2" />

                                                                        Tutup
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="bi bi-toggle-on me-2" />

                                                                        Buka
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
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

            {/* H-N GLOBAL */}

            <section className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-4">
                        <div>
                            <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-2 mb-3">
                                KHUSUS SUPERADMIN
                            </span>

                            <h4 className="fw-bold mb-2">
                                Batas Minimal Pengajuan
                            </h4>

                            <p className="text-muted mb-0">
                                Setiap layanan memiliki aturan H-n yang dapat diatur secara terpisah.
                            </p>
                        </div>

                        {!isSuperadmin && (
                            <div className="alert alert-warning border-0 rounded-4 mb-0">
                                <i className="bi bi-lock-fill me-2" />

                                Hanya Super Administrator yang dapat mengubah aturan H-n.
                            </div>
                        )}
                    </div>

                    <div className="row g-4">
                        {SUBMISSION_SERVICE_KEYS.map(
                            (
                                serviceKey
                            ) => {
                                const config =
                                    SUBMISSION_SERVICE_CONFIG[
                                        serviceKey
                                    ];

                                const storedSetting =
                                    settings
                                        .submission_settings[
                                        serviceKey
                                    ] ||
                                    {};

                                const currentStoredDays =
                                    Number(
                                        storedSetting
                                            ?.min_submission_days ??
                                            4
                                    );

                                const inputValue =
                                    submissionInputs[
                                        serviceKey
                                    ] ??
                                    currentStoredDays;

                                const minimumDate =
                                    storedSetting
                                        ?.minimum_date ||
                                    '';

                                const isSaving =
                                    savingRule ===
                                    serviceKey;

                                return (
                                    <div
                                        className="col-12 col-xl-6"
                                        key={
                                            serviceKey
                                        }
                                    >
                                        <div className="border rounded-5 p-4 h-100">
                                            <div className="d-flex align-items-start gap-3 mb-4">
                                                <div
                                                    className={`rounded-4 d-flex align-items-center justify-content-center flex-shrink-0 ${config.backgroundClass} ${config.className}`}
                                                    style={{
                                                        width:
                                                            54,

                                                        height:
                                                            54,
                                                    }}
                                                >
                                                    <i
                                                        className={`bi ${config.icon} fs-4`}
                                                    />
                                                </div>

                                                <div>
                                                    <h5 className="fw-bold mb-1">
                                                        {
                                                            config
                                                                .label
                                                        }
                                                    </h5>

                                                    <p className="small text-muted mb-0">
                                                        {
                                                            config
                                                                .description
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <label className="form-label fw-bold">
                                                Minimal Hari Sebelum Kegiatan
                                            </label>

                                            <div className="input-group input-group-lg mb-3">
                                                <span className="input-group-text">
                                                    H-
                                                </span>

                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min="0"
                                                    max="365"
                                                    step="1"
                                                    value={
                                                        inputValue
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleSubmissionInputChange(
                                                            serviceKey,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    disabled={
                                                        !isSuperadmin ||
                                                        !settings
                                                            .access
                                                            .can_manage_submission_rule ||
                                                        isSaving
                                                    }
                                                />

                                                <span className="input-group-text">
                                                    hari
                                                </span>
                                            </div>

                                            <div className="row g-3 mb-4">
                                                <div className="col-sm-6">
                                                    <div className="p-3 rounded-4 bg-light border h-100">
                                                        <div className="small text-muted mb-1">
                                                            Aturan Tersimpan
                                                        </div>

                                                        <div
                                                            className={`fs-4 fw-bold ${config.className}`}
                                                        >
                                                            {getRuleLabel(
                                                                currentStoredDays
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-sm-6">
                                                    <div className="p-3 rounded-4 bg-light border h-100">
                                                        <div className="small text-muted mb-1">
                                                            Tanggal Paling Cepat
                                                        </div>

                                                        <div className="fw-bold">
                                                            {formatDate(
                                                                minimumDate
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                                                <div className="small text-muted">
                                                    0 = H-0, 1 = H-1, 4 = H-4, dan seterusnya.
                                                </div>

                                                {isSuperadmin && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger rounded-pill px-4"
                                                        onClick={() =>
                                                            handleSaveSubmissionRule(
                                                                serviceKey
                                                            )
                                                        }
                                                        disabled={
                                                            isSaving ||
                                                            Number(
                                                                inputValue
                                                            ) ===
                                                                currentStoredDays
                                                        }
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" />

                                                                Menyimpan...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-floppy-fill me-2" />

                                                                Simpan
                                                            </>
                                                        )}
                                                    </button>
                                                )}
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