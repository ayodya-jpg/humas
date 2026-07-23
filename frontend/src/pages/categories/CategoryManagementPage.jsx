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

export default function CategoryManagementPage() {
    const currentUser =
        useMemo(
            () => getCurrentUser(),
            []
        );

    const canManage =
        hasPermission(
            currentUser,
            'categories.manage'
        );

    const [
        categories,
        setCategories,
    ] = useState([]);

    const [
        search,
        setSearch,
    ] = useState('');

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

    const fetchCategories =
        useCallback(
            async () => {
                try {
                    setLoading(true);

                    const response =
                        await api.get(
                            '/categories'
                        );

                    setCategories(
                        extractArray(response)
                    );
                } catch (error) {
                    console.error(
                        'Fetch categories error:',
                        error?.response?.data ||
                            error
                    );

                    setCategories([]);

                    await showErrorAlert(
                        'Gagal Memuat Data',
                        getBackendErrorMessage(
                            error,
                            'Data kategori gagal dimuat dari server.'
                        )
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return categories.filter(
                (category) => {
                    const matchSearch =
                        !searchValue ||
                        category.name
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        category.slug
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        category.description
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            );

                    const matchStatus =
                        selectedStatus ===
                            'all' ||
                        category.status ===
                            selectedStatus;

                    return (
                        matchSearch &&
                        matchStatus
                    );
                }
            );
        }, [
            categories,
            search,
            selectedStatus,
        ]);

    const summary =
        useMemo(() => {
            return {
                total:
                    categories.length,

                active:
                    categories.filter(
                        (category) =>
                            category.status ===
                            'active'
                    ).length,

                inactive:
                    categories.filter(
                        (category) =>
                            category.status ===
                            'inactive'
                    ).length,
            };
        }, [categories]);

    const ensureManageAccess = () => {
        if (canManage) {
            return true;
        }

        showErrorAlert(
            'Akses Ditolak',
            'Akun hanya memiliki izin melihat kategori dan tidak dapat mengubah data.'
        );

        return false;
    };

    const handleDelete =
        async (category) => {
            if (
                !ensureManageAccess()
            ) {
                return;
            }

            const productsCount =
                Number(
                    category.products_count ||
                        0
                );

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Hapus Kategori?',

                    text:
                        productsCount > 0
                            ? `Kategori "${category.name}" masih digunakan oleh ${productsCount} produk. Penghapusan mungkin ditolak oleh sistem.`
                            : `Kategori "${category.name}" akan dihapus dari sistem.`,

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
                    category.id
                );

                showLoadingAlert(
                    'Menghapus Kategori',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.delete(
                        `/categories/${category.id}`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Kategori Dihapus',
                    response?.data?.message ||
                        'Data kategori berhasil dihapus.'
                );

                await fetchCategories();
            } catch (error) {
                console.error(
                    'Delete category error:',
                    error?.response?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Hapus Gagal',
                    getBackendErrorMessage(
                        error,
                        'Kategori gagal dihapus.'
                    )
                );
            } finally {
                setDeletingId(null);
            }
        };

    const resetFilters = () => {
        setSearch('');
        setSelectedStatus('all');
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Master Data Kategori
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {canManage
                                    ? 'Kelola kategori produk.'
                                    : 'Daftar kategori produk.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                {canManage
                                    ? 'Tambah, edit, hapus, dan pantau kategori yang digunakan untuk merchandise maupun peminjaman.'
                                    : 'Akun ini hanya dapat melihat kategori. Perubahan data hanya dapat dilakukan oleh akun yang memiliki permission pengelolaan kategori.'}
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-4">
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

                                <div className="col-4">
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

                                <div className="col-4">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {
                                                summary.inactive
                                            }
                                        </div>

                                        <div className="small text-white-50">
                                            Nonaktif
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
                                    categories.manage
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
                                    ? 'col-lg-5'
                                    : 'col-lg-7'
                            }
                        >
                            <label className="form-label fw-bold">
                                Cari kategori
                            </label>

                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nama, slug, deskripsi..."
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

                        <div
                            className={
                                canManage
                                    ? 'col-lg-4'
                                    : 'col-lg-4'
                            }
                        >
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
                                    ? 'col-lg-3'
                                    : 'col-lg-1'
                            }
                        >
                            {canManage ? (
                                <Link
                                    to="/admin/categories/create"
                                    className="btn btn-primary rounded-pill w-100"
                                >
                                    <i className="bi bi-plus-lg me-2" />

                                    Tambah Kategori
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
                        <div className="spinner-border text-primary mb-3" />

                        <h5 className="fw-bold mb-1">
                            Memuat data kategori
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            ) : filteredCategories.length ===
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
                            Kategori tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Tidak ada kategori berdasarkan filter yang dipilih.
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
                    {filteredCategories.map(
                        (category) => (
                            <div
                                className="col-12"
                                key={
                                    category.id
                                }
                            >
                                <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                    <div className="card-body p-4">
                                        <div className="row g-4 align-items-center">
                                            <div
                                                className={
                                                    canManage
                                                        ? 'col-lg-7'
                                                        : 'col-lg-8'
                                                }
                                            >
                                                <div className="d-flex gap-3">
                                                    <div className="icon-box bg-primary-subtle text-primary flex-shrink-0">
                                                        <i className="bi bi-tags-fill fs-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                            <span className="badge rounded-pill text-bg-primary">
                                                                Kategori
                                                            </span>

                                                            <span
                                                                className={`status status-${category.status}`}
                                                            >
                                                                {getStatusLabel(
                                                                    category.status
                                                                )}
                                                            </span>
                                                        </div>

                                                        <h5 className="fw-black mb-1 text-break">
                                                            {
                                                                category.name
                                                            }
                                                        </h5>

                                                        <p className="text-muted mb-0">
                                                            {category.description ||
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
                                                    {category.slug ||
                                                        '-'}
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    canManage
                                                        ? 'col-md-6 col-lg-3 text-lg-end'
                                                        : 'col-md-6 col-lg-2 text-lg-end'
                                                }
                                            >
                                                {canManage ? (
                                                    <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                                        <Link
                                                            to={`/admin/categories/${category.id}/edit`}
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
                                                                    category
                                                                )
                                                            }
                                                            disabled={
                                                                deletingId ===
                                                                category.id
                                                            }
                                                        >
                                                            {deletingId ===
                                                            category.id ? (
                                                                <span className="spinner-border spinner-border-sm" />
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-trash me-2" />

                                                                    Hapus
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="badge rounded-pill text-bg-light border text-dark">
                                                        <i className="bi bi-eye me-2" />

                                                        Lihat Saja
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {category.products_count !==
                                            undefined && (
                                            <div className="mt-3 p-3 rounded-4 bg-light border">
                                                <div className="d-flex align-items-center justify-content-between gap-3">
                                                    <div>
                                                        <div className="small text-muted">
                                                            Jumlah produk dalam kategori
                                                        </div>

                                                        <div className="fw-black">
                                                            {
                                                                category.products_count
                                                            }{' '}
                                                            produk
                                                        </div>
                                                    </div>

                                                    <i className="bi bi-box-seam fs-4 text-primary" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}