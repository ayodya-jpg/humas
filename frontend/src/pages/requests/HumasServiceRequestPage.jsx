import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const UNIT_OPTIONS = [
    'TEKNIK TELEKOMUNIKASI',
    'TEKNIK ELEKTRO',
    'TEKNIK KOMPUTER',
    'TEKNIK INDUSTRI',
    'SISTEM INFORMASI',
    'TEKNIK LOGISTIK',
    'INFORMATIKA',
    'TEKNOLOGI INFORMASI',
    'REKAYASA PERANGKAT LUNAK',
    'SAINS DATA',
    'DIGITAL BISNIS',
    'KEMAHASISWAAN',
    'AKADEMIK',
    'KEUANGAN',
    'LOGISTIK',
    'PUTI',
    'ADMISI',
    'LPPM',
    'LABORATORIUM, PUSAT BAHASA & PERPUSTAKAAN',
    'SDM',
    'SPMP',
    'Lainnya',
];

const COVERAGE_OPTIONS = [
    {
        value: 'REQUEST DESIGN INSTAGRAM',
        label: 'Request Design Instagram',
        icon: 'bi-instagram',
        description:
            'Pembuatan desain konten Instagram untuk kebutuhan publikasi resmi.',
    },
    {
        value: 'DOKUMENTASI',
        label: 'Dokumentasi',
        icon: 'bi-camera-fill',
        description:
            'Dokumentasi foto atau video selama kegiatan.',
    },
    {
        value: 'PUBLIKASI WEBSITE',
        label: 'Publikasi Website',
        icon: 'bi-globe2',
        description:
            'Artikel dan publikasi melalui website resmi.',
    },
    {
        value: 'PUBLIKASI MEDIA MASSA',
        label: 'Publikasi Media Massa',
        icon: 'bi-newspaper',
        description:
            'Publikasi berita atau kegiatan melalui media massa.',
    },
    {
        value: 'YOUTUBE',
        label: 'YouTube',
        icon: 'bi-youtube',
        description:
            'Publikasi video melalui kanal YouTube resmi.',
    },
    {
        value: 'VIDEO REELS',
        label: 'Video Reels',
        icon: 'bi-play-btn-fill',
        description:
            'Pembuatan video pendek atau reels kegiatan.',
    },
];

const PIC_CONTACTS = [
    {
        service: 'Artikel Website',
        name: 'Cahya',
        phone: '0813-3432-3355',
        icon: 'bi-file-earmark-text-fill',
    },
    {
        service: 'YouTube',
        name: 'Rizky',
        phone: '0817-0300-0403',
        icon: 'bi-youtube',
    },
    {
        service: 'Request Design Instagram',
        name: 'Naya',
        phone: '0852-3025-1932',
        icon: 'bi-instagram',
    },
];

const INITIAL_FORM = {
    applicant_name: '',
    unit_name: '',
    other_unit_name: '',
    pic_whatsapp: '',
    activity_detail: '',
    coverage_type: '',
    event_location: '',
    event_date: '',
    reference_link: '',
};

const formatFileSize = (size) => {
    if (!size) {
        return '0 KB';
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const extractErrorMessage = (error) => {
    const responseData =
        error?.response?.data;

    if (responseData?.errors) {
        const firstError =
            Object.values(
                responseData.errors
            )
                .flat()
                .find(Boolean);

        if (firstError) {
            return firstError;
        }
    }

    return (
        responseData?.message ||
        'Request liputan gagal dikirim. Silakan periksa kembali data yang diisi.'
    );
};

const getStoredUser = () => {
    const possibleKeys = [
        'admin_user',
        'user',
        'auth_user',
    ];

    for (const key of possibleKeys) {
        try {
            const storedValue =
                localStorage.getItem(
                    key
                );

            if (!storedValue) {
                continue;
            }

            const parsedUser =
                JSON.parse(
                    storedValue
                );

            if (
                parsedUser &&
                typeof parsedUser ===
                    'object'
            ) {
                return parsedUser;
            }
        } catch {
            // Lanjut ke key berikutnya.
        }
    }

    return {};
};

const normalizeUrl = (value) => {
    const trimmedValue =
        value.trim();

    if (!trimmedValue) {
        return '';
    }

    if (
        /^https?:\/\//i.test(
            trimmedValue
        )
    ) {
        return trimmedValue;
    }

    return `https://${trimmedValue}`;
};

const isValidUrl = (value) => {
    if (!value.trim()) {
        return true;
    }

    try {
        const parsedUrl =
            new URL(
                normalizeUrl(
                    value
                )
            );

        return [
            'http:',
            'https:',
        ].includes(
            parsedUrl.protocol
        );
    } catch {
        return false;
    }
};

const SectionHeader = ({
    icon,
    title,
    description,
}) => {
    return (
        <div className="d-flex align-items-start gap-3 mb-4">
            <div
                className="rounded-4 bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                    width: 48,
                    height: 48,
                }}
            >
                <i
                    className={`bi ${icon} fs-5`}
                />
            </div>

            <div>
                <h5 className="fw-bold mb-1">
                    {title}
                </h5>

                <p className="text-muted mb-0">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default function HumasServiceRequestPage() {
    const navigate =
        useNavigate();

    const storedUser =
        useMemo(
            () =>
                getStoredUser(),
            []
        );

    const [
        form,
        setForm,
    ] = useState(
        () => ({
            ...INITIAL_FORM,

            applicant_name:
                storedUser?.name ||
                storedUser?.full_name ||
                storedUser?.username ||
                '',
        })
    );

    /*
     * Secara database nama field tetap article_draft
     * untuk kompatibilitas data lama.
     *
     * Pada UI ditampilkan sebagai Lampiran / Brief Kegiatan.
     */
    const [
        articleDraft,
        setArticleDraft,
    ] = useState(null);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const selectedCoverage =
        useMemo(
            () => {
                return COVERAGE_OPTIONS.find(
                    (item) =>
                        item.value ===
                        form.coverage_type
                );
            },
            [
                form.coverage_type,
            ]
        );

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (
                previousForm
            ) => ({
                ...previousForm,

                [name]:
                    value,

                ...(name ===
                    'unit_name' &&
                value !==
                    'Lainnya'
                    ? {
                          other_unit_name:
                              '',
                      }
                    : {}),
            })
        );
    };

    const handleReferenceLinkBlur =
        () => {
            if (
                !form.reference_link.trim()
            ) {
                return;
            }

            setForm(
                (
                    previousForm
                ) => ({
                    ...previousForm,

                    reference_link:
                        normalizeUrl(
                            previousForm.reference_link
                        ),
                })
            );
        };

    const handleCoverageChange = (
        coverageType
    ) => {
        setForm(
            (
                previousForm
            ) => ({
                ...previousForm,

                coverage_type:
                    coverageType,
            })
        );
    };

    const handleArticleDraftChange = (
        event
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            setArticleDraft(
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

            setArticleDraft(
                null
            );

            showWarningAlert(
                'Format File Tidak Didukung',
                'Lampiran harus berformat PDF, DOC, DOCX, JPG, JPEG, atau PNG.'
            );

            return;
        }

        if (
            file.size >
            10 *
                1024 *
                1024
        ) {
            event.target.value =
                '';

            setArticleDraft(
                null
            );

            showWarningAlert(
                'Ukuran File Terlalu Besar',
                'Ukuran lampiran maksimal 10 MB.'
            );

            return;
        }

        setArticleDraft(
            file
        );
    };

    const validateForm =
        () => {
            if (
                !form.applicant_name.trim()
            ) {
                return 'Nama lengkap pemohon wajib diisi.';
            }

            if (
                form.applicant_name
                    .trim()
                    .length <
                3
            ) {
                return 'Nama lengkap pemohon minimal tiga karakter.';
            }

            if (
                !form.unit_name
            ) {
                return 'Nama unit atau program studi wajib dipilih.';
            }

            if (
                form.unit_name ===
                    'Lainnya' &&
                !form.other_unit_name.trim()
            ) {
                return 'Nama unit atau program studi lainnya wajib diisi.';
            }

            if (
                !form.pic_whatsapp.trim()
            ) {
                return 'Kontak WhatsApp PIC acara wajib diisi.';
            }

            const normalizedPhone =
                form.pic_whatsapp.replace(
                    /[\s\-()+]/g,
                    ''
                );

            if (
                !/^[0-9]{9,15}$/.test(
                    normalizedPhone
                )
            ) {
                return 'Format nomor WhatsApp PIC tidak valid.';
            }

            if (
                !form.activity_detail.trim()
            ) {
                return 'Detail kegiatan wajib diisi.';
            }

            if (
                form.activity_detail
                    .trim()
                    .length <
                10
            ) {
                return 'Detail kegiatan minimal sepuluh karakter.';
            }

            if (
                !form.coverage_type
            ) {
                return 'Jenis layanan Humas wajib dipilih.';
            }

            if (
                !form.event_location.trim()
            ) {
                return 'Lokasi acara wajib diisi.';
            }

            if (
                form.event_location
                    .trim()
                    .length <
                3
            ) {
                return 'Lokasi acara minimal tiga karakter.';
            }

            if (
                !form.event_date
            ) {
                return 'Tanggal pelaksanaan kegiatan wajib diisi.';
            }

            if (
                form.reference_link.trim() &&
                !isValidUrl(
                    form.reference_link
                )
            ) {
                return 'Link bahan mentah atau referensi tidak valid.';
            }

            if (
                !articleDraft
            ) {
                return 'Lampiran atau brief kegiatan wajib diunggah.';
            }

            return null;
        };

    const buildFormData =
        () => {
            const formData =
                new FormData();

            formData.append(
                'applicant_name',
                form.applicant_name.trim()
            );

            formData.append(
                'unit_name',
                form.unit_name
            );

            if (
                form.unit_name ===
                'Lainnya'
            ) {
                formData.append(
                    'other_unit_name',
                    form.other_unit_name.trim()
                );
            }

            formData.append(
                'pic_whatsapp',
                form.pic_whatsapp.trim()
            );

            formData.append(
                'activity_detail',
                form.activity_detail.trim()
            );

            formData.append(
                'coverage_type',
                form.coverage_type
            );

            formData.append(
                'event_location',
                form.event_location.trim()
            );

            formData.append(
                'event_date',
                form.event_date
            );

            if (
                form.reference_link.trim()
            ) {
                formData.append(
                    'reference_link',
                    normalizeUrl(
                        form.reference_link
                    )
                );
            }

            /*
             * Nama request backend tetap article_draft
             * supaya tidak perlu migration/database rename.
             */
            formData.append(
                'article_draft',
                articleDraft
            );

            return formData;
        };

    const resetForm =
        () => {
            setForm({
                ...INITIAL_FORM,

                applicant_name:
                    storedUser?.name ||
                    storedUser?.full_name ||
                    storedUser?.username ||
                    '',
            });

            setArticleDraft(
                null
            );

            const fileInput =
                document.getElementById(
                    'article_draft'
                );

            if (fileInput) {
                fileInput.value =
                    '';
            }
        };

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            const validationError =
                validateForm();

            if (
                validationError
            ) {
                await showWarningAlert(
                    'Form Belum Lengkap',
                    validationError
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Kirim request Humas?',

                    text:
                        'Pastikan data kegiatan, jenis layanan, link bahan, dan lampiran/brief kegiatan sudah benar.',

                    confirmButtonText:
                        'Ya, kirim request',

                    cancelButtonText:
                        'Periksa lagi',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation.isConfirmed
            ) {
                return;
            }

            try {
                setSubmitting(
                    true
                );

                showLoadingAlert(
                    'Mengirim Request',
                    'Data request Humas sedang diproses.'
                );

                const response =
                    await api.post(
                        '/humas-service-requests',
                        buildFormData(),
                        {
                            headers: {
                                'Content-Type':
                                    'multipart/form-data',
                            },
                        }
                    );

                closeAlert();

                await showSuccessAlert(
                    'Request Berhasil Dikirim',
                    response?.data
                        ?.message ||
                        'Request layanan Humas berhasil dikirim.'
                );

                resetForm();

                navigate(
                    '/admin/my-requests',
                    {
                        replace:
                            true,
                    }
                );
            } catch (
                error
            ) {
                console.error(
                    'Submit request Humas error:',
                    error?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Request Gagal Dikirim',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSubmitting(
                    false
                );
            }
        };

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.18), transparent 30%), linear-gradient(135deg, #0f172a 0%, #7f1d1d 55%, #dc2626 115%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                                HUMAS TELKOM UNIVERSITY SURABAYA
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                Form Request Layanan
                                HUMAS TUS
                            </h1>

                            <p
                                className="text-white-50 mb-3"
                                style={{
                                    maxWidth:
                                        850,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Mohon melengkapi data
                                kegiatan untuk kebutuhan
                                layanan Humas. Pemohon dapat
                                mencantumkan link bahan
                                mentah, referensi, atau folder
                                pendukung yang dibutuhkan oleh
                                tim Humas.
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <span className="badge bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill px-3 py-2">
                                    <i className="bi bi-shield-check me-2" />

                                    Data tercatat dalam sistem
                                </span>

                                <span className="badge bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill px-3 py-2">
                                    <i className="bi bi-link-45deg me-2" />

                                    Mendukung link bahan
                                </span>

                                <span className="badge bg-white bg-opacity-10 border border-white border-opacity-25 rounded-pill px-3 py-2">
                                    <i className="bi bi-clock-history me-2" />

                                    Status dapat dipantau
                                </span>
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-5 p-4">
                                <div className="small text-white-50 mb-2">
                                    Pemohon terdeteksi
                                </div>

                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="rounded-circle bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width:
                                                52,

                                            height:
                                                52,
                                        }}
                                    >
                                        <i className="bi bi-person-fill fs-4" />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="fw-bold text-truncate">
                                            {form.applicant_name ||
                                                'Pengguna'}
                                        </div>

                                        <div className="small text-white-50 text-truncate">
                                            {storedUser?.email ||
                                                'Akun pengguna aktif'}
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-white border-opacity-25" />

                                <p className="small text-white-50 mb-0">
                                    Nama dan email akun
                                    pengirim dapat dilihat oleh
                                    Admin Humas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-4">
                <div className="mb-3">
                    <span className="text-danger small fw-bold text-uppercase">
                        Informasi tindak lanjut
                    </span>

                    <h4 className="fw-bold mt-1 mb-1">
                        PIC Layanan Humas
                    </h4>

                    <p className="text-muted mb-0">
                        Hubungi PIC terkait setelah
                        request berhasil dikirim.
                    </p>
                </div>

                <div className="row g-3">
                    {PIC_CONTACTS.map(
                        (
                            contact
                        ) => (
                            <div
                                className="col-12 col-md-4"
                                key={
                                    contact.service
                                }
                            >
                                <div className="card border-0 shadow-sm rounded-5 h-100">
                                    <div className="card-body p-4">
                                        <div className="d-flex align-items-center gap-3">
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
                                                    className={`bi ${contact.icon} fs-4`}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="small text-muted">
                                                    {
                                                        contact.service
                                                    }
                                                </div>

                                                <h6 className="fw-bold mb-1">
                                                    {
                                                        contact.name
                                                    }
                                                </h6>

                                                <a
                                                    href={`https://wa.me/62${contact.phone
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
                                                    className="text-decoration-none text-success fw-semibold"
                                                >
                                                    <i className="bi bi-whatsapp me-1" />

                                                    {
                                                        contact.phone
                                                    }
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </section>

            <form
                onSubmit={
                    handleSubmit
                }
            >
                <div className="row g-4 align-items-start">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4 p-lg-5">
                                <SectionHeader
                                    icon="bi-person-vcard-fill"
                                    title="Data Pemohon"
                                    description="Lengkapi identitas pemohon dan PIC kegiatan."
                                />

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Nama Lengkap Pemohon

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="text"
                                            name="applicant_name"
                                            className="form-control form-control-lg"
                                            placeholder="Masukkan nama lengkap"
                                            value={
                                                form.applicant_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Nama Unit/Prodi

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <select
                                            name="unit_name"
                                            className="form-select form-select-lg"
                                            value={
                                                form.unit_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        >
                                            <option value="">
                                                Pilih unit atau program studi
                                            </option>

                                            {UNIT_OPTIONS.map(
                                                (
                                                    unit
                                                ) => (
                                                    <option
                                                        value={
                                                            unit
                                                        }
                                                        key={
                                                            unit
                                                        }
                                                    >
                                                        {
                                                            unit
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    {form.unit_name ===
                                        'Lainnya' && (
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Nama Unit/Prodi Lainnya

                                                <span className="text-danger ms-1">
                                                    *
                                                </span>
                                            </label>

                                            <input
                                                type="text"
                                                name="other_unit_name"
                                                className="form-control"
                                                placeholder="Masukkan nama unit atau program studi"
                                                value={
                                                    form.other_unit_name
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    submitting
                                                }
                                            />
                                        </div>
                                    )}

                                    <div
                                        className={
                                            form.unit_name ===
                                            'Lainnya'
                                                ? 'col-md-6'
                                                : 'col-12'
                                        }
                                    >
                                        <label className="form-label fw-bold">
                                            Kontak WhatsApp PIC Acara

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <div className="input-group">
                                            <span className="input-group-text bg-success-subtle text-success border-end-0">
                                                <i className="bi bi-whatsapp" />
                                            </span>

                                            <input
                                                type="tel"
                                                name="pic_whatsapp"
                                                className="form-control border-start-0"
                                                placeholder="Contoh: 081234567890"
                                                value={
                                                    form.pic_whatsapp
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    submitting
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4 p-lg-5">
                                <SectionHeader
                                    icon="bi-calendar-event-fill"
                                    title="Detail Kegiatan"
                                    description="Jelaskan kegiatan yang membutuhkan layanan Humas."
                                />

                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label fw-bold">
                                            Detail Kegiatan

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <textarea
                                            name="activity_detail"
                                            className="form-control"
                                            rows="6"
                                            maxLength="10000"
                                            placeholder="Jelaskan nama kegiatan, tujuan, susunan acara, narasumber, jumlah peserta, dan informasi penting lainnya."
                                            value={
                                                form.activity_detail
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />

                                        <div className="d-flex justify-content-between form-text">
                                            <span>
                                                Minimal 10 karakter.
                                            </span>

                                            <span>
                                                {
                                                    form
                                                        .activity_detail
                                                        .length
                                                }
                                                /10000
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Lokasi Acara

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="text"
                                            name="event_location"
                                            className="form-control"
                                            placeholder="Contoh: Aula Gedung A"
                                            value={
                                                form.event_location
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Pelaksanaan Kegiatan

                                            <span className="text-danger ms-1">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="date"
                                            name="event_date"
                                            className="form-control"
                                            value={
                                                form.event_date
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4 p-lg-5">
                                <SectionHeader
                                    icon="bi-camera-reels-fill"
                                    title="Jenis Layanan Humas"
                                    description="Pilih salah satu jenis layanan yang dibutuhkan."
                                />

                                <div className="row g-3">
                                    {COVERAGE_OPTIONS.map(
                                        (
                                            coverage
                                        ) => {
                                            const isSelected =
                                                form.coverage_type ===
                                                coverage.value;

                                            return (
                                                <div
                                                    className="col-12 col-md-6"
                                                    key={
                                                        coverage.value
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className={`card w-100 h-100 text-start rounded-4 ${
                                                            isSelected
                                                                ? 'border-danger shadow-sm bg-danger-subtle'
                                                                : 'border shadow-none'
                                                        }`}
                                                        onClick={() =>
                                                            handleCoverageChange(
                                                                coverage.value
                                                            )
                                                        }
                                                        disabled={
                                                            submitting
                                                        }
                                                    >
                                                        <div className="card-body p-3">
                                                            <div className="d-flex align-items-start gap-3">
                                                                <div
                                                                    className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                                                        isSelected
                                                                            ? 'bg-danger text-white'
                                                                            : 'bg-light text-danger'
                                                                    }`}
                                                                    style={{
                                                                        width:
                                                                            44,

                                                                        height:
                                                                            44,
                                                                    }}
                                                                >
                                                                    <i
                                                                        className={`bi ${coverage.icon}`}
                                                                    />
                                                                </div>

                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex align-items-start justify-content-between gap-2">
                                                                        <h6 className="fw-bold text-dark mb-1">
                                                                            {
                                                                                coverage.label
                                                                            }
                                                                        </h6>

                                                                        {isSelected && (
                                                                            <i className="bi bi-check-circle-fill text-danger" />
                                                                        )}
                                                                    </div>

                                                                    <p className="small text-muted mb-0">
                                                                        {
                                                                            coverage.description
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4 p-lg-5">
                                <SectionHeader
                                    icon="bi-link-45deg"
                                    title="Link Bahan Mentah atau Referensi"
                                    description="Cantumkan link folder, file, desain, foto, video, atau bahan pendukung lainnya."
                                />

                                <label className="form-label fw-bold">
                                    Link Bahan atau Referensi

                                    <span className="text-muted fw-normal ms-2">
                                        Opsional
                                    </span>
                                </label>

                                <div className="input-group input-group-lg">
                                    <span className="input-group-text bg-light border-end-0">
                                        <i className="bi bi-link-45deg text-danger" />
                                    </span>

                                    <input
                                        type="text"
                                        name="reference_link"
                                        className="form-control border-start-0"
                                        placeholder="https://drive.google.com/... atau link lainnya"
                                        value={
                                            form.reference_link
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        onBlur={
                                            handleReferenceLinkBlur
                                        }
                                        disabled={
                                            submitting
                                        }
                                    />

                                    {form.reference_link && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() =>
                                                setForm(
                                                    (
                                                        previousForm
                                                    ) => ({
                                                        ...previousForm,

                                                        reference_link:
                                                            '',
                                                    })
                                                )
                                            }
                                            disabled={
                                                submitting
                                            }
                                        >
                                            <i className="bi bi-x-lg" />
                                        </button>
                                    )}
                                </div>

                                <div className="form-text">
                                    Pastikan akses link telah diatur agar dapat
                                    dibuka oleh Admin Humas. Link dapat berasal
                                    dari Google Drive, OneDrive, Dropbox, Canva,
                                    YouTube, atau website lainnya.
                                </div>

                                {form.reference_link &&
                                    isValidUrl(
                                        form.reference_link
                                    ) && (
                                        <div className="alert alert-success rounded-4 mt-3 mb-0">
                                            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                                                <div>
                                                    <i className="bi bi-check-circle-fill me-2" />

                                                    Link terdeteksi valid.
                                                </div>

                                                <a
                                                    href={normalizeUrl(
                                                        form.reference_link
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-sm btn-outline-success rounded-pill"
                                                >
                                                    <i className="bi bi-box-arrow-up-right me-2" />

                                                    Uji Link
                                                </a>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4 p-lg-5">
                                <SectionHeader
                                    icon="bi-file-earmark-arrow-up-fill"
                                    title="Lampiran / Brief Kegiatan"
                                    description="Unggah brief, TOR, rundown, draft artikel, script, referensi desain, atau dokumen pendukung lainnya."
                                />

                                {!articleDraft ? (
                                    <label
                                        htmlFor="article_draft"
                                        className="border border-2 border-dashed rounded-5 p-4 p-lg-5 text-center w-100 bg-light"
                                        style={{
                                            cursor:
                                                submitting
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                        }}
                                    >
                                        <div
                                            className="mx-auto mb-3 rounded-circle bg-white text-danger d-flex align-items-center justify-content-center shadow-sm"
                                            style={{
                                                width:
                                                    68,

                                                height:
                                                    68,
                                            }}
                                        >
                                            <i className="bi bi-cloud-arrow-up-fill fs-2" />
                                        </div>

                                        <h6 className="fw-bold mb-2">
                                            Klik untuk mengunggah lampiran
                                        </h6>

                                        <p className="small text-muted mb-1">
                                            Wajib untuk seluruh jenis layanan Humas.
                                        </p>

                                        <p className="small text-muted mb-0">
                                            PDF, DOC, DOCX, JPG, JPEG, atau PNG.
                                            Maksimal 10 MB.
                                        </p>

                                        <input
                                            id="article_draft"
                                            name="article_draft"
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            className="d-none"
                                            onChange={
                                                handleArticleDraftChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />
                                    </label>
                                ) : (
                                    <div className="border rounded-4 p-3 bg-light">
                                        <div className="d-flex align-items-center gap-3">
                                            <div
                                                className="rounded-4 bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                                                style={{
                                                    width:
                                                        52,

                                                    height:
                                                        52,
                                                }}
                                            >
                                                <i className="bi bi-file-earmark-check-fill fs-4" />
                                            </div>

                                            <div className="flex-grow-1 min-w-0">
                                                <div className="fw-bold text-truncate">
                                                    {
                                                        articleDraft.name
                                                    }
                                                </div>

                                                <div className="small text-muted">
                                                    {formatFileSize(
                                                        articleDraft.size
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="btn btn-outline-danger rounded-circle"
                                                onClick={() => {
                                                    setArticleDraft(
                                                        null
                                                    );

                                                    const input =
                                                        document.getElementById(
                                                            'article_draft'
                                                        );

                                                    if (
                                                        input
                                                    ) {
                                                        input.value =
                                                            '';
                                                    }
                                                }}
                                                disabled={
                                                    submitting
                                                }
                                            >
                                                <i className="bi bi-trash-fill" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
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
                                    <h5 className="fw-bold mb-4">
                                        Ringkasan Request
                                    </h5>

                                    <div className="d-grid gap-3">
                                        <div className="border-bottom pb-3">
                                            <div className="small text-muted mb-1">
                                                Pemohon
                                            </div>

                                            <div className="fw-semibold">
                                                {form.applicant_name ||
                                                    '-'}
                                            </div>
                                        </div>

                                        <div className="border-bottom pb-3">
                                            <div className="small text-muted mb-1">
                                                Unit/Prodi
                                            </div>

                                            <div className="fw-semibold">
                                                {form.unit_name ===
                                                'Lainnya'
                                                    ? form.other_unit_name ||
                                                      'Lainnya'
                                                    : form.unit_name ||
                                                      '-'}
                                            </div>
                                        </div>

                                        <div className="border-bottom pb-3">
                                            <div className="small text-muted mb-1">
                                                Jenis Layanan
                                            </div>

                                            <div className="fw-semibold">
                                                {selectedCoverage?.label ||
                                                    '-'}
                                            </div>
                                        </div>

                                        <div className="border-bottom pb-3">
                                            <div className="small text-muted mb-1">
                                                Pelaksanaan
                                            </div>

                                            <div className="fw-semibold">
                                                {form.event_date ||
                                                    '-'}
                                            </div>
                                        </div>

                                        <div className="border-bottom pb-3">
                                            <div className="small text-muted mb-1">
                                                Link Bahan
                                            </div>

                                            <div className="fw-semibold text-truncate">
                                                {form.reference_link
                                                    ? 'Sudah dicantumkan'
                                                    : 'Tidak ada'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="small text-muted mb-1">
                                                Lampiran / Brief
                                            </div>

                                            <div className="fw-semibold text-truncate">
                                                {articleDraft?.name ||
                                                    'Belum diunggah'}
                                            </div>
                                        </div>
                                    </div>

                                    <hr />

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-danger btn-lg rounded-pill"
                                            disabled={
                                                submitting
                                            }
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />

                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send-fill me-2" />

                                                    Kirim Request
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary rounded-pill"
                                            onClick={
                                                resetForm
                                            }
                                            disabled={
                                                submitting
                                            }
                                        >
                                            <i className="bi bi-arrow-counterclockwise me-2" />

                                            Reset Form
                                        </button>

                                        <Link
                                            to="/admin/my-requests"
                                            className="btn btn-light border rounded-pill"
                                        >
                                            <i className="bi bi-clock-history me-2" />

                                            Riwayat Pengajuan
                                        </Link>
                                    </div>
                                </div>
                            </section>

                            <section className="card border-0 shadow-sm rounded-5">
                                <div className="card-body p-4">
                                    <h5 className="fw-bold mb-3">
                                        Alur Request
                                    </h5>

                                    <div className="d-grid gap-3">
                                        <div className="d-flex align-items-start gap-3">
                                            <span className="badge text-bg-danger rounded-pill">
                                                1
                                            </span>

                                            <div>
                                                <div className="fw-semibold">
                                                    Request dikirim
                                                </div>

                                                <div className="small text-muted">
                                                    Data dan bahan masuk ke Admin Humas.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-start gap-3">
                                            <span className="badge text-bg-danger rounded-pill">
                                                2
                                            </span>

                                            <div>
                                                <div className="fw-semibold">
                                                    Pemeriksaan admin
                                                </div>

                                                <div className="small text-muted">
                                                    Admin menyetujui atau menolak.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-start gap-3">
                                            <span className="badge text-bg-danger rounded-pill">
                                                3
                                            </span>

                                            <div>
                                                <div className="fw-semibold">
                                                    Layanan diproses
                                                </div>

                                                <div className="small text-muted">
                                                    PIC mengerjakan layanan.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-start gap-3">
                                            <span className="badge text-bg-danger rounded-pill">
                                                4
                                            </span>

                                            <div>
                                                <div className="fw-semibold">
                                                    Hasil diberikan
                                                </div>

                                                <div className="small text-muted">
                                                    File atau link hasil muncul pada riwayat user.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </form>

            <section className="card border-0 shadow-sm rounded-5 mt-4">
                <div className="card-body p-4 p-lg-5 text-center">
                    <h5 className="fw-bold mb-2">
                        Terima Kasih
                    </h5>

                    <p className="text-muted mb-2">
                        Setelah mengisi formulir,
                        silakan melakukan tindak lanjut
                        kepada PIC layanan terkait.
                    </p>

                    <div className="fw-bold text-danger">
                        Salam HEI — Harmony,
                        Excellence, Integrity
                    </div>

                    <div className="small text-muted mt-1">
                        Humas Telkom University Kampus Surabaya
                    </div>
                </div>
            </section>
        </div>
    );
}