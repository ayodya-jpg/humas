import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
    let currentUser = {};

    try {
        currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        currentUser = {};
    }

    const role = currentUser.role || 'user';

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-7">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Akses Ditolak
                            </span>

                            <h1 className="display-5 fw-black mb-3">
                                Kamu tidak punya akses ke halaman ini.
                            </h1>

                            <p
                                className="text-white-50 mb-4"
                                style={{ maxWidth: 720, lineHeight: 1.8 }}
                            >
                                Halaman yang kamu buka membutuhkan role tertentu.
                                Saat ini akun kamu terdeteksi sebagai{' '}
                                <strong className="text-white text-capitalize">{role}</strong>.
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <Link
                                    to="/admin/dashboard"
                                    className="btn btn-light rounded-pill px-4"
                                >
                                    <i className="bi bi-speedometer2 me-2"></i>
                                    Kembali ke Dashboard
                                </Link>

                                <Link
                                    to="/admin/my-requests"
                                    className="btn btn-outline-light rounded-pill px-4"
                                >
                                    <i className="bi bi-clock-history me-2"></i>
                                    Riwayat Saya
                                </Link>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4 p-lg-5 text-center">
                                <div
                                    className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-white text-danger"
                                    style={{ width: 112, height: 112 }}
                                >
                                    <i className="bi bi-shield-lock-fill display-4"></i>
                                </div>

                                <h4 className="fw-black mb-3">
                                    Role tidak sesuai
                                </h4>

                                <p className="text-white-50 mb-0" style={{ lineHeight: 1.8 }}>
                                    Coba kembali ke dashboard atau hubungi super admin
                                    kalau kamu merasa seharusnya punya akses ke halaman ini.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="row g-4 mt-1">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="icon-box bg-primary-subtle text-primary mb-3">
                                <i className="bi bi-person-fill"></i>
                            </div>

                            <h5 className="fw-black mb-2">User</h5>
                            <p className="text-muted mb-0">
                                Bisa membuat pengajuan dan melihat riwayat pribadi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="icon-box bg-success-subtle text-success mb-3">
                                <i className="bi bi-person-check-fill"></i>
                            </div>

                            <h5 className="fw-black mb-2">Admin</h5>
                            <p className="text-muted mb-0">
                                Bisa memproses approval merchandise dan peminjaman.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="icon-box bg-danger-subtle text-danger mb-3">
                                <i className="bi bi-person-gear"></i>
                            </div>

                            <h5 className="fw-black mb-2">Super Admin</h5>
                            <p className="text-muted mb-0">
                                Bisa mengelola master data dan manajemen user.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}