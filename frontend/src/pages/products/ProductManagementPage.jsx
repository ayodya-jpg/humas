
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import api from '../../api/axios';

import ProductDetailModal from '../../components/ProductDetailModal';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

/*
|--------------------------------------------------------------------------
| FILTER LAYANAN
|--------------------------------------------------------------------------
*/

const SERVICE_FILTERS = [
    {
        value: 'all',
        label: 'Semua Layanan',
    },
    {
        value: 'merchandise',
        label: 'Merchandise HUMAS',
    },
    {
        value: 'borrow',
        label: 'Peminjaman SEKPiM',
    },
    {
        value: 'asset_request',
        label: 'Request Aset SEKPiM',
    },
];

/*
|--------------------------------------------------------------------------
| HELPER LAYANAN PRODUK
|--------------------------------------------------------------------------
*/

const getServices = (product) => {
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

/*
|--------------------------------------------------------------------------
| HELPER DATA API
|--------------------------------------------------------------------------
*/

const getRows = (response) => {
    const data = response?.data?.data;

    if (Array.isArray(data)) {
        return data;
    }

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

/*
|--------------------------------------------------------------------------
| CEK PERMISSION
|--------------------------------------------------------------------------
*/

const canManageProducts = () => {
    try {
        const user = JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );

        return (
            user.role === 'superadmin' ||
            (
                Array.isArray(user.permissions) &&
                user.permissions.includes('products.manage')
            )
        );
    } catch {
        return false;
    }
};

/*
|--------------------------------------------------------------------------
| HITUNG FOTO PRODUK
|--------------------------------------------------------------------------
*/

const getProductImages = (product) => {
    const gallery = Array.isArray(
        product?.gallery_images
    )
        ? product.gallery_images
        : [];

    return [
        ...new Set(
            [
                product?.image,
                ...gallery,
            ].filter(
                (url) =>
                    typeof url === 'string' &&
                    url.trim() !== ''
            )
        ),
    ];
};

/*
|--------------------------------------------------------------------------
| URL FOTO
|--------------------------------------------------------------------------
*/

const getImageUrl = (value) => {
    if (
        !value ||
        typeof value !== 'string'
    ) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    if (/^(javascript:|data:|blob:|\/\/)/i.test(value)) {
        return '';
    }

    try {
        const apiUrl = new URL(
            api.defaults.baseURL || '/api',
            window.location.origin
        );

        const path = value.startsWith('/')
            ? value
            : `/${value}`;

        return new URL(
            path,
            apiUrl.origin
        ).href;
    } catch {
        return '';
    }
};

/*
|--------------------------------------------------------------------------
| HALAMAN DATA PRODUK
|--------------------------------------------------------------------------
*/

export default function ProductManagementPage() {
    const canManage = useMemo(
        () => canManageProducts(),
        []
    );

    const [products, setProducts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [search, setSearch] = useState('');

    const [service, setService] = useState('all');

    const [status, setStatus] = useState('all');

    const [deletingId, setDeletingId] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | PRODUK YANG DIPILIH UNTUK PREVIEW
    |--------------------------------------------------------------------------
    */

    const [previewProduct, setPreviewProduct] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | LOAD PRODUK
    |--------------------------------------------------------------------------
    */

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get('/products');

            const rows = getRows(response);

            setProducts(rows);
        } catch (err) {
            console.error(
                'Load products:',
                err
            );

            setProducts([]);

            setError(
                getError(err)
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    /*
    |--------------------------------------------------------------------------
    | FILTER PRODUK
    |--------------------------------------------------------------------------
    */

    const filteredProducts = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        return products.filter((product) => {
            const matchSearch =
                !keyword ||
                [
                    product.name,
                    product.slug,
                    product.description,
                    product.category?.name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(keyword);

            const matchService =
                service === 'all' ||
                getServices(product).includes(service);

            const matchStatus =
                status === 'all' ||
                product.status === status;

            return (
                matchSearch &&
                matchService &&
                matchStatus
            );
        });
    }, [
        products,
        search,
        service,
        status,
    ]);

    /*
    |--------------------------------------------------------------------------
    | RINGKASAN DATA
    |--------------------------------------------------------------------------
    */

    const summary = useMemo(() => ({
        total: products.length,

        active: products.filter(
            (product) => product.status === 'active'
        ).length,

        lowStock: products.filter(
            (product) =>
                Number(product.stock ?? 0) <= 5
        ).length,

        withImages: products.filter(
            (product) =>
                getProductImages(product).length > 0
        ).length,
    }), [products]);

    /*
    |--------------------------------------------------------------------------
    | BUKA DETAIL PRODUK
    |--------------------------------------------------------------------------
    */

    const handlePreview = (product) => {
        setPreviewProduct(product);
    };

    /*
    |--------------------------------------------------------------------------
    | TUTUP DETAIL PRODUK
    |--------------------------------------------------------------------------
    */

    const closePreview = () => {
        setPreviewProduct(null);
    };

    /*
    |--------------------------------------------------------------------------
    | HAPUS PRODUK
    |--------------------------------------------------------------------------
    */

    const handleDelete = async (product) => {
        if (
            !canManage ||
            deletingId !== null
        ) {
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Hapus Produk?',

            text:
                `Produk "${product.name}" akan dihapus. ` +
                'Produk yang sudah digunakan dalam pengajuan mungkin tidak dapat dihapus.',

            confirmButtonText: 'Ya, hapus',

            cancelButtonText: 'Batal',

            icon: 'warning',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            setDeletingId(product.id);

            showLoadingAlert(
                'Menghapus Produk',
                'Memproses penghapusan...'
            );

            await api.delete(
                `/products/${product.id}`
            );

            closeAlert();

            if (
                previewProduct?.id === product.id
            ) {
                closePreview();
            }

            await loadProducts();

            await showSuccessAlert(
                'Produk Dihapus',
                'Produk berhasil dihapus.'
            );
        } catch (err) {
            closeAlert();

            await showErrorAlert(
                'Gagal Menghapus Produk',
                getError(err)
            );
        } finally {
            setDeletingId(null);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RESET FILTER
    |--------------------------------------------------------------------------
    */

    const resetFilters = () => {
        setSearch('');
        setService('all');
        setStatus('all');
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">

            {/* HEADER */}

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3">
                <div
                    className="card-body text-white p-4"
                    style={{
                        background:
                            'linear-gradient(115deg,#047857,#0f172a)',
                    }}
                >
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div>
                            <span className="badge bg-white text-success rounded-pill mb-2">
                                MASTER KATALOG
                            </span>

                            <h2 className="fw-bold mb-1">
                                Data Produk
                            </h2>

                            <p className="mb-0 opacity-75 small">
                                Kelola Merchandise HUMAS, Peminjaman SEKPiM,
                                dan Request Aset dalam satu tempat.
                                Periksa galeri dan detail produk sebelum digunakan.
                            </p>
                        </div>

                        {canManage && (
                            <Link
                                to="/admin/products/create"
                                className="btn btn-light text-success fw-bold rounded-pill px-4"
                            >
                                <i className="bi bi-plus-lg me-2" />
                                Tambah Produk
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* RINGKASAN PRODUK */}

            <div className="row g-3 mb-3">
                {[
                    {
                        label: 'Total Produk',
                        value: summary.total,
                        icon: 'bi-boxes',
                    },
                    {
                        label: 'Produk Aktif',
                        value: summary.active,
                        icon: 'bi-check-circle',
                    },
                    {
                        label: 'Stok ≤ 5',
                        value: summary.lowStock,
                        icon: 'bi-exclamation-circle',
                    },
                    {
                        label: 'Memiliki Foto',
                        value: summary.withImages,
                        icon: 'bi-images',
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="col-6 col-lg-3"
                    >
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                            <div className="card-body d-flex align-items-center gap-3 p-3">
                                <div className="rounded-3 bg-success-subtle text-success p-3">
                                    <i
                                        className={`bi ${item.icon} fs-4`}
                                    />
                                </div>

                                <div>
                                    <div className="small text-muted">
                                        {item.label}
                                    </div>

                                    <div className="fs-4 fw-bold">
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FILTER */}

            <div className="card border-0 shadow-sm rounded-4 mb-3">
                <div className="card-body p-3 p-lg-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label
                                htmlFor="product-search"
                                className="form-label fw-semibold small"
                            >
                                Cari Produk
                            </label>

                            <input
                                id="product-search"
                                type="search"
                                className="form-control"
                                value={search}
                                placeholder="Nama barang, kategori, deskripsi..."
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>

                        <div className="col-lg-4">
                            <label
                                htmlFor="product-service-filter"
                                className="form-label fw-semibold small"
                            >
                                Layanan
                            </label>

                            <select
                                id="product-service-filter"
                                className="form-select"
                                value={service}
                                onChange={(event) =>
                                    setService(event.target.value)
                                }
                            >
                                {SERVICE_FILTERS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-lg-2">
                            <label
                                htmlFor="product-status-filter"
                                className="form-label fw-semibold small"
                            >
                                Status
                            </label>

                            <select
                                id="product-status-filter"
                                className="form-select"
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                            >
                                <option value="all">
                                    Semua
                                </option>

                                <option value="active">
                                    Aktif
                                </option>

                                <option value="inactive">
                                    Nonaktif
                                </option>
                            </select>
                        </div>

                        <div className="col-lg-1">
                            <button
                                type="button"
                                className="btn btn-outline-secondary w-100"
                                onClick={resetFilters}
                                title="Reset Filter"
                                aria-label="Reset filter produk"
                            >
                                <i className="bi bi-arrow-counterclockwise" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ERROR */}

            {error && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3">
                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={loadProducts}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* LOADING */}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-4 text-center p-5">
                    <span className="spinner-border text-success mx-auto" />

                    <p className="text-muted mt-3 mb-0">
                        Memuat produk...
                    </p>
                </div>
            ) : error ? null : filteredProducts.length === 0 ? (
                /* DATA KOSONG */

                <div className="card border-0 shadow-sm rounded-4 text-center p-5">
                    <i className="bi bi-inbox fs-1 text-muted" />

                    <h5 className="mt-3">
                        Tidak ada produk
                    </h5>

                    <p className="text-muted mb-0">
                        Periksa filter atau tambahkan produk baru.
                    </p>
                </div>
            ) : (
                /* TABEL PRODUK */

                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">
                                        Produk
                                    </th>

                                    <th>
                                        Kategori
                                    </th>

                                    <th>
                                        Layanan
                                    </th>

                                    <th>
                                        Foto
                                    </th>

                                    <th>
                                        Stok
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th className="text-end pe-4">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredProducts.map((product) => {
                                    const services = getServices(
                                        product
                                    );

                                    const images = getProductImages(
                                        product
                                    );

                                    const cover = getImageUrl(
                                        product.image ||
                                            images[0] ||
                                            ''
                                    );

                                    return (
                                        <tr key={product.id}>
                                            {/* GAMBAR DAN NAMA PRODUK */}

                                            <td
                                                className="ps-4"
                                                style={{
                                                    minWidth: 230,
                                                }}
                                            >
                                                <div className="d-flex gap-3 align-items-center">
                                                    <button
                                                        type="button"
                                                        className="product-admin-cover"
                                                        onClick={() =>
                                                            handlePreview(product)
                                                        }
                                                        title={`Lihat detail ${product.name}`}
                                                        aria-label={`Lihat foto ${product.name}`}
                                                    >
                                                        {cover ? (
                                                            <img
                                                                src={cover}
                                                                alt={product.name}
                                                            />
                                                        ) : (
                                                            <i className="bi bi-box-seam" />
                                                        )}

                                                        {images.length > 1 && (
                                                            <span className="product-admin-cover-count">
                                                                {images.length}
                                                            </span>
                                                        )}
                                                    </button>

                                                    <div className="min-w-0">
                                                        <button
                                                            type="button"
                                                            className="product-admin-name"
                                                            onClick={() =>
                                                                handlePreview(product)
                                                            }
                                                        >
                                                            {product.name}
                                                        </button>

                                                        <small className="d-block text-muted text-break">
                                                            {product.slug}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* KATEGORI */}

                                            <td>
                                                {product.category?.name || '-'}
                                            </td>

                                            {/* LAYANAN */}

                                            <td style={{ minWidth: 190 }}>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {services.length === 0 ? (
                                                        <span className="badge text-bg-secondary">
                                                            Belum diatur
                                                        </span>
                                                    ) : (
                                                        services.map((value) => (
                                                            <span
                                                                key={value}
                                                                className="badge bg-success-subtle text-success border border-success-subtle"
                                                            >
                                                                {
                                                                    SERVICE_FILTERS.find(
                                                                        (item) =>
                                                                            item.value === value
                                                                    )?.label || value
                                                                }
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>

                                            {/* JUMLAH FOTO */}

                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light border rounded-pill"
                                                    onClick={() =>
                                                        handlePreview(product)
                                                    }
                                                    title="Lihat galeri"
                                                >
                                                    <i className="bi bi-images me-1" />

                                                    {images.length} foto
                                                </button>
                                            </td>

                                            {/* STOK */}

                                            <td className="fw-semibold">
                                                {product.stock ?? 0}
                                            </td>

                                            {/* STATUS */}

                                            <td>
                                                <span
                                                    className={`badge ${
                                                        product.status === 'active'
                                                            ? 'text-bg-success'
                                                            : 'text-bg-secondary'
                                                    }`}
                                                >
                                                    {product.status === 'active'
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </span>
                                            </td>

                                            {/* AKSI */}

                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary rounded-pill"
                                                        onClick={() =>
                                                            handlePreview(product)
                                                        }
                                                    >
                                                        <i className="bi bi-eye me-1" />
                                                        Detail
                                                    </button>

                                                    {canManage && (
                                                        <>
                                                            <Link
                                                                to={`/admin/products/${product.id}/edit`}
                                                                className="btn btn-sm btn-outline-success rounded-pill"
                                                            >
                                                                <i className="bi bi-pencil-square me-1" />
                                                                Edit
                                                            </Link>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger rounded-pill"
                                                                disabled={
                                                                    deletingId !== null
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(product)
                                                                }
                                                            >
                                                                <i className="bi bi-trash me-1" />
                                                                Hapus
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* FOOTER */}

                    <div className="card-footer border-0 bg-white small text-muted px-4 py-3">
                        Menampilkan{' '}

                        <strong>
                            {filteredProducts.length}
                        </strong>

                        {' '}dari{' '}

                        <strong>
                            {products.length}
                        </strong>

                        {' '}produk.
                    </div>
                </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | PREVIEW DETAIL BARANG ADMIN
            |--------------------------------------------------------------------------
            |
            | Menggunakan komponen yang sama
            | dengan Merchandise dan SEKPiM.
            |
            | Tidak mengirim pengajuan ataupun
            | menambahkan barang ke keranjang.
            |
            */}

            <ProductDetailModal
                open={Boolean(previewProduct)}
                product={previewProduct}
                serviceName="Preview Katalog Admin"
                onClose={closePreview}
            />

            {/* CSS */}

            <style>{`
                .product-admin-cover {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 58px;
                    height: 58px;
                    min-width: 58px;
                    padding: 0;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                    color: #94a3b8;
                    font-size: 23px;
                    overflow: hidden;
                    cursor: pointer;
                }

                .product-admin-cover img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .product-admin-cover-count {
                    position: absolute;
                    right: 3px;
                    bottom: 3px;
                    background: rgba(15,23,42,.85);
                    color: #fff;
                    border-radius: 6px;
                    padding: 2px 5px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .product-admin-name {
                    display: block;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: #0f172a;
                    font-weight: 700;
                    font-size: 14px;
                    text-align: left;
                    cursor: pointer;
                    overflow-wrap: anywhere;
                }

                .product-admin-name:hover {
                    color: #047857;
                }

                .product-admin-cover:hover {
                    border-color: #059669;
                }

                .product-admin-cover:focus-visible,
                .product-admin-name:focus-visible {
                    outline: 3px solid #6ee7b7;
                    outline-offset: 2px;
                }
            `}</style>
        </div>
    );
}
