import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import api from '../../api/axios';

import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const formatDateInput = (
    date
) => {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        );

    return `${year}-${month}-${day}`;
};

const getTodayDate =
    () => {
        return formatDateInput(
            new Date()
        );
    };

const getMinimumActivityDate =
    () => {
        const date =
            new Date();

        date.setDate(
            date.getDate() + 4
        );

        return formatDateInput(
            date
        );
    };

const initialForm = {
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

export default function MerchandiseRequestPage() {
    const [
        products,
        setProducts,
    ] = useState([]);

    const [
        cart,
        setCart,
    ] = useState([]);

    const [
        form,
        setForm,
    ] = useState(
        initialForm
    );

    const [
        proofFile,
        setProofFile,
    ] = useState(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(
        true
    );

    const [
        submitting,
        setSubmitting,
    ] = useState(
        false
    );

    const todayDate =
        useMemo(
            () =>
                getTodayDate(),
            []
        );

    const minimumActivityDate =
        useMemo(
            () =>
                getMinimumActivityDate(),
            []
        );

    const fetchProducts =
        async () => {
            try {
                setLoading(
                    true
                );

                const response =
                    await api.get(
                        '/products'
                    );

                const productData =
                    response.data
                        .data ||
                    [];

                const merchandiseProducts =
                    productData.filter(
                        (
                            product
                        ) => {
                            return (
                                product.status ===
                                    'active' &&
                                [
                                    'checkout',
                                    'both',
                                ].includes(
                                    product.type
                                )
                            );
                        }
                    );

                setProducts(
                    merchandiseProducts
                );
            } catch (
                error
            ) {
                console.error(
                    error
                );

                showErrorAlert(
                    'Gagal Memuat Data',
                    'Data merchandise gagal dimuat dari server.'
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    useEffect(
        () => {
            fetchProducts();
        },
        []
    );

    const selectedItems =
        useMemo(
            () => {
                return cart
                    .map(
                        (
                            cartItem
                        ) => {
                            const product =
                                products.find(
                                    (
                                        item
                                    ) =>
                                        item.id ===
                                        cartItem.product_id
                                );

                            return {
                                ...cartItem,
                                product,
                            };
                        }
                    )
                    .filter(
                        (
                            item
                        ) =>
                            item.product
                    );
            },
            [
                cart,
                products,
            ]
        );

    const totalQty =
        useMemo(
            () => {
                return selectedItems.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        item.quantity,
                    0
                );
            },
            [
                selectedItems,
            ]
        );

    const handleAddToCart =
        (
            product
        ) => {
            if (
                product.stock <=
                0
            ) {
                showWarningAlert(
                    'Stok Habis',
                    'Produk ini tidak memiliki stok tersedia.'
                );

                return;
            }

            setCart(
                (
                    prevCart
                ) => {
                    const existingItem =
                        prevCart.find(
                            (
                                item
                            ) =>
                                item.product_id ===
                                product.id
                        );

                    if (
                        existingItem
                    ) {
                        if (
                            existingItem.quantity >=
                            product.stock
                        ) {
                            showWarningAlert(
                                'Stok Tidak Cukup',
                                `Stok ${product.name} hanya tersedia ${product.stock}.`
                            );

                            return prevCart;
                        }

                        return prevCart.map(
                            (
                                item
                            ) =>
                                item.product_id ===
                                product.id
                                    ? {
                                          ...item,

                                          quantity:
                                              item.quantity +
                                              1,
                                      }
                                    : item
                        );
                    }

                    return [
                        ...prevCart,
                        {
                            product_id:
                                product.id,

                            quantity:
                                1,
                        },
                    ];
                }
            );
        };

    const handleDecreaseQty =
        (
            productId
        ) => {
            setCart(
                (
                    prevCart
                ) =>
                    prevCart
                        .map(
                            (
                                item
                            ) =>
                                item.product_id ===
                                productId
                                    ? {
                                          ...item,

                                          quantity:
                                              item.quantity -
                                              1,
                                      }
                                    : item
                        )
                        .filter(
                            (
                                item
                            ) =>
                                item.quantity >
                                0
                        )
            );
        };

    const handleIncreaseQty =
        (
            product
        ) => {
            setCart(
                (
                    prevCart
                ) =>
                    prevCart.map(
                        (
                            item
                        ) => {
                            if (
                                item.product_id !==
                                product.id
                            ) {
                                return item;
                            }

                            if (
                                item.quantity >=
                                product.stock
                            ) {
                                showWarningAlert(
                                    'Stok Tidak Cukup',
                                    `Stok ${product.name} hanya tersedia ${product.stock}.`
                                );

                                return item;
                            }

                            return {
                                ...item,

                                quantity:
                                    item.quantity +
                                    1,
                            };
                        }
                    )
            );
        };

    const handleRemoveItem =
        (
            productId
        ) => {
            setCart(
                (
                    prevCart
                ) =>
                    prevCart.filter(
                        (
                            item
                        ) =>
                            item.product_id !==
                            productId
                    )
            );
        };

    const handleChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            setForm(
                (
                    prevForm
                ) => {
                    const nextForm = {
                        ...prevForm,
                        [name]:
                            value,
                    };

                    /*
                     * Jika tanggal kegiatan berubah
                     * menjadi sebelum pickup yang sudah
                     * dipilih, reset pickup.
                     */
                    if (
                        name ===
                            'activity_date' &&
                        prevForm.pickup_date &&
                        value &&
                        prevForm.pickup_date >
                            value
                    ) {
                        nextForm.pickup_date =
                            '';
                    }

                    return nextForm;
                }
            );
        };

    const handleFileChange =
        (
            event
        ) => {
            const file =
                event.target
                    .files?.[0];

            if (
                !file
            ) {
                setProofFile(
                    null
                );

                return;
            }

            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
            ];

            const maxSize =
                5 *
                1024 *
                1024;

            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {
                showWarningAlert(
                    'Format File Tidak Sesuai',
                    'File lampiran hanya boleh PDF, JPG, JPEG, atau PNG.'
                );

                event.target.value =
                    '';

                setProofFile(
                    null
                );

                return;
            }

            if (
                file.size >
                maxSize
            ) {
                showWarningAlert(
                    'Ukuran File Terlalu Besar',
                    'Ukuran file maksimal 5 MB.'
                );

                event.target.value =
                    '';

                setProofFile(
                    null
                );

                return;
            }

            setProofFile(
                file
            );
        };

    const getBackendErrorMessage =
        (
            error
        ) => {
            const responseData =
                error.response
                    ?.data;

            if (
                responseData
                    ?.errors
            ) {
                const firstError =
                    Object.values(
                        responseData.errors
                    )?.[0]?.[0];

                if (
                    firstError
                ) {
                    return firstError;
                }
            }

            if (
                responseData
                    ?.message
            ) {
                return responseData.message;
            }

            if (
                responseData
                    ?.data &&
                typeof responseData.data ===
                    'string'
            ) {
                return responseData.data;
            }

            return 'Pengajuan merchandise gagal dikirim.';
        };

    const validateSchedule =
        async () => {
            if (
                !form.activity_date
            ) {
                await showWarningAlert(
                    'Tanggal Kegiatan Belum Diisi',
                    'Pilih tanggal kegiatan terlebih dahulu.'
                );

                return false;
            }

            if (
                form.activity_date <
                minimumActivityDate
            ) {
                await showWarningAlert(
                    'Pengajuan Terlalu Dekat',
                    'Pengajuan merchandise wajib dilakukan minimal H-4 sebelum tanggal kegiatan.'
                );

                return false;
            }

            if (
                !form.pickup_date
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Belum Diisi',
                    'Pilih tanggal pengambilan merchandise.'
                );

                return false;
            }

            if (
                form.pickup_date <
                todayDate
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Tidak Valid',
                    'Tanggal pengambilan merchandise tidak boleh menggunakan tanggal yang sudah lewat.'
                );

                return false;
            }

            if (
                form.pickup_date >
                form.activity_date
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Tidak Valid',
                    'Tanggal pengambilan merchandise tidak boleh setelah tanggal kegiatan.'
                );

                return false;
            }

            return true;
        };

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                selectedItems.length ===
                0
            ) {
                showWarningAlert(
                    'Keranjang Kosong',
                    'Tambahkan minimal satu merchandise ke keranjang.'
                );

                return;
            }

            if (
                !(await validateSchedule())
            ) {
                return;
            }

            if (
                !proofFile
            ) {
                showWarningAlert(
                    'Lampiran Belum Diunggah',
                    'Upload file bukti undangan atau lampiran terlebih dahulu.'
                );

                return;
            }

            try {
                setSubmitting(
                    true
                );

                showLoadingAlert(
                    'Mengirim Pengajuan',
                    'Mohon tunggu sebentar.'
                );

                const payload =
                    new FormData();

                payload.append(
                    'event_name',
                    form.event_name
                );

                payload.append(
                    'pic_name',
                    form.pic_name
                );

                payload.append(
                    'pic_phone',
                    form.pic_phone
                );

                payload.append(
                    'activity_date',
                    form.activity_date
                );

                payload.append(
                    'pickup_date',
                    form.pickup_date
                );

                payload.append(
                    'institution_name',
                    form.institution_name
                );

                payload.append(
                    'guest_name',
                    form.guest_name
                );

                payload.append(
                    'guest_position',
                    form.guest_position
                );

                payload.append(
                    'user_note',
                    form.user_note
                );

                payload.append(
                    'proof_file',
                    proofFile
                );

                selectedItems.forEach(
                    (
                        item,
                        index
                    ) => {
                        payload.append(
                            `items[${index}][product_id]`,
                            item.product_id
                        );

                        payload.append(
                            `items[${index}][quantity]`,
                            item.quantity
                        );
                    }
                );

                await api.post(
                    '/orders',
                    payload
                );

                closeAlert();

                await showSuccessAlert(
                    'Pengajuan Berhasil',
                    'Pengajuan merchandise berhasil dikirim.'
                );

                setForm(
                    initialForm
                );

                setProofFile(
                    null
                );

                setCart(
                    []
                );

                const fileInput =
                    document.getElementById(
                        'proof_file'
                    );

                if (
                    fileInput
                ) {
                    fileInput.value =
                        '';
                }

                fetchProducts();
            } catch (
                error
            ) {
                console.error(
                    'Checkout merchandise error:',
                    error.response
                        ?.data ||
                        error
                );

                closeAlert();

                showErrorAlert(
                    'Pengajuan Gagal',
                    getBackendErrorMessage(
                        error
                    )
                );
            } finally {
                setSubmitting(
                    false
                );
            }
        };

    const handleReset =
        () => {
            setForm(
                initialForm
            );

            setProofFile(
                null
            );

            setCart(
                []
            );

            const fileInput =
                document.getElementById(
                    'proof_file'
                );

            if (
                fileInput
            ) {
                fileInput.value =
                    '';
            }
        };

    return (
        <div className="container-fluid px-0">
            <div className="row g-4">
                <div className="col-xl-8">
                    <section
                        className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                        }}
                    >
                        <div className="card-body p-4 p-lg-5 text-white">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Pengajuan Merchandise
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Pilih paket merchandise untuk kebutuhan tamu dan kegiatan.
                            </h1>

                            <p
                                className="mb-3 text-white-50"
                                style={{
                                    maxWidth:
                                        760,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Pilih merchandise, isi informasi PIC,
                                jadwal pengambilan, data tamu, dan
                                informasi kegiatan sebelum dikirim ke
                                admin.
                            </p>

                            <div
                                className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2"
                                style={{
                                    background:
                                        'rgba(255,255,255,0.12)',
                                }}
                            >
                                <i className="bi bi-calendar-check-fill" />

                                <span className="small fw-bold">
                                    Pengajuan wajib minimal H-4 sebelum kegiatan
                                </span>
                            </div>
                        </div>
                    </section>

                    {loading ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="spinner-border text-primary mb-3" />

                                <p className="text-muted mb-0">
                                    Memuat katalog merchandise...
                                </p>
                            </div>
                        </div>
                    ) : products.length ===
                      0 ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div
                                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                                    style={{
                                        width:
                                            76,

                                        height:
                                            76,
                                    }}
                                >
                                    <i className="bi bi-inbox fs-1" />
                                </div>

                                <h5 className="fw-black mb-2">
                                    Belum ada merchandise tersedia
                                </h5>

                                <p className="text-muted mb-0">
                                    Data produk merchandise aktif belum tersedia.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {products.map(
                                (
                                    product
                                ) => {
                                    const cartItem =
                                        cart.find(
                                            (
                                                item
                                            ) =>
                                                item.product_id ===
                                                product.id
                                        );

                                    return (
                                        <div
                                            className="col-12 col-md-6 col-xxl-4"
                                            key={
                                                product.id
                                            }
                                        >
                                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden h-100">
                                                <div
                                                    className="bg-primary-subtle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        height:
                                                            150,
                                                    }}
                                                >
                                                    {product.image ? (
                                                        <img
                                                            src={
                                                                product.image
                                                            }
                                                            alt={
                                                                product.name
                                                            }
                                                            className="w-100 h-100 object-fit-cover"
                                                        />
                                                    ) : (
                                                        <div className="fw-black text-primary">
                                                            HUMAS
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="card-body p-4 d-flex flex-column">
                                                    <div className="mb-3">
                                                        <span className="badge rounded-pill text-bg-primary mb-3">
                                                            {product.category
                                                                ?.name ||
                                                                'Merchandise'}
                                                        </span>

                                                        <h5 className="fw-black mb-2">
                                                            {
                                                                product.name
                                                            }
                                                        </h5>

                                                        <p
                                                            className="text-muted small mb-0"
                                                            style={{
                                                                lineHeight:
                                                                    1.7,
                                                            }}
                                                        >
                                                            {product.description ||
                                                                'Tidak ada deskripsi.'}
                                                        </p>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <div className="p-3 rounded-4 border bg-light d-flex align-items-center justify-content-between mb-3">
                                                            <span className="small text-muted fw-bold">
                                                                Stok tersedia
                                                            </span>

                                                            <strong className="fs-4">
                                                                {
                                                                    product.stock
                                                                }
                                                            </strong>
                                                        </div>

                                                        {cartItem ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary rounded-pill"
                                                                    onClick={() =>
                                                                        handleDecreaseQty(
                                                                            product.id
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-dash-lg" />
                                                                </button>

                                                                <div className="form-control text-center fw-bold rounded-pill">
                                                                    {
                                                                        cartItem.quantity
                                                                    }
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary rounded-pill"
                                                                    onClick={() =>
                                                                        handleIncreaseQty(
                                                                            product
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-plus-lg" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary rounded-pill w-100"
                                                                onClick={() =>
                                                                    handleAddToCart(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    product.stock <=
                                                                    0
                                                                }
                                                            >
                                                                <i className="bi bi-cart-plus-fill me-2" />

                                                                Tambah ke Keranjang
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{
                            top:
                                105,
                        }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Keranjang
                                        </h4>

                                        <p className="text-muted mb-0">
                                            {totalQty} item dipilih
                                        </p>
                                    </div>

                                    <div className="icon-box bg-primary-subtle text-primary">
                                        <i className="bi bi-cart-fill fs-4" />
                                    </div>
                                </div>

                                {selectedItems.length ===
                                0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-cart-x fs-1 text-muted" />

                                        <p className="text-muted mb-0 mt-2">
                                            Keranjang masih kosong.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {selectedItems.map(
                                            (
                                                item
                                            ) => (
                                                <div
                                                    key={
                                                        item.product_id
                                                    }
                                                    className="p-3 rounded-4 border"
                                                >
                                                    <div className="d-flex align-items-start justify-content-between gap-2">
                                                        <div>
                                                            <h6 className="fw-black mb-1">
                                                                {
                                                                    item
                                                                        .product
                                                                        .name
                                                                }
                                                            </h6>

                                                            <p className="text-muted small mb-0">
                                                                Qty:{' '}
                                                                {
                                                                    item.quantity
                                                                }
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm rounded-pill"
                                                            onClick={() =>
                                                                handleRemoveItem(
                                                                    item.product_id
                                                                )
                                                            }
                                                        >
                                                            <i className="bi bi-trash" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Tamu &amp; Kegiatan
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi data kegiatan, PIC,
                                    pengambilan merchandise, dan informasi tamu.
                                </p>

                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama Kegiatan
                                        </label>

                                        <input
                                            type="text"
                                            name="event_name"
                                            className="form-control rounded-pill"
                                            value={
                                                form.event_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama PIC
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_name"
                                            className="form-control rounded-pill"
                                            placeholder="Nama penanggung jawab kegiatan"
                                            value={
                                                form.pic_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nomor PIC
                                        </label>

                                        <input
                                            type="tel"
                                            name="pic_phone"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: 081234567890"
                                            value={
                                                form.pic_phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Masukkan nomor WhatsApp atau nomor telepon PIC.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Kegiatan
                                        </label>

                                        <input
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            min={
                                                minimumActivityDate
                                            }
                                            value={
                                                form.activity_date
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text text-primary fw-semibold">
                                            <i className="bi bi-info-circle me-1" />

                                            Pengajuan minimal H-4 dari tanggal kegiatan.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Pengambilan Merchandise
                                        </label>

                                        <input
                                            type="date"
                                            name="pickup_date"
                                            className="form-control rounded-pill"
                                            min={
                                                todayDate
                                            }
                                            max={
                                                form.activity_date ||
                                                undefined
                                            }
                                            value={
                                                form.pickup_date
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                !form.activity_date
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Pengambilan merchandise tidak boleh setelah tanggal kegiatan.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Instansi / Pihak Eksternal
                                        </label>

                                        <input
                                            type="text"
                                            name="institution_name"
                                            className="form-control rounded-pill"
                                            value={
                                                form.institution_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama Tamu
                                        </label>

                                        <input
                                            type="text"
                                            name="guest_name"
                                            className="form-control rounded-pill"
                                            value={
                                                form.guest_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Jabatan Tamu
                                        </label>

                                        <input
                                            type="text"
                                            name="guest_position"
                                            className="form-control rounded-pill"
                                            value={
                                                form.guest_position
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            File Bukti Undangan / Lampiran
                                        </label>

                                        <label
                                            htmlFor="proof_file"
                                            className="d-block p-3 rounded-4 border border-dashed bg-light"
                                            style={{
                                                cursor:
                                                    'pointer',
                                            }}
                                        >
                                            <div className="fw-bold text-primary">
                                                <i className="bi bi-cloud-arrow-up-fill me-2" />

                                                Upload File
                                            </div>

                                            <div className="small text-muted mt-1">
                                                {proofFile
                                                    ? proofFile.name
                                                    : 'PDF, JPG, JPEG, PNG. Maksimal 5 MB.'}
                                            </div>
                                        </label>

                                        <input
                                            type="file"
                                            id="proof_file"
                                            className="d-none"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={
                                                handleFileChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-bold">
                                            Alasan / Catatan Pengajuan
                                        </label>

                                        <textarea
                                            name="user_note"
                                            className="form-control rounded-4"
                                            rows="4"
                                            value={
                                                form.user_note
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
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

                                                    Mengirim...
                                                </>
                                            ) : (
                                                'Checkout Pengajuan'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-dark rounded-pill"
                                            onClick={
                                                handleReset
                                            }
                                            disabled={
                                                submitting
                                            }
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
        </div>
    );
}