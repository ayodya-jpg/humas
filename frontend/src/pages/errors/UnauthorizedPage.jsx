import {
    Link,
    useNavigate,
} from 'react-router-dom';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from '../../components/ProtectedRoute';

import {
    clearLocalSession,
} from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

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

export default function UnauthorizedPage() {
    const navigate =
        useNavigate();

    const currentUser =
        getStoredUser();

    const role =
        currentUser?.role ||
        'user';

    const defaultPath =
        getDefaultPath(
            currentUser
        );

    const basePath =
        role === 'user'
            ? '/user'
            : '/admin';

    const canViewHistory =
        hasPermission(
            currentUser,
            'request.history.view'
        );

    const canViewDashboard =
        hasPermission(
            currentUser,
            'dashboard.view'
        );

    const handleLogout =
        async () => {
            const confirmation =
                await showConfirmAlert({
                    title:
                        'Keluar dari sistem?',

                    text:
                        'Sesi login akan dihapus dan kamu harus login kembali.',

                    confirmButtonText:
                        'Ya, keluar',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation.isConfirmed
            ) {
                return;
            }

            clearLocalSession();
            closeAlert();

            await showSuccessAlert(
                'Sesi Dihapus',
                'Silakan login kembali menggunakan akun yang sesuai.'
            );

            navigate(
                '/login',
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
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-7">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                403 — Akses Ditolak
                            </span>

                            <h1 className="display-5 fw-black mb-3">
                                Akun kamu tidak memiliki izin membuka halaman ini.
                            </h1>

                            <p
                                className="text-white-50 mb-4"
                                style={{
                                    maxWidth: 720,
                                    lineHeight: 1.8,
                                }}
                            >
                                Sistem mendeteksi akun sebagai{' '}

                                <strong className="text-white">
                                    {getRoleLabel(
                                        role
                                    )}
                                </strong>

                                . Halaman ini membutuhkan permission yang belum aktif
                                pada akun kamu.
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <Link
                                    to={
                                        defaultPath
                                    }
                                    className="btn btn-light rounded-pill px-4"
                                >
                                    <i className="bi bi-house-door-fill me-2" />

                                    Kembali ke Halaman Utama
                                </Link>

                                {canViewHistory && (
                                    <Link
                                        to={`${basePath}/my-requests`}
                                        className="btn btn-outline-light rounded-pill px-4"
                                    >
                                        <i className="bi bi-clock-history me-2" />

                                        Riwayat Pengajuan
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-outline-light rounded-pill px-4"
                                    onClick={
                                        handleLogout
                                    }
                                >
                                    <i className="bi bi-box-arrow-right me-2" />

                                    Logout
                                </button>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="bg-white bg-opacity-10 rounded-5 p-4 p-lg-5 text-center">
                                <div
                                    className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-white text-danger"
                                    style={{
                                        width: 112,
                                        height: 112,
                                    }}
                                >
                                    <i className="bi bi-shield-lock-fill display-4" />
                                </div>

                                <h4 className="fw-black mb-3">
                                    Permission belum tersedia
                                </h4>

                                <p
                                    className="text-white-50 mb-0"
                                    style={{
                                        lineHeight: 1.8,
                                    }}
                                >
                                    Hubungi superadmin apabila akun ini seharusnya
                                    mempunyai akses ke menu tersebut.
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
                                <i className="bi bi-person-badge-fill" />
                            </div>

                            <h5 className="fw-black mb-2">
                                Role Akun
                            </h5>

                            <p className="text-muted mb-0">
                                {getRoleLabel(
                                    role
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="icon-box bg-success-subtle text-success mb-3">
                                <i className="bi bi-key-fill" />
                            </div>

                            <h5 className="fw-black mb-2">
                                Hak Akses
                            </h5>

                            <p className="text-muted mb-0">
                                {Array.isArray(
                                    currentUser?.permissions
                                )
                                    ? currentUser.permissions.length
                                    : 0}{' '}
                                permission aktif.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4">
                            <div className="icon-box bg-danger-subtle text-danger mb-3">
                                <i className="bi bi-house-door-fill" />
                            </div>

                            <h5 className="fw-black mb-2">
                                Halaman Utama
                            </h5>

                            <p className="text-muted mb-0">
                                {canViewDashboard
                                    ? 'Dashboard dapat diakses.'
                                    : 'Sistem akan memilih menu pertama yang tersedia.'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}