
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import ProductDetailModal from '../../components/ProductDetailModal';
import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const BORROW = 'borrow';
const ASSET = 'asset_request';
const ACTIVE_STATUSES = ['pending', 'approved', 'borrowed'];

const SERVICE_KEYS = {
    [BORROW]: 'sekpim_borrow',
    [ASSET]: 'sekpim_asset_request',
};

const EMPTY_FORM = {
    request_type: BORROW,
    pic_name: '',
    pic_phone: '',
    purpose: '',
    activity_date: '',
    borrow_date: '',
    return_date: '',
};

function rows(response) {
    const value = response?.data?.data;

    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;

    return [];
}

function errorMessage(error) {
    return Object.values(
        error?.response?.data?.errors || {}
    ).flat().find(Boolean)
        || error?.response?.data?.message
        || error?.message
        || 'Permintaan gagal diproses.';
}

function localDate(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDate(value) {
    if (!value) return '-';

    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(
            ...value.split('-').map(
                (part, index) =>
                    Number(part) - (index === 1 ? 1 : 0)
            )
        )
        : new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
}

function photoUrl(value) {
    if (
        typeof value !== 'string' ||
        !value.trim()
    ) {
        return '';
    }

    const source = value.trim();

    if (/^https?:\/\//i.test(source)) {
        return source;
    }

    if (/^(data:|blob:|javascript:|\/\/)/i.test(source)) {
        return '';
    }

    try {
        const apiOrigin = new URL(
            api.defaults.baseURL || '/api',
            window.location.origin
        ).origin;

        const clean = source.replace(/^\/+/, '');

        const path = /^(storage|uploads)\//i.test(clean)
            ? clean
            : /^(products|product-images)\//i.test(clean)
                ? `storage/${clean}`
                : clean;

        return new URL(
            `/${path}`,
            apiOrigin
        ).href;
    } catch {
        return '';
    }
}

function galleryCount(product) {
    let gallery = product?.gallery_images;

    if (typeof gallery === 'string') {
        try {
            gallery = JSON.parse(gallery);
        } catch {
            gallery = [];
        }
    }

    const photos = [
        product?.image,
        ...(Array.isArray(gallery) ? gallery : []),
    ];

    return [
        ...new Set(photos.filter(Boolean)),
    ].length;
}

function isProductFor(product, type) {
    if (product?.status !== 'active') {
        return false;
    }

    const sekpimType =
        product.sekpim_item_type
        || (
            ['borrow', 'both'].includes(product.type)
                ? BORROW
                : ''
        );

    return type === BORROW
        ? ['borrow', 'both'].includes(sekpimType)
        : ['asset_request', 'both'].includes(sekpimType);
}

/*
|--------------------------------------------------------------------------
| KARTU BARANG SEKPiM
|--------------------------------------------------------------------------
*/

function ProductCard({
    product,
    mode,
    quantity,
    onOpen,
    onAdd,
    onDecrease,
}) {
    const [imageError, setImageError] = useState(false);

    const cover = photoUrl(product.image);

    const stock = Math.max(
        0,
        Number(product.stock) || 0
    );

    const isBorrow = mode === BORROW;

    useEffect(() => {
        setImageError(false);
    }, [cover]);

    return (
        <article
            className={`sk-card ${
                isBorrow
                    ? 'sk-card-borrow'
                    : 'sk-card-asset'
            }`}
        >
            {/* FOTO BARANG */}

            <button
                type="button"
                className="sk-cover"
                onClick={() => onOpen(product)}
                aria-label={`Lihat foto dan detail ${product.name}`}
            >
                {cover && !imageError ? (
                    <img
                        src={cover}
                        alt={product.name}
                        loading="lazy"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <span className="sk-no-photo">
                        <i className="bi bi-box-seam" />
                        Belum ada foto
                    </span>
                )}

                <span className="sk-photo-count">
                    <i className="bi bi-images me-1" />
                    {galleryCount(product)} foto
                </span>

                <span className="sk-cover-detail">
                    <i className="bi bi-eye me-1" />
                    Lihat detail
                </span>
            </button>

            {/* DETAIL KARTU */}

            <div className="sk-card-body">
                <div className="sk-card-tags">
                    <span className="sk-category">
                        {product.category?.name ||
                            'Barang SEKPiM'}
                    </span>

                    <span
                        className={
                            stock
                                ? 'sk-stock-ok'
                                : 'sk-stock-empty'
                        }
                    >
                        {stock ? 'Tersedia' : 'Habis'}
                    </span>
                </div>

                <button
                    type="button"
                    className="sk-title"
                    onClick={() => onOpen(product)}
                    title={product.name}
                >
                    {product.name}
                </button>

                <p className="sk-description">
                    {product.description ||
                        'Belum ada deskripsi barang.'}
                </p>

                <button
                    type="button"
                    className="sk-detail"
                    onClick={() => onOpen(product)}
                >
                    Lihat detail & galeri
                    <i className="bi bi-arrow-up-right" />
                </button>

                {/* STOK DAN KERANJANG */}

                <div className="sk-card-bottom">
                    <div className="sk-stock">
                        <span>
                            <i className="bi bi-box-seam me-1" />
                            Stok tersedia
                        </span>

                        <strong>
                            {stock.toLocaleString('id-ID')}
                        </strong>
                    </div>

                    {quantity > 0 ? (
                        <div className="sk-qty">
                            <button
                                type="button"
                                aria-label={`Kurangi ${product.name}`}
                                onClick={() =>
                                    onDecrease(product.id)
                                }
                            >
                                <i className="bi bi-dash-lg" />
                            </button>

                            <strong aria-live="polite">
                                {quantity}
                            </strong>

                            <button
                                type="button"
                                aria-label={`Tambah ${product.name}`}
                                onClick={() => onAdd(product)}
                            >
                                <i className="bi bi-plus-lg" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="sk-add"
                            disabled={!stock}
                            onClick={() => onAdd(product)}
                        >
                            <i className="bi bi-cart-plus me-2" />

                            {stock
                                ? 'Tambah ke Keranjang'
                                : 'Stok Habis'}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| HALAMAN PEMINJAMAN DAN REQUEST BARANG SEKPiM
|--------------------------------------------------------------------------
*/

export default function SekpimBorrowingRequestPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [search, setSearch] = useState('');

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [activeBorrow, setActiveBorrow] =
        useState(null);

    const [checkingBorrow, setCheckingBorrow] =
        useState(true);

    const [settingLoading, setSettingLoading] =
        useState(true);

    const [settingError, setSettingError] =
        useState('');

    const [settings, setSettings] = useState({});

    const type = form.request_type;
    const isBorrow = type === BORROW;
    const theme = isBorrow ? 'success' : 'primary';
    const today = localDate();

    const currentSetting =
        settings[SERVICE_KEYS[type]] || {};

    const minimumDays = Number(
        currentSetting.min_submission_days ?? 4
    );

    const minimumDate =
        currentSetting.minimum_date || '';

    const serviceName = isBorrow
        ? 'Peminjaman Barang SEKPiM'
        : 'Request Barang SEKPiM';

    /*
    |--------------------------------------------------------------------------
    | AMBIL PRODUK
    |--------------------------------------------------------------------------
    */

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);

            const result = await api.get('/products');

            setProducts(rows(result));
        } catch (error) {
            setProducts([]);

            await showErrorAlert(
                'Gagal Memuat Barang',
                errorMessage(error)
            );
        } finally {
            setLoading(false);
        }
    }, []);

    /*
    |--------------------------------------------------------------------------
    | AMBIL PENGATURAN H-N
    |--------------------------------------------------------------------------
    */

    const fetchSettings = useCallback(async () => {
        try {
            setSettingLoading(true);
            setSettingError('');

            const result = await api.get(
                '/humas-settings'
            );

            const all =
                result?.data?.data?.submission_settings || {};

            if (
                !all.sekpim_borrow ||
                !all.sekpim_asset_request
            ) {
                throw new Error(
                    'Pengaturan batas pengajuan SEKPiM belum lengkap.'
                );
            }

            setSettings(all);
        } catch (error) {
            setSettingError(errorMessage(error));
        } finally {
            setSettingLoading(false);
        }
    }, []);

    /*
    |--------------------------------------------------------------------------
    | CEK PEMINJAMAN AKTIF
    |--------------------------------------------------------------------------
    */

    const fetchActiveBorrow = useCallback(async () => {
        try {
            setCheckingBorrow(true);

            const result = await api.get(
                '/my-borrow-requests'
            );

            const found = rows(result).find(
                (item) =>
                    (item.request_type || BORROW) === BORROW &&
                    ACTIVE_STATUSES.includes(item.status)
            ) || null;

            setActiveBorrow(found);

            if (found) {
                setForm((old) => ({
                    ...old,
                    request_type: ASSET,
                    activity_date: '',
                    borrow_date: '',
                    return_date: '',
                }));

                setCart([]);
                setSelectedProduct(null);
            }
        } catch (error) {
            console.error(
                'Gagal mengecek peminjaman aktif:',
                error
            );
        } finally {
            setCheckingBorrow(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetchSettings();
        fetchActiveBorrow();
    }, [
        fetchProducts,
        fetchSettings,
        fetchActiveBorrow,
    ]);

    /*
    |--------------------------------------------------------------------------
    | FILTER BARANG SESUAI LAYANAN
    |--------------------------------------------------------------------------
    */

    const availableProducts = useMemo(
        () =>
            products.filter(
                (product) =>
                    isProductFor(product, type)
            ),
        [products, type]
    );

    /*
    |--------------------------------------------------------------------------
    | PENCARIAN
    |--------------------------------------------------------------------------
    */

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        return availableProducts.filter(
            (product) =>
                !term ||
                [
                    product.name,
                    product.description,
                    product.category?.name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(term)
        );
    }, [availableProducts, search]);

    /*
    |--------------------------------------------------------------------------
    | DATA KERANJANG
    |--------------------------------------------------------------------------
    */

    const selectedItems = useMemo(
        () =>
            cart
                .map((item) => ({
                    ...item,

                    product: availableProducts.find(
                        (product) =>
                            Number(product.id) ===
                            Number(item.product_id)
                    ),
                }))
                .filter((item) => item.product),

        [cart, availableProducts]
    );

    const totalQty = selectedItems.reduce(
        (sum, item) =>
            sum + item.quantity,
        0
    );

    /*
    |--------------------------------------------------------------------------
    | GANTI JENIS LAYANAN
    |--------------------------------------------------------------------------
    */

    async function changeType(next) {
        if (
            next === BORROW &&
            activeBorrow
        ) {
            await showWarningAlert(
                'Peminjaman Masih Aktif',
                'Selesaikan atau kembalikan barang dari peminjaman sebelumnya terlebih dahulu.'
            );

            return;
        }

        if (next === type) return;

        setForm((old) => ({
            ...old,
            request_type: next,
            activity_date: '',
            borrow_date: '',
            return_date: '',
        }));

        setCart([]);
        setSearch('');
        setSelectedProduct(null);
    }

    /*
    |--------------------------------------------------------------------------
    | TAMBAHKAN BARANG
    |--------------------------------------------------------------------------
    */

    async function addToCart(product) {
        if (submitting) return false;

        const stock = Math.max(
            0,
            Number(product.stock) || 0
        );

        const previous = cart.find(
            (item) =>
                Number(item.product_id) ===
                Number(product.id)
        );

        if (!stock) {
            await showWarningAlert(
                'Stok Habis',
                'Barang ini tidak memiliki stok tersedia.'
            );

            return false;
        }

        if (
            previous &&
            previous.quantity >= stock
        ) {
            await showWarningAlert(
                'Stok Tidak Cukup',
                `Stok ${product.name} hanya ${stock} unit.`
            );

            return false;
        }

        setCart((old) => {
            const found = old.find(
                (item) =>
                    Number(item.product_id) ===
                    Number(product.id)
            );

            return found
                ? old.map((item) =>
                    Number(item.product_id) ===
                    Number(product.id)
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                        }
                        : item
                )
                : [
                    ...old,
                    {
                        product_id: product.id,
                        quantity: 1,
                    },
                ];
        });

        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | KURANGI JUMLAH
    |--------------------------------------------------------------------------
    */

    function decrease(productId) {
        setCart((old) =>
            old
                .map((item) =>
                    Number(item.product_id) ===
                    Number(productId)
                        ? {
                            ...item,
                            quantity: item.quantity - 1,
                        }
                        : item
                )
                .filter((item) =>
                    item.quantity > 0
                )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | HAPUS DARI KERANJANG
    |--------------------------------------------------------------------------
    */

    function removeItem(productId) {
        setCart((old) =>
            old.filter(
                (item) =>
                    Number(item.product_id) !==
                    Number(productId)
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PERUBAHAN FORM
    |--------------------------------------------------------------------------
    */

    function changeForm(event) {
        const { name, value } = event.target;

        setForm((old) => {
            const next = {
                ...old,

                [name]:
                    name === 'pic_phone'
                        ? value.replace(
                            /[^0-9+\-\s().]/g,
                            ''
                        )
                        : value,
            };

            if (
                name === 'activity_date' &&
                old.borrow_date &&
                old.borrow_date > value
            ) {
                next.borrow_date = '';
                next.return_date = '';
            }

            if (
                name === 'borrow_date' &&
                old.return_date &&
                old.return_date < value
            ) {
                next.return_date = '';
            }

            return next;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI FORM
    |--------------------------------------------------------------------------
    */

    async function validate() {
        const warning = async (title, message) => {
            await showWarningAlert(title, message);
            return false;
        };

        if (settingLoading || settingError) {
            return warning(
                'Aturan Belum Siap',
                'Pengaturan H-n belum berhasil dimuat.'
            );
        }

        if (isBorrow && activeBorrow) {
            return warning(
                'Peminjaman Masih Aktif',
                'Selesaikan peminjaman sebelumnya.'
            );
        }

        if (!selectedItems.length) {
            return warning(
                'Keranjang Kosong',
                'Tambahkan minimal satu barang.'
            );
        }

        if (form.pic_name.trim().length < 3) {
            return warning(
                'Nama PIC',
                'Nama PIC minimal 3 karakter.'
            );
        }

        if (form.pic_phone.trim().length < 8) {
            return warning(
                'Nomor PIC',
                'Nomor PIC minimal 8 karakter.'
            );
        }

        if (form.purpose.trim().length < 5) {
            return warning(
                'Keperluan',
                'Keperluan minimal 5 karakter.'
            );
        }

        if (!form.activity_date) {
            return warning(
                'Tanggal Kegiatan',
                'Tanggal kegiatan wajib diisi.'
            );
        }

        if (
            minimumDate &&
            form.activity_date < minimumDate
        ) {
            return warning(
                'Pengajuan Terlalu Dekat',
                `Pengajuan minimal H-${minimumDays}; tanggal paling cepat ${formatDate(minimumDate)}.`
            );
        }

        if (
            !form.borrow_date ||
            form.borrow_date < today
        ) {
            return warning(
                'Tanggal Pengambilan',
                'Tanggal pengambilan tidak boleh sebelum hari ini.'
            );
        }

        if (
            form.borrow_date >
            form.activity_date
        ) {
            return warning(
                'Tanggal Pengambilan',
                'Tanggal pengambilan tidak boleh setelah tanggal kegiatan.'
            );
        }

        if (
            isBorrow &&
            !form.return_date
        ) {
            return warning(
                'Tanggal Pengembalian',
                'Tanggal pengembalian wajib diisi.'
            );
        }

        if (
            isBorrow &&
            form.return_date < form.borrow_date
        ) {
            return warning(
                'Tanggal Pengembalian',
                'Tanggal pengembalian tidak boleh sebelum pengambilan.'
            );
        }

        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | KIRIM PENGAJUAN
    |--------------------------------------------------------------------------
    */

    async function submit(event) {
        event.preventDefault();

        if (
            submitting ||
            checkingBorrow ||
            !(await validate())
        ) {
            return;
        }

        try {
            setSubmitting(true);

            showLoadingAlert(
                'Mengirim Pengajuan',
                'Sedang memproses permintaan barang...'
            );

            const payload = {
                request_type: type,
                pic_name: form.pic_name.trim(),
                pic_phone: form.pic_phone.trim(),
                purpose: form.purpose.trim(),
                activity_date: form.activity_date,
                borrow_date: form.borrow_date,

                return_date:
                    isBorrow
                        ? form.return_date
                        : null,

                items: selectedItems.map(
                    (item) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                    })
                ),
            };

            const response = await api.post(
                '/borrow-requests',
                payload
            );

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Berhasil',
                response?.data?.message ||
                    'Pengajuan berhasil dikirim.'
            );

            setCart([]);
            setSearch('');
            setSelectedProduct(null);

            setForm({
                ...EMPTY_FORM,

                request_type:
                    activeBorrow
                        ? ASSET
                        : BORROW,
            });

            await Promise.all([
                fetchProducts(),
                fetchActiveBorrow(),
                fetchSettings(),
            ]);
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Pengajuan Gagal',
                errorMessage(error)
            );

            await Promise.all([
                fetchActiveBorrow(),
                fetchSettings(),
            ]);
        } finally {
            setSubmitting(false);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RESET
    |--------------------------------------------------------------------------
    */

    function reset() {
        setForm({
            ...EMPTY_FORM,

            request_type:
                activeBorrow
                    ? ASSET
                    : type,
        });

        setCart([]);
        setSearch('');
        setSelectedProduct(null);
    }

    /*
    |--------------------------------------------------------------------------
    | TAMPILAN
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* ERROR PENGATURAN */}

            {settingError && (
                <div className="alert alert-danger rounded-4 d-flex justify-content-between align-items-center gap-3">
                    <span>
                        Aturan pengajuan gagal dimuat:
                        {' '}{settingError}
                    </span>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={fetchSettings}
                    >
                        Muat Ulang
                    </button>
                </div>
            )}

            {/* PERINGATAN PEMINJAMAN AKTIF */}

            {activeBorrow && (
                <div className="alert alert-warning rounded-4">
                    <i className="bi bi-exclamation-triangle-fill me-2" />

                    Masih ada peminjaman aktif
                    {' '}(
                    {activeBorrow.borrow_code ||
                        `#${activeBorrow.id}`}
                    , status: {activeBorrow.status}).
                    Peminjaman baru terkunci sampai selesai,
                    tetapi Request Barang tetap bisa digunakan.
                </div>
            )}

            {/* HEADER */}

            <div
                className="rounded-4 shadow-sm p-4 p-lg-5 text-white mb-4"
                style={{
                    background:
                        'linear-gradient(125deg, #047857, #0f172a)',
                }}
            >
                <span className="badge bg-white text-success rounded-pill mb-3">
                    Layanan SEKPiM
                </span>

                <h2 className="fw-bold mb-2">
                    Peminjaman dan Request Barang
                </h2>

                <p className="mb-0 opacity-75">
                    Pilih jenis layanan, lihat detail dan foto barang,
                    kemudian kirim pengajuan.
                </p>
            </div>

            {/* PILIH JENIS LAYANAN */}

            <div className="row g-3 mb-4">
                {[
                    {
                        value: BORROW,
                        label: 'Peminjaman Barang',
                        subtitle: 'Barang wajib dikembalikan',
                        icon: 'bi-box-arrow-up-right',
                    },
                    {
                        value: ASSET,
                        label: 'Request Barang',
                        subtitle: 'Barang tidak dikembalikan',
                        icon: 'bi-box2-heart',
                    },
                ].map((option) => (
                    <div
                        className="col-md-6"
                        key={option.value}
                    >
                        <button
                            type="button"
                            onClick={() =>
                                changeType(option.value)
                            }
                            disabled={
                                submitting ||
                                checkingBorrow
                            }
                            className={`sk-option w-100 text-start ${
                                type === option.value
                                    ? 'sk-option-active'
                                    : ''
                            }`}
                        >
                            <span className="sk-option-icon">
                                <i className={`bi ${option.icon}`} />
                            </span>

                            <span className="flex-grow-1">
                                <strong className="d-block">
                                    {option.label}
                                </strong>

                                <small className="text-muted">
                                    {option.subtitle}
                                </small>
                            </span>

                            {option.value === BORROW &&
                                activeBorrow && (
                                    <span className="badge text-bg-warning">
                                        Terkunci
                                    </span>
                                )}

                            {type === option.value && (
                                <i className="bi bi-check-circle-fill text-success" />
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* KATALOG DAN FORM */}

            <div className="row g-4">
                {/* KATALOG */}

                <div className="col-xl-8">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-body p-3 p-lg-4">
                            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                                <div>
                                    <h3 className="h5 fw-bold mb-1">
                                        Katalog{' '}
                                        {isBorrow
                                            ? 'Peminjaman'
                                            : 'Request Barang'}
                                    </h3>

                                    <span className="small text-muted">
                                        {availableProducts.length}
                                        {' '}barang tersedia di katalog
                                    </span>
                                </div>

                                <input
                                    type="search"
                                    className="form-control"
                                    style={{
                                        maxWidth: 330,
                                    }}
                                    placeholder="Cari nama, kategori, atau deskripsi..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    aria-label="Cari barang SEKPiM"
                                />
                            </div>
                        </div>
                    </div>

                    {/* DAFTAR BARANG */}

                    {loading ? (
                        <div className="card border-0 rounded-4 shadow-sm p-5 text-center">
                            <div className="spinner-border text-success mx-auto" />

                            <p className="mt-3 mb-0">
                                Memuat barang...
                            </p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="card border-0 rounded-4 shadow-sm p-5 text-center text-muted">
                            <i className="bi bi-inbox fs-1" />

                            <p className="mt-2 mb-0">
                                Barang tidak ditemukan.
                            </p>
                        </div>
                    ) : (
                        <div className="row g-3">
                            {filteredProducts.map(
                                (product) => (
                                    <div
                                        className="col-12 col-md-6 col-xxl-4"
                                        key={product.id}
                                    >
                                        <ProductCard
                                            product={product}
                                            mode={type}
                                            quantity={
                                                cart.find(
                                                    (item) =>
                                                        Number(item.product_id) ===
                                                        Number(product.id)
                                                )?.quantity || 0
                                            }
                                            onOpen={setSelectedProduct}
                                            onAdd={addToCart}
                                            onDecrease={decrease}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* SIDEBAR FORM */}

                <div className="col-xl-4">
                    <div className="sk-side">
                        {/* KERANJANG */}

                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h3 className="h5 fw-bold mb-0">
                                        Keranjang
                                    </h3>

                                    <span className={`badge text-bg-${theme}`}>
                                        {totalQty} item
                                    </span>
                                </div>

                                {!selectedItems.length ? (
                                    <div className="bg-light rounded-4 p-4 text-center text-muted">
                                        Belum ada barang dipilih.
                                    </div>
                                ) : (
                                    selectedItems.map(
                                        (item) => (
                                            <div
                                                className="sk-cart-item"
                                                key={item.product_id}
                                            >
                                                <div className="flex-grow-1">
                                                    <strong className="d-block">
                                                        {item.product.name}
                                                    </strong>

                                                    <small className="text-muted">
                                                        Jumlah: {item.quantity}
                                                    </small>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                    onClick={() =>
                                                        removeItem(
                                                            item.product_id
                                                        )
                                                    }
                                                    aria-label={`Hapus ${item.product.name}`}
                                                >
                                                    <i className="bi bi-trash" />
                                                </button>
                                            </div>
                                        )
                                    )
                                )}
                            </div>
                        </div>

                        {/* FORM PENGAJUAN */}

                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h3 className="h5 fw-bold">
                                    Form {serviceName}
                                </h3>

                                <p className="small text-muted">
                                    {settingLoading
                                        ? 'Memuat ketentuan...'
                                        : `Pengajuan minimal H-${minimumDays}, tanggal tercepat ${formatDate(minimumDate)}.`}
                                </p>

                                <form onSubmit={submit}>
                                    <div className="mb-3">
                                        <label
                                            className="form-label fw-semibold"
                                            htmlFor="sk-pic"
                                        >
                                            Nama PIC *
                                        </label>

                                        <input
                                            id="sk-pic"
                                            name="pic_name"
                                            className="form-control rounded-3"
                                            required
                                            minLength={3}
                                            value={form.pic_name}
                                            onChange={changeForm}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            className="form-label fw-semibold"
                                            htmlFor="sk-phone"
                                        >
                                            Nomor PIC *
                                        </label>

                                        <input
                                            id="sk-phone"
                                            name="pic_phone"
                                            type="tel"
                                            className="form-control rounded-3"
                                            required
                                            minLength={8}
                                            value={form.pic_phone}
                                            onChange={changeForm}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            className="form-label fw-semibold"
                                            htmlFor="sk-activity"
                                        >
                                            Tanggal Kegiatan *
                                        </label>

                                        <input
                                            id="sk-activity"
                                            name="activity_date"
                                            type="date"
                                            className="form-control rounded-3"
                                            required
                                            min={minimumDate || today}
                                            disabled={
                                                settingLoading ||
                                                Boolean(settingError)
                                            }
                                            value={form.activity_date}
                                            onChange={changeForm}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label
                                            className="form-label fw-semibold"
                                            htmlFor="sk-borrow"
                                        >
                                            Tanggal Pengambilan *
                                        </label>

                                        <input
                                            id="sk-borrow"
                                            name="borrow_date"
                                            type="date"
                                            className="form-control rounded-3"
                                            required
                                            min={today}
                                            max={
                                                form.activity_date ||
                                                undefined
                                            }
                                            value={form.borrow_date}
                                            onChange={changeForm}
                                        />
                                    </div>

                                    {/* PENGEMBALIAN KHUSUS PEMINJAMAN */}

                                    {isBorrow && (
                                        <div className="mb-3">
                                            <label
                                                className="form-label fw-semibold"
                                                htmlFor="sk-return"
                                            >
                                                Tanggal Pengembalian *
                                            </label>

                                            <input
                                                id="sk-return"
                                                name="return_date"
                                                type="date"
                                                className="form-control rounded-3"
                                                required
                                                min={
                                                    form.borrow_date ||
                                                    today
                                                }
                                                value={form.return_date}
                                                onChange={changeForm}
                                            />
                                        </div>
                                    )}

                                    {/* KEPERLUAN */}

                                    <div className="mb-3">
                                        <label
                                            className="form-label fw-semibold"
                                            htmlFor="sk-purpose"
                                        >
                                            Keperluan *
                                        </label>

                                        <textarea
                                            id="sk-purpose"
                                            name="purpose"
                                            className="form-control rounded-3"
                                            rows={4}
                                            minLength={5}
                                            maxLength={3000}
                                            required
                                            value={form.purpose}
                                            onChange={changeForm}
                                        />

                                        <div className="small text-muted text-end">
                                            {form.purpose.length}/3000
                                        </div>
                                    </div>

                                    {/* KETERANGAN */}

                                    <div
                                        className={`alert alert-${
                                            isBorrow
                                                ? 'warning'
                                                : 'primary'
                                        } small rounded-3`}
                                    >
                                        <i className="bi bi-info-circle me-2" />

                                        {isBorrow
                                            ? 'Barang yang dipinjam wajib dikembalikan sesuai jadwal.'
                                            : 'Request Barang tidak memerlukan tanggal pengembalian.'}
                                    </div>

                                    {/* SUBMIT */}

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className={`btn btn-${theme} rounded-pill fw-semibold`}
                                            disabled={
                                                submitting ||
                                                checkingBorrow ||
                                                settingLoading ||
                                                Boolean(settingError) ||
                                                (
                                                    isBorrow &&
                                                    Boolean(activeBorrow)
                                                )
                                            }
                                        >
                                            {submitting
                                                ? 'Mengirim...'
                                                : `Kirim ${
                                                    isBorrow
                                                        ? 'Peminjaman'
                                                        : 'Request Barang'
                                                }`}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary rounded-pill"
                                            onClick={reset}
                                            disabled={submitting}
                                        >
                                            Reset Form
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL BARANG */}

            <ProductDetailModal
                open={Boolean(selectedProduct)}
                product={selectedProduct}
                serviceName={serviceName}
                onClose={() =>
                    setSelectedProduct(null)
                }
                onAddToCart={async (product) => {
                    const added = await addToCart(product);

                    if (added) {
                        setSelectedProduct(null);
                    }
                }}
            />

            {/* STYLE KATALOG */}

            <style>{`
                .sk-option {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    background: white;
                    padding: 22px;
                    min-height: 110px;
                    transition: .2s;
                }

                .sk-option:hover {
                    border-color: #34d399;
                    box-shadow: 0 8px 24px #0f172a12;
                }

                .sk-option-active {
                    background: #f0fdf4;
                    border-color: #10b981;
                }

                .sk-option-icon {
                    display: grid;
                    place-items: center;
                    width: 52px;
                    height: 52px;
                    flex-shrink: 0;
                    border-radius: 15px;
                    color: #047857;
                    background: #d1fae5;
                    font-size: 23px;
                }

                .sk-card {
                    --accent: #059669;
                    --soft: #ecfdf5;

                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    border-radius: 21px;
                    overflow: hidden;
                    background: white;
                    box-shadow: 0 4px 17px #0f172a13;

                    transition:
                        transform .2s,
                        box-shadow .2s;
                }

                .sk-card-asset {
                    --accent: #2563eb;
                    --soft: #eff6ff;
                }

                .sk-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 14px 32px #0f172a20;
                }

                .sk-cover {
                    position: relative;
                    width: 100%;
                    height: 200px;
                    display: grid;
                    place-items: center;
                    border: 0;
                    background: linear-gradient(
                        135deg,
                        var(--soft),
                        #f8fafc
                    );
                    padding: 14px;
                    cursor: zoom-in;
                }

                .sk-cover img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .sk-no-photo {
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                    gap: 8px;
                    color: #94a3b8;
                    font-size: 12px;
                }

                .sk-no-photo i {
                    font-size: 41px;
                }

                .sk-photo-count,
                .sk-cover-detail {
                    position: absolute;
                    bottom: 10px;
                    padding: 5px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    background: #ffffffed;
                    color: #334155;
                }

                .sk-photo-count {
                    left: 10px;
                }

                .sk-cover-detail {
                    right: 10px;
                    color: var(--accent);
                }

                .sk-card-body {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    padding: 19px;
                }

                .sk-card-tags {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 11px;
                }

                .sk-category {
                    max-width: 70%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    padding: 6px 9px;
                    border-radius: 999px;
                    background: var(--soft);
                    color: var(--accent);
                    font-size: 11px;
                    font-weight: 700;
                }

                .sk-stock-ok,
                .sk-stock-empty {
                    font-size: 11px;
                    font-weight: 700;
                    color: #047857;
                }

                .sk-stock-empty {
                    color: #b91c1c;
                }

                .sk-title {
                    height: 46px;
                    text-align: left;
                    border: 0;
                    background: none;
                    padding: 0;
                    color: #0f172a;
                    font-size: 16px;
                    font-weight: 800;
                    line-height: 1.45;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    cursor: pointer;
                }

                .sk-title:hover,
                .sk-detail:hover {
                    color: var(--accent);
                }

                .sk-description {
                    font-size: 12px;
                    color: #64748b;
                    line-height: 1.65;
                    margin: 8px 0 0;
                    min-height: 59px;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .sk-detail {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    border: 0;
                    background: none;
                    padding: 8px 0 13px;
                    color: var(--accent);
                    font-size: 12px;
                    font-weight: 700;
                    text-align: left;
                    cursor: pointer;
                }

                .sk-card-bottom {
                    margin-top: auto;
                }

                .sk-stock {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 11px 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    margin-bottom: 12px;
                }

                .sk-stock span {
                    font-size: 11px;
                    color: #64748b;
                }

                .sk-stock strong {
                    font-size: 20px;
                    color: #0f172a;
                }

                .sk-add {
                    width: 100%;
                    border: 0;
                    border-radius: 999px;
                    padding: 11px 8px;
                    background: var(--accent);
                    color: #fff;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .sk-add:disabled {
                    background: #94a3b8;
                    cursor: not-allowed;
                }

                .sk-qty {
                    display: grid;
                    grid-template-columns: 42px 1fr 42px;
                    gap: 8px;
                    align-items: center;
                }

                .sk-qty button {
                    width: 42px;
                    height: 42px;
                    border: 0;
                    border-radius: 12px;
                    background: var(--accent);
                    color: white;
                }

                .sk-qty strong {
                    display: grid;
                    place-items: center;
                    min-height: 42px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                }

                .sk-side {
                    position: sticky;
                    top: 96px;
                }

                .sk-cart-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 11px 0;
                    border-bottom: 1px solid #e2e8f0;
                }

                .sk-cart-item:last-child {
                    border-bottom: 0;
                }

                .sk-card button:focus-visible,
                .sk-option:focus-visible {
                    outline: 3px solid #86efac;
                    outline-offset: 2px;
                }

                @media (max-width: 1199px) {
                    .sk-side {
                        position: static;
                    }
                }

                @media (max-width: 575px) {
                    .sk-cover {
                        height: 225px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .sk-card,
                    .sk-option {
                        transition: none;
                    }
                }
            `}</style>
        </div>
    );
}
