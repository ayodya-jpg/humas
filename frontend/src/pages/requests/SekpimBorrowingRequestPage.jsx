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

const SERVICE_KEY_BORROW =
    'sekpim_borrow';

const SERVICE_KEY_ASSET_REQUEST =
    'sekpim_asset_request';

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
        value ||
            ''
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
        error
            ?.response
            ?.data;

    if (
        responseData
            ?.errors
    ) {
        const firstError =
            Object.values(
                responseData.errors
            )
                .flat()
                .find(
                    Boolean
                );

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        responseData
            ?.message ||
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
    }[
        status
    ] ||
        status ||
        '-';
};

const getRuleLabel = (
    days
) => {
    return `H-${Number(
        days ||
            0
    )}`;
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

    const [
        settingLoading,
        setSettingLoading,
    ] = useState(
        true
    );

    const [
        settingError,
        setSettingError,
    ] = useState(
        ''
    );

    const [
        submissionSettings,
        setSubmissionSettings,
    ] = useState({
        [SERVICE_KEY_BORROW]: {
            min_submission_days:
                4,

            minimum_date:
                '',
        },

        [SERVICE_KEY_ASSET_REQUEST]: {
            min_submission_days:
                4,

            minimum_date:
                '',
        },
    });

    const today =
        useMemo(
            () =>
                toLocalDateString(
                    new Date()
                ),
            []
        );

    /*
    |--------------------------------------------------------------------------
    | CURRENT DYNAMIC SETTING
    |--------------------------------------------------------------------------
    */

    const currentServiceKey =
        form
            .request_type ===
        REQUEST_TYPE_ASSET_REQUEST
            ? SERVICE_KEY_ASSET_REQUEST
            : SERVICE_KEY_BORROW;

    const currentSubmissionSetting =
        submissionSettings[
            currentServiceKey
        ] || {
            min_submission_days:
                4,

            minimum_date:
                '',
        };

    const minimumSubmissionDays =
        Number(
            currentSubmissionSetting
                .min_submission_days ??
                4
        );

    const minimumActivityDate =
        currentSubmissionSetting
            .minimum_date ||
        '';

    /*
    |--------------------------------------------------------------------------
    | FETCH GLOBAL SETTINGS
    |--------------------------------------------------------------------------
    */

    const fetchSubmissionSettings =
        useCallback(
            async () => {
                try {
                    setSettingLoading(
                        true
                    );

                    setSettingError(
                        ''
                    );

                    const response =
                        await api.get(
                            '/humas-settings'
                        );

                    const data =
                        response
                            ?.data
                            ?.data ||
                        {};

                    const allSettings =
                        data
                            ?.submission_settings ||
                        {};

                    const borrowSetting =
                        allSettings[
                            SERVICE_KEY_BORROW
                        ];

                    const assetSetting =
                        allSettings[
                            SERVICE_KEY_ASSET_REQUEST
                        ];

                    if (
                        !borrowSetting ||
                        !assetSetting
                    ) {
                        throw new Error(
                            'Pengaturan batas pengajuan SEKPiM belum lengkap.'
                        );
                    }

                    setSubmissionSettings({
                        [SERVICE_KEY_BORROW]: {
                            min_submission_days:
                                Number(
                                    borrowSetting
                                        ?.min_submission_days ??
                                        4
                                ),

                            minimum_date:
                                borrowSetting
                                    ?.minimum_date ||
                                '',
                        },

                        [SERVICE_KEY_ASSET_REQUEST]: {
                            min_submission_days:
                                Number(
                                    assetSetting
                                        ?.min_submission_days ??
                                        4
                                ),

                            minimum_date:
                                assetSetting
                                    ?.minimum_date ||
                                '',
                        },
                    });
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch SEKPiM submission settings error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setSettingError(
                        getBackendErrorMessage(
                            error,
                            error
                                ?.message ||
                                'Pengaturan batas pengajuan SEKPiM gagal dimuat.'
                        )
                    );
                } finally {
                    setSettingLoading(
                        false
                    );
                }
            },
            []
        );

    /*
    |--------------------------------------------------------------------------
    | CHECK ACTIVE BORROW
    |--------------------------------------------------------------------------
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
                                  data
                                      ?.data
                              )
                              ? data
                                    .data
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

                                activity_date:
                                    '',

                                borrow_date:
                                    '',

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
    | PRODUCTS
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
            fetchSubmissionSettings();
        },
        [
            fetchProducts,
            fetchActiveBorrow,
            fetchSubmissionSettings,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER PRODUCTS
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
                            item
                                .quantity ||
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
                     * Reset seluruh tanggal karena setiap jenis
                     * dapat mempunyai aturan H-n berbeda.
                     */
                    activity_date:
                        '',

                    borrow_date:
                        '',

                    return_date:
                        '',
                })
            );

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
                    product
                        .stock ||
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

            const existingItem =
                cart.find(
                    (
                        item
                    ) =>
                        item
                            .product_id ===
                        product.id
                );

            if (
                existingItem &&
                existingItem
                    .quantity >=
                    Number(
                        product
                            .stock ||
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
                ) => {
                    const existing =
                        previousCart.find(
                            (
                                item
                            ) =>
                                item
                                    .product_id ===
                                product.id
                        );

                    if (
                        existing
                    ) {
                        return previousCart.map(
                            (
                                item
                            ) =>
                                item
                                    .product_id ===
                                product.id
                                    ? {
                                          ...item,

                                          quantity:
                                              item
                                                  .quantity +
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
                                item
                                    .product_id ===
                                productId
                                    ? {
                                          ...item,

                                          quantity:
                                              item
                                                  .quantity -
                                              1,
                                      }
                                    : item
                        )
                        .filter(
                            (
                                item
                            ) =>
                                item
                                    .quantity >
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
                        item
                            .product_id ===
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
                currentItem
                    .quantity >=
                Number(
                    product
                        .stock ||
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
                                item
                                    .product_id !==
                                product.id
                            ) {
                                return item;
                            }

                            return {
                                ...item,

                                quantity:
                                    item
                                        .quantity +
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
                            item
                                .product_id !==
                            productId
                    )
            );
        };

    /*
    |--------------------------------------------------------------------------
    | FORM
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
                        nextForm
                            .borrow_date =
                            '';

                        nextForm
                            .return_date =
                            '';
                    }

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
                        nextForm
                            .return_date =
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
                settingLoading
            ) {
                await showWarningAlert(
                    'Pengaturan Masih Dimuat',
                    'Tunggu sampai aturan batas pengajuan selesai dimuat.'
                );

                return false;
            }

            if (
                settingError
            ) {
                await showWarningAlert(
                    'Pengaturan Belum Tersedia',
                    'Aturan batas pengajuan SEKPiM gagal dimuat. Silakan muat ulang halaman.'
                );

                return false;
            }

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
                minimumActivityDate &&
                form
                    .activity_date <
                    minimumActivityDate
            ) {
                await showWarningAlert(
                    'Belum Memenuhi Batas Pengajuan',
                    minimumSubmissionDays ===
                    0
                        ? 'Tanggal kegiatan tidak boleh sebelum hari ini.'
                        : `${getRequestTypeLabel(
                              form.request_type
                          )} harus diajukan minimal H-${minimumSubmissionDays}. Tanggal kegiatan paling cepat ${formatDate(
                              minimumActivityDate
                          )}.`
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
                    fetchSubmissionSettings(),
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

                await Promise.all([
                    fetchActiveBorrow(),
                    fetchSubmissionSettings(),
                ]);
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
        form
            .request_type ===
        REQUEST_TYPE_BORROW;

    const isAssetRequest =
        form
            .request_type ===
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
            {settingError && (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div className="flex-grow-1">
                            <div className="fw-bold">
                                Aturan pengajuan gagal dimuat
                            </div>

                            <div className="small">
                                {settingError}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm rounded-pill"
                            onClick={
                                fetchSubmissionSettings
                            }
                        >
                            Muat Ulang
                        </button>
                    </div>
                </div>
            )}

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
                                Peminjaman Barang baru dapat dibuat setelah barang sebelumnya dikembalikan dan diselesaikan admin. Kamu tetap dapat menggunakan fitur{' '}

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
                                Pilih Peminjaman Barang untuk perlengkapan yang harus dikembalikan, atau Request Barang untuk kebutuhan yang diberikan kepada pemohon.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="p-4 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-25">
                                <div className="small text-white-50 mb-1">
                                    Ketentuan waktu {getRequestTypeLabel(
                                        form.request_type
                                    )}
                                </div>

                                <div className="fs-4 fw-black">
                                    {settingLoading
                                        ? 'Memuat...'
                                        : `Minimal ${getRuleLabel(
                                              minimumSubmissionDays
                                          )}`}
                                </div>

                                {!settingLoading &&
                                    !settingError && (
                                        <div className="small text-white-50 mt-2">
                                            Tanggal kegiatan paling cepat{' '}

                                            <strong className="text-white">
                                                {formatDate(
                                                    minimumActivityDate
                                                )}
                                            </strong>
                                        </div>
                                    )}
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
                            Masing-masing jenis pengajuan dapat memiliki batas waktu pengajuan yang berbeda.
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
                                            Untuk barang yang wajib dikembalikan setelah digunakan.
                                        </p>

                                        <div className="small fw-bold text-success">
                                            <i className="bi bi-clock-history me-2" />

                                            Minimal{' '}

                                            {getRuleLabel(
                                                submissionSettings[
                                                    SERVICE_KEY_BORROW
                                                ]
                                                    ?.min_submission_days
                                            )}
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
                                            Untuk barang yang diberikan kepada pemohon dan tidak perlu dikembalikan.
                                        </p>

                                        <div className="small fw-bold text-primary">
                                            <i className="bi bi-clock-history me-2" />

                                            Minimal{' '}

                                            {getRuleLabel(
                                                submissionSettings[
                                                    SERVICE_KEY_ASSET_REQUEST
                                                ]
                                                    ?.min_submission_days
                                            )}
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
                                                    ? 'Cari barang peminjaman...'
                                                    : 'Cari barang request...'
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
                                                        form.request_type
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
                                <i className="bi bi-inbox fs-1 text-muted" />

                                <h5 className="fw-black mt-3">
                                    Barang tidak ditemukan
                                </h5>

                                <p className="text-muted mb-0">
                                    Belum ada barang aktif untuk jenis pengajuan ini.
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
                                                item
                                                    .product_id ===
                                                product
                                                    .id
                                        );

                                    const stock =
                                        Number(
                                            product
                                                .stock ||
                                                0
                                        );

                                    return (
                                        <div
                                            className="col-12 col-md-6 col-xxl-4"
                                            key={
                                                product
                                                    .id
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
                                                                product
                                                                    .image
                                                            }
                                                            alt={
                                                                product
                                                                    .name
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
                                                                product
                                                                    .name
                                                            }
                                                        </h5>

                                                        <p className="text-muted small">
                                                            {product
                                                                .description ||
                                                                'Tidak ada deskripsi.'}
                                                        </p>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <div className="p-3 rounded-4 border bg-light d-flex justify-content-between mb-3">
                                                            <span className="small text-muted fw-bold">
                                                                Stok tersedia
                                                            </span>

                                                            <strong className="fs-4">
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
                                                                            product
                                                                                .id
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-dash-lg" />
                                                                </button>

                                                                <div className="form-control text-center fw-black rounded-pill">
                                                                    {
                                                                        cartItem
                                                                            .quantity
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
                                <h4 className="fw-black mb-1">
                                    Keranjang
                                </h4>

                                <p className="text-muted">
                                    {totalQty}{' '}
                                    barang dipilih
                                </p>

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
                                                        item
                                                            .product_id
                                                    }
                                                    className="p-3 rounded-4 border"
                                                >
                                                    <div className="d-flex justify-content-between gap-2">
                                                        <div>
                                                            <h6 className="fw-black mb-1">
                                                                {
                                                                    item
                                                                        .product
                                                                        .name
                                                                }
                                                            </h6>

                                                            <div className="small text-muted">
                                                                Qty:{' '}
                                                                {
                                                                    item
                                                                        .quantity
                                                                }
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm rounded-pill"
                                                            onClick={() =>
                                                                handleRemoveItem(
                                                                    item
                                                                        .product_id
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
                                    {pageTitle}
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
                                            Nama PIC *
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_name"
                                            className="form-control rounded-pill"
                                            value={
                                                form
                                                    .pic_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nomor PIC *
                                        </label>

                                        <input
                                            type="text"
                                            name="pic_phone"
                                            className="form-control rounded-pill"
                                            value={
                                                form
                                                    .pic_phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Kegiatan *
                                        </label>

                                        <input
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form
                                                    .activity_date
                                            }
                                            min={
                                                minimumActivityDate ||
                                                undefined
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                settingLoading ||
                                                Boolean(
                                                    settingError
                                                )
                                            }
                                            required
                                        />

                                        <div className="form-text">
                                            {settingLoading
                                                ? 'Memuat aturan batas pengajuan...'
                                                : `Minimal ${getRuleLabel(
                                                      minimumSubmissionDays
                                                  )}. Tanggal paling cepat ${formatDate(
                                                      minimumActivityDate
                                                  )}.`}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Pengambilan *
                                        </label>

                                        <input
                                            type="date"
                                            name="borrow_date"
                                            className="form-control rounded-pill"
                                            value={
                                                form
                                                    .borrow_date
                                            }
                                            min={
                                                today
                                            }
                                            max={
                                                form
                                                    .activity_date ||
                                                undefined
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />
                                    </div>

                                    {isBorrow && (
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">
                                                Tanggal Pengembalian *
                                            </label>

                                            <input
                                                type="date"
                                                name="return_date"
                                                className="form-control rounded-pill"
                                                value={
                                                    form
                                                        .return_date
                                                }
                                                min={
                                                    form
                                                        .borrow_date ||
                                                    today
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                required
                                            />
                                        </div>
                                    )}

                                    {form
                                        .activity_date &&
                                        form
                                            .borrow_date && (
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

                                                <div className="small">
                                                    <strong>
                                                        Kegiatan:
                                                    </strong>{' '}

                                                    {formatDate(
                                                        form.activity_date
                                                    )}
                                                </div>

                                                <div className="small">
                                                    <strong>
                                                        Pengambilan:
                                                    </strong>{' '}

                                                    {formatDate(
                                                        form.borrow_date
                                                    )}
                                                </div>

                                                {isBorrow &&
                                                    form
                                                        .return_date && (
                                                        <div className="small">
                                                            <strong>
                                                                Pengembalian:
                                                            </strong>{' '}

                                                            {formatDate(
                                                                form.return_date
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        )}

                                    <div className="mb-4">
                                        <label className="form-label fw-bold">
                                            Keperluan *
                                        </label>

                                        <textarea
                                            name="purpose"
                                            className="form-control rounded-4"
                                            rows="5"
                                            maxLength="3000"
                                            value={
                                                form
                                                    .purpose
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            required
                                        />

                                        <div className="form-text text-end">
                                            {
                                                form
                                                    .purpose
                                                    .length
                                            }
                                            /3000
                                        </div>
                                    </div>

                                    {isBorrow ? (
                                        <div className="alert alert-warning border-0 rounded-4 small">
                                            <i className="bi bi-info-circle-fill me-2" />

                                            Peminjaman baru hanya dapat dibuat setelah peminjaman aktif sebelumnya selesai.
                                        </div>
                                    ) : (
                                        <div className="alert alert-primary border-0 rounded-4 small">
                                            <i className="bi bi-info-circle-fill me-2" />

                                            Request Barang tidak mempunyai proses pengembalian.
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
                                                settingLoading ||
                                                Boolean(
                                                    settingError
                                                ) ||
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