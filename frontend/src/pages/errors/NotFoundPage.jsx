import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="card-body p-4 p-lg-5">
                    <div className="row align-items-center justify-content-center g-4">
                        <div className="col-lg-7 text-center">
                            <div
                                className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-5 bg-primary-subtle text-primary"
                                style={{ width: 90, height: 90 }}
                            >
                                <i className="bi bi-map-fill display-5"></i>
                            </div>

                            <span className="text-primary small fw-bold text-uppercase">
                                404 Not Found
                            </span>

                            <h1 className="display-5 fw-black mt-2 mb-3">
                                Halaman Tidak Ditemukan
                            </h1>

                            <p className="text-muted mb-4" style={{ lineHeight: 1.8 }}>
                                Route atau halaman yang kamu buka tidak tersedia di sistem
                                HUMAS & SEKPIM. Cek kembali URL, atau kembali ke dashboard.
                            </p>

                            <div className="d-flex justify-content-center flex-wrap gap-2">
                                <Link
                                    to="/admin/dashboard"
                                    className="btn btn-primary rounded-pill fw-bold px-4"
                                >
                                    <i className="bi bi-house-door-fill me-2"></i>
                                    Kembali ke Dashboard
                                </Link>

                                <Link
                                    to="/admin/request/merchandise"
                                    className="btn btn-outline-primary rounded-pill fw-bold px-4"
                                >
                                    <i className="bi bi-gift-fill me-2"></i>
                                    Ajukan Merchandise
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}