import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import api from '../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../utils/sweetAlert';

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

const toInputDate = (
    value
) => {
    if (!value) {
        return '';
    }

    return String(
        value
    ).slice(
        0,
        10
    );
};

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

const extractArray = (
    response
) => {
    const payload =
        response?.data?.data;

    if (
        Array.isArray(
            payload
        )
    ) {
        return payload;
    }

    if (
        payload &&
        Array.isArray(
            payload.data
        )
    ) {
        return payload.data;
    }

    return [];
};

const getBackendErrorMessage = (
    error,
    fallbackMessage
) => {
    const responseData =
        error?.response?.data;

    if (
        responseData?.errors
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

    return (
        responseData?.message ||
        fallbackMessage
    );
};

const formatFileSize = (
    size
) => {
    const numericSize =
        Number(
            size || 0
        );

    if (
        numericSize <
        1024
    ) {
        return `${numericSize} B`;
    }

    if (
        numericSize <
        1024 * 1024
    ) {
        return `${(
            numericSize /
            1024
        ).toFixed(
            1
        )} KB`;
    }

    return `${(
        numericSize /
        (1024 * 1024)
    ).toFixed(
        1
    )} MB`;
};

export default function MerchandiseRevisionForm({
    order,
    onSuccess,
}) {
    const [
        products,
        setProducts,
    ] = useState([]);

    const [
        form,
        setForm,
    ] = useState(
        INITIAL_FORM
    );

    const [
        originalForm,
        setOriginalForm,
    ] = useState(
        INITIAL_FORM
    );

    const [
        cart,
        setCart,
    ] = useState([]);

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

    const [
        fileInputKey,
        setFileInputKey,
    ] = useState(
        0
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

    const initializeForm =
        useCallback(
            () => {
                if (
                    !order
                ) {
                    return;
                }

                const nextForm = {
                    event_name:
                        order.event_name ||
                        '',

                    pic_name:
                        order.pic_name ||
                        '',

                    pic_phone:
                        order.pic_phone ||
                        '',

                    activity_date:
                        toInputDate(
                            order.activity_date
                        ),

                    pickup_date:
                        toInputDate(
                            order.pickup_date
                        ),

                    institution_name:
                        order.institution_name ||
                        '',

                    guest_name:
                        order.guest_name ||
                        '',

                    guest_position:
                        order.guest_position ||
                        '',

                    user_note:
                        order.user_note ||
                        '',
                };

                setForm(
                    nextForm
                );

                setOriginalForm(
                    nextForm
                );

                const initialItems =
                    Array.isArray(
                        order.items
                    )
                        ? order.items
                              .filter(
                                  (
                                      item
                                  ) =>
                                      item.product_id ||
                                      item.product
                                          ?.id
                              )
                              .map(
                                  (
                                      item
                                  ) => ({
                                      product_id:
                                          Number(
                                              item.product_id ||
                                                  item
                                                      .product
                                                      ?.id
                                          ),

                                      quantity:
                                          Number(
                                              item.quantity ||
                                                  1
                                          ),
                                  })
                              )
                        : [];

                setCart(
                    initialItems
                );

                setProofFile(
                    null
                );

                setFileInputKey(
                    (
                        previousKey
                    ) =>
                        previousKey +
                        1
                );
            },
            [
                order,
            ]
        );

    const fetchProducts =
        useCallback(
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
                        extractArray(
                            response
                        );

                    setProducts(
                        productData.filter(
                            (
                                product
                            ) =>
                                product.status ===
                                    'active' &&
                                [
                                    'checkout',
                                    'both',
                                ].includes(
                                    product.type
                                )
                        )
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch revision products error:',
                        error?.response
                            ?.data ||
                            error
                    );

                    setProducts(
                        []
                    );

                    await showErrorAlert(
                        'Gagal Memuat Produk',
                        getBackendErrorMessage(
                            error,
                            'Data merchandise gagal dimuat.'
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
            initializeForm();
        },
        [
            initializeForm,
        ]
    );

    useEffect(
        () => {
            fetchProducts();
        },
        [
            fetchProducts,
        ]
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
                                        Number(
                                            item.id
                                        ) ===
                                        Number(
                                            cartItem.product_id
                                        )
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

    const totalQuantity =
        useMemo(
            () => {
                return selectedItems.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.quantity ||
                                0
                        ),
                    0
                );
            },
            [
                selectedItems,
            ]
        );

    const activityDateChanged =
        form.activity_date !==
        originalForm.activity_date;

    const pickupDateChanged =
        form.pickup_date !==
        originalForm.pickup_date;

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
                    previousForm
                ) => {
                    const nextForm = {
                        ...previousForm,

                        [name]:
                            value,
                    };

                    /*
                     * Jika tanggal kegiatan diganti
                     * dan pickup sekarang berada
                     * sesudah tanggal kegiatan baru,
                     * kosongkan pickup.
                     */
                    if (
                        name ===
                            'activity_date' &&
                        nextForm.pickup_date &&
                        value &&
                        nextForm.pickup_date >
                            value
                    ) {
                        nextForm.pickup_date =
                            '';
                    }

                    return nextForm;
                }
            );
        };

    const handleAddProduct =
        (
            product
        ) => {
            const stock =
                Number(
                    product.stock ||
                        0
                );

            if (
                stock <=
                0
            ) {
                showWarningAlert(
                    'Stok Habis',
                    `${product.name} tidak mempunyai stok tersedia.`
                );

                return;
            }

            setCart(
                (
                    previousCart
                ) => {
                    const existingItem =
                        previousCart.find(
                            (
                                item
                            ) =>
                                Number(
                                    item.product_id
                                ) ===
                                Number(
                                    product.id
                                )
                        );

                    if (
                        existingItem
                    ) {
                        if (
                            Number(
                                existingItem.quantity
                            ) >=
                            stock
                        ) {
                            showWarningAlert(
                                'Stok Tidak Mencukupi',
                                `Stok ${product.name} hanya tersedia ${stock}.`
                            );

                            return previousCart;
                        }

                        return previousCart.map(
                            (
                                item
                            ) =>
                                Number(
                                    item.product_id
                                ) ===
                                Number(
                                    product.id
                                )
                                    ? {
                                          ...item,

                                          quantity:
                                              Number(
                                                  item.quantity
                                              ) +
                                              1,
                                      }
                                    : item
                        );
                    }

                    return [
                        ...previousCart,

                        {
                            product_id:
                                Number(
                                    product.id
                                ),

                            quantity:
                                1,
                        },
                    ];
                }
            );
        };

    const handleIncrease =
        (
            product
        ) => {
            const stock =
                Number(
                    product.stock ||
                        0
                );

            setCart(
                (
                    previousCart
                ) =>
                    previousCart.map(
                        (
                            item
                        ) => {
                            if (
                                Number(
                                    item.product_id
                                ) !==
                                Number(
                                    product.id
                                )
                            ) {
                                return item;
                            }

                            if (
                                Number(
                                    item.quantity
                                ) >=
                                stock
                            ) {
                                showWarningAlert(
                                    'Stok Tidak Mencukupi',
                                    `Stok ${product.name} hanya tersedia ${stock}.`
                                );

                                return item;
                            }

                            return {
                                ...item,

                                quantity:
                                    Number(
                                        item.quantity
                                    ) +
                                    1,
                            };
                        }
                    )
            );
        };

    const handleDecrease =
        (
            productId
        ) => {
            setCart(
                (
                    previousCart
                ) =>
                    previousCart
                        .map(
                            (
                                item
                            ) =>
                                Number(
                                    item.product_id
                                ) ===
                                Number(
                                    productId
                                )
                                    ? {
                                          ...item,

                                          quantity:
                                              Number(
                                                  item.quantity
                                              ) -
                                              1,
                                      }
                                    : item
                        )
                        .filter(
                            (
                                item
                            ) =>
                                Number(
                                    item.quantity
                                ) >
                                0
                        )
            );
        };

    const handleRemove =
        (
            productId
        ) => {
            setCart(
                (
                    previousCart
                ) =>
                    previousCart.filter(
                        (
                            item
                        ) =>
                            Number(
                                item.product_id
                            ) !==
                            Number(
                                productId
                            )
                    )
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
                'image/png',
            ];

            const maximumSize =
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
                    'Lampiran hanya boleh PDF, JPG, JPEG, atau PNG.'
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
                maximumSize
            ) {
                showWarningAlert(
                    'Ukuran File Terlalu Besar',
                    'Ukuran lampiran maksimal 5 MB.'
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

    const validateForm =
        async () => {
            if (
                !form.event_name.trim()
            ) {
                await showWarningAlert(
                    'Nama Kegiatan Wajib Diisi',
                    'Isi nama kegiatan terlebih dahulu.'
                );

                return false;
            }

            if (
                !form.pic_name.trim()
            ) {
                await showWarningAlert(
                    'Nama PIC Wajib Diisi',
                    'Isi nama PIC kegiatan terlebih dahulu.'
                );

                return false;
            }

            if (
                form.pic_name
                    .trim()
                    .length <
                2
            ) {
                await showWarningAlert(
                    'Nama PIC Tidak Valid',
                    'Nama PIC minimal dua karakter.'
                );

                return false;
            }

            if (
                !form.pic_phone.trim()
            ) {
                await showWarningAlert(
                    'Nomor PIC Wajib Diisi',
                    'Isi nomor WhatsApp atau telepon PIC.'
                );

                return false;
            }

            if (
                form.pic_phone
                    .trim()
                    .length <
                8
            ) {
                await showWarningAlert(
                    'Nomor PIC Tidak Valid',
                    'Nomor PIC minimal delapan karakter.'
                );

                return false;
            }

            if (
                !/^[0-9+\-\s().]+$/.test(
                    form.pic_phone.trim()
                )
            ) {
                await showWarningAlert(
                    'Nomor PIC Tidak Valid',
                    'Gunakan format nomor telepon yang benar.'
                );

                return false;
            }

            if (
                !form.activity_date
            ) {
                await showWarningAlert(
                    'Tanggal Wajib Diisi',
                    'Pilih tanggal kegiatan.'
                );

                return false;
            }

            /*
             * Jika tanggal kegiatan tidak berubah,
             * H-4 tidak dipaksa ulang.
             *
             * Jika user mengganti tanggal kegiatan,
             * tanggal baru wajib minimal H-4.
             */
            if (
                activityDateChanged &&
                form.activity_date <
                    minimumActivityDate
            ) {
                await showWarningAlert(
                    'Tanggal Kegiatan Terlalu Dekat',
                    'Jika tanggal kegiatan diubah saat revisi, tanggal baru wajib minimal H-4 dari hari ini.'
                );

                return false;
            }

            if (
                !form.pickup_date
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Wajib Diisi',
                    'Pilih tanggal pengambilan merchandise.'
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

            /*
             * Pickup lama boleh dipertahankan ketika
             * hanya melakukan revisi.
             *
             * Jika pickup diganti, pickup baru tidak
             * boleh menggunakan tanggal yang sudah lewat.
             */
            if (
                pickupDateChanged &&
                form.pickup_date <
                    todayDate
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Tidak Valid',
                    'Jika tanggal pengambilan diubah, tanggal baru tidak boleh menggunakan tanggal yang sudah lewat.'
                );

                return false;
            }

            if (
                !form.institution_name.trim()
            ) {
                await showWarningAlert(
                    'Instansi Wajib Diisi',
                    'Isi nama instansi atau pihak eksternal.'
                );

                return false;
            }

            if (
                !form.guest_name.trim()
            ) {
                await showWarningAlert(
                    'Nama Tamu Wajib Diisi',
                    'Isi nama tamu.'
                );

                return false;
            }

            if (
                !form.guest_position.trim()
            ) {
                await showWarningAlert(
                    'Jabatan Wajib Diisi',
                    'Isi jabatan tamu.'
                );

                return false;
            }

            if (
                form.user_note
                    .trim()
                    .length <
                5
            ) {
                await showWarningAlert(
                    'Catatan Belum Lengkap',
                    'Alasan atau catatan pengajuan minimal lima karakter.'
                );

                return false;
            }

            if (
                selectedItems.length ===
                0
            ) {
                await showWarningAlert(
                    'Merchandise Belum Dipilih',
                    'Pilih minimal satu merchandise.'
                );

                return false;
            }

            const invalidStockItem =
                selectedItems.find(
                    (
                        item
                    ) =>
                        Number(
                            item.quantity
                        ) >
                        Number(
                            item.product
                                ?.stock ||
                                0
                        )
                );

            if (
                invalidStockItem
            ) {
                await showWarningAlert(
                    'Stok Tidak Mencukupi',
                    `Jumlah ${invalidStockItem.product.name} melebihi stok yang tersedia.`
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
                !(await validateForm())
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Kirim Ulang Pengajuan?',

                    text:
                        'Data perbaikan akan dikirim kembali kepada admin dan status berubah menjadi menunggu.',

                    confirmButtonText:
                        'Ya, kirim ulang',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#2563eb',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setSubmitting(
                    true
                );

                showLoadingAlert(
                    'Mengirim Perbaikan',
                    'Mohon tunggu sebentar.'
                );

                const payload =
                    new FormData();

                payload.append(
                    'event_name',
                    form.event_name.trim()
                );

                payload.append(
                    'pic_name',
                    form.pic_name.trim()
                );

                payload.append(
                    'pic_phone',
                    form.pic_phone.trim()
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
                    form.institution_name.trim()
                );

                payload.append(
                    'guest_name',
                    form.guest_name.trim()
                );

                payload.append(
                    'guest_position',
                    form.guest_position.trim()
                );

                payload.append(
                    'user_note',
                    form.user_note.trim()
                );

                if (
                    proofFile
                ) {
                    payload.append(
                        'proof_file',
                        proofFile
                    );
                }

                selectedItems.forEach(
                    (
                        item,
                        index
                    ) => {
                        payload.append(
                            `items[${index}][product_id]`,
                            String(
                                item.product_id
                            )
                        );

                        payload.append(
                            `items[${index}][quantity]`,
                            String(
                                item.quantity
                            )
                        );
                    }
                );

                const response =
                    await api.post(
                        `/orders/${order.id}/resubmit`,
                        payload
                    );

                closeAlert();

                await showSuccessAlert(
                    'Perbaikan Terkirim',
                    response?.data
                        ?.message ||
                        'Pengajuan berhasil dikirim ulang.'
                );

                if (
                    typeof onSuccess ===
                    'function'
                ) {
                    await onSuccess(
                        response?.data
                            ?.data ||
                            null
                    );
                }
            } catch (
                error
            ) {
                console.error(
                    'Resubmit merchandise error:',
                    error?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Pengiriman Gagal',
                    getBackendErrorMessage(
                        error,
                        'Perbaikan pengajuan gagal dikirim.'
                    )
                );
            } finally {
                setSubmitting(
                    false
                );
            }
        };

    if (
        order?.status !==
        'revision'
    ) {
        return null;
    }

    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4">
                <div className="d-flex align-items-start gap-3 mb-4">
                    <div className="icon-box bg-warning-subtle text-warning flex-shrink-0">
                        <i className="bi bi-pencil-square fs-4" />
                    </div>

                    <div>
                        <h4 className="fw-black mb-1">
                            Perbaiki Pengajuan Merchandise
                        </h4>

                        <p className="text-muted mb-0">
                            Sesuaikan data berdasarkan catatan revisi admin, lalu kirim kembali.
                        </p>
                    </div>
                </div>

                <div className="alert alert-warning border-0 rounded-4 mb-4">
                    <div className="fw-black mb-1">
                        Catatan Revisi Admin
                    </div>

                    <div
                        style={{
                            whiteSpace:
                                'pre-line',
                        }}
                    >
                        {order.admin_note ||
                            'Admin tidak memberikan catatan tambahan.'}
                    </div>
                </div>

                <div className="alert alert-info border-0 rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-info-circle-fill fs-5" />

                        <div>
                            <div className="fw-black mb-1">
                                Ketentuan Jadwal
                            </div>

                            <div className="small">
                                Jika tanggal kegiatan lama tidak diubah, pengajuan tetap dapat dikirim ulang.
                                Jika tanggal kegiatan diubah, tanggal baru wajib minimal H-4.
                                Tanggal pengambilan tidak boleh setelah tanggal kegiatan.
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-warning mb-3" />

                        <p className="text-muted mb-0">
                            Memuat data merchandise...
                        </p>
                    </div>
                ) : (
                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <div className="row g-4">
                            <div className="col-xl-7">
                                <div className="row g-3">
                                    <div className="col-md-6">
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
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Nama PIC
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_name"
                                            className="form-control rounded-pill"
                                            value={
                                                form.pic_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            placeholder="Nama penanggung jawab kegiatan"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Nomor PIC
                                        </label>

                                        <input
                                            type="tel"
                                            name="pic_phone"
                                            className="form-control rounded-pill"
                                            value={
                                                form.pic_phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="30"
                                            placeholder="Contoh: 081234567890"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Tanggal Kegiatan
                                        </label>

                                        <input
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form.activity_date
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            {activityDateChanged
                                                ? `Tanggal baru minimal ${minimumActivityDate}.`
                                                : 'Tanggal lama dapat dipertahankan saat revisi.'}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Tanggal Pengambilan Merchandise
                                        </label>

                                        <input
                                            type="date"
                                            name="pickup_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form.pickup_date
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            max={
                                                form.activity_date ||
                                                undefined
                                            }
                                            disabled={
                                                submitting ||
                                                !form.activity_date
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            {pickupDateChanged
                                                ? 'Tanggal baru tidak boleh lewat dan tidak boleh setelah kegiatan.'
                                                : 'Tanggal pengambilan lama dapat dipertahankan.'}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
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
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
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
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
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
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Lampiran Baru

                                            <span className="text-muted fw-normal">
                                                {' '}
                                                (Opsional)
                                            </span>
                                        </label>

                                        <input
                                            key={
                                                fileInputKey
                                            }
                                            type="file"
                                            className="form-control rounded-4"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={
                                                handleFileChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                        />

                                        <div className="form-text">
                                            Kosongkan untuk tetap menggunakan lampiran sebelumnya.
                                        </div>

                                        {proofFile && (
                                            <div className="small fw-bold text-success mt-2">
                                                {proofFile.name}

                                                {' • '}

                                                {formatFileSize(
                                                    proofFile.size
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">
                                            Alasan / Catatan Pengajuan
                                        </label>

                                        <textarea
                                            name="user_note"
                                            className="form-control rounded-4"
                                            rows="5"
                                            value={
                                                form.user_note
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="5000"
                                            required
                                        />

                                        <div className="form-text text-end">
                                            {
                                                form.user_note.length
                                            }
                                            /5000 karakter
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-5">
                                <div className="p-3 rounded-4 bg-light border mb-3">
                                    <div className="d-flex justify-content-between gap-3">
                                        <div>
                                            <div className="small text-muted">
                                                Merchandise Dipilih
                                            </div>

                                            <div className="fw-black">
                                                {
                                                    selectedItems.length
                                                }{' '}
                                                produk
                                            </div>
                                        </div>

                                        <div className="text-end">
                                            <div className="small text-muted">
                                                Total Jumlah
                                            </div>

                                            <div className="fw-black">
                                                {
                                                    totalQuantity
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="d-flex flex-column gap-3 mb-4"
                                    style={{
                                        maxHeight:
                                            360,

                                        overflowY:
                                            'auto',
                                    }}
                                >
                                    {products.map(
                                        (
                                            product
                                        ) => {
                                            const cartItem =
                                                cart.find(
                                                    (
                                                        item
                                                    ) =>
                                                        Number(
                                                            item.product_id
                                                        ) ===
                                                        Number(
                                                            product.id
                                                        )
                                                );

                                            return (
                                                <div
                                                    key={
                                                        product.id
                                                    }
                                                    className="p-3 rounded-4 border"
                                                >
                                                    <div className="d-flex align-items-start justify-content-between gap-3">
                                                        <div>
                                                            <div className="fw-black">
                                                                {
                                                                    product.name
                                                                }
                                                            </div>

                                                            <div className="small text-muted">
                                                                Stok:{' '}
                                                                {
                                                                    product.stock
                                                                }
                                                            </div>
                                                        </div>

                                                        {!cartItem && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary rounded-pill"
                                                                onClick={() =>
                                                                    handleAddProduct(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    submitting ||
                                                                    Number(
                                                                        product.stock
                                                                    ) <=
                                                                        0
                                                                }
                                                            >
                                                                Tambah
                                                            </button>
                                                        )}
                                                    </div>

                                                    {cartItem && (
                                                        <div className="d-flex align-items-center gap-2 mt-3">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary rounded-circle"
                                                                onClick={() =>
                                                                    handleDecrease(
                                                                        product.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    submitting
                                                                }
                                                            >
                                                                <i className="bi bi-dash-lg" />
                                                            </button>

                                                            <div className="form-control form-control-sm text-center fw-bold rounded-pill">
                                                                {
                                                                    cartItem.quantity
                                                                }
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary rounded-circle"
                                                                onClick={() =>
                                                                    handleIncrease(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    submitting
                                                                }
                                                            >
                                                                <i className="bi bi-plus-lg" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger rounded-circle"
                                                                onClick={() =>
                                                                    handleRemove(
                                                                        product.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    submitting
                                                                }
                                                            >
                                                                <i className="bi bi-trash" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    )}
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill"
                                        disabled={
                                            submitting ||
                                            selectedItems.length ===
                                                0
                                        }
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />

                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-send-check-fill me-2" />

                                                Kirim Ulang Pengajuan
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill"
                                        onClick={
                                            initializeForm
                                        }
                                        disabled={
                                            submitting
                                        }
                                    >
                                        <i className="bi bi-arrow-counterclockwise me-2" />

                                        Kembalikan Data Awal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}