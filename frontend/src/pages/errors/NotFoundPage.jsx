import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
    const location = useLocation();

    let currentUser = {};

    try {
        currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        currentUser = {};
    }

    const role = currentUser.role || 'user';

    const recommendedMenus = [
        {
            label: 'Dashboard',
            description: 'Kembali ke halaman utama sistem.',
            icon: 'bi-speedometer2',
            color: 'primary',
            path: '/admin/dashboard',
            roles: ['user', 'admin', 'superadmin'],
        },
        {
            label: 'Riwayat Saya',
            description: 'Lihat status pengajuan pribadi.',
            icon: 'bi-clock-history',
            color: 'info',
            path: '/admin/my-requests',
            roles: ['user', 'admin', 'superadmin'],
        },
        {
            label: 'Approval Merchandise',
            description: 'Kelola pengajuan merchandise.',
            icon: 'bi-gift-fill',
            color: 'primary',
            path: '/admin/orders',
            roles: ['admin', 'superadmin'],
        },
        {
            label: 'Approval Peminjaman',
            description: 'Kelola peminjaman barang.',
            icon: 'bi-box-seam-fill',
            color: 'success',
            path: '/admin/borrow-requests',
            roles: ['admin', 'superadmin'],
        },
        {
            label: 'Paket Merchandise',
            description: 'Kelola produk dan stok.',
            icon: 'bi-boxes',
            color: 'warning',
            path: '/admin/products',
            roles: ['superadmin'],
        },
        {
            label: 'Data User',
            description: 'Kelola akun pengguna sistem.',
            icon: 'bi-people-fill',
            color: 'danger',
            path: '/admin/users',
            roles: ['superadmin'],
        },
    ].filter((menu) => menu.roles.includes(role));

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
                                404 Not Found
                            </span>

                            <h1 className="display-5 fw-black mb-3">
                                Halaman yang kamu cari tidak ditemukan.
                            </h1>

                            <p
                                className="text-white-50 mb-4"
                                style={{ maxWidth: 720, lineHeight: 1.8 }}
                            >
                                URL yang kamu buka tidak tersedia, sudah dipindahkan,
                                atau kamu mengetik alamat halaman yang kurang tepat.
                            </p>

                            <div className="p-3 rounded-4 bg-white bg-opacity-10 mb-4">
                                <div className="small text-white-50 mb-1">
                                    URL yang dicoba:
                                </div>

                                <div className="fw-bold text-break">
                                    {location.pathname}
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                <Link
                                    to="/admin/dashboard"
                                    className="btn btn-light rounded-pill px-4"
                                >
                                    <i className="bi bi-house-door-fill me-2"></i>
                                    Dashboard
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-outline-light rounded-pill px-4"
                                    onClick={() => window.history.back()}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>
                                    Kembali
                                </button>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4 p-lg-5 text-center">
                                <div
                                    className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-white text-primary"
                                    style={{ width: 112, height: 112 }}
                                >
                                    <i className="bi bi-compass-fill display-4"></i>
                                </div>

                                <h4 className="fw-black mb-3">
                                    Sepertinya kamu tersesat
                                </h4>

                                <p className="text-white-50 mb-0" style={{ lineHeight: 1.8 }}>
                                    Tenang, sistemnya aman. Pilih salah satu menu yang
                                    tersedia di bawah untuk kembali ke alur yang benar.
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
                                    Menu yang bisa kamu buka
                                </h4>

                                <p className="text-muted mb-0">
                                    Rekomendasi berdasarkan role kamu saat ini.
                                </p>
                            </div>

                            <span className="badge rounded-pill text-bg-light text-capitalize px-3 py-2">
                                Role: {role}
                            </span>
                        </div>

                        <div className="row g-3">
                            {recommendedMenus.map((menu) => (
                                <div className="col-md-6 col-xl-4" key={menu.path}>
                                    <Link to={menu.path} className="text-decoration-none">
                                        <div className="p-3 rounded-4 border action-card h-100">
                                            <div className="d-flex align-items-start gap-3">
                                                <div className={`icon-box bg-${menu.color}-subtle text-${menu.color}`}>
                                                    <i className={`bi ${menu.icon}`}></i>
                                                </div>

                                                <div>
                                                    <div className="fw-black text-dark mb-1">
                                                        {menu.label}
                                                    </div>

                                                    <div className="small text-muted">
                                                        {menu.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}