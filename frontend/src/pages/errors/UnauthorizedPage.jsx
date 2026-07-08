import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
    const authUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="card-body p-4 p-lg-5">
                    <div className="row align-items-center justify-content-center g-4">
                        <div className="col-lg-7 text-center">
                            <div
                                className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-5 bg-danger-subtle text-danger"
                                style={{ width: 90, height: 90 }}
                            >
                                <i className="bi bi-shield-lock-fill display-5"></i>
                            </div>

                            <span className="text-danger small fw-bold text-uppercase">
                                Access Denied
                            </span>

                            <h1 className="display-5 fw-black mt-2 mb-3">
                                Akses Ditolak
                            </h1>

                            <p className="text-muted mb-4" style={{ lineHeight: 1.8 }}>
                                Akun kamu saat ini login sebagai{' '}
                                <strong className="text-dark">{authUser.role || 'user'}</strong>.
                                Halaman yang kamu coba buka membutuhkan role yang lebih tinggi.
                            </p>

                            <div className="d-flex justify-content-center flex-wrap gap-2">
                                <Link
                                    to="/admin/dashboard"
                                    className="btn btn-primary rounded-pill fw-bold px-4"
                                >
                                    <i className="bi bi-grid-1x2-fill me-2"></i>
                                    Kembali ke Dashboard
                                </Link>

                                <Link
                                    to="/admin/my-requests"
                                    className="btn btn-outline-dark rounded-pill fw-bold px-4"
                                >
                                    <i className="bi bi-clock-history me-2"></i>
                                    Riwayat Saya
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}