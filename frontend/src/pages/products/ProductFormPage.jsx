
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
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

/*
|--------------------------------------------------------------------------
| KONFIGURASI LAYANAN
|--------------------------------------------------------------------------
*/

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
        description:
            'Barang diberikan kepada penerima dan tidak dikembalikan.',
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
const MAX_GALLERY_IMAGES = 8;

const ALLOWED_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
];

const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

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
    error?.message ||
    'Permintaan gagal diproses.';

const prettySize = (bytes) =>
    `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const fileKey = (file) =>
    `${file.name}-${file.size}-${file.lastModified}`;

const isValidImage = (file) => {
    if (!file) return false;

    const extension = file.name
        .split('.')
        .pop()
        ?.toLowerCase();

    return (
        ALLOWED_EXTENSIONS.includes(extension) &&
        (
            !file.type ||
            ALLOWED_TYPES.includes(file.type)
        ) &&
        file.size <= MAX_IMAGE_SIZE
    );
};

/*
|--------------------------------------------------------------------------
| NORMALISASI URL GAMBAR
|--------------------------------------------------------------------------
|
| Mendukung:
| - URL lengkap HTTP/HTTPS
| - /storage/products/...
| - storage/products/...
| - blob URL untuk preview
|
*/

const resolveImageUrl = (value) => {
    if (!value) return '';

    if (/^(https?:|blob:|data:)/i.test(value)) {
        return value;
    }

    try {
        const apiOrigin = new URL(
            api.defaults.baseURL || '/api',
            window.location.origin
        ).origin;

        const path = value.startsWith('/')
            ? value
            : `/${value}`;

        return new URL(path, apiOrigin).href;
    } catch {
        return value;
    }
};

/*
|--------------------------------------------------------------------------
| KONVERSI KLASIFIKASI LAYANAN
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| KOMPONEN PREVIEW FOTO
|--------------------------------------------------------------------------
*/

function ImageThumbnail({
    src,
    label,
    onRemove,
    disabled = false,
    isNew = false,
}) {
    return (
        <div className="product-gallery-thumbnail">
            <div className="product-gallery-image-box">
                <img
                    src={resolveImageUrl(src)}
                    alt={label}
                    loading="lazy"
                />

                <button
                    type="button"
                    className="product-gallery-remove"
                    onClick={onRemove}
                    disabled={disabled}
                    title="Hapus foto"
                    aria-label={`Hapus ${label}`}
                >
                    <i className="bi bi-x-lg" />
                </button>
            </div>

            <small className="d-block text-muted mt-2 text-center">
                {isNew ? 'Foto Baru' : 'Foto Tersimpan'}
            </small>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| HALAMAN FORM PRODUK
|--------------------------------------------------------------------------
*/

export default function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const editing = Boolean(id);

    const mainInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const canManage = useMemo(
        () => hasManagePermission(),
        []
    );

    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    /*
    |--------------------------------------------------------------------------
    | FOTO UTAMA
    |--------------------------------------------------------------------------
    */

    const [imageFile, setImageFile] = useState(null);
    const [existingImage, setExistingImage] = useState('');
    const [removeImage, setRemoveImage] = useState(false);
    const [imagePreview, setImagePreview] = useState('');

    /*
    |--------------------------------------------------------------------------
    | GALERI FOTO TAMBAHAN
    |--------------------------------------------------------------------------
    |
    | existingGallery:
    | Foto yang sudah tersimpan di database.
    |
    | removedGallery:
    | URL foto lama yang dipilih untuk dihapus.
    |
    | galleryFiles:
    | File baru yang dipilih admin.
    |
    | galleryPreviews:
    | Blob URL untuk menampilkan preview.
    |
    */

    const [existingGallery, setExistingGallery] = useState([]);
    const [removedGallery, setRemovedGallery] = useState([]);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);

    /*
    |--------------------------------------------------------------------------
    | PREVIEW FOTO UTAMA
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return undefined;
        }

        const url = URL.createObjectURL(imageFile);

        setImagePreview(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [imageFile]);

    const displayedImage =
        imagePreview ||
        (
            !removeImage
                ? resolveImageUrl(existingImage)
                : ''
        );

    /*
    |--------------------------------------------------------------------------
    | PREVIEW GALERI BARU
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (galleryFiles.length === 0) {
            setGalleryPreviews([]);
            return undefined;
        }

        const urls = galleryFiles.map((file) =>
            URL.createObjectURL(file)
        );

        setGalleryPreviews(urls);

        return () => {
            urls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [galleryFiles]);

    /*
    |--------------------------------------------------------------------------
    | GALERI YANG MASIH AKTIF
    |--------------------------------------------------------------------------
    */

    const activeGallery = useMemo(() => {
        return existingGallery.filter(
            (url) => !removedGallery.includes(url)
        );
    }, [existingGallery, removedGallery]);

    const galleryCount =
        activeGallery.length + galleryFiles.length;

    const remainingSlots =
        Math.max(0, MAX_GALLERY_IMAGES - galleryCount);

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

            const results = await Promise.all(requests);

            setCategories(
                getRows(results[0])
            );

            if (editing) {
                const product = results[1]?.data?.data;

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
                    description: product.description || '',
                    stock: String(product.stock ?? 0),
                    status: product.status || 'active',
                    services: servicesFromProduct(product),
                    slug: product.slug || '',
                });

                setExistingImage(
                    product.image || ''
                );

                setExistingGallery(
                    Array.isArray(product.gallery_images)
                        ? product.gallery_images.filter(
                              (url) =>
                                  typeof url === 'string' &&
                                  url.trim() !== ''
                          )
                        : []
                );

                setImageFile(null);
                setRemoveImage(false);
                setRemovedGallery([]);
                setGalleryFiles([]);
            } else {
                setForm(EMPTY_FORM);
                setExistingImage('');
                setExistingGallery([]);
                setImageFile(null);
                setRemoveImage(false);
                setRemovedGallery([]);
                setGalleryFiles([]);
            }
        } catch (err) {
            console.error(
                'Load product form:',
                err
            );

            setError(getError(err));
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

    /*
    |--------------------------------------------------------------------------
    | FOTO UTAMA
    |--------------------------------------------------------------------------
    */

    const changeImage = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!isValidImage(file)) {
            event.target.value = '';

            await showWarningAlert(
                'Foto Tidak Valid',
                'Gunakan JPG, JPEG, PNG, atau WEBP dengan ukuran maksimal 5 MB.'
            );

            return;
        }

        setImageFile(file);
        setRemoveImage(false);
    };

    const cancelNewImage = () => {
        setImageFile(null);

        if (mainInputRef.current) {
            mainInputRef.current.value = '';
        }
    };

    const removeCurrentImage = () => {
        setImageFile(null);
        setRemoveImage(true);

        if (mainInputRef.current) {
            mainInputRef.current.value = '';
        }
    };

    /*
    |--------------------------------------------------------------------------
    | PILIH BEBERAPA FOTO GALERI
    |--------------------------------------------------------------------------
    */

    const changeGalleryImages = async (event) => {
        const selectedFiles = Array.from(
            event.target.files || []
        );

        // Agar file yang sama bisa dipilih ulang.
        event.target.value = '';

        if (selectedFiles.length === 0) {
            return;
        }

        const invalid = selectedFiles.find(
            (file) => !isValidImage(file)
        );

        if (invalid) {
            await showWarningAlert(
                'Foto Galeri Tidak Valid',
                'Setiap foto harus JPG, JPEG, PNG, atau WEBP dan maksimal 5 MB.'
            );

            return;
        }

        /*
        | Hindari foto yang sama ditambahkan
        | dua kali secara tidak sengaja.
        */

        const knownFiles = new Set(
            galleryFiles.map(fileKey)
        );

        const uniqueFiles = [];

        selectedFiles.forEach((file) => {
            const key = fileKey(file);

            if (!knownFiles.has(key)) {
                knownFiles.add(key);
                uniqueFiles.push(file);
            }
        });

        if (uniqueFiles.length === 0) {
            await showWarningAlert(
                'Foto Sudah Dipilih',
                'Foto tersebut sudah ada dalam daftar upload.'
            );

            return;
        }

        const total =
            activeGallery.length +
            galleryFiles.length +
            uniqueFiles.length;

        if (total > MAX_GALLERY_IMAGES) {
            await showWarningAlert(
                'Batas Foto Galeri',
                `Maksimal ${MAX_GALLERY_IMAGES} foto tambahan. Saat ini tersisa ${remainingSlots} slot foto.`
            );

            return;
        }

        setGalleryFiles((previous) => [
            ...previous,
            ...uniqueFiles,
        ]);
    };

    /*
    |--------------------------------------------------------------------------
    | HAPUS FOTO BARU SEBELUM DISIMPAN
    |--------------------------------------------------------------------------
    */

    const removeNewGalleryImage = (index) => {
        setGalleryFiles((previous) =>
            previous.filter(
                (_, currentIndex) => currentIndex !== index
            )
        );

        if (galleryInputRef.current) {
            galleryInputRef.current.value = '';
        }
    };

    /*
    |--------------------------------------------------------------------------
    | TANDAI FOTO LAMA UNTUK DIHAPUS
    |--------------------------------------------------------------------------
    */

    const removeExistingGalleryImage = (url) => {
        setRemovedGallery((previous) =>
            previous.includes(url)
                ? previous
                : [...previous, url]
        );
    };

    /*
    |--------------------------------------------------------------------------
    | BATALKAN PENGHAPUSAN FOTO LAMA
    |--------------------------------------------------------------------------
    */

    const restoreExistingGalleryImage = (url) => {
        const restoredCount =
            activeGallery.length +
            galleryFiles.length +
            1;

        if (restoredCount > MAX_GALLERY_IMAGES) {
            showWarningAlert(
                'Galeri Sudah Penuh',
                'Hapus foto tambahan lain terlebih dahulu.'
            );

            return;
        }

        setRemovedGallery((previous) =>
            previous.filter((item) => item !== url)
        );
    };

    /*
    |--------------------------------------------------------------------------
    | SIMPAN PRODUK
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

        if (galleryCount > MAX_GALLERY_IMAGES) {
            await showWarningAlert(
                'Foto Terlalu Banyak',
                'Maksimal 8 foto tambahan untuk satu produk.'
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

        if (classification.sekpim_item_type) {
            payload.append(
                'sekpim_item_type',
                classification.sekpim_item_type
            );
        }

        // Pertahankan slug produk saat edit.
        if (editing && form.slug) {
            payload.append(
                'slug',
                form.slug
            );
        }

        /*
        |--------------------------------------------------------------------------
        | FOTO UTAMA
        |--------------------------------------------------------------------------
        */

        if (imageFile) {
            payload.append(
                'image_file',
                imageFile
            );
        } else if (editing && removeImage) {
            payload.append(
                'remove_image',
                '1'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | FOTO GALERI BARU
        |--------------------------------------------------------------------------
        */

        galleryFiles.forEach((file) => {
            payload.append(
                'gallery_files[]',
                file
            );
        });

        /*
        |--------------------------------------------------------------------------
        | FOTO GALERI LAMA YANG DIHAPUS
        |--------------------------------------------------------------------------
        */

        if (editing) {
            removedGallery.forEach((url) => {
                payload.append(
                    'remove_gallery_images[]',
                    url
                );
            });
        }

        try {
            setSaving(true);

            showLoadingAlert(
                'Menyimpan Produk',
                'Menyimpan data produk, foto utama, dan galeri foto.'
            );

            /*
            | Laravel menerima edit dengan:
            | POST + _method=PUT
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

            console.error(
                'Save product:',
                err
            );

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
    | LOADING
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

    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

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
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* HEADER */}

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
                        Kelola informasi, stok, dan galeri foto
                        untuk layanan HUMAS & SEKPiM.
                    </p>
                </div>
            </div>

            <form onSubmit={saveProduct}>
                <div className="row g-3">
                    {/* KOLOM INFORMASI PRODUK */}

                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-3">
                                    Informasi Produk
                                </h5>

                                <div className="row g-3">
                                    {/* NAMA */}

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
                                            placeholder="Contoh: Paket Merchandise VIP"
                                            disabled={saving}
                                        />
                                    </div>

                                    {/* STOK */}

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

                                    {/* KATEGORI */}

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
                                                Belum ada kategori tersedia.
                                            </div>
                                        )}
                                    </div>

                                    {/* STATUS */}

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

                                    {/* DESKRIPSI */}

                                    <div className="col-12">
                                        <label
                                            htmlFor="product-description"
                                            className="form-label fw-semibold"
                                        >
                                            Deskripsi Produk
                                        </label>

                                        <textarea
                                            id="product-description"
                                            className="form-control"
                                            rows={5}
                                            maxLength={5000}
                                            value={form.description}
                                            onChange={(event) =>
                                                updateField(
                                                    'description',
                                                    event.target.value
                                                )
                                            }
                                            disabled={saving}
                                            placeholder="Tuliskan detail paket, isi barang, spesifikasi, kondisi, dan informasi penggunaan..."
                                        />

                                        <small className="text-muted">
                                            Deskripsi ini akan ditampilkan
                                            secara lengkap saat user membuka
                                            Detail Barang.
                                        </small>
                                    </div>

                                    {/* FOTO UTAMA */}

                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
                                            <label
                                                htmlFor="product-image-file"
                                                className="form-label fw-semibold mb-0"
                                            >
                                                Foto Utama Produk
                                            </label>

                                            <span className="badge text-bg-light border rounded-pill">
                                                Opsional
                                            </span>
                                        </div>

                                        <div className="border rounded-4 p-3 bg-light">
                                            <div className="row g-3 align-items-center">
                                                <div className="col-12 col-sm-auto">
                                                    {displayedImage ? (
                                                        <img
                                                            src={displayedImage}
                                                            alt={`Foto utama ${form.name || 'produk'}`}
                                                            className="rounded-3 border bg-white"
                                                            style={{
                                                                width: 160,
                                                                height: 140,
                                                                maxWidth: '100%',
                                                                objectFit: 'contain',
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="d-flex flex-column align-items-center justify-content-center rounded-3 border bg-white text-muted"
                                                            style={{
                                                                width: 160,
                                                                height: 140,
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
                                                        ref={mainInputRef}
                                                        type="file"
                                                        className="form-control"
                                                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                                        onChange={changeImage}
                                                        disabled={saving}
                                                    />

                                                    <div className="form-text">
                                                        JPG, JPEG, PNG,
                                                        atau WEBP.
                                                        Maksimal 5 MB.
                                                    </div>

                                                    {imageFile && (
                                                        <div className="small text-success mt-2 text-break">
                                                            <i className="bi bi-check-circle me-2" />

                                                            {imageFile.name}
                                                            {' ('}
                                                            {prettySize(imageFile.size)}
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

                                                        {existingImage &&
                                                            !removeImage && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                                    onClick={removeCurrentImage}
                                                                    disabled={saving}
                                                                >
                                                                    <i className="bi bi-trash me-1" />
                                                                    Hapus Foto Utama
                                                                </button>
                                                            )}

                                                        {existingImage &&
                                                            removeImage && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-success rounded-pill"
                                                                    onClick={() =>
                                                                        setRemoveImage(false)
                                                                    }
                                                                    disabled={saving}
                                                                >
                                                                    Batalkan Hapus
                                                                </button>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GALERI FOTO TAMBAHAN */}

                                    <div className="col-12">
                                        <div className="product-gallery-panel">
                                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                                <div>
                                                    <h6 className="fw-bold mb-1">
                                                        <i className="bi bi-images me-2 text-success" />
                                                        Galeri Foto Tambahan
                                                    </h6>

                                                    <p className="small text-muted mb-0">
                                                        Tambahkan beberapa sudut
                                                        gambar barang agar user
                                                        dapat menggeser foto
                                                        ketika melihat detail.
                                                    </p>
                                                </div>

                                                <span
                                                    className={`badge rounded-pill px-3 py-2 ${
                                                        galleryCount >= MAX_GALLERY_IMAGES
                                                            ? 'text-bg-success'
                                                            : 'text-bg-light border'
                                                    }`}
                                                >
                                                    {galleryCount} / {MAX_GALLERY_IMAGES} Foto
                                                </span>
                                            </div>

                                            {/* FILE INPUT */}

                                            <div className="mb-3">
                                                <label
                                                    htmlFor="product-gallery-files"
                                                    className="form-label small fw-semibold"
                                                >
                                                    Pilih Foto Tambahan
                                                </label>

                                                <input
                                                    id="product-gallery-files"
                                                    ref={galleryInputRef}
                                                    type="file"
                                                    className="form-control"
                                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                                    multiple
                                                    onChange={changeGalleryImages}
                                                    disabled={
                                                        saving ||
                                                        remainingSlots === 0
                                                    }
                                                />

                                                <div className="form-text">
                                                    Bisa memilih beberapa foto
                                                    sekaligus. Maksimal 8 foto
                                                    tambahan, masing-masing 5 MB.
                                                </div>
                                            </div>

                                            {/* STATUS GALERI */}

                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="product-gallery-info">
                                                    <i className="bi bi-check2-circle text-success" />
                                                    {activeGallery.length} tersimpan
                                                </span>

                                                <span className="product-gallery-info">
                                                    <i className="bi bi-cloud-arrow-up text-primary" />
                                                    {galleryFiles.length} baru
                                                </span>

                                                <span className="product-gallery-info">
                                                    <i className="bi bi-plus-circle text-secondary" />
                                                    {remainingSlots} slot tersisa
                                                </span>
                                            </div>

                                            {/* GALERI KOSONG */}

                                            {galleryCount === 0 && (
                                                <div className="product-gallery-empty">
                                                    <i className="bi bi-images fs-1 text-muted" />

                                                    <div className="fw-semibold mt-2">
                                                        Belum Ada Foto Tambahan
                                                    </div>

                                                    <p className="small text-muted mb-0">
                                                        Upload beberapa foto
                                                        untuk melengkapi detail
                                                        barang pada katalog.
                                                    </p>
                                                </div>
                                            )}

                                            {/* FOTO YANG SUDAH TERSIMPAN */}

                                            {activeGallery.length > 0 && (
                                                <div className="mb-3">
                                                    <div className="small fw-semibold mb-2">
                                                        Foto Tersimpan
                                                    </div>

                                                    <div className="product-gallery-grid">
                                                        {activeGallery.map(
                                                            (url, index) => (
                                                                <ImageThumbnail
                                                                    key={url}
                                                                    src={url}
                                                                    label={`Foto tersimpan ${index + 1}`}
                                                                    onRemove={() =>
                                                                        removeExistingGalleryImage(url)
                                                                    }
                                                                    disabled={saving}
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* FOTO BARU */}

                                            {galleryFiles.length > 0 && (
                                                <div className="mb-3">
                                                    <div className="small fw-semibold mb-2">
                                                        Foto Baru yang Akan Diunggah
                                                    </div>

                                                    <div className="product-gallery-grid">
                                                        {galleryFiles.map(
                                                            (file, index) => (
                                                                <ImageThumbnail
                                                                    key={fileKey(file)}
                                                                    src={
                                                                        galleryPreviews[index] || ''
                                                                    }
                                                                    label={`Foto baru ${index + 1}`}
                                                                    isNew
                                                                    onRemove={() =>
                                                                        removeNewGalleryImage(index)
                                                                    }
                                                                    disabled={saving}
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* BATALKAN HAPUS FOTO LAMA */}

                                            {removedGallery.length > 0 && (
                                                <div className="alert alert-warning border-0 rounded-4 mb-0">
                                                    <div className="fw-semibold small mb-2">
                                                        <i className="bi bi-exclamation-circle me-2" />
                                                        {removedGallery.length} foto ditandai untuk dihapus
                                                    </div>

                                                    <p className="small mb-2">
                                                        Foto akan benar-benar
                                                        dihapus setelah kamu
                                                        menyimpan perubahan.
                                                    </p>

                                                    <div className="d-flex flex-wrap gap-2">
                                                        {removedGallery.map(
                                                            (url, index) => (
                                                                <button
                                                                    key={url}
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-dark rounded-pill"
                                                                    onClick={() =>
                                                                        restoreExistingGalleryImage(url)
                                                                    }
                                                                    disabled={saving}
                                                                >
                                                                    <i className="bi bi-arrow-counterclockwise me-1" />
                                                                    Pulihkan Foto {index + 1}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KOLOM PILIHAN LAYANAN */}

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
                                    {SERVICE_OPTIONS.map((option) => (
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
                                    ))}
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

                        {/* RINGKASAN FOTO */}

                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <h6 className="fw-bold mb-3">
                                    <i className="bi bi-card-image me-2 text-success" />
                                    Ringkasan Gambar
                                </h6>

                                <div className="d-flex justify-content-between small mb-2">
                                    <span className="text-muted">
                                        Foto utama
                                    </span>

                                    <strong>
                                        {displayedImage
                                            ? 'Tersedia'
                                            : 'Belum ada'}
                                    </strong>
                                </div>

                                <div className="d-flex justify-content-between small mb-2">
                                    <span className="text-muted">
                                        Foto tambahan
                                    </span>

                                    <strong>
                                        {galleryCount}
                                    </strong>
                                </div>

                                <div className="d-flex justify-content-between small">
                                    <span className="text-muted">
                                        Total gambar
                                    </span>

                                    <strong>
                                        {galleryCount +
                                            (displayedImage ? 1 : 0)}
                                    </strong>
                                </div>

                                <div className="small text-muted mt-3">
                                    Foto utama akan menjadi gambar
                                    pertama pada galeri detail barang.
                                    Foto tambahan dapat digeser oleh user.
                                </div>
                            </div>
                        </div>

                        {/* SIMPAN */}

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

            {/* CSS KHUSUS GALERI */}

            <style>{`
                .product-gallery-panel {
                    padding: 20px;
                    border: 1px solid #dbe5e1;
                    border-radius: 18px;
                    background: linear-gradient(
                        145deg,
                        #f8fffb,
                        #f8fafc
                    );
                }

                .product-gallery-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(auto-fill, minmax(100px, 1fr));
                    gap: 14px;
                }

                .product-gallery-thumbnail {
                    min-width: 0;
                }

                .product-gallery-image-box {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1 / 1;
                    border-radius: 13px;
                    overflow: visible;
                }

                .product-gallery-image-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 13px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                }

                .product-gallery-remove {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 27px;
                    height: 27px;
                    border: 0;
                    border-radius: 50%;
                    background: #dc2626;
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 12px;
                    box-shadow: 0 3px 8px rgba(0,0,0,.15);
                    cursor: pointer;
                }

                .product-gallery-remove:hover {
                    background: #991b1b;
                }

                .product-gallery-remove:disabled {
                    opacity: .5;
                    cursor: not-allowed;
                }

                .product-gallery-info {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 999px;
                    font-size: 12px;
                    color: #475569;
                    font-weight: 600;
                }

                .product-gallery-empty {
                    padding: 32px 16px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 15px;
                    text-align: center;
                    background: #fff;
                }

                @media (max-width: 576px) {
                    .product-gallery-panel {
                        padding: 14px;
                    }

                    .product-gallery-grid {
                        grid-template-columns:
                            repeat(3, minmax(0, 1fr));
                        gap: 10px;
                    }

                    .product-gallery-image-box {
                        border-radius: 10px;
                    }
                }
            `}</style>
        </div>
    );
}
