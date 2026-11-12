
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

const SERVICE_OPTIONS = [
    {
        value: 'merchandise',
        label: 'Merchandise HUMAS',
        description: 'Barang untuk permintaan merchandise.',
        icon: 'bi-gift',
    },
    {
        value: 'borrow',
        label: 'Peminjaman SEKPiM',
        description: 'Barang dipinjam dan wajib dikembalikan.',
        icon: 'bi-arrow-left-right',
    },
    {
        value: 'asset_request',
        label: 'Request Aset SEKPiM',
        description: 'Barang diberikan kepada penerima dan tidak dikembalikan.',
        icon: 'bi-box-seam',
    },
];

const EMPTY_FORM = {
    category_id: '',
    name: '',
    description: '',
    stock: '0',
    status: 'active',
    services: ['merchandise'],
    slug: '',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
];

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

const getUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const hasManagePermission = () => {
    const user = getUser();

    return (
        user.role === 'superadmin' ||
        (
            Array.isArray(user.permissions) &&
            user.permissions.includes('products.manage')
        )
    );
};

const getRows = (response) => {
    const data = response?.data?.data;

    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    return [];
};

const getError = (error) =>
    Object.values(
        error?.response?.data?.errors || {}
    )
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Permintaan gagal diproses.';

const servicesFromProduct = (product) => {
    const services = [];

    if (
        ['checkout', 'both'].includes(product.type)
    ) {
        services.push('merchandise');
    }

    let sekpimType = product.sekpim_item_type;

    if (
        !sekpimType &&
        ['borrow', 'both'].includes(product.type)
    ) {
        sekpimType = 'borrow';
    }

    if (
        ['borrow', 'both'].includes(sekpimType)
    ) {
        services.push('borrow');
    }

    if (
        ['asset_request', 'both'].includes(sekpimType)
    ) {
        services.push('asset_request');
    }

    return services;
};

const typeFromServices = (services) => {
    const merchandise = services.includes('merchandise');
    const borrow = services.includes('borrow');
    const assetRequest = services.includes('asset_request');

    const type = merchandise
        ? (
            borrow || assetRequest
                ? 'both'
                : 'checkout'
        )
        : 'borrow';

    const sekpim_item_type =
        borrow && assetRequest
            ? 'both'
            : borrow
              ? 'borrow'
              : assetRequest
                ? 'asset_request'
                : null;

    return {
        type,
        sekpim_item_type,
    };
};

const prettySize = (bytes) =>
    `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function ProductFormPage() {
    const { id } = useParams();

    const navigate = useNavigate();

    const editing = Boolean(id);

    const canManage = useMemo(
        () => hasManagePermission(),
        []
    );

    const [categories, setCategories] = useState([]);

    const [form, setForm] = useState(EMPTY_FORM);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');

    // State gambar produk.
    const [imageFile, setImageFile] = useState(null);

    const [existingImage, setExistingImage] = useState('');

    const [removeImage, setRemoveImage] = useState(false);

    const [imagePreview, setImagePreview] = useState('');

    /*
    |--------------------------------------------------------------------------
    | PREVIEW GAMBAR
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return undefined;
        }

        const url = URL.createObjectURL(
            imageFile
        );

        setImagePreview(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [imageFile]);

    const displayedImage =
        imagePreview ||
        (
            !removeImage
                ? existingImage
                : ''
        );

    /*
    |--------------------------------------------------------------------------
    | LOAD FORM
    |--------------------------------------------------------------------------
    */

    const loadData = useCallback(async () => {
        if (!canManage) {
            setError(
                'Akun tidak memiliki izin products.manage.'
            );

            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const requests = [
                api.get('/categories'),
            ];

            if (editing) {
                requests.push(
                    api.get(`/products/${id}`)
                );
            }

            const results = await Promise.all(
                requests
            );

            setCategories(
                getRows(results[0])
            );

            if (editing) {
                const product =
                    results[1]?.data?.data;

                if (!product?.id) {
                    throw new Error(
                        'Produk tidak ditemukan.'
                    );
                }

                setForm({
                    category_id: String(
                        product.category_id ?? ''
                    ),

                    name: product.name || '',

                    description:
                        product.description || '',

                    stock: String(
                        product.stock ?? 0
                    ),

                    status: product.status || 'active',

                    services: servicesFromProduct(
                        product
                    ),

                    slug: product.slug || '',
                });

                setExistingImage(
                    product.image || ''
                );

                setImageFile(null);

                setRemoveImage(false);
            }
        } catch (err) {
            setError(
                err.response
                    ? getError(err)
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    }, [
        canManage,
        editing,
        id,
    ]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /*
    |--------------------------------------------------------------------------
    | FORM HANDLERS
    |--------------------------------------------------------------------------
    */

    const updateField = (name, value) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const toggleService = (service, checked) => {
        setForm((previous) => ({
            ...previous,

            services: checked
                ? [
                    ...new Set([
                        ...previous.services,
                        service,
                    ]),
                ]
                : previous.services.filter(
                    (value) => value !== service
                ),
        }));
    };

    const clearFileInput = () => {
        const input = document.getElementById(
            'product-image-file'
        );

        if (input) {
            input.value = '';
        }
    };

    /*
    |--------------------------------------------------------------------------
    | VALIDASI DAN PILIH GAMBAR
    |--------------------------------------------------------------------------
    */

    const changeImage = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const extension = file.name
            .split('.')
            .pop()
            ?.toLowerCase();

        const valid =
            ALLOWED_IMAGE_EXTENSIONS.includes(
                extension
            ) &&
            (
                !file.type ||
                ALLOWED_IMAGE_TYPES.includes(
                    file.type
                )
            );

        if (!valid) {
            clearFileInput();

            setImageFile(null);

            await showWarningAlert(
                'Format Gambar Tidak Didukung',
                'Gunakan JPG, JPEG, PNG, atau WEBP.'
            );

            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            clearFileInput();

            setImageFile(null);

            await showWarningAlert(
                'Ukuran Gambar Terlalu Besar',
                'Maksimal 5 MB per gambar.'
            );

            return;
        }

        setImageFile(file);

        setRemoveImage(false);
    };

    const cancelNewImage = () => {
        setImageFile(null);

        clearFileInput();
    };

    const removeCurrentImage = () => {
        setImageFile(null);

        setRemoveImage(true);

        clearFileInput();
    };

    /*
    |--------------------------------------------------------------------------
    | SIMPAN PRODUK DAN GAMBAR
    |--------------------------------------------------------------------------
    */

    const saveProduct = async (event) => {
        event.preventDefault();

        if (!canManage || saving) {
            return;
        }

        const qty = Number(form.stock);

        if (
            !form.category_id ||
            form.name.trim().length < 3 ||
            form.stock === '' ||
            !Number.isSafeInteger(qty) ||
            qty < 0 ||
            form.services.length === 0
        ) {
            await showWarningAlert(
                'Periksa Form',
                'Isi kategori, nama minimal 3 karakter, stok valid, dan pilih setidaknya satu layanan.'
            );

            return;
        }

        const classification = typeFromServices(
            form.services
        );

        const payload = new FormData();

        payload.append(
            'category_id',
            String(form.category_id)
        );

        payload.append(
            'name',
            form.name.trim()
        );

        payload.append(
            'description',
            form.description.trim()
        );

        payload.append(
            'stock',
            String(qty)
        );

        payload.append(
            'status',
            form.status
        );

        payload.append(
            'type',
            classification.type
        );

        if (
            classification.sekpim_item_type
        ) {
            payload.append(
                'sekpim_item_type',
                classification.sekpim_item_type
            );
        }

        // Pertahankan slug produk saat mengedit.
        if (editing && form.slug) {
            payload.append(
                'slug',
                form.slug
            );
        }

        if (imageFile) {
            payload.append(
                'image_file',
                imageFile
            );
        } else if (
            editing &&
            removeImage
        ) {
            payload.append(
                'remove_image',
                '1'
            );
        }

        try {
            setSaving(true);

            showLoadingAlert(
                'Menyimpan Produk',
                'Menyimpan produk beserta gambar ke katalog HUMAS dan SEKPiM.'
            );

            /*
             * Laravel menerima upload edit melalui
             * POST + _method=PUT.
             */

            if (editing) {
                payload.append(
                    '_method',
                    'PUT'
                );
            }

            const response = await api.post(
                editing
                    ? `/products/${id}`
                    : '/products',
                payload
            );

            closeAlert();

            await showSuccessAlert(
                editing
                    ? 'Produk Diperbarui'
                    : 'Produk Ditambahkan',

                response?.data?.message ||
                    'Produk berhasil disimpan.'
            );

            navigate(
                '/admin/products',
                {
                    replace: true,
                }
            );
        } catch (err) {
            closeAlert();

            await showErrorAlert(
                'Gagal Menyimpan Produk',
                getError(err)
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | LOADING DAN ERROR
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                <span className="spinner-border text-success" />

                <p className="text-muted mt-3 mb-0">
                    Memuat formulir produk...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="alert alert-danger mb-3">
                    {error}
                </div>

                <Link
                    className="btn btn-outline-secondary"
                    to="/admin/products"
                >
                    Kembali ke Data Produk
                </Link>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER FORM
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div
                    className="card-body text-white p-4"
                    style={{
                        background:
                            'linear-gradient(115deg,#047857,#0f172a)',
                    }}
                >
                    <Link
                        to="/admin/products"
                        className="text-white text-decoration-none small"
                    >
                        <i className="bi bi-arrow-left me-2" />
                        Kembali ke Data Produk
                    </Link>

                    <h2 className="fw-bold mt-3 mb-1">
                        {editing
                            ? 'Edit Produk'
                            : 'Tambah Produk Baru'}
                    </h2>

                    <p className="mb-0 opacity-75">
                        Satu produk dapat digunakan oleh lebih
                        dari satu layanan HUMAS/SEKPiM.
                    </p>
                </div>
            </div>

            <form onSubmit={saveProduct}>
                <div className="row g-3">
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-3">
                                    Informasi Produk
                                </h5>

                                <div className="row g-3">
                                    <div className="col-md-8">
                                        <label
                                            htmlFor="product-name"
                                            className="form-label fw-semibold"
                                        >
                                            Nama Produk *
                                        </label>

                                        <input
                                            id="product-name"
                                            className="form-control"
                                            required
                                            minLength={3}
                                            maxLength={255}
                                            value={form.name}
                                            onChange={(event) =>
                                                updateField(
                                                    'name',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Contoh: Map Dokumen SEKPiM"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label
                                            htmlFor="product-stock"
                                            className="form-label fw-semibold"
                                        >
                                            Stok *
                                        </label>

                                        <input
                                            id="product-stock"
                                            type="number"
                                            className="form-control"
                                            required
                                            min={0}
                                            step={1}
                                            value={form.stock}
                                            onChange={(event) =>
                                                updateField(
                                                    'stock',
                                                    event.target.value
                                                )
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="product-category"
                                            className="form-label fw-semibold"
                                        >
                                            Kategori *
                                        </label>

                                        <select
                                            id="product-category"
                                            className="form-select"
                                            required
                                            value={form.category_id}
                                            onChange={(event) =>
                                                updateField(
                                                    'category_id',
                                                    event.target.value
                                                )
                                            }
                                            disabled={saving}
                                        >
                                            <option value="">
                                                Pilih kategori
                                            </option>

                                            {categories.map(
                                                (category) => (
                                                    <option
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        {categories.length === 0 && (
                                            <div className="form-text text-danger">
                                                Belum ada kategori yang tersedia.
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="product-status"
                                            className="form-label fw-semibold"
                                        >
                                            Status
                                        </label>

                                        <select
                                            id="product-status"
                                            className="form-select"
                                            value={form.status}
                                            onChange={(event) =>
                                                updateField(
                                                    'status',
                                                    event.target.value
                                                )
                                            }
                                            disabled={saving}
                                        >
                                            <option value="active">
                                                Aktif — tampil di katalog
                                            </option>

                                            <option value="inactive">
                                                Nonaktif — sembunyikan dari katalog
                                            </option>
                                        </select>
                                    </div>

                                    <div className="col-12">
                                        <label
                                            htmlFor="product-description"
                                            className="form-label fw-semibold"
                                        >
                                            Deskripsi
                                        </label>

                                        <textarea
                                            id="product-description"
                                            className="form-control"
                                            rows={4}
                                            maxLength={5000}
                                            value={form.description}
                                            onChange={(event) =>
                                                updateField(
                                                    'description',
                                                    event.target.value
                                                )
                                            }
                                            disabled={saving}
                                            placeholder="Deskripsi atau spesifikasi barang"
                                        />
                                    </div>

                                    {/* UPLOAD FOTO PRODUK */}
                                    <div className="col-12">
                                        <label
                                            htmlFor="product-image-file"
                                            className="form-label fw-semibold"
                                        >
                                            Foto Produk (opsional)
                                        </label>

                                        <div className="border rounded-4 p-3 bg-light">
                                            <div className="row g-3 align-items-center">
                                                <div className="col-12 col-sm-auto">
                                                    {displayedImage ? (
                                                        <img
                                                            src={displayedImage}
                                                            alt={`Preview ${form.name || 'produk'}`}
                                                            className="rounded-3 border bg-white"
                                                            style={{
                                                                height: 124,
                                                                width: 160,
                                                                maxWidth: '100%',
                                                                objectFit: 'contain',
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="d-flex flex-column align-items-center justify-content-center rounded-3 border bg-white text-muted"
                                                            style={{
                                                                height: 124,
                                                                width: 160,
                                                                maxWidth: '100%',
                                                            }}
                                                        >
                                                            <i className="bi bi-image fs-2" />

                                                            <small>
                                                                Belum ada foto
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="col">
                                                    <input
                                                        id="product-image-file"
                                                        type="file"
                                                        className="form-control"
                                                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                                        onChange={changeImage}
                                                        disabled={saving}
                                                    />

                                                    <div className="form-text">
                                                        Upload dari PC/laptop:
                                                        JPG, JPEG, PNG, atau WEBP.
                                                        Maksimal 5 MB.
                                                    </div>

                                                    {imageFile && (
                                                        <div className="small text-success mt-2 text-break">
                                                            <i className="bi bi-check-circle me-2" />

                                                            {imageFile.name}
                                                            {' ('}
                                                            {prettySize(
                                                                imageFile.size
                                                            )}
                                                            {')'}
                                                        </div>
                                                    )}

                                                    <div className="d-flex flex-wrap gap-2 mt-3">
                                                        {imageFile && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                                                onClick={cancelNewImage}
                                                                disabled={saving}
                                                            >
                                                                Batalkan Pilihan
                                                            </button>
                                                        )}

                                                        {existingImage && !removeImage && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger rounded-pill"
                                                                onClick={removeCurrentImage}
                                                                disabled={saving}
                                                            >
                                                                <i className="bi bi-trash me-1" />
                                                                Hapus Foto Lama
                                                            </button>
                                                        )}

                                                        {existingImage && removeImage && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success rounded-pill"
                                                                onClick={() =>
                                                                    setRemoveImage(false)
                                                                }
                                                                disabled={saving}
                                                            >
                                                                Batal Hapus Foto
                                                            </button>
                                                        )}
                                                    </div>

                                                    {editing &&
                                                        !imageFile &&
                                                        !removeImage &&
                                                        existingImage && (
                                                            <div className="small text-muted mt-2">
                                                                Jika tidak memilih foto baru,
                                                                foto lama tetap digunakan.
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PILIH LAYANAN */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-2">
                                    Digunakan untuk Layanan *
                                </h5>

                                <p className="small text-muted">
                                    Pilih satu atau beberapa layanan.
                                    Produk akan otomatis muncul
                                    di katalog yang sesuai.
                                </p>

                                <div className="d-flex flex-column gap-2">
                                    {SERVICE_OPTIONS.map(
                                        (option) => (
                                            <label
                                                key={option.value}
                                                className={`border rounded-3 p-3 d-flex gap-3 align-items-start ${
                                                    form.services.includes(
                                                        option.value
                                                    )
                                                        ? 'border-success bg-success-subtle'
                                                        : ''
                                                }`}
                                                style={{
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input mt-1"
                                                    checked={form.services.includes(
                                                        option.value
                                                    )}
                                                    onChange={(event) =>
                                                        toggleService(
                                                            option.value,
                                                            event.target.checked
                                                        )
                                                    }
                                                    disabled={saving}
                                                />

                                                <span>
                                                    <span className="fw-semibold d-block">
                                                        <i className={`bi ${option.icon} me-2`} />

                                                        {option.label}
                                                    </span>

                                                    <small className="text-muted">
                                                        {option.description}
                                                    </small>
                                                </span>
                                            </label>
                                        )
                                    )}
                                </div>

                                <div className="alert alert-light border small mt-3 mb-0">
                                    <i className="bi bi-info-circle me-2" />

                                    Untuk Request Aset, stok berkurang
                                    setelah serah terima selesai.
                                    Untuk Peminjaman, stok kembali
                                    saat barang dikembalikan.
                                </div>
                            </div>
                        </div>

                        <div className="d-grid gap-2">
                            <button
                                className="btn btn-success rounded-pill py-2 fw-semibold"
                                type="submit"
                                disabled={
                                    saving ||
                                    categories.length === 0
                                }
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-2" />

                                        {editing
                                            ? 'Simpan Perubahan'
                                            : 'Tambah Produk'}
                                    </>
                                )}
                            </button>

                            <Link
                                className="btn btn-light rounded-pill"
                                to="/admin/products"
                            >
                                Batal
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
