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
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const INITIAL_FORM = {
    name: '',
    slug: '',
    description: '',
    status: 'active',
};

const STATUS_OPTIONS = [
    {
        value: 'active',
        label: 'Aktif',
    },
    {
        value: 'inactive',
        label: 'Nonaktif',
    },
];

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const normalizePermissions = (permissions) => {
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
        currentUser?.role === 'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
};

const extractObject = (response) => {
    const payload =
        response?.data?.data;

    if (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload)
    ) {
        return payload;
    }

    return null;
};

const createSlug = (value) => {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const getBackendErrorMessage = (
    error,
    fallbackMessage = 'Proses gagal dilakukan.'
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

    if (responseData?.message) {
        return responseData.message;
    }

    return fallbackMessage;
};

export default function CategoryFormPage() {
    const { id } = useParams();

    const navigate =
        useNavigate();

    const isEdit =
        Boolean(id);

    const currentUser =
        useMemo(
            () => getCurrentUser(),
            []
        );

    const canManage =
        hasPermission(
            currentUser,
            'categories.manage'
        );

    const [
        form,
        setForm,
    ] = useState(INITIAL_FORM);

    const [
        loading,
        setLoading,
    ] = useState(isEdit);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        loadError,
        setLoadError,
    ] = useState('');

    const fetchCategory =
        useCallback(
            async () => {
                if (!canManage) {
                    setLoading(false);

                    setLoadError(
                        'Akun tidak memiliki permission categories.manage.'
                    );

                    return;
                }

                if (!isEdit) {
                    setLoading(false);
                    setLoadError('');

                    return;
                }

                try {
                    setLoading(true);
                    setLoadError('');

                    const response =
                        await api.get(
                            `/categories/${id}`
                        );

                    const category =
                        extractObject(
                            response
                        );

                    if (!category) {
                        throw new Error(
                            'Data kategori tidak ditemukan.'
                        );
                    }

                    setForm({
                        name:
                            category.name ||
                            '',

                        slug:
                            category.slug ||
                            '',

                        description:
                            category.description ||
                            '',

                        status:
                            category.status ||
                            'active',
                    });
                } catch (error) {
                    console.error(
                        'Fetch category form error:',
                        error?.response?.data ||
                            error
                    );

                    const message =
                        getBackendErrorMessage(
                            error,
                            error?.message ||
                                'Data kategori gagal dimuat.'
                        );

                    setLoadError(message);

                    await showErrorAlert(
                        'Gagal Memuat Form',
                        message
                    );
                } finally {
                    setLoading(false);
                }
            },
            [
                canManage,
                id,
                isEdit,
            ]
        );

    useEffect(() => {
        fetchCategory();
    }, [fetchCategory]);

    const statusLabel =
        useMemo(() => {
            return (
                STATUS_OPTIONS.find(
                    (option) =>
                        option.value ===
                        form.status
                )?.label ||
                form.status ||
                '-'
            );
        }, [form.status]);

    const ensureManageAccess = () => {
        if (canManage) {
            return true;
        }

        showErrorAlert(
            'Akses Ditolak',
            'Akun tidak memiliki permission untuk mengelola kategori.'
        );

        return false;
    };

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (previousForm) => {
                const nextForm = {
                    ...previousForm,
                    [name]: value,
                };

                if (
                    name === 'name' &&
                    !isEdit
                ) {
                    nextForm.slug =
                        createSlug(value);
                }

                return nextForm;
            }
        );
    };

    const handleNameBlur = () => {
        if (
            !form.slug.trim() &&
            form.name.trim()
        ) {
            setForm(
                (previousForm) => ({
                    ...previousForm,

                    slug:
                        createSlug(
                            previousForm.name
                        ),
                })
            );
        }
    };

    const handleSlugBlur = () => {
        if (!form.slug.trim()) {
            return;
        }

        setForm(
            (previousForm) => ({
                ...previousForm,

                slug:
                    createSlug(
                        previousForm.slug
                    ),
            })
        );
    };

    const validateForm = () => {
        if (
            !ensureManageAccess()
        ) {
            return false;
        }

        if (!form.name.trim()) {
            showWarningAlert(
                'Nama Wajib Diisi',
                'Isi nama kategori terlebih dahulu.'
            );

            return false;
        }

        if (
            form.name.trim().length <
            3
        ) {
            showWarningAlert(
                'Nama Terlalu Pendek',
                'Nama kategori minimal terdiri dari 3 karakter.'
            );

            return false;
        }

        if (!form.slug.trim()) {
            showWarningAlert(
                'Slug Wajib Diisi',
                'Isi slug kategori terlebih dahulu.'
            );

            return false;
        }

        if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                form.slug.trim()
            )
        ) {
            showWarningAlert(
                'Slug Tidak Valid',
                'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'
            );

            return false;
        }

        if (
            !STATUS_OPTIONS.some(
                (option) =>
                    option.value ===
                    form.status
            )
        ) {
            showWarningAlert(
                'Status Tidak Valid',
                'Pilih status kategori yang tersedia.'
            );

            return false;
        }

        return true;
    };

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);

            showLoadingAlert(
                isEdit
                    ? 'Memperbarui Kategori'
                    : 'Menyimpan Kategori',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                name:
                    form.name.trim(),

                slug:
                    createSlug(
                        form.slug
                    ),

                description:
                    form.description
                        .trim() ||
                    null,

                status:
                    form.status,
            };

            let response;

            if (isEdit) {
                response =
                    await api.put(
                        `/categories/${id}`,
                        payload
                    );
            } else {
                response =
                    await api.post(
                        '/categories',
                        payload
                    );
            }

            closeAlert();

            await showSuccessAlert(
                isEdit
                    ? 'Kategori Diperbarui'
                    : 'Kategori Ditambahkan',

                response?.data?.message ||
                    (isEdit
                        ? 'Data kategori berhasil diperbarui.'
                        : 'Kategori baru berhasil ditambahkan.')
            );

            navigate(
                '/admin/categories',
                {
                    replace: true,
                }
            );
        } catch (error) {
            console.error(
                'Save category error:',
                error?.response?.data ||
                    error
            );

            closeAlert();

            await showErrorAlert(
                isEdit
                    ? 'Update Gagal'
                    : 'Tambah Gagal',

                getBackendErrorMessage(
                    error,
                    'Data kategori gagal disimpan.'
                )
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-primary mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat form kategori
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-4"
                        style={{
                            width: 88,
                            height: 88,
                        }}
                    >
                        <i className="bi bi-shield-lock-fill fs-1" />
                    </div>

                    <h3 className="fw-black mb-2">
                        Akses Ditolak
                    </h3>

                    <p className="text-muted mx-auto mb-4">
                        Akun tidak memiliki permission
                        {' '}
                        <strong>
                            categories.manage
                        </strong>
                        {' '}
                        untuk menambah atau mengedit kategori.
                    </p>

                    <Link
                        to="/admin/categories"
                        className="btn btn-primary rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Data Kategori
                    </Link>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-4"
                        style={{
                            width: 88,
                            height: 88,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h3 className="fw-black mb-2">
                        Form Gagal Dimuat
                    </h3>

                    <p className="text-muted mx-auto mb-4">
                        {loadError}
                    </p>

                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary rounded-pill"
                            onClick={
                                fetchCategory
                            }
                        >
                            <i className="bi bi-arrow-clockwise me-2" />

                            Coba Lagi
                        </button>

                        <Link
                            to="/admin/categories"
                            className="btn btn-primary rounded-pill"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                {isEdit
                                    ? 'Edit Kategori'
                                    : 'Tambah Kategori'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit
                                    ? 'Perbarui data kategori.'
                                    : 'Tambahkan kategori baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                Kategori digunakan untuk mengelompokkan produk merchandise dan perlengkapan peminjaman agar katalog lebih terstruktur.
                            </p>
                        </div>

                        <Link
                            to="/admin/categories"
                            className="btn btn-light rounded-pill px-4"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            <form
                onSubmit={
                    handleSubmit
                }
            >
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Kategori
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi nama, slug, dan deskripsi kategori.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label
                                            htmlFor="name"
                                            className="form-label fw-bold"
                                        >
                                            Nama Kategori
                                        </label>

                                        <input
                                            id="name"
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Merchandise"
                                            value={
                                                form.name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            onBlur={
                                                handleNameBlur
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />

                                        <div className="form-text">
                                            Gunakan nama yang singkat dan mudah dipahami.
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="slug"
                                            className="form-label fw-bold"
                                        >
                                            Slug
                                        </label>

                                        <input
                                            id="slug"
                                            type="text"
                                            name="slug"
                                            className="form-control rounded-pill"
                                            placeholder="merchandise"
                                            value={
                                                form.slug
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            onBlur={
                                                handleSlugBlur
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />

                                        <div className="form-text">
                                            Slug otomatis dibuat ketika menambah kategori dan tetap dapat diedit.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label
                                            htmlFor="description"
                                            className="form-label fw-bold"
                                        >
                                            Deskripsi
                                        </label>

                                        <textarea
                                            id="description"
                                            name="description"
                                            className="form-control rounded-4"
                                            rows="7"
                                            placeholder="Deskripsi singkat kategori..."
                                            value={
                                                form.description
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="5000"
                                        />

                                        <div className="form-text text-end">
                                            {
                                                form.description.length
                                            }
                                            /5000 karakter
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Pengaturan
                                </h4>

                                <p className="text-muted mb-4">
                                    Atur status kategori.
                                </p>

                                <div className="mb-4">
                                    <label
                                        htmlFor="status"
                                        className="form-label fw-bold"
                                    >
                                        Status
                                    </label>

                                    <select
                                        id="status"
                                        name="status"
                                        className="form-select"
                                        value={
                                            form.status
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            submitting
                                        }
                                        required
                                    >
                                        {STATUS_OPTIONS.map(
                                            (
                                                option
                                            ) => (
                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <div className="form-text">
                                        Kategori nonaktif tetap tersimpan, tetapi dapat disembunyikan dari pemilihan katalog.
                                    </div>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill"
                                        disabled={
                                            submitting
                                        }
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />

                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-save-fill me-2" />

                                                {isEdit
                                                    ? 'Update Kategori'
                                                    : 'Simpan Kategori'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/categories"
                                        className="btn btn-outline-dark rounded-pill"
                                    >
                                        Batal
                                    </Link>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-3">
                                    Preview Singkat
                                </h4>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        <span className="badge rounded-pill text-bg-primary">
                                            Kategori
                                        </span>

                                        <span
                                            className={`status status-${form.status}`}
                                        >
                                            {
                                                statusLabel
                                            }
                                        </span>
                                    </div>

                                    <h5 className="fw-black mb-2 text-break">
                                        {form.name ||
                                            'Nama Kategori'}
                                    </h5>

                                    <p
                                        className="text-muted mb-3"
                                        style={{
                                            whiteSpace:
                                                'pre-line',
                                        }}
                                    >
                                        {form.description ||
                                            'Deskripsi kategori akan tampil di sini.'}
                                    </p>

                                    <div className="small text-muted">
                                        Slug
                                    </div>

                                    <div className="fw-bold text-break">
                                        {form.slug ||
                                            'slug-kategori'}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
}