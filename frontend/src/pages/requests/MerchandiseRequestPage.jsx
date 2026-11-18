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

const SERVICE_KEY = 'merchandise';

const INITIAL_FORM = {
    event_name: '',
    pic_name: '',
    pic_phone: '',
    activity_date: '',
    pickup_date: '',
    institution_name: '',
    guest_name: '',
    guest_position: '',
    user_note: '',
};

function toDateInput(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDate(value) {
    if (!value) return '-';

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? (() => {
              const [year, month, day] = String(value).split('-').map(Number);
              return new Date(year, month - 1, day);
          })()
        : new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          });
}

function getError(error, fallback = 'Permintaan gagal diproses.') {
    return (
        Object.values(error?.response?.data?.errors || {}).flat().find(Boolean) ||
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
}

function getRows(response) {
    const data = response?.data?.data;

    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function imageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';

    const src = value.trim();

    if (/^https?:\/\//i.test(src)) return src;

    if (/^(javascript:|data:|blob:|\/\/)/i.test(src)) return '';

    try {
        const base = new URL(
            api.defaults.baseURL || '/api',
            window.location.origin
        );

        return new URL(
            src.startsWith('/') ? src : `/${src}`,
            base.origin
        ).href;
    } catch {
        return '';
    }
}

function getPhotos(product) {
    const gallery = Array.isArray(product.gallery_images)
        ? product.gallery_images
        : [];

    return [
        ...new Set(
            [product.image, ...gallery].filter(Boolean)
        ),
    ];
}

/*
|--------------------------------------------------------------------------
| KARTU KATALOG MERCHANDISE
|--------------------------------------------------------------------------
|
| - Foto dan nama dapat diklik untuk melihat detail.
| - Tombol keranjang tetap berfungsi secara terpisah.
| - Semua kartu menggunakan tata letak seragam.
|
*/

function MerchandiseCard({
    product,
    quantity,
    onDetail,
    onAdd,
    onDecrease,
}) {
    const [imageFailed, setImageFailed] = useState(false);

    const photos = getPhotos(product);

    const cover = imageUrl(photos[0]);

    const stock = Math.max(
        0,
        Number(product.stock || 0)
    );

    const hasStock = stock > 0;

    useEffect(() => {
        setImageFailed(false);
    }, [cover]);

    const handleCardClick = (event) => {
        if (
            !event.target.closest(
                'button, a, input, select, textarea'
            )
        ) {
            onDetail(product);
        }
    };

    return (
        <article
            className="card border-0 shadow-sm h-100 merch-card"
            onClick={handleCardClick}
        >
            {/* FOTO PRODUK */}

            <button
                type="button"
                className="merch-card-photo"
                onClick={() => onDetail(product)}
                aria-label={`Lihat detail dan foto ${product.name}`}
                title={`Lihat detail ${product.name}`}
            >
                {cover && !imageFailed ? (
                    <img
                        src={cover}
                        alt={product.name}
                        loading="lazy"
                        onError={() =>
                            setImageFailed(true)
                        }
                    />
                ) : (
                    <div className="merch-card-no-photo">
                        <i className="bi bi-gift" />

                        <span>
                            Belum ada foto
                        </span>
                    </div>
                )}

                {/* INDIKATOR JUMLAH FOTO */}

                <span className="merch-card-photo-count">
                    <i className="bi bi-images" />

                    {photos.length} foto
                </span>

                {/* TOMBOL LIHAT DETAIL */}

                <span className="merch-card-photo-hint">
                    <i className="bi bi-arrows-angle-expand" />

                    Lihat detail
                </span>
            </button>

            {/* INFORMASI PRODUK */}

            <div className="card-body d-flex flex-column merch-card-body">
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                    {/* KATEGORI */}

                    <span
                        className="merch-card-category"
                        title={
                            product.category?.name ||
                            'Merchandise'
                        }
                    >
                        <i className="bi bi-tag" />

                        {product.category?.name ||
                            'Merchandise'}
                    </span>

                    {/* STATUS STOK */}

                    <span
                        className={`merch-card-availability ${
                            hasStock
                                ? ''
                                : 'is-empty'
                        }`}
                    >
                        {hasStock
                            ? 'Tersedia'
                            : 'Habis'}
                    </span>
                </div>

                {/* NAMA PRODUK */}

                <h3 className="merch-card-title">
                    <button
                        type="button"
                        title={product.name}
                        onClick={() =>
                            onDetail(product)
                        }
                    >
                        {product.name}
                    </button>
                </h3>

                {/* DESKRIPSI */}

                <p className="merch-card-description">
                    {product.description ||
                        'Belum ada deskripsi untuk barang ini.'}
                </p>

                {/* TOMBOL DETAIL */}

                <button
                    type="button"
                    className="merch-card-detail"
                    onClick={() =>
                        onDetail(product)
                    }
                >
                    Lihat detail & galeri

                    <i className="bi bi-arrow-up-right" />
                </button>

                {/* STOK DAN KERANJANG */}

                <div className="merch-card-bottom mt-auto">
                    <div className="merch-card-stock">
                        <span>
                            <i className="bi bi-box-seam" />

                            Stok tersedia
                        </span>

                        <strong>
                            {stock.toLocaleString('id-ID')}
                        </strong>
                    </div>

                    {quantity > 0 ? (
                        <div className="merch-card-quantity">
                            {/* KURANGI */}

                            <button
                                type="button"
                                onClick={() =>
                                    onDecrease(product.id)
                                }
                                aria-label={`Kurangi ${product.name}`}
                                title="Kurangi jumlah"
                            >
                                <i className="bi bi-dash-lg" />
                            </button>

                            {/* JUMLAH */}

                            <strong aria-live="polite">
                                {quantity}
                            </strong>

                            {/* TAMBAH */}

                            <button
                                type="button"
                                onClick={() =>
                                    onAdd(product)
                                }
                                aria-label={`Tambah ${product.name}`}
                                title="Tambah jumlah"
                            >
                                <i className="bi bi-plus-lg" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="merch-card-add"
                            onClick={() =>
                                onAdd(product)
                            }
                            disabled={!hasStock}
                        >
                            <i
                                className={`bi ${
                                    hasStock
                                        ? 'bi-cart-plus'
                                        : 'bi-exclamation-circle'
                                }`}
                            />

                            {hasStock
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
| HALAMAN PENGAJUAN MERCHANDISE
|--------------------------------------------------------------------------
*/

export default function MerchandiseRequestPage() {
    const [products, setProducts] = useState([]);

    const [cart, setCart] = useState([]);

    const [form, setForm] = useState(INITIAL_FORM);

    const [proofFile, setProofFile] = useState(null);

    const [loading, setLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);

    const [settingLoading, setSettingLoading] = useState(true);

    const [settingError, setSettingError] = useState('');

    const [
        submissionSetting,
        setSubmissionSetting,
    ] = useState({
        min_submission_days: 4,
        minimum_date: '',
    });

    /*
    |--------------------------------------------------------------------------
    | STATE DETAIL BARANG
    |--------------------------------------------------------------------------
    */

    const [
        selectedProduct,
        setSelectedProduct,
    ] = useState(null);

    const todayDate = useMemo(
        () => toDateInput(new Date()),
        []
    );

    const minimumDays = Number(
        submissionSetting.min_submission_days ?? 4
    );

    const minimumDate =
        submissionSetting.minimum_date || '';

    /*
    |--------------------------------------------------------------------------
    | LOAD PENGATURAN H-N
    |--------------------------------------------------------------------------
    */

    const fetchSubmissionSetting = useCallback(
        async () => {
            try {
                setSettingLoading(true);

                setSettingError('');

                const response = await api.get(
                    '/humas-settings'
                );

                const setting =
                    response?.data?.data
                        ?.submission_settings?.[SERVICE_KEY];

                if (!setting) {
                    throw new Error(
                        'Pengaturan Merchandise tidak ditemukan.'
                    );
                }

                setSubmissionSetting({
                    min_submission_days: Number(
                        setting.min_submission_days ?? 4
                    ),

                    minimum_date:
                        setting.minimum_date || '',
                });
            } catch (error) {
                console.error(
                    'Fetch merchandise settings:',
                    error
                );

                setSettingError(
                    getError(error)
                );
            } finally {
                setSettingLoading(false);
            }
        },
        []
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD PRODUK
    |--------------------------------------------------------------------------
    */

    const fetchProducts = useCallback(
        async () => {
            try {
                setLoading(true);

                const response = await api.get(
                    '/products'
                );

                setProducts(
                    getRows(response).filter(
                        (product) =>
                            product.status === 'active' &&
                            ['checkout', 'both'].includes(
                                product.type
                            )
                    )
                );
            } catch (error) {
                console.error(
                    'Fetch merchandise products:',
                    error
                );

                setProducts([]);

                await showErrorAlert(
                    'Gagal Memuat Data',
                    getError(error)
                );
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchProducts();

        fetchSubmissionSetting();
    }, [
        fetchProducts,
        fetchSubmissionSetting,
    ]);

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

                    product: products.find(
                        (product) =>
                            Number(product.id) ===
                            Number(item.product_id)
                    ),
                }))
                .filter((item) => item.product),

        [cart, products]
    );

    const totalQty = useMemo(
        () =>
            selectedItems.reduce(
                (sum, item) =>
                    sum +
                    Number(item.quantity || 0),
                0
            ),
        [selectedItems]
    );

    /*
    |--------------------------------------------------------------------------
    | TAMBAH KE KERANJANG
    |--------------------------------------------------------------------------
    */

    const handleAddToCart = async (product) => {
        const stock = Number(
            product.stock || 0
        );

        const current = cart.find(
            (item) =>
                Number(item.product_id) ===
                Number(product.id)
        );

        if (stock <= 0) {
            await showWarningAlert(
                'Stok Habis',
                'Produk ini tidak memiliki stok tersedia.'
            );

            return false;
        }

        if (
            current &&
            Number(current.quantity) >= stock
        ) {
            await showWarningAlert(
                'Stok Tidak Cukup',
                `Stok ${product.name} hanya tersedia ${product.stock}.`
            );

            return false;
        }

        setCart((previous) => {
            const existing = previous.find(
                (item) =>
                    Number(item.product_id) ===
                    Number(product.id)
            );

            return existing
                ? previous.map((item) =>
                    Number(item.product_id) ===
                    Number(product.id)
                        ? {
                              ...item,
                              quantity:
                                  item.quantity + 1,
                          }
                        : item
                )
                : [
                      ...previous,
                      {
                          product_id: product.id,
                          quantity: 1,
                      },
                  ];
        });

        return true;
    };

    /*
    |--------------------------------------------------------------------------
    | KURANGI JUMLAH
    |--------------------------------------------------------------------------
    */

    const handleDecreaseQty = (productId) => {
        setCart((previous) =>
            previous
                .map((item) =>
                    Number(item.product_id) ===
                    Number(productId)
                        ? {
                              ...item,
                              quantity:
                                  item.quantity - 1,
                          }
                        : item
                )
                .filter(
                    (item) =>
                        item.quantity > 0
                )
        );
    };

    /*
    |--------------------------------------------------------------------------
    | HAPUS BARANG DARI KERANJANG
    |--------------------------------------------------------------------------
    */

    const handleRemoveItem = (productId) => {
        setCart((previous) =>
            previous.filter(
                (item) =>
                    Number(item.product_id) !==
                    Number(productId)
            )
        );
    };

    /*
    |--------------------------------------------------------------------------
    | PERUBAHAN FORM
    |--------------------------------------------------------------------------
    */

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((previous) => {
            const next = {
                ...previous,
                [name]: value,
            };

            if (
                name === 'activity_date' &&
                previous.pickup_date &&
                value &&
                previous.pickup_date > value
            ) {
                next.pickup_date = '';
            }

            return next;
        });
    };

    /*
    |--------------------------------------------------------------------------
    | UPLOAD LAMPIRAN
    |--------------------------------------------------------------------------
    */

    const handleFileChange = async (event) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            setProofFile(null);
            return;
        }

        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
        ];

        if (!allowed.includes(file.type)) {
            event.target.value = '';

            setProofFile(null);

            await showWarningAlert(
                'Format File Tidak Sesuai',
                'File lampiran harus PDF, JPG, JPEG, atau PNG.'
            );

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            event.target.value = '';

            setProofFile(null);

            await showWarningAlert(
                'Ukuran File Terlalu Besar',
                'Ukuran maksimal 5 MB.'
            );

            return;
        }

        setProofFile(file);
    };

    /*
    |--------------------------------------------------------------------------
    | VALIDASI TANGGAL
    |--------------------------------------------------------------------------
    */

    const validateSchedule = async () => {
        if (
            settingLoading ||
            settingError
        ) {
            await showWarningAlert(
                'Aturan Belum Tersedia',
                'Pengaturan batas pengajuan gagal dimuat. Silakan muat ulang.'
            );

            return false;
        }

        if (!form.activity_date) {
            await showWarningAlert(
                'Tanggal Kegiatan Belum Diisi',
                'Pilih tanggal kegiatan.'
            );

            return false;
        }

        if (
            minimumDate &&
            form.activity_date < minimumDate
        ) {
            await showWarningAlert(
                'Pengajuan Terlalu Dekat',

                minimumDays === 0
                    ? 'Tanggal kegiatan tidak boleh sebelum hari ini.'
                    : `Pengajuan Merchandise wajib minimal H-${minimumDays}. Tanggal tercepat ${formatDate(minimumDate)}.`
            );

            return false;
        }

        if (!form.pickup_date) {
            await showWarningAlert(
                'Tanggal Pengambilan Belum Diisi',
                'Pilih tanggal pengambilan.'
            );

            return false;
        }

        if (
            form.pickup_date < todayDate
        ) {
            await showWarningAlert(
                'Tanggal Pengambilan Tidak Valid',
                'Tanggal pengambilan tidak boleh menggunakan tanggal yang sudah lewat.'
            );

            return false;
        }

        if (
            form.pickup_date >
            form.activity_date
        ) {
            await showWarningAlert(
                'Tanggal Pengambilan Tidak Valid',
                'Tanggal pengambilan tidak boleh setelah tanggal kegiatan.'
            );

            return false;
        }

        return true;
    };

    /*
    |--------------------------------------------------------------------------
    | RESET FORM
    |--------------------------------------------------------------------------
    */

    const handleReset = () => {
        setForm({
            ...INITIAL_FORM,
        });

        setCart([]);

        setProofFile(null);

        const input = document.getElementById(
            'proof_file'
        );

        if (input) {
            input.value = '';
        }
    };

    /*
    |--------------------------------------------------------------------------
    | CHECKOUT PENGAJUAN
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submitting) return;

        if (selectedItems.length === 0) {
            await showWarningAlert(
                'Keranjang Kosong',
                'Tambahkan minimal satu merchandise.'
            );

            return;
        }

        if (!(await validateSchedule())) {
            return;
        }

        if (!proofFile) {
            await showWarningAlert(
                'Lampiran Belum Diunggah',
                'Upload bukti undangan terlebih dahulu.'
            );

            return;
        }

        try {
            setSubmitting(true);

            showLoadingAlert(
                'Mengirim Pengajuan',
                'Mohon tunggu sebentar.'
            );

            const payload = new FormData();

            Object.keys(INITIAL_FORM).forEach(
                (key) => {
                    payload.append(
                        key,
                        String(form[key] || '').trim()
                    );
                }
            );

            payload.append(
                'proof_file',
                proofFile
            );

            selectedItems.forEach(
                (item, index) => {
                    payload.append(
                        `items[${index}][product_id]`,
                        String(item.product_id)
                    );

                    payload.append(
                        `items[${index}][quantity]`,
                        String(item.quantity)
                    );
                }
            );

            const response = await api.post(
                '/orders',
                payload
            );

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Berhasil',

                response?.data?.message ||
                    'Pengajuan merchandise berhasil dikirim.'
            );

            handleReset();

            await Promise.all([
                fetchProducts(),
                fetchSubmissionSetting(),
            ]);
        } catch (error) {
            console.error(
                'Checkout merchandise:',
                error
            );

            closeAlert();

            await showErrorAlert(
                'Pengajuan Gagal',
                getError(error)
            );

            await fetchSubmissionSetting();
        } finally {
            setSubmitting(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* ERROR PENGATURAN */}

            {settingError && (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4 d-flex align-items-start gap-3">
                    <i className="bi bi-exclamation-triangle-fill fs-4" />

                    <div className="flex-grow-1">
                        <strong>
                            Aturan pengajuan gagal dimuat
                        </strong>

                        <div className="small mt-1">
                            {settingError}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-pill"
                        onClick={fetchSubmissionSetting}
                    >
                        Muat Ulang
                    </button>
                </div>
            )}

            <div className="row g-4">
                {/* KATALOG MERCHANDISE */}

                <div className="col-xl-8">
                    <section
                        className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                        style={{
                            background:
                                'linear-gradient(135deg,rgba(37,99,235,.95),rgba(15,23,42,.98))',
                        }}
                    >
                        <div className="card-body p-4 p-lg-5 text-white">
                            <span className="badge bg-white text-primary rounded-pill px-3 py-2 mb-3">
                                Merchandise HUMAS
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Pilih merchandise untuk tamu dan kegiatan.
                            </h1>

                            <p
                                className="mb-3 text-white-50"
                                style={{
                                    maxWidth: 720,
                                    lineHeight: 1.8,
                                }}
                            >
                                Klik foto atau nama barang untuk
                                melihat semua foto dan deskripsi
                                lengkap. Tambahkan barang ke
                                keranjang sebelum mengirim pengajuan.
                            </p>

                            <div
                                className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2"
                                style={{
                                    background:
                                        'rgba(255,255,255,.12)',
                                }}
                            >
                                <i className="bi bi-calendar-check-fill" />

                                <span className="small fw-bold">
                                    {settingLoading
                                        ? 'Memuat ketentuan waktu...'
                                        : `Pengajuan minimal H-${minimumDays} sebelum kegiatan`}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* LOADING */}

                    {loading ? (
                        <div className="card border-0 shadow-sm rounded-5 p-5 text-center">
                            <span className="spinner-border text-primary mx-auto" />

                            <p className="text-muted mt-3 mb-0">
                                Memuat katalog merchandise...
                            </p>
                        </div>
                    ) : products.length === 0 ? (
                        /* KATALOG KOSONG */

                        <div className="card border-0 shadow-sm rounded-5 p-5 text-center">
                            <i className="bi bi-inbox fs-1 text-muted" />

                            <h5 className="fw-black mt-3">
                                Belum ada merchandise tersedia
                            </h5>

                            <p className="text-muted mb-0">
                                Produk merchandise aktif belum tersedia.
                            </p>
                        </div>
                    ) : (
                        /* KARTU PRODUK */

                        <div className="row g-4 merch-catalog">
                            {products.map((product) => {
                                const item = cart.find(
                                    (cartItem) =>
                                        Number(cartItem.product_id) ===
                                        Number(product.id)
                                );

                                return (
                                    <div
                                        className="col-12 col-md-6 col-xxl-4"
                                        key={product.id}
                                    >
                                        <MerchandiseCard
                                            product={product}
                                            quantity={Number(
                                                item?.quantity || 0
                                            )}
                                            onDetail={setSelectedProduct}
                                            onAdd={handleAddToCart}
                                            onDecrease={handleDecreaseQty}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* KERANJANG DAN FORM */}

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{
                            top: 105,
                        }}
                    >
                        {/* KERANJANG */}

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Keranjang
                                        </h4>

                                        <p className="small text-muted mb-0">
                                            {totalQty} item dipilih
                                        </p>
                                    </div>

                                    <div className="icon-box bg-primary-subtle text-primary">
                                        <i className="bi bi-cart-fill fs-4" />
                                    </div>
                                </div>

                                {selectedItems.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-cart-x fs-1 text-muted" />

                                        <p className="text-muted mt-2 mb-0">
                                            Keranjang masih kosong.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {selectedItems.map(
                                            (item) => (
                                                <div
                                                    key={item.product_id}
                                                    className="p-3 rounded-4 border d-flex justify-content-between gap-2"
                                                >
                                                    <div>
                                                        <h6 className="fw-bold mb-1">
                                                            {item.product.name}
                                                        </h6>

                                                        <span className="small text-muted">
                                                            Qty: {item.quantity}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger rounded-pill"
                                                        aria-label={`Hapus ${item.product.name}`}
                                                        onClick={() =>
                                                            handleRemoveItem(
                                                                item.product_id
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* FORM PENGAJUAN */}

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Tamu &amp; Kegiatan
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi PIC, jadwal, data tamu,
                                    dan bukti undangan.
                                </p>

                                <form onSubmit={handleSubmit}>
                                    {/* NAMA KEGIATAN */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-event-name"
                                            className="form-label fw-bold"
                                        >
                                            Nama Kegiatan
                                        </label>

                                        <input
                                            id="merch-event-name"
                                            type="text"
                                            name="event_name"
                                            className="form-control rounded-pill"
                                            value={form.event_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* NAMA PIC */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-pic-name"
                                            className="form-label fw-bold"
                                        >
                                            Nama PIC
                                        </label>

                                        <input
                                            id="merch-pic-name"
                                            type="text"
                                            name="pic_name"
                                            className="form-control rounded-pill"
                                            value={form.pic_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* NOMOR PIC */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-pic-phone"
                                            className="form-label fw-bold"
                                        >
                                            Nomor PIC
                                        </label>

                                        <input
                                            id="merch-pic-phone"
                                            type="tel"
                                            name="pic_phone"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: 081234567890"
                                            value={form.pic_phone}
                                            onChange={handleChange}
                                            required
                                        />

                                        <div className="form-text">
                                            Nomor WhatsApp/telepon PIC.
                                        </div>
                                    </div>

                                    {/* TANGGAL KEGIATAN */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-activity-date"
                                            className="form-label fw-bold"
                                        >
                                            Tanggal Kegiatan
                                        </label>

                                        <input
                                            id="merch-activity-date"
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            min={
                                                minimumDate ||
                                                undefined
                                            }
                                            value={form.activity_date}
                                            onChange={handleChange}
                                            disabled={
                                                settingLoading ||
                                                Boolean(settingError)
                                            }
                                            required
                                        />

                                        <div className="form-text text-primary fw-semibold">
                                            <i className="bi bi-info-circle me-1" />

                                            {settingLoading
                                                ? 'Memuat aturan pengajuan...'
                                                : `Minimal H-${minimumDays}. Tanggal paling cepat ${formatDate(minimumDate)}.`}
                                        </div>
                                    </div>

                                    {/* TANGGAL PENGAMBILAN */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-pickup-date"
                                            className="form-label fw-bold"
                                        >
                                            Tanggal Pengambilan Merchandise
                                        </label>

                                        <input
                                            id="merch-pickup-date"
                                            type="date"
                                            name="pickup_date"
                                            className="form-control rounded-pill"
                                            min={todayDate}
                                            max={
                                                form.activity_date ||
                                                undefined
                                            }
                                            value={form.pickup_date}
                                            onChange={handleChange}
                                            disabled={
                                                !form.activity_date
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Pengambilan tidak boleh setelah
                                            tanggal kegiatan.
                                        </div>
                                    </div>

                                    {/* INSTANSI */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-institution"
                                            className="form-label fw-bold"
                                        >
                                            Instansi / Pihak Eksternal
                                        </label>

                                        <input
                                            id="merch-institution"
                                            type="text"
                                            name="institution_name"
                                            className="form-control rounded-pill"
                                            value={form.institution_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* NAMA TAMU */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-guest-name"
                                            className="form-label fw-bold"
                                        >
                                            Nama Tamu
                                        </label>

                                        <input
                                            id="merch-guest-name"
                                            type="text"
                                            name="guest_name"
                                            className="form-control rounded-pill"
                                            value={form.guest_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* JABATAN TAMU */}

                                    <div className="mb-3">
                                        <label
                                            htmlFor="merch-guest-position"
                                            className="form-label fw-bold"
                                        >
                                            Jabatan Tamu
                                        </label>

                                        <input
                                            id="merch-guest-position"
                                            type="text"
                                            name="guest_position"
                                            className="form-control rounded-pill"
                                            value={form.guest_position}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* UPLOAD LAMPIRAN */}

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            File Bukti Undangan / Lampiran
                                        </label>

                                        <label
                                            htmlFor="proof_file"
                                            className="d-block p-3 rounded-4 border bg-light"
                                            style={{
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <span className="fw-bold text-primary">
                                                <i className="bi bi-cloud-arrow-up-fill me-2" />
                                                Upload File
                                            </span>

                                            <span className="small text-muted d-block mt-1 text-break">
                                                {proofFile
                                                    ? proofFile.name
                                                    : 'PDF, JPG, JPEG, PNG. Maksimal 5 MB.'}
                                            </span>
                                        </label>

                                        <input
                                            type="file"
                                            id="proof_file"
                                            className="visually-hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            required
                                        />
                                    </div>

                                    {/* CATATAN */}

                                    <div className="mb-4">
                                        <label
                                            htmlFor="merch-user-note"
                                            className="form-label fw-bold"
                                        >
                                            Alasan / Catatan Pengajuan
                                        </label>

                                        <textarea
                                            id="merch-user-note"
                                            name="user_note"
                                            className="form-control rounded-4"
                                            rows={4}
                                            value={form.user_note}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    {/* SUBMIT */}

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary rounded-pill"
                                            disabled={
                                                submitting ||
                                                settingLoading ||
                                                Boolean(settingError)
                                            }
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Mengirim...
                                                </>
                                            ) : (
                                                'Checkout Pengajuan'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-dark rounded-pill"
                                            onClick={handleReset}
                                            disabled={submitting}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | MODAL DETAIL PRODUK
            |--------------------------------------------------------------------------
            */}

            <ProductDetailModal
                open={Boolean(selectedProduct)}
                product={selectedProduct}
                serviceName="Merchandise HUMAS"
                onClose={() =>
                    setSelectedProduct(null)
                }
                onAddToCart={async (product) => {
                    const added = await handleAddToCart(
                        product
                    );

                    if (added) {
                        setSelectedProduct(null);
                    }
                }}
            />

            {/* CSS KARTU MERCHANDISE */}

            <style>{`
                .merch-card {
                    border-radius: 22px;
                    overflow: hidden;
                    background: #fff;
                    transition:
                        transform .2s ease,
                        box-shadow .2s ease;
                    cursor: pointer;
                }

                .merch-card:hover {
                    transform: translateY(-4px);
                    box-shadow:
                        0 14px 35px rgba(15,23,42,.12)
                        !important;
                }

                .merch-card-photo {
                    height: 196px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 14px;
                    position: relative;
                    border: 0;
                    background: linear-gradient(
                        140deg,#edf3ff,#f8fbff
                    );
                    cursor: zoom-in;
                    overflow: hidden;
                }

                .merch-card-photo img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    transition: transform .25s ease;
                }

                .merch-card:hover .merch-card-photo img {
                    transform: scale(1.045);
                }

                .merch-card-no-photo {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    color: #64748b;
                    font-size: 12px;
                }

                .merch-card-no-photo i {
                    color: #94a3b8;
                    font-size: 40px;
                }

                .merch-card-photo-count,
                .merch-card-photo-hint {
                    position: absolute;
                    bottom: 11px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    font-weight: 750;
                    border-radius: 999px;
                    padding: 5px 9px;
                    white-space: nowrap;
                }

                .merch-card-photo-count {
                    left: 10px;
                    background: rgba(255,255,255,.95);
                    color: #334155;
                    border: 1px solid #e2e8f0;
                }

                .merch-card-photo-hint {
                    right: 10px;
                    color: #1d4ed8;
                    background: rgba(255,255,255,.96);
                }

                .merch-card-body {
                    padding: 20px !important;
                }

                .merch-card-category {
                    min-width: 0;
                    max-width: 75%;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 10px;
                    border-radius: 999px;
                    color: #1d4ed8;
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    font-size: 11px;
                    font-weight: 750;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .merch-card-availability {
                    color: #047857;
                    font-size: 11px;
                    font-weight: 700;
                }

                .merch-card-availability.is-empty {
                    color: #b91c1c;
                }

                .merch-card-title {
                    margin: 0 0 9px;
                    line-height: 1.45;
                    font-size: 16px;
                    font-weight: 800;
                    min-height: 2.9em;
                }

                .merch-card-title button {
                    border: 0;
                    background: transparent;
                    color: #0f172a;
                    font: inherit;
                    text-align: left;
                    padding: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    cursor: pointer;
                }

                .merch-card-title button:hover {
                    color: #2563eb;
                }

                .merch-card-description {
                    color: #64748b;
                    line-height: 1.65;
                    font-size: 12px;
                    margin: 0;
                    min-height: 5em;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .merch-card-detail {
                    border: 0;
                    background: transparent;
                    padding: 8px 0 14px;
                    text-align: left;
                    color: #2563eb;
                    font-weight: 750;
                    font-size: 12px;
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    cursor: pointer;
                }

                .merch-card-bottom {
                    padding-top: 4px;
                }

                .merch-card-stock {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 13px;
                    padding: 11px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 9px;
                    margin-bottom: 12px;
                }

                .merch-card-stock span {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 650;
                    color: #64748b;
                }

                .merch-card-stock strong {
                    font-size: 20px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .merch-card-add {
                    width: 100%;
                    border: 0;
                    border-radius: 999px;
                    background: #2563eb;
                    color: white;
                    padding: 11px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .merch-card-add:hover:not(:disabled) {
                    background: #1d4ed8;
                }

                .merch-card-add:disabled {
                    background: #94a3b8;
                    cursor: not-allowed;
                }

                .merch-card-quantity {
                    display: grid;
                    grid-template-columns:
                        42px minmax(0,1fr) 42px;
                    align-items: center;
                    gap: 9px;
                }

                .merch-card-quantity button {
                    height: 42px;
                    width: 42px;
                    border: 0;
                    background: #2563eb;
                    border-radius: 13px;
                    color: #fff;
                    cursor: pointer;
                }

                .merch-card-quantity strong {
                    height: 42px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 13px;
                    display: grid;
                    place-items: center;
                    font-weight: 800;
                }

                .merch-card button:focus-visible {
                    outline: 3px solid #93c5fd;
                    outline-offset: 3px;
                }

                @media(max-width:575px) {
                    .merch-card-photo {
                        height: 225px;
                    }
                }

                @media(prefers-reduced-motion:reduce) {
                    .merch-card,
                    .merch-card-photo img {
                        transition: none;
                    }
                }
            `}</style>
        </div>
    );
}
