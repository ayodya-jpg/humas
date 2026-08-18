import {
    useCallback,
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

const REQUEST_TYPE_BORROW =
    'borrow';

const REQUEST_TYPE_ASSET_REQUEST =
    'asset_request';

const ACTIVE_BORROW_STATUSES = [
    'pending',
    'approved',
    'borrowed',
];

const initialForm = {
    request_type:
        REQUEST_TYPE_BORROW,

    pic_name:
        '',

    pic_phone:
        '',

    purpose:
        '',

    activity_date:
        '',

    borrow_date:
        '',

    return_date:
        '',
};

const padNumber = (
    number
) => {
    return String(
        number
    ).padStart(
        2,
        '0'
    );
};

const toLocalDateString = (
    date
) => {
    return [
        date.getFullYear(),
        padNumber(
            date.getMonth() +
                1
        ),
        padNumber(
            date.getDate()
        ),
    ].join(
        '-'
    );
};

const addDays = (
    date,
    days
) => {
    const nextDate =
        new Date(
            date
        );

    nextDate.setDate(
        nextDate.getDate() +
            days
    );

    return nextDate;
};

const formatDate = (
    date
) => {
    if (
        !date
    ) {
        return '-';
    }

    if (
        typeof date ===
            'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            date
        )
    ) {
        const [
            year,
            month,
            day,
        ] =
            date
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
    }

    const parsedDate =
        new Date(
            date
        );

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate
        .toLocaleDateString(
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

const normalizePhone = (
    value
) => {
    return String(
        value || ''
    ).replace(
        /[^0-9+\-\s().]/g,
        ''
    );
};

const getBackendErrorMessage = (
    error,
    fallbackMessage =
        'Pengajuan gagal dikirim.'
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

const getRequestTypeLabel = (
    requestType
) => {
    if (
        requestType ===
        REQUEST_TYPE_ASSET_REQUEST
    ) {
        return 'Request Barang';
    }

    return 'Peminjaman Barang';
};

const getStatusLabel = (
    status
) => {
    return {
        pending:
            'Menunggu',

        approved:
            'Disetujui',

        borrowed:
            'Sedang Dipinjam',

        returned:
            'Dikembalikan',

        rejected:
            'Ditolak',

        completed:
            'Selesai',
    }[status] ||
        status ||
        '-';
};

export default function SekpimBorrowingRequestPage() {
    const [
        products,
        setProducts,
    ] = useState(
        []
    );

    const [
        cart,
        setCart,
    ] = useState(
        []
    );

    const [
        form,
        setForm,
    ] = useState(
        initialForm
    );

    const [
        search,
        setSearch,
    ] = useState(
        ''
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
        activeBorrow,
        setActiveBorrow,
    ] = useState(
        null
    );

    const [
        checkingBorrowStatus,
        setCheckingBorrowStatus,
    ] = useState(
        true
    );

    const today =
        useMemo(
            () =>
                toLocalDateString(
                    new Date()
                ),
            []
        );

    const minimumActivityDate =
        useMemo(
            () =>
                toLocalDateString(
                    addDays(
                        new Date(),
                        4
                    )
                ),
            []
        );

    /*
    |--------------------------------------------------------------------------
    | CHECK ACTIVE BORROW
    |--------------------------------------------------------------------------
    |
    | Backend tetap menjadi pengaman utama.
    |
    | Frontend hanya memberikan UX agar user langsung tahu
    | bahwa Peminjaman Barang sementara tidak tersedia.
    |
    */

    const fetchActiveBorrow =
        useCallback(
            async () => {
                try {
                    setCheckingBorrowStatus(
                        true
                    );

                    const response =
                        await api.get(
                            '/my-borrow-requests'
                        );

                    const data =
                        response
                            ?.data
                            ?.data;

                    const requests =
                        Array.isArray(
                            data
                        )
                            ? data
                            : Array.isArray(
                                  data?.data
                              )
                              ? data.data
                              : [];

                    const found =
                        requests.find(
                            (
                                item
                            ) => {
                                const requestType =
                                    item
                                        ?.request_type ||
                                    REQUEST_TYPE_BORROW;

                                return (
                                    requestType ===
                                        REQUEST_TYPE_BORROW &&
                                    ACTIVE_BORROW_STATUSES.includes(
                                        item
                                            ?.status
                                    )
                                );
                            }
                        );

                    setActiveBorrow(
                        found ||
                            null
                    );

                    /*
                     * Jika user punya peminjaman aktif,
                     * otomatis arahkan pilihan awal ke Request Barang.
                     */
                    if (
                        found
                    ) {
                        setForm(
                            (
                                previous
                            ) => ({
                                ...previous,

                                request_type:
                                    REQUEST_TYPE_ASSET_REQUEST,

                                return_date:
                                    '',
                            })
                        );
                    }
                } catch (
                    error
                ) {
                    console.error(
                        'Check active borrowing error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    /*
                     * Tidak memblok form jika endpoint riwayat gagal,
                     * karena backend store tetap akan melakukan validasi.
                     */
                    setActiveBorrow(
                        null
                    );
                } finally {
                    setCheckingBorrowStatus(
                        false
                    );
                }
            },
            []
        );

    /*
    |--------------------------------------------------------------------------
    | FETCH PRODUCTS
    |--------------------------------------------------------------------------
    */

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
                        response
                            ?.data
                            ?.data ||
                        [];

                    setProducts(
                        Array.isArray(
                            productData
                        )
                            ? productData
                            : []
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch SEKPiM products error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Data',
                        getBackendErrorMessage(
                            error,
                            'Data barang SEKPiM gagal dimuat dari server.'
                        )
                    );

                    setProducts(
                        []
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
            fetchProducts();
            fetchActiveBorrow();
        },
        [
            fetchProducts,
            fetchActiveBorrow,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER PRODUCT BY REQUEST TYPE
    |--------------------------------------------------------------------------
    */

    const availableProducts =
        useMemo(
            () => {
                return products.filter(
                    (
                        product
                    ) => {
                        if (
                            product
                                ?.status !==
                            'active'
                        ) {
                            return false;
                        }

                        let sekpimType =
                            product
                                ?.sekpim_item_type;

                        /*
                         * Legacy fallback:
                         *
                         * Produk lama type borrow/both
                         * dianggap barang peminjaman.
                         */
                        if (
                            !sekpimType &&
                            [
                                'borrow',
                                'both',
                            ].includes(
                                product
                                    ?.type
                            )
                        ) {
                            sekpimType =
                                REQUEST_TYPE_BORROW;
                        }

                        if (
                            form
                                .request_type ===
                            REQUEST_TYPE_BORROW
                        ) {
                            return [
                                'borrow',
                                'both',
                            ].includes(
                                sekpimType
                            );
                        }

                        if (
                            form
                                .request_type ===
                            REQUEST_TYPE_ASSET_REQUEST
                        ) {
                            return [
                                'asset_request',
                                'both',
                            ].includes(
                                sekpimType
                            );
                        }

                        return false;
                    }
                );
            },
            [
                products,
                form.request_type,
            ]
        );

    const filteredProducts =
        useMemo(
            () => {
                const searchValue =
                    search
                        .trim()
                        .toLowerCase();

                if (
                    !searchValue
                ) {
                    return availableProducts;
                }

                return availableProducts.filter(
                    (
                        product
                    ) => {
                        return [
                            product
                                ?.name,

                            product
                                ?.description,

                            product
                                ?.category
                                ?.name,
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' '
                            )
                            .toLowerCase()
                            .includes(
                                searchValue
                            );
                    }
                );
            },
            [
                availableProducts,
                search,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | SELECTED ITEMS
    |--------------------------------------------------------------------------
    */

    const selectedItems =
        useMemo(
            () => {
                return cart
                    .map(
                        (
                            cartItem
                        ) => {
                            const product =
                                availableProducts.find(
                                    (
                                        item
                                    ) =>
                                        item.id ===
                                        cartItem
                                            .product_id
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
                availableProducts,
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

    /*
    |--------------------------------------------------------------------------
    | REQUEST TYPE
    |--------------------------------------------------------------------------
    */

    const handleRequestTypeChange =
        async (
            requestType
        ) => {
            if (
                requestType ===
                    REQUEST_TYPE_BORROW &&
                activeBorrow
            ) {
                await showWarningAlert(
                    'Masih Ada Peminjaman Aktif',
                    `Kamu masih memiliki peminjaman ${activeBorrow.borrow_code || ''} dengan status ${getStatusLabel(
                        activeBorrow.status
                    )}. Selesaikan peminjaman tersebut terlebih dahulu sebelum membuat peminjaman baru.`
                );

                return;
            }

            setForm(
                (
                    previous
                ) => ({
                    ...previous,

                    request_type:
                        requestType,

                    /*
                     * Request Barang tidak mempunyai
                     * tanggal pengembalian.
                     */
                    return_date:
                        requestType ===
                        REQUEST_TYPE_ASSET_REQUEST
                            ? ''
                            : previous
                                  .return_date,
                })
            );

            /*
             * Produk tiap jenis berbeda.
             * Keranjang wajib dikosongkan ketika ganti jenis.
             */
            setCart(
                []
            );

            setSearch(
                ''
            );
        };

    /*
    |--------------------------------------------------------------------------
    | CART
    |--------------------------------------------------------------------------
    */

    const handleAddToCart =
        async (
            product
        ) => {
            if (
                Number(
                    product.stock ||
                        0
                ) <=
                0
            ) {
                await showWarningAlert(
                    'Stok Habis',
                    'Barang ini tidak memiliki stok tersedia.'
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
                                item.product_id ===
                                product.id
                        );

                    if (
                        existingItem
                    ) {
                        if (
                            existingItem.quantity >=
                            Number(
                                product.stock ||
                                    0
                            )
                        ) {
                            showWarningAlert(
                                'Stok Tidak Cukup',
                                `Stok ${product.name} hanya tersedia ${product.stock}.`
                            );

                            return previousCart;
                        }

                        return previousCart.map(
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
                        ...previousCart,

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
                    previousCart
                ) => {
                    return previousCart
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
                        );
                }
            );
        };

    const handleIncreaseQty =
        async (
            product
        ) => {
            const currentItem =
                cart.find(
                    (
                        item
                    ) =>
                        item.product_id ===
                        product.id
                );

            if (
                !currentItem
            ) {
                await handleAddToCart(
                    product
                );

                return;
            }

            if (
                currentItem.quantity >=
                Number(
                    product.stock ||
                        0
                )
            ) {
                await showWarningAlert(
                    'Stok Tidak Cukup',
                    `Stok ${product.name} hanya tersedia ${product.stock}.`
                );

                return;
            }

            setCart(
                (
                    previousCart
                ) =>
                    previousCart.map(
                        (
                            item
                        ) => {
                            if (
                                item.product_id !==
                                product.id
                            ) {
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
                    previousCart
                ) =>
                    previousCart.filter(
                        (
                            item
                        ) =>
                            item.product_id !==
                            productId
                    )
            );
        };

    /*
    |--------------------------------------------------------------------------
    | FORM CHANGE
    |--------------------------------------------------------------------------
    */

    const handleChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            if (
                name ===
                'pic_phone'
            ) {
                setForm(
                    (
                        previous
                    ) => ({
                        ...previous,

                        pic_phone:
                            normalizePhone(
                                value
                            ),
                    })
                );

                return;
            }

            setForm(
                (
                    previous
                ) => {
                    const nextForm = {
                        ...previous,
                        [name]:
                            value,
                    };

                    /*
                     * Jika tanggal kegiatan berubah dan
                     * tanggal pengambilan jadi lebih besar,
                     * kosongkan tanggal pengambilan.
                     */
                    if (
                        name ===
                            'activity_date' &&
                        previous
                            .borrow_date &&
                        value &&
                        previous
                            .borrow_date >
                            value
                    ) {
                        nextForm.borrow_date =
                            '';

                        nextForm.return_date =
                            '';
                    }

                    /*
                     * Jika tanggal pengambilan berubah dan
                     * tanggal return lebih awal,
                     * kosongkan return.
                     */
                    if (
                        name ===
                            'borrow_date' &&
                        previous
                            .return_date &&
                        value &&
                        previous
                            .return_date <
                            value
                    ) {
                        nextForm.return_date =
                            '';
                    }

                    return nextForm;
                }
            );
        };

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    const validateForm =
        async () => {
            if (
                form
                    .request_type ===
                    REQUEST_TYPE_BORROW &&
                activeBorrow
            ) {
                await showWarningAlert(
                    'Peminjaman Belum Selesai',
                    `Kamu masih memiliki peminjaman ${activeBorrow.borrow_code || ''} dengan status ${getStatusLabel(
                        activeBorrow.status
                    )}.`
                );

                return false;
            }

            if (
                selectedItems.length ===
                0
            ) {
                await showWarningAlert(
                    'Keranjang Kosong',
                    form
                        .request_type ===
                    REQUEST_TYPE_BORROW
                        ? 'Tambahkan minimal satu barang yang akan dipinjam.'
                        : 'Tambahkan minimal satu barang yang ingin diminta.'
                );

                return false;
            }

            if (
                !form
                    .pic_name
                    .trim()
            ) {
                await showWarningAlert(
                    'Nama PIC Wajib Diisi',
                    'Isi nama PIC kegiatan terlebih dahulu.'
                );

                return false;
            }

            if (
                form
                    .pic_name
                    .trim()
                    .length <
                3
            ) {
                await showWarningAlert(
                    'Nama PIC Tidak Valid',
                    'Nama PIC minimal tiga karakter.'
                );

                return false;
            }

            if (
                !form
                    .pic_phone
                    .trim()
            ) {
                await showWarningAlert(
                    'Nomor PIC Wajib Diisi',
                    'Isi nomor WhatsApp/telepon PIC terlebih dahulu.'
                );

                return false;
            }

            if (
                form
                    .pic_phone
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
                !form
                    .purpose
                    .trim()
            ) {
                await showWarningAlert(
                    'Keperluan Wajib Diisi',
                    'Isi keperluan pengajuan terlebih dahulu.'
                );

                return false;
            }

            if (
                form
                    .purpose
                    .trim()
                    .length <
                5
            ) {
                await showWarningAlert(
                    'Keperluan Terlalu Pendek',
                    'Keperluan minimal lima karakter.'
                );

                return false;
            }

            if (
                !form
                    .activity_date
            ) {
                await showWarningAlert(
                    'Tanggal Kegiatan Wajib Diisi',
                    'Pilih tanggal pelaksanaan kegiatan.'
                );

                return false;
            }

            if (
                form
                    .activity_date <
                minimumActivityDate
            ) {
                await showWarningAlert(
                    'Belum Memenuhi H-4',
                    `Tanggal kegiatan paling cepat ${formatDate(
                        minimumActivityDate
                    )}. Pengajuan harus dilakukan minimal H-4.`
                );

                return false;
            }

            if (
                !form
                    .borrow_date
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Wajib Diisi',
                    'Pilih tanggal pengambilan barang.'
                );

                return false;
            }

            if (
                form
                    .borrow_date <
                today
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Tidak Valid',
                    'Tanggal pengambilan tidak boleh sebelum hari ini.'
                );

                return false;
            }

            if (
                form
                    .borrow_date >
                form
                    .activity_date
            ) {
                await showWarningAlert(
                    'Tanggal Pengambilan Tidak Valid',
                    'Tanggal pengambilan tidak boleh setelah tanggal kegiatan.'
                );

                return false;
            }

            if (
                form
                    .request_type ===
                REQUEST_TYPE_BORROW
            ) {
                if (
                    !form
                        .return_date
                ) {
                    await showWarningAlert(
                        'Tanggal Pengembalian Wajib Diisi',
                        'Pilih tanggal pengembalian barang.'
                    );

                    return false;
                }

                if (
                    form
                        .return_date <
                    form
                        .borrow_date
                ) {
                    await showWarningAlert(
                        'Tanggal Pengembalian Tidak Valid',
                        'Tanggal pengembalian tidak boleh sebelum tanggal pengambilan.'
                    );

                    return false;
                }
            }

            return true;
        };

    /*
    |--------------------------------------------------------------------------
    | SUBMIT
    |--------------------------------------------------------------------------
    */

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

            try {
                setSubmitting(
                    true
                );

                showLoadingAlert(
                    'Mengirim Pengajuan',
                    'Mohon tunggu sebentar.'
                );

                const payload = {
                    request_type:
                        form
                            .request_type,

                    pic_name:
                        form
                            .pic_name
                            .trim(),

                    pic_phone:
                        form
                            .pic_phone
                            .trim(),

                    purpose:
                        form
                            .purpose
                            .trim(),

                    activity_date:
                        form
                            .activity_date,

                    /*
                     * Backend menggunakan borrow_date
                     * sebagai tanggal pengambilan.
                     */
                    borrow_date:
                        form
                            .borrow_date,

                    return_date:
                        form
                            .request_type ===
                        REQUEST_TYPE_BORROW
                            ? form
                                  .return_date
                            : null,

                    items:
                        selectedItems.map(
                            (
                                item
                            ) => ({
                                product_id:
                                    item
                                        .product_id,

                                quantity:
                                    item
                                        .quantity,
                            })
                        ),
                };

                const response =
                    await api.post(
                        '/borrow-requests',
                        payload
                    );

                closeAlert();

                await showSuccessAlert(
                    'Pengajuan Berhasil',
                    response
                        ?.data
                        ?.message ||
                        (
                            form
                                .request_type ===
                            REQUEST_TYPE_BORROW
                                ? 'Pengajuan peminjaman barang berhasil dikirim.'
                                : 'Request barang berhasil dikirim.'
                        )
                );

                setCart(
                    []
                );

                setSearch(
                    ''
                );

                setForm({
                    ...initialForm,

                    request_type:
                        activeBorrow
                            ? REQUEST_TYPE_ASSET_REQUEST
                            : REQUEST_TYPE_BORROW,
                });

                await Promise.all([
                    fetchProducts(),
                    fetchActiveBorrow(),
                ]);
            } catch (
                error
            ) {
                console.error(
                    'Submit SEKPiM request error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Pengajuan Gagal',
                    getBackendErrorMessage(
                        error,
                        form
                            .request_type ===
                        REQUEST_TYPE_BORROW
                            ? 'Pengajuan peminjaman barang gagal dikirim.'
                            : 'Request barang gagal dikirim.'
                    )
                );

                /*
                 * Jika backend menolak karena masih ada
                 * peminjaman aktif, refresh status.
                 */
                await fetchActiveBorrow();
            } finally {
                setSubmitting(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | RESET
    |--------------------------------------------------------------------------
    */

    const handleReset =
        () => {
            setForm({
                ...initialForm,

                request_type:
                    activeBorrow
                        ? REQUEST_TYPE_ASSET_REQUEST
                        : form
                              .request_type,
            });

            setCart(
                []
            );

            setSearch(
                ''
            );
        };

    /*
    |--------------------------------------------------------------------------
    | LABELS
    |--------------------------------------------------------------------------
    */

    const isBorrow =
        form.request_type ===
        REQUEST_TYPE_BORROW;

    const isAssetRequest =
        form.request_type ===
        REQUEST_TYPE_ASSET_REQUEST;

    const pageTitle =
        isBorrow
            ? 'Peminjaman Barang SEKPiM'
            : 'Request Barang SEKPiM';

    const catalogDescription =
        isBorrow
            ? 'Barang yang dipinjam wajib dikembalikan setelah digunakan.'
            : 'Barang yang diminta akan diberikan kepada pemohon dan tidak perlu dikembalikan.';

    return (
        <div className="container-fluid px-0">
            {activeBorrow && (
                <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <div className="fs-4">
                            <i className="bi bi-exclamation-triangle-fill" />
                        </div>

                        <div className="flex-grow-1">
                            <div className="fw-black mb-1">
                                Kamu masih memiliki Peminjaman Barang aktif
                            </div>

                            <div className="small mb-2">
                                Peminjaman{' '}

                                <strong>
                                    {activeBorrow
                                        .borrow_code ||
                                        `BRW-${activeBorrow.id}`}
                                </strong>{' '}

                                masih berstatus{' '}

                                <strong>
                                    {getStatusLabel(
                                        activeBorrow
                                            .status
                                    )}
                                </strong>
                                .
                            </div>

                            <div className="small">
                                Peminjaman Barang baru dapat dibuat setelah barang pada pengajuan sebelumnya dikembalikan dan diselesaikan admin. Kamu tetap dapat menggunakan fitur{' '}

                                <strong>
                                    Request Barang
                                </strong>
                                .
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'linear-gradient(135deg, rgba(15,118,110,0.97), rgba(15,23,42,0.99))',
                    }}
                >
                    <span className="badge rounded-pill bg-white text-success px-3 py-2 mb-3">
                        Layanan SEKPiM
                    </span>

                    <div className="row g-4 align-items-center">
                        <div className="col-lg-8">
                            <h1 className="display-6 fw-black mb-3">
                                Ajukan kebutuhan barang SEKPiM.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth:
                                        760,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Pilih Peminjaman Barang untuk perlengkapan yang harus dikembalikan, atau Request Barang untuk kebutuhan seperti kertas kop dan map yang tidak dikembalikan.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-25">
                                <div className="small text-white-50 mb-1">
                                    Ketentuan waktu
                                </div>

                                <div className="fs-4 fw-black">
                                    Minimal H-4
                                </div>

                                <div className="small text-white-50 mt-2">
                                    Tanggal kegiatan paling cepat{' '}

                                    <strong className="text-white">
                                        {formatDate(
                                            minimumActivityDate
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="mb-4">
                        <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2 mb-3">
                            Langkah 1
                        </span>

                        <h3 className="fw-black mb-2">
                            Pilih jenis pengajuan
                        </h3>

                        <p className="text-muted mb-0">
                            Jenis pengajuan menentukan barang yang tersedia serta proses setelah approval.
                        </p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-6">
                            <button
                                type="button"
                                className={`w-100 h-100 text-start border rounded-5 p-4 ${
                                    isBorrow
                                        ? 'border-success bg-success-subtle shadow-sm'
                                        : 'bg-white'
                                }`}
                                onClick={() =>
                                    handleRequestTypeChange(
                                        REQUEST_TYPE_BORROW
                                    )
                                }
                                disabled={
                                    checkingBorrowStatus
                                }
                                style={{
                                    cursor:
                                        activeBorrow
                                            ? 'not-allowed'
                                            : 'pointer',
                                }}
                            >
                                <div className="d-flex align-items-start gap-3">
                                    <div
                                        className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                                            isBorrow
                                                ? 'bg-success text-white'
                                                : 'bg-light text-success'
                                        }`}
                                        style={{
                                            width:
                                                54,

                                            height:
                                                54,
                                        }}
                                    >
                                        <i className="bi bi-box-arrow-up-right fs-4" />
                                    </div>

                                    <div className="flex-grow-1">
                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                            <h5 className="fw-black mb-0">
                                                Peminjaman Barang
                                            </h5>

                                            {activeBorrow && (
                                                <span className="badge rounded-pill text-bg-warning">
                                                    Terkunci
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-muted mb-3">
                                            Untuk barang seperti taplak meja, piring, gelas, dan perlengkapan yang wajib dikembalikan.
                                        </p>

                                        <div className="small fw-bold text-success">
                                            <i className="bi bi-arrow-return-left me-2" />

                                            Barang wajib dikembalikan
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="col-md-6">
                            <button
                                type="button"
                                className={`w-100 h-100 text-start border rounded-5 p-4 ${
                                    isAssetRequest
                                        ? 'border-primary bg-primary-subtle shadow-sm'
                                        : 'bg-white'
                                }`}
                                onClick={() =>
                                    handleRequestTypeChange(
                                        REQUEST_TYPE_ASSET_REQUEST
                                    )
                                }
                                disabled={
                                    checkingBorrowStatus
                                }
                                style={{
                                    cursor:
                                        'pointer',
                                }}
                            >
                                <div className="d-flex align-items-start gap-3">
                                    <div
                                        className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                                            isAssetRequest
                                                ? 'bg-primary text-white'
                                                : 'bg-light text-primary'
                                        }`}
                                        style={{
                                            width:
                                                54,

                                            height:
                                                54,
                                        }}
                                    >
                                        <i className="bi bi-box2-heart-fill fs-4" />
                                    </div>

                                    <div className="flex-grow-1">
                                        <h5 className="fw-black mb-2">
                                            Request Barang
                                        </h5>

                                        <p className="text-muted mb-3">
                                            Untuk barang seperti kertas kop, map Tel-U, dan kebutuhan lain yang diberikan kepada pemohon.
                                        </p>

                                        <div className="small fw-bold text-primary">
                                            <i className="bi bi-check-circle-fill me-2" />

                                            Tidak perlu dikembalikan
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="row g-3 align-items-end">
                                <div className="col-lg-7">
                                    <label className="form-label fw-bold">
                                        Cari barang
                                    </label>

                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-search" />
                                        </span>

                                        <input
                                            type="search"
                                            className="form-control"
                                            placeholder={
                                                isBorrow
                                                    ? 'Cari taplak, piring, gelas...'
                                                    : 'Cari kertas kop, map Tel-U...'
                                            }
                                            value={
                                                search
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSearch(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="col-lg-5">
                                    <div
                                        className={`p-3 rounded-4 ${
                                            isBorrow
                                                ? 'bg-success-subtle'
                                                : 'bg-primary-subtle'
                                        }`}
                                    >
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            <div>
                                                <div
                                                    className={`fw-black ${
                                                        isBorrow
                                                            ? 'text-success'
                                                            : 'text-primary'
                                                    }`}
                                                >
                                                    {getRequestTypeLabel(
                                                        form
                                                            .request_type
                                                    )}
                                                </div>

                                                <div className="small text-muted">
                                                    {
                                                        catalogDescription
                                                    }
                                                </div>
                                            </div>

                                            <div
                                                className={`fs-3 fw-black ${
                                                    isBorrow
                                                        ? 'text-success'
                                                        : 'text-primary'
                                                }`}
                                            >
                                                {
                                                    availableProducts.length
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {loading ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="spinner-border text-success mb-3" />

                                <p className="text-muted mb-0">
                                    Memuat katalog barang...
                                </p>
                            </div>
                        </div>
                    ) : filteredProducts.length ===
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
                                    Barang tidak ditemukan
                                </h5>

                                <p className="text-muted mb-0">
                                    {isBorrow
                                        ? 'Belum ada barang aktif yang tersedia untuk Peminjaman Barang.'
                                        : 'Belum ada barang aktif yang tersedia untuk Request Barang.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {filteredProducts.map(
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

                                    const stock =
                                        Number(
                                            product.stock ||
                                                0
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
                                                    className={`d-flex align-items-center justify-content-center ${
                                                        isBorrow
                                                            ? 'bg-success-subtle'
                                                            : 'bg-primary-subtle'
                                                    }`}
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
                                                        <div
                                                            className={`fw-black ${
                                                                isBorrow
                                                                    ? 'text-success'
                                                                    : 'text-primary'
                                                            }`}
                                                        >
                                                            SEKPIM
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="card-body p-4 d-flex flex-column">
                                                    <div className="mb-3">
                                                        <span
                                                            className={`badge rounded-pill mb-3 ${
                                                                isBorrow
                                                                    ? 'text-bg-success'
                                                                    : 'text-bg-primary'
                                                            }`}
                                                        >
                                                            {product
                                                                .category
                                                                ?.name ||
                                                                'Barang SEKPiM'}
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

                                                            <strong
                                                                className={`fs-4 ${
                                                                    stock >
                                                                    0
                                                                        ? ''
                                                                        : 'text-danger'
                                                                }`}
                                                            >
                                                                {
                                                                    stock
                                                                }
                                                            </strong>
                                                        </div>

                                                        {cartItem ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    className={`btn rounded-pill ${
                                                                        isBorrow
                                                                            ? 'btn-success'
                                                                            : 'btn-primary'
                                                                    }`}
                                                                    onClick={() =>
                                                                        handleDecreaseQty(
                                                                            product.id
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-dash-lg" />
                                                                </button>

                                                                <div className="form-control text-center fw-black rounded-pill">
                                                                    {
                                                                        cartItem.quantity
                                                                    }
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className={`btn rounded-pill ${
                                                                        isBorrow
                                                                            ? 'btn-success'
                                                                            : 'btn-primary'
                                                                    }`}
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
                                                                className={`btn rounded-pill w-100 ${
                                                                    isBorrow
                                                                        ? 'btn-success'
                                                                        : 'btn-primary'
                                                                }`}
                                                                onClick={() =>
                                                                    handleAddToCart(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    stock <=
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
                                            {totalQty}{' '}
                                            barang dipilih
                                        </p>
                                    </div>

                                    <div
                                        className={`icon-box ${
                                            isBorrow
                                                ? 'bg-success-subtle text-success'
                                                : 'bg-primary-subtle text-primary'
                                        }`}
                                    >
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
                                                        <div className="min-w-0">
                                                            <h6 className="fw-black mb-1">
                                                                {
                                                                    item.product.name
                                                                }
                                                            </h6>

                                                            <p className="text-muted small mb-0">
                                                                Qty:{' '}
                                                                {
                                                                    item.quantity
                                                                }{' '}
                                                                • Stok:{' '}

                                                                {
                                                                    item.product.stock
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
                                <span
                                    className={`badge rounded-pill px-3 py-2 mb-3 ${
                                        isBorrow
                                            ? 'bg-success-subtle text-success'
                                            : 'bg-primary-subtle text-primary'
                                    }`}
                                >
                                    Langkah 2
                                </span>

                                <h4 className="fw-black mb-1">
                                    {
                                        pageTitle
                                    }
                                </h4>

                                <p className="text-muted mb-4">
                                    Lengkapi PIC, jadwal kegiatan, tanggal pengambilan, dan keperluan.
                                </p>

                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama PIC{' '}

                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_name"
                                            className="form-control rounded-pill"
                                            placeholder="Nama PIC kegiatan"
                                            value={
                                                form.pic_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            maxLength={
                                                255
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nomor PIC{' '}

                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_phone"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: 081234567890"
                                            value={
                                                form.pic_phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            maxLength={
                                                30
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Nomor WhatsApp atau telepon PIC yang dapat dihubungi.
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Kegiatan{' '}

                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form.activity_date
                                            }
                                            min={
                                                minimumActivityDate
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Minimal H-4. Tanggal paling cepat{' '}

                                            <strong>
                                                {formatDate(
                                                    minimumActivityDate
                                                )}
                                            </strong>
                                            .
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Pengambilan{' '}

                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>

                                        <input
                                            type="date"
                                            name="borrow_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form.borrow_date
                                            }
                                            min={
                                                today
                                            }
                                            max={
                                                form.activity_date ||
                                                undefined
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            Pengambilan dapat dilakukan mulai hari ini dan tidak boleh setelah tanggal kegiatan.
                                        </div>
                                    </div>

                                    {isBorrow && (
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">
                                                Tanggal Pengembalian{' '}

                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </label>

                                            <input
                                                type="date"
                                                name="return_date"
                                                className="form-control rounded-pill"
                                                value={
                                                    form.return_date
                                                }
                                                min={
                                                    form.borrow_date ||
                                                    today
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            />

                                            <div className="form-text">
                                                Barang wajib dikembalikan paling cepat pada tanggal pengambilan.
                                            </div>
                                        </div>
                                    )}

                                    {form.activity_date &&
                                        form.borrow_date && (
                                            <div
                                                className={`p-3 rounded-4 mb-3 ${
                                                    isBorrow
                                                        ? 'bg-success-subtle'
                                                        : 'bg-primary-subtle'
                                                }`}
                                            >
                                                <div className="small text-muted mb-2">
                                                    Ringkasan Jadwal
                                                </div>

                                                <div className="d-flex flex-column gap-1 small">
                                                    <div>
                                                        <strong>
                                                            Kegiatan:
                                                        </strong>{' '}

                                                        {formatDate(
                                                            form.activity_date
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            Pengambilan:
                                                        </strong>{' '}

                                                        {formatDate(
                                                            form.borrow_date
                                                        )}
                                                    </div>

                                                    {isBorrow &&
                                                        form.return_date && (
                                                            <div>
                                                                <strong>
                                                                    Pengembalian:
                                                                </strong>{' '}

                                                                {formatDate(
                                                                    form.return_date
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        )}

                                    <div className="mb-4">
                                        <label className="form-label fw-bold">
                                            Keperluan{' '}

                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>

                                        <textarea
                                            name="purpose"
                                            className="form-control rounded-4"
                                            rows={
                                                5
                                            }
                                            maxLength={
                                                3000
                                            }
                                            placeholder={
                                                isBorrow
                                                    ? 'Contoh: Peminjaman taplak meja untuk kegiatan rapat pimpinan...'
                                                    : 'Contoh: Request map Tel-U untuk kebutuhan penerimaan tamu...'
                                            }
                                            value={
                                                form.purpose
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text text-end">
                                            {
                                                form.purpose.length
                                            }
                                            /3000
                                        </div>
                                    </div>

                                    {isBorrow ? (
                                        <div className="alert alert-warning border-0 rounded-4 small">
                                            <i className="bi bi-info-circle-fill me-2" />

                                            Kamu tidak dapat membuat Peminjaman Barang baru sebelum peminjaman aktif sebelumnya dikembalikan dan diselesaikan admin.
                                        </div>
                                    ) : (
                                        <div className="alert alert-primary border-0 rounded-4 small">
                                            <i className="bi bi-info-circle-fill me-2" />

                                            Request Barang tidak memiliki proses pengembalian. Stok akan dikurangi permanen ketika barang diserahkan oleh admin.
                                        </div>
                                    )}

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className={`btn rounded-pill ${
                                                isBorrow
                                                    ? 'btn-success'
                                                    : 'btn-primary'
                                            }`}
                                            disabled={
                                                submitting ||
                                                checkingBorrowStatus ||
                                                (
                                                    isBorrow &&
                                                    Boolean(
                                                        activeBorrow
                                                    )
                                                )
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

                                                    {isBorrow
                                                        ? 'Kirim Peminjaman Barang'
                                                        : 'Kirim Request Barang'}
                                                </>
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
                                            <i className="bi bi-arrow-counterclockwise me-2" />

                                            Reset Form
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