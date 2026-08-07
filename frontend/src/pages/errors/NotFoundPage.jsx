import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from '../../components/ProtectedRoute';

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin Humas',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Super Admin',
};

const getRoleLabel = (role) => {
    return (
        ROLE_LABELS[role] ||
        role ||
        'Pengguna'
    );
};

export default function NotFoundPage() {
    const location =
        useLocation();

    const navigate =
        useNavigate();

    const currentUser =
        getStoredUser();

    const role =
        currentUser?.role ||
        'user';

    const basePath =
        role === 'user'
            ? '/user'
            : '/admin';

    const defaultPath =
        getDefaultPath(
            currentUser
        );

    const recommendedMenus = [
        {
            label:
                'Dashboard',

            description:
                'Kembali ke halaman ringkasan sistem.',

            icon:
                'bi-speedometer2',

            color:
                'primary',

            path:
                `${basePath}/dashboard`,

            permission:
                'dashboard.view',
        },

        {
            label:
                'Ajukan Merchandise',

            description:
                'Buat pengajuan paket merchandise.',

            icon:
                'bi-cart-plus-fill',

            color:
                'primary',

            path:
                `${basePath}/request/merchandise`,

            permission:
                'request.merchandise.create',
        },

        {
            label:
                'Request Liputan Humas',

            description:
                'Ajukan kebutuhan liputan atau dokumentasi.',

            icon:
                'bi-camera-reels-fill',

            color:
                'danger',

            path:
                `${basePath}/request/humas-service`,

            permission:
                'request.humas.create',
        },

        {
            label:
                'Peminjaman SEKPiM',

            description:
                'Ajukan peminjaman perlengkapan.',

            icon:
                'bi-box-seam-fill',

            color:
                'success',

            path:
                `${basePath}/request/sekpim-borrowing`,

            permission:
                'request.borrowing.create',
        },

        {
            label:
                'Riwayat Pengajuan',

            description:
                'Pantau status pengajuan pribadi.',

            icon:
                'bi-clock-history',

            color:
                'info',

            path:
                `${basePath}/my-requests`,

            permission:
                'request.history.view',
        },

        {
            label:
                'Approval Merchandise',

            description:
                'Periksa pengajuan merchandise.',

            icon:
                'bi-gift-fill',

            color:
                'primary',

            path:
                '/admin/orders',

            permission:
                'approval.merchandise.view',
        },

        {
            label:
                'Approval Liputan Humas',

            description:
                'Periksa request layanan Humas.',

            icon:
                'bi-camera-reels-fill',

            color:
                'danger',

            path:
                '/admin/humas-services',

            permission:
                'approval.humas.view',
        },

        {
            label:
                'Approval Peminjaman',

            description:
                'Periksa peminjaman SEKPiM.',

            icon:
                'bi-clipboard-check-fill',

            color:
                'success',

            path:
                '/admin/borrow-requests',

            permission:
                'approval.borrowing.view',
        },

        {
            label:
                'Data Kategori',

            description:
                'Lihat kategori produk sistem.',

            icon:
                'bi-tags-fill',

            color:
                'warning',

            path:
                '/admin/categories',

            permission:
                'categories.view',
        },

        {
            label:
                'Data Produk',

            description:
                'Lihat produk dan stok.',

            icon:
                'bi-boxes',

            color:
                'warning',

            path:
                '/admin/products',

            permission:
                'products.view',
        },

        {
            label:
                'Data User',

            description:
                'Lihat daftar akun sistem.',

            icon:
                'bi-people-fill',

            color:
                'dark',

            path:
                '/admin/users',

            permission: [
                'users.view',
                'users.manage',
            ],
        },
    ].filter(
        (menu) =>
            hasPermission(
                currentUser,
                menu.permission
            )
    );

    const handleBack = () => {
        if (
            window.history.length >
            1
        ) {
            navigate(-1);
            return;
        }

        navigate(
            defaultPath,
            {
                replace: true,
            }
        );
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-7">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                404 — Halaman Tidak Ditemukan
                            </span>

                            <h1 className="display-5 fw-black mb-3">
                                Halaman yang kamu cari tidak tersedia.
                            </h1>

                            <p
                                className="text-white-50 mb-4"
                                style={{
                                    maxWidth: 720,
                                    lineHeight: 1.8,
                                }}
                            >
                                URL mungkin salah, halaman telah dipindahkan,
                                atau route tersebut belum tersedia di sistem.
                            </p>

                            <div className="p-3 rounded-4 bg-white bg-opacity-10 mb-4">
                                <div className="small text-white-50 mb-1">
                                    URL yang dibuka
                                </div>

                                <div className="fw-bold text-break">
                                    {location.pathname}
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                <Link
                                    to={
                                        defaultPath
                                    }
                                    className="btn btn-light rounded-pill px-4"
                                >
                                    <i className="bi bi-house-door-fill me-2" />

                                    Halaman Utama
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-outline-light rounded-pill px-4"
                                    onClick={
                                        handleBack
                                    }
                                >
                                    <i className="bi bi-arrow-left me-2" />

                                    Kembali
                                </button>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4 p-lg-5 text-center">
                                <div
                                    className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-white text-primary"
                                    style={{
                                        width: 112,
                                        height: 112,
                                    }}
                                >
                                    <i className="bi bi-compass-fill display-4" />
                                </div>

                                <h4 className="fw-black mb-3">
                                    Kamu tersesat
                                </h4>

                                <p
                                    className="text-white-50 mb-0"
                                    style={{
                                        lineHeight: 1.8,
                                    }}
                                >
                                    Pilih halaman utama atau salah satu menu yang
                                    tersedia sesuai permission akun.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-4">
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h4 className="fw-black mb-1">
                                    Menu yang dapat diakses
                                </h4>

                                <p className="text-muted mb-0">
                                    Rekomendasi berdasarkan permission akun saat ini.
                                </p>
                            </div>

                            <span className="badge rounded-pill text-bg-light px-3 py-2">
                                {getRoleLabel(
                                    role
                                )}
                            </span>
                        </div>

                        {recommendedMenus.length ===
                        0 ? (
                            <div className="alert alert-warning border-0 rounded-4 mb-0">
                                <i className="bi bi-exclamation-triangle-fill me-2" />

                                Akun belum memiliki menu yang dapat dibuka.
                            </div>
                        ) : (
                            <div className="row g-3">
                                {recommendedMenus.map(
                                    (menu) => (
                                        <div
                                            className="col-md-6 col-xl-4"
                                            key={`${menu.label}-${menu.path}`}
                                        >
                                            <Link
                                                to={
                                                    menu.path
                                                }
                                                className="text-decoration-none"
                                            >
                                                <div className="p-3 rounded-4 border action-card h-100">
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div
                                                            className={`icon-box bg-${menu.color}-subtle text-${menu.color}`}
                                                        >
                                                            <i
                                                                className={`bi ${menu.icon}`}
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="fw-black text-dark mb-1">
                                                                {
                                                                    menu.label
                                                                }
                                                            </div>

                                                            <div className="small text-muted">
                                                                {
                                                                    menu.description
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}