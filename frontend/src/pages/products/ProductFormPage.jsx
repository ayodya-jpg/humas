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
    category_id: '',
    name: '',
    slug: '',
    description: '',
    stock: 0,
    type: 'checkout',
    image: '',
    status: 'active',
};

const TYPE_OPTIONS = [
    {
        value: 'checkout',
        label: 'Merchandise',
    },
    {
        value: 'borrow',
        label: 'Peminjaman',
    },
    {
        value: 'both',
        label: 'Keduanya',
    },
];

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
        currentUser?.role ===
        'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
};

const extractArray = (response) => {
    const payload =
        response?.data?.data;

    if (Array.isArray(payload)) {
        return payload;
    }

    if (
        payload &&
        Array.isArray(payload.data)
    ) {
        return payload.data;
    }

    return [];
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

const normalizeImageUrl = (value) => {
    const imageUrl =
        String(value || '').trim();

    if (!imageUrl) {
        return '';
    }

    if (
        /^https?:\/\//i.test(imageUrl) ||
        imageUrl.startsWith('/')
    ) {
        return imageUrl;
    }

    return `https://${imageUrl}`;
};

export default function ProductFormPage() {
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
            'products.manage'
        );

    const [
        categories,
        setCategories,
    ] = useState([]);

    const [
        form,
        setForm,
    ] = useState(INITIAL_FORM);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        loadError,
        setLoadError,
    ] = useState('');

    const fetchData =
        useCallback(
            async () => {
                if (!canManage) {
                    setLoading(false);

                    setLoadError(
                        'Akun tidak memiliki permission products.manage.'
                    );

                    return;
                }

                try {
                    setLoading(true);
                    setLoadError('');

                    const requests = [
                        api.get('/categories'),
                    ];

                    if (isEdit) {
                        requests.push(
                            api.get(
                                `/products/${id}`
                            )
                        );
                    }

                    const responses =
                        await Promise.all(
                            requests
                        );

                    const categoryData =
                        extractArray(
                            responses[0]
                        );

                    setCategories(
                        categoryData
                    );

                    if (isEdit) {
                        const product =
                            extractObject(
                                responses[1]
                            );

                        if (!product) {
                            throw new Error(
                                'Data produk tidak ditemukan.'
                            );
                        }

                        setForm({
                            category_id:
                                product.category_id
                                    ? String(
                                          product.category_id
                                      )
                                    : '',

                            name:
                                product.name ||
                                '',

                            slug:
                                product.slug ||
                                '',

                            description:
                                product.description ||
                                '',

                            stock:
                                product.stock ??
                                0,

                            type:
                                product.type ||
                                'checkout',

                            image:
                                product.image ||
                                '',

                            status:
                                product.status ||
                                'active',
                        });
                    }
                } catch (error) {
                    console.error(
                        'Fetch product form error:',
                        error?.response?.data ||
                            error
                    );

                    const message =
                        getBackendErrorMessage(
                            error,
                            error?.message ||
                                'Data form produk gagal dimuat.'
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
        fetchData();
    }, [fetchData]);

    const selectedCategory =
        useMemo(() => {
            return categories.find(
                (category) =>
                    String(category.id) ===
                    String(
                        form.category_id
                    )
            );
        }, [
            categories,
            form.category_id,
        ]);

    const previewImageUrl =
        useMemo(
            () =>
                normalizeImageUrl(
                    form.image
                ),
            [form.image]
        );

    const typeLabel =
        useMemo(() => {
            return (
                TYPE_OPTIONS.find(
                    (option) =>
                        option.value ===
                        form.type
                )?.label ||
                'Produk'
            );
        }, [form.type]);

    const ensureManageAccess = () => {
        if (canManage) {
            return true;
        }

        showErrorAlert(
            'Akses Ditolak',
            'Akun tidak memiliki permission untuk mengelola produk.'
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

                if (
                    name === 'stock'
                ) {
                    nextForm.stock =
                        value === ''
                            ? ''
                            : value;
                }

                return nextForm;
            }
        );
    };

    const validateForm = () => {
        if (
            !ensureManageAccess()
        ) {
            return false;
        }

        if (!form.category_id) {
            showWarningAlert(
                'Kategori Wajib Dipilih',
                'Pilih kategori produk terlebih dahulu.'
            );

            return false;
        }

        if (!form.name.trim()) {
            showWarningAlert(
                'Nama Wajib Diisi',
                'Isi nama produk terlebih dahulu.'
            );

            return false;
        }

        if (
            form.name.trim().length <
            3
        ) {
            showWarningAlert(
                'Nama Terlalu Pendek',
                'Nama produk minimal terdiri dari 3 karakter.'
            );

            return false;
        }

        if (!form.slug.trim()) {
            showWarningAlert(
                'Slug Wajib Diisi',
                'Isi slug produk terlebih dahulu.'
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
            form.stock === '' ||
            Number.isNaN(
                Number(form.stock)
            )
        ) {
            showWarningAlert(
                'Stok Tidak Valid',
                'Isi stok menggunakan angka.'
            );

            return false;
        }

        if (
            Number(form.stock) < 0
        ) {
            showWarningAlert(
                'Stok Tidak Valid',
                'Stok tidak boleh kurang dari 0.'
            );

            return false;
        }

        if (
            !Number.isInteger(
                Number(form.stock)
            )
        ) {
            showWarningAlert(
                'Stok Tidak Valid',
                'Stok harus berupa bilangan bulat.'
            );

            return false;
        }

        if (
            !TYPE_OPTIONS.some(
                (option) =>
                    option.value ===
                    form.type
            )
        ) {
            showWarningAlert(
                'Jenis Tidak Valid',
                'Pilih jenis produk yang tersedia.'
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
                'Pilih status produk yang tersedia.'
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
                    ? 'Memperbarui Produk'
                    : 'Menyimpan Produk',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                category_id:
                    Number(
                        form.category_id
                    ),

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

                stock:
                    Number(
                        form.stock
                    ),

                type:
                    form.type,

                image:
                    form.image.trim()
                        ? normalizeImageUrl(
                              form.image
                          )
                        : null,

                status:
                    form.status,
            };

            let response;

            if (isEdit) {
                response =
                    await api.put(
                        `/products/${id}`,
                        payload
                    );
            } else {
                response =
                    await api.post(
                        '/products',
                        payload
                    );
            }

            closeAlert();

            await showSuccessAlert(
                isEdit
                    ? 'Produk Diperbarui'
                    : 'Produk Ditambahkan',

                response?.data?.message ||
                    (isEdit
                        ? 'Data produk berhasil diperbarui.'
                        : 'Produk baru berhasil ditambahkan.')
            );

            navigate(
                '/admin/products',
                {
                    replace: true,
                }
            );
        } catch (error) {
            console.error(
                'Save product error:',
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
                    'Data produk gagal disimpan.'
                )
            );
        } finally {
            setSubmitting(false);
        }
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

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-warning mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat form produk
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
                            products.manage
                        </strong>
                        {' '}
                        untuk menambah atau mengedit produk.
                    </p>

                    <Link
                        to="/admin/products"
                        className="btn btn-warning text-white rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Data Produk
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
                            className="btn btn-outline-warning rounded-pill"
                            onClick={
                                fetchData
                            }
                        >
                            <i className="bi bi-arrow-clockwise me-2" />

                            Coba Lagi
                        </button>

                        <Link
                            to="/admin/products"
                            className="btn btn-warning text-white rounded-pill"
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
                        'linear-gradient(135deg, rgba(245,158,11,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-warning px-3 py-2 mb-3">
                                {isEdit
                                    ? 'Edit Produk'
                                    : 'Tambah Produk'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit
                                    ? 'Perbarui data produk.'
                                    : 'Tambahkan produk baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                Isi data produk dengan benar agar muncul pada katalog merchandise atau peminjaman sesuai jenis yang dipilih.
                            </p>
                        </div>

                        <Link
                            to="/admin/products"
                            className="btn btn-light rounded-pill px-4"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            {categories.length === 0 && (
                <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Kategori belum tersedia
                            </div>

                            <div className="small">
                                Produk membutuhkan kategori. Tambahkan kategori terlebih dahulu sebelum menyimpan produk.
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                    Informasi Produk
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi identitas produk, kategori, dan deskripsi.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label
                                            htmlFor="category_id"
                                            className="form-label fw-bold"
                                        >
                                            Kategori
                                        </label>

                                        <select
                                            id="category_id"
                                            name="category_id"
                                            className="form-select"
                                            value={
                                                form.category_id
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            required
                                        >
                                            <option value="">
                                                Pilih kategori
                                            </option>

                                            {categories.map(
                                                (
                                                    category
                                                ) => (
                                                    <option
                                                        key={
                                                            category.id
                                                        }
                                                        value={
                                                            category.id
                                                        }
                                                    >
                                                        {
                                                            category.name
                                                        }

                                                        {category.status ===
                                                        'inactive'
                                                            ? ' — Nonaktif'
                                                            : ''}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="name"
                                            className="form-label fw-bold"
                                        >
                                            Nama Produk
                                        </label>

                                        <input
                                            id="name"
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Paket Merchandise VIP"
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
                                            placeholder="paket-merchandise-vip"
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
                                            Slug otomatis dibuat saat menambah produk dan tetap dapat diedit.
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="image"
                                            className="form-label fw-bold"
                                        >
                                            URL Gambar
                                        </label>

                                        <input
                                            id="image"
                                            type="text"
                                            name="image"
                                            className="form-control rounded-pill"
                                            placeholder="https://contoh.com/gambar.jpg"
                                            value={
                                                form.image
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />

                                        <div className="form-text">
                                            Kosongkan apabila produk tidak menggunakan gambar.
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
                                            rows="6"
                                            placeholder="Deskripsi singkat produk..."
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
                                    Pengaturan Produk
                                </h4>

                                <p className="text-muted mb-4">
                                    Atur stok, jenis penggunaan, dan status produk.
                                </p>

                                <div className="mb-3">
                                    <label
                                        htmlFor="stock"
                                        className="form-label fw-bold"
                                    >
                                        Stok
                                    </label>

                                    <input
                                        id="stock"
                                        type="number"
                                        name="stock"
                                        min="0"
                                        step="1"
                                        className="form-control rounded-pill"
                                        value={
                                            form.stock
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            submitting
                                        }
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        htmlFor="type"
                                        className="form-label fw-bold"
                                    >
                                        Jenis Produk
                                    </label>

                                    <select
                                        id="type"
                                        name="type"
                                        className="form-select"
                                        value={
                                            form.type
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            submitting
                                        }
                                        required
                                    >
                                        {TYPE_OPTIONS.map(
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
                                </div>

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
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-warning rounded-pill text-white"
                                        disabled={
                                            submitting ||
                                            categories.length ===
                                                0
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
                                                    ? 'Update Produk'
                                                    : 'Simpan Produk'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/products"
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
                                    {previewImageUrl && (
                                        <div
                                            className="rounded-4 bg-white border overflow-hidden mb-3"
                                            style={{
                                                height: 180,
                                            }}
                                        >
                                            <img
                                                src={
                                                    previewImageUrl
                                                }
                                                alt={
                                                    form.name ||
                                                    'Preview produk'
                                                }
                                                className="w-100 h-100"
                                                style={{
                                                    objectFit:
                                                        'cover',
                                                }}
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        <span className="badge rounded-pill text-bg-warning">
                                            {
                                                typeLabel
                                            }
                                        </span>

                                        {selectedCategory && (
                                            <span className="badge rounded-pill text-bg-secondary">
                                                {
                                                    selectedCategory.name
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <h5 className="fw-black mb-2 text-break">
                                        {form.name ||
                                            'Nama Produk'}
                                    </h5>

                                    <p
                                        className="text-muted mb-3"
                                        style={{
                                            whiteSpace:
                                                'pre-line',
                                        }}
                                    >
                                        {form.description ||
                                            'Deskripsi produk akan tampil di sini.'}
                                    </p>

                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <span
                                            className={`status status-${form.status}`}
                                        >
                                            {form.status ===
                                            'active'
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </span>

                                        <strong>
                                            Stok{' '}
                                            {form.stock ||
                                                0}
                                        </strong>
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