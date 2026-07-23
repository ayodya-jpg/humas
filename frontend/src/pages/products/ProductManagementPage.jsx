import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

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

const FILTER_TYPE_OPTIONS = [
    {
        value: 'all',
        label: 'Semua Jenis',
    },
    ...TYPE_OPTIONS,
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

const getTypeLabel = (type) => {
    return (
        TYPE_OPTIONS.find(
            (option) =>
                option.value === type
        )?.label ||
        type ||
        '-'
    );
};

const getTypeBadgeClass = (type) => {
    if (type === 'borrow') {
        return 'text-bg-success';
    }

    if (type === 'both') {
        return 'text-bg-info';
    }

    return 'text-bg-primary';
};

const getStatusLabel = (status) => {
    const labels = {
        active: 'Aktif',
        inactive: 'Nonaktif',
    };

    return (
        labels[status] ||
        status ||
        '-'
    );
};

export default function ProductManagementPage() {
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
        products,
        setProducts,
    ] = useState([]);

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        selectedType,
        setSelectedType,
    ] = useState('all');

    const [
        selectedStatus,
        setSelectedStatus,
    ] = useState('all');

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    const fetchProducts =
        useCallback(
            async () => {
                try {
                    setLoading(true);

                    const response =
                        await api.get(
                            '/products'
                        );

                    setProducts(
                        extractArray(response)
                    );
                } catch (error) {
                    console.error(
                        'Fetch products error:',
                        error?.response?.data ||
                            error
                    );

                    setProducts([]);

                    await showErrorAlert(
                        'Gagal Memuat Data',
                        getBackendErrorMessage(
                            error,
                            'Data produk gagal dimuat dari server.'
                        )
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return products.filter(
                (product) => {
                    const matchSearch =
                        !searchValue ||
                        product.name
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        product.slug
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        product.description
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        product.category
                            ?.name
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            );

                    const matchType =
                        selectedType ===
                            'all' ||
                        product.type ===
                            selectedType;

                    const matchStatus =
                        selectedStatus ===
                            'all' ||
                        product.status ===
                            selectedStatus;

                    return (
                        matchSearch &&
                        matchType &&
                        matchStatus
                    );
                }
            );
        }, [
            products,
            search,
            selectedType,
            selectedStatus,
        ]);

    const summary =
        useMemo(() => {
            return {
                total:
                    products.length,

                active:
                    products.filter(
                        (product) =>
                            product.status ===
                            'active'
                    ).length,

                inactive:
                    products.filter(
                        (product) =>
                            product.status ===
                            'inactive'
                    ).length,

                checkout:
                    products.filter(
                        (product) =>
                            product.type ===
                            'checkout'
                    ).length,

                borrow:
                    products.filter(
                        (product) =>
                            product.type ===
                            'borrow'
                    ).length,

                both:
                    products.filter(
                        (product) =>
                            product.type ===
                            'both'
                    ).length,

                lowStock:
                    products.filter(
                        (product) =>
                            Number(
                                product.stock ||
                                    0
                            ) <= 5
                    ).length,
            };
        }, [products]);

    const ensureManageAccess = () => {
        if (canManage) {
            return true;
        }

        showErrorAlert(
            'Akses Ditolak',
            'Akun hanya memiliki izin melihat produk dan tidak dapat mengubah data.'
        );

        return false;
    };

    const handleDelete =
        async (product) => {
            if (
                !ensureManageAccess()
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Hapus Produk?',

                    text:
                        `Produk "${product.name}" akan dihapus dari sistem.`,

                    confirmButtonText:
                        'Ya, hapus',

                    icon:
                        'warning',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation.isConfirmed
            ) {
                return;
            }

            try {
                setDeletingId(
                    product.id
                );

                showLoadingAlert(
                    'Menghapus Produk',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.delete(
                        `/products/${product.id}`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Produk Dihapus',
                    response?.data?.message ||
                        'Data produk berhasil dihapus.'
                );

                await fetchProducts();
            } catch (error) {
                console.error(
                    'Delete product error:',
                    error?.response?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Hapus Gagal',
                    getBackendErrorMessage(
                        error,
                        'Produk gagal dihapus.'
                    )
                );
            } finally {
                setDeletingId(null);
            }
        };

    const resetFilters = () => {
        setSearch('');
        setSelectedType('all');
        setSelectedStatus('all');
    };

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
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-warning px-3 py-2 mb-3">
                                Master Data Produk
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {canManage
                                    ? 'Kelola produk dan stok.'
                                    : 'Daftar produk dan stok.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                {canManage
                                    ? 'Tambah, edit, hapus, dan pantau stok produk merchandise maupun barang peminjaman.'
                                    : 'Akun ini hanya dapat melihat informasi produk. Perubahan data hanya dapat dilakukan oleh akun yang memiliki permission pengelolaan produk.'}
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {
                                                summary.total
                                            }
                                        </div>

                                        <div className="small text-white-50">
                                            Total
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {
                                                summary.active
                                            }
                                        </div>

                                        <div className="small text-white-50">
                                            Aktif
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {
                                                summary.checkout
                                            }
                                        </div>

                                        <div className="small text-white-50">
                                            Merchandise
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {
                                                summary.lowStock
                                            }
                                        </div>

                                        <div className="small text-white-50">
                                            Stok Rendah
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {!canManage && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-eye-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Mode hanya lihat
                            </div>

                            <div className="small">
                                Tombol tambah, edit, dan hapus disembunyikan karena akun tidak memiliki permission
                                {' '}
                                <strong>
                                    products.manage
                                </strong>
                                .
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div
                            className={
                                canManage
                                    ? 'col-lg-4'
                                    : 'col-lg-5'
                            }
                        >
                            <label className="form-label fw-bold">
                                Cari produk
                            </label>

                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nama, slug, kategori..."
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

                        <div className="col-lg-3">
                            <label className="form-label fw-bold">
                                Filter jenis
                            </label>

                            <select
                                className="form-select"
                                value={
                                    selectedType
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSelectedType(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {FILTER_TYPE_OPTIONS.map(
                                    (option) => (
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

                        <div className="col-lg-3">
                            <label className="form-label fw-bold">
                                Filter status
                            </label>

                            <select
                                className="form-select"
                                value={
                                    selectedStatus
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSelectedStatus(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="all">
                                    Semua Status
                                </option>

                                <option value="active">
                                    Aktif
                                </option>

                                <option value="inactive">
                                    Nonaktif
                                </option>
                            </select>
                        </div>

                        <div
                            className={
                                canManage
                                    ? 'col-lg-2'
                                    : 'col-lg-1'
                            }
                        >
                            {canManage ? (
                                <Link
                                    to="/admin/products/create"
                                    className="btn btn-warning rounded-pill text-white w-100"
                                >
                                    <i className="bi bi-plus-lg me-2" />

                                    Tambah
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill w-100"
                                    onClick={
                                        resetFilters
                                    }
                                    title="Reset filter"
                                >
                                    <i className="bi bi-arrow-counterclockwise" />
                                </button>
                            )}
                        </div>
                    </div>

                    {canManage && (
                        <div className="d-flex justify-content-end mt-3">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                onClick={
                                    resetFilters
                                }
                            >
                                <i className="bi bi-arrow-counterclockwise me-2" />

                                Reset Filter
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-warning mb-3" />

                        <h5 className="fw-bold mb-1">
                            Memuat data produk
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
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
                                width: 76,
                                height: 76,
                            }}
                        >
                            <i className="bi bi-inbox fs-1" />
                        </div>

                        <h5 className="fw-black mb-2">
                            Produk tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Tidak ada produk berdasarkan filter yang dipilih.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-secondary rounded-pill"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredProducts.map(
                        (product) => {
                            const stock =
                                Number(
                                    product.stock ||
                                        0
                                );

                            const isLowStock =
                                stock <= 5;

                            return (
                                <div
                                    className="col-12"
                                    key={
                                        product.id
                                    }
                                >
                                    <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                        <div className="card-body p-4">
                                            <div className="row g-4 align-items-center">
                                                <div
                                                    className={
                                                        canManage
                                                            ? 'col-lg-6'
                                                            : 'col-lg-7'
                                                    }
                                                >
                                                    <div className="d-flex gap-3">
                                                        <div className="icon-box bg-warning-subtle text-warning flex-shrink-0">
                                                            <i className="bi bi-box-seam-fill fs-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                                <span className="badge rounded-pill text-bg-warning">
                                                                    {product
                                                                        .category
                                                                        ?.name ||
                                                                        'Tanpa Kategori'}
                                                                </span>

                                                                <span
                                                                    className={`status status-${product.status}`}
                                                                >
                                                                    {getStatusLabel(
                                                                        product.status
                                                                    )}
                                                                </span>

                                                                <span
                                                                    className={`badge rounded-pill ${getTypeBadgeClass(
                                                                        product.type
                                                                    )}`}
                                                                >
                                                                    {getTypeLabel(
                                                                        product.type
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <h5 className="fw-black mb-1 text-break">
                                                                {
                                                                    product.name
                                                                }
                                                            </h5>

                                                            <p className="text-muted mb-0">
                                                                {product.description ||
                                                                    'Tidak ada deskripsi.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-2">
                                                    <div className="small text-muted">
                                                        Slug
                                                    </div>

                                                    <div className="fw-bold text-break">
                                                        {product.slug ||
                                                            '-'}
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-lg-2">
                                                    <div className="small text-muted">
                                                        Stok
                                                    </div>

                                                    <div
                                                        className={`fw-black fs-4 ${
                                                            isLowStock
                                                                ? 'text-danger'
                                                                : 'text-dark'
                                                        }`}
                                                    >
                                                        {
                                                            stock
                                                        }
                                                    </div>
                                                </div>

                                                {canManage && (
                                                    <div className="col-lg-2 text-lg-end">
                                                        <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                                            <Link
                                                                to={`/admin/products/${product.id}/edit`}
                                                                className="btn btn-outline-primary rounded-pill"
                                                            >
                                                                <i className="bi bi-pencil-square me-2" />

                                                                Edit
                                                            </Link>

                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger rounded-pill"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        product
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingId ===
                                                                    product.id
                                                                }
                                                            >
                                                                {deletingId ===
                                                                product.id ? (
                                                                    <span className="spinner-border spinner-border-sm" />
                                                                ) : (
                                                                    <>
                                                                        <i className="bi bi-trash me-2" />

                                                                        Hapus
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {isLowStock && (
                                                <div className="mt-3 p-3 rounded-4 bg-danger-subtle border border-danger-subtle">
                                                    <div className="d-flex align-items-start gap-3">
                                                        <i className="bi bi-exclamation-triangle-fill text-danger" />

                                                        <div>
                                                            <div className="fw-bold text-danger">
                                                                Stok rendah
                                                            </div>

                                                            <div className="small text-muted">
                                                                {canManage
                                                                    ? 'Pertimbangkan untuk memperbarui stok produk ini.'
                                                                    : 'Stok produk tersisa lima atau kurang.'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}