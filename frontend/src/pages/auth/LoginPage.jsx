import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    useLocation,
    useNavigate,
} from 'react-router-dom';

import api from '../../api/axios';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from '../../components/ProtectedRoute';

import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const USER_ROLE = 'user';

const isRedirectAllowedForRole = (
    path,
    role
) => {
    if (
        typeof path !== 'string' ||
        path.trim() === ''
    ) {
        return false;
    }

    if (role === USER_ROLE) {
        return (
            path === '/user' ||
            path.startsWith('/user/')
        );
    }

    return (
        path === '/admin' ||
        path.startsWith('/admin/')
    );
};

const canAccessRequestedPath = (
    path,
    user
) => {
    if (
        !isRedirectAllowedForRole(
            path,
            user?.role
        )
    ) {
        return false;
    }

    const permissionRoutes = [
        {
            prefix: '/user/dashboard',
            permission: 'dashboard.view',
        },
        {
            prefix: '/admin/dashboard',
            permission: 'dashboard.view',
        },
        {
            prefix: '/user/request/merchandise',
            permission:
                'request.merchandise.create',
        },
        {
            prefix: '/admin/request/merchandise',
            permission:
                'request.merchandise.create',
        },
        {
            prefix: '/user/request/humas-service',
            permission:
                'request.humas.create',
        },
        {
            prefix: '/admin/request/humas-service',
            permission:
                'request.humas.create',
        },
        {
            prefix: '/user/request/sekpim-borrowing',
            permission:
                'request.borrowing.create',
        },
        {
            prefix: '/admin/request/sekpim-borrowing',
            permission:
                'request.borrowing.create',
        },
        {
            prefix: '/user/my-requests',
            permission:
                'request.history.view',
        },
        {
            prefix: '/admin/my-requests',
            permission:
                'request.history.view',
        },
        {
            prefix: '/admin/orders',
            permission:
                'approval.merchandise.view',
        },
        {
            prefix: '/admin/humas-services',
            permission:
                'approval.humas.view',
        },
        {
            prefix: '/admin/borrow-requests',
            permission:
                'approval.borrowing.view',
        },
        {
            prefix: '/admin/categories',
            permission:
                'categories.view',
        },
        {
            prefix: '/admin/products',
            permission:
                'products.view',
        },
        {
            prefix: '/admin/users',
            permission: [
                'users.view',
                'users.manage',
            ],
        },
    ];

    const matchedRoute =
        permissionRoutes.find(
            (route) =>
                path === route.prefix ||
                path.startsWith(
                    `${route.prefix}/`
                )
        );

    if (!matchedRoute) {
        return false;
    }

    return hasPermission(
        user,
        matchedRoute.permission
    );
};

const clearLocalSession = () => {
    localStorage.removeItem(
        'admin_token'
    );

    localStorage.removeItem(
        'admin_user'
    );
};

export default function LoginPage() {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const [
        form,
        setForm,
    ] = useState({
        username: '',
        password: '',
    });

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const getRedirectAfterLogin =
        useCallback(
            (user) => {
                const requestedPath =
                    location.state?.from;

                if (
                    canAccessRequestedPath(
                        requestedPath,
                        user
                    )
                ) {
                    return requestedPath;
                }

                return getDefaultPath(
                    user
                );
            },
            [location.state]
        );

    /*
    |--------------------------------------------------------------------------
    | Sinkronisasi sesi yang masih tersimpan
    |--------------------------------------------------------------------------
    |
    | Jangan hanya percaya data localStorage.
    | Ambil data akun terbaru dari endpoint /admin/me.
    |
    */

    useEffect(() => {
        let isMounted = true;

        const synchronizeSession =
            async () => {
                const token =
                    localStorage.getItem(
                        'admin_token'
                    );

                if (!token) {
                    return;
                }

                try {
                    const response =
                        await api.get(
                            '/admin/me'
                        );

                    const authenticatedUser =
                        response?.data?.data;

                    if (
                        !authenticatedUser?.role
                    ) {
                        throw new Error(
                            'Data sesi tidak lengkap.'
                        );
                    }

                    localStorage.setItem(
                        'admin_user',
                        JSON.stringify(
                            authenticatedUser
                        )
                    );

                    if (isMounted) {
                        navigate(
                            getRedirectAfterLogin(
                                authenticatedUser
                            ),
                            {
                                replace: true,
                            }
                        );
                    }
                } catch (error) {
                    if (
                        error?.response?.status !==
                        401
                    ) {
                        console.error(
                            'Session synchronization error:',
                            error?.response?.data ||
                                error
                        );

                        clearLocalSession();
                    }
                }
            };

        synchronizeSession();

        return () => {
            isMounted = false;
        };
    }, [
        getRedirectAfterLogin,
        navigate,
    ]);

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (previousForm) => ({
                ...previousForm,
                [name]: value,
            })
        );
    };

    const validateForm = () => {
        if (
            !form.username.trim()
        ) {
            showWarningAlert(
                'Username Wajib Diisi',
                'Masukkan username terlebih dahulu.'
            );

            return false;
        }

        if (!form.password) {
            showWarningAlert(
                'Password Wajib Diisi',
                'Masukkan password terlebih dahulu.'
            );

            return false;
        }

        return true;
    };

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            showLoadingAlert(
                'Login',
                'Memeriksa akun kamu...'
            );

            const loginResponse =
                await api.post(
                    '/admin/login',
                    {
                        username:
                            form.username.trim(),

                        password:
                            form.password,
                    }
                );

            const loginData =
                loginResponse?.data?.data;

            if (
                !loginData?.token ||
                !loginData?.user?.role
            ) {
                throw new Error(
                    'Response login tidak lengkap.'
                );
            }

            /*
             * Simpan token lebih dahulu agar endpoint /admin/me
             * dapat menggunakan bearer token.
             */
            localStorage.setItem(
                'admin_token',
                loginData.token
            );

            /*
             * Simpan sementara response login.
             */
            localStorage.setItem(
                'admin_user',
                JSON.stringify(
                    loginData.user
                )
            );

            /*
             * Ambil data user terbaru dari backend.
             */
            const meResponse =
                await api.get(
                    '/admin/me'
                );

            const authenticatedUser =
                meResponse?.data?.data;

            if (
                !authenticatedUser?.role
            ) {
                throw new Error(
                    'Data akun terbaru tidak dapat diambil.'
                );
            }

            localStorage.setItem(
                'admin_user',
                JSON.stringify(
                    authenticatedUser
                )
            );

            closeAlert();

            await showSuccessAlert(
                'Login Berhasil',
                `Selamat datang, ${authenticatedUser.name}.`
            );

            navigate(
                getRedirectAfterLogin(
                    authenticatedUser
                ),
                {
                    replace: true,
                }
            );
        } catch (error) {
            console.error(
                'Login error:',
                error?.response?.data ||
                    error
            );

            clearLocalSession();
            closeAlert();

            await showErrorAlert(
                'Login Gagal',
                error?.response?.data
                    ?.message ||
                    error?.message ||
                    'Username atau password tidak sesuai.'
            );
        } finally {
            setLoading(false);
        }
    };

    const fillDemoAccount = (
        username
    ) => {
        setForm({
            username,
            password:
                'password123',
        });
    };

    const storedUser =
        getStoredUser();

    return (
        <main className="login-page">
            <div className="login-bg-shape login-bg-shape-1" />
            <div className="login-bg-shape login-bg-shape-2" />

            <div className="container">
                <div className="row min-vh-100 align-items-center justify-content-center g-5 py-5">
                    <div className="col-lg-6">
                        <section className="login-hero text-white">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className="login-logo-box">
                                    <img
                                        src="/images/logo-putih-tus.png"
                                        alt="Telkom University Surabaya"
                                        className="login-logo-img"
                                        onError={(
                                            event
                                        ) => {
                                            event.currentTarget.style.display =
                                                'none';
                                        }}
                                    />
                                </div>

                                <div>
                                    <div className="login-brand-title">
                                        HUMAS
                                    </div>

                                    <div className="login-brand-subtitle">
                                        Telkom University Surabaya
                                    </div>
                                </div>
                            </div>

                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-4">
                                Sistem Pengajuan Internal
                            </span>

                            <h1 className="display-4 fw-black mb-4">
                                Kelola pengajuan HUMAS &amp; SEKPiM dalam satu sistem.
                            </h1>

                            <p
                                className="lead text-white-50 mb-4"
                                style={{
                                    lineHeight: 1.8,
                                }}
                            >
                                Masuk untuk membuat pengajuan merchandise,
                                request liputan Humas, peminjaman barang
                                Sekretariat Pimpinan, serta memantau proses
                                pelayanan berdasarkan akses akun.
                            </p>

                            <div className="row g-3">
                                <div className="col-sm-4">
                                    <div className="login-feature-card">
                                        <i className="bi bi-gift-fill fs-3 mb-3" />

                                        <div className="fw-black">
                                            Merchandise
                                        </div>

                                        <div className="small text-white-50">
                                            Pengajuan paket tamu.
                                        </div>
                                    </div>
                                </div>

                                <div className="col-sm-4">
                                    <div className="login-feature-card">
                                        <i className="bi bi-camera-reels-fill fs-3 mb-3" />

                                        <div className="fw-black">
                                            Humas
                                        </div>

                                        <div className="small text-white-50">
                                            Request liputan kegiatan.
                                        </div>
                                    </div>
                                </div>

                                <div className="col-sm-4">
                                    <div className="login-feature-card">
                                        <i className="bi bi-box-seam-fill fs-3 mb-3" />

                                        <div className="fw-black">
                                            SEKPiM
                                        </div>

                                        <div className="small text-white-50">
                                            Peminjaman perlengkapan.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-lg-5">
                        <section className="card border-0 shadow-lg rounded-5 login-card">
                            <div className="card-body p-4 p-lg-5">
                                <div className="text-center mb-4">
                                    <div className="login-icon mx-auto mb-3">
                                        <i className="bi bi-shield-lock-fill" />
                                    </div>

                                    <h2 className="fw-black mb-2">
                                        Login
                                    </h2>

                                    <p className="text-muted mb-0">
                                        Masukkan username dan password untuk melanjutkan.
                                    </p>
                                </div>

                                {storedUser?.role && (
                                    <div className="alert alert-info border-0 rounded-4">
                                        <i className="bi bi-arrow-clockwise me-2" />
                                        Memeriksa sesi akun yang tersimpan.
                                    </div>
                                )}

                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >
                                    <div className="mb-3">
                                        <label
                                            htmlFor="username"
                                            className="form-label fw-bold"
                                        >
                                            Username
                                        </label>

                                        <div className="input-group input-group-lg">
                                            <span className="input-group-text">
                                                <i className="bi bi-person-fill" />
                                            </span>

                                            <input
                                                id="username"
                                                type="text"
                                                name="username"
                                                className="form-control"
                                                placeholder="Masukkan username"
                                                value={
                                                    form.username
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    loading
                                                }
                                                autoComplete="username"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            htmlFor="password"
                                            className="form-label fw-bold"
                                        >
                                            Password
                                        </label>

                                        <div className="input-group input-group-lg">
                                            <span className="input-group-text">
                                                <i className="bi bi-key-fill" />
                                            </span>

                                            <input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                name="password"
                                                className="form-control"
                                                placeholder="Masukkan password"
                                                value={
                                                    form.password
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    loading
                                                }
                                                autoComplete="current-password"
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (
                                                            previousValue
                                                        ) =>
                                                            !previousValue
                                                    )
                                                }
                                                disabled={
                                                    loading
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? 'Sembunyikan password'
                                                        : 'Tampilkan password'
                                                }
                                            >
                                                <i
                                                    className={`bi ${
                                                        showPassword
                                                            ? 'bi-eye-slash-fill'
                                                            : 'bi-eye-fill'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-danger btn-lg rounded-pill w-100 mb-4"
                                        disabled={
                                            loading
                                        }
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-box-arrow-in-right me-2" />
                                                Masuk Sistem
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="p-3 rounded-4 bg-light border">
                                    <div className="small fw-bold text-muted mb-2">
                                        Akun testing
                                    </div>

                                    <div className="d-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger rounded-pill"
                                            onClick={() =>
                                                fillDemoAccount(
                                                    'superadmin'
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                        >
                                            Super Admin
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary rounded-pill"
                                            onClick={() =>
                                                fillDemoAccount(
                                                    'admin'
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                        >
                                            Admin
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-success rounded-pill"
                                            onClick={() =>
                                                fillDemoAccount(
                                                    'user'
                                                )
                                            }
                                            disabled={
                                                loading
                                            }
                                        >
                                            User
                                        </button>
                                    </div>

                                    <div className="small text-muted mt-2">
                                        Password default:{' '}
                                        <strong>
                                            password123
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <p className="text-center text-white-50 small mt-4 mb-0">
                            © HUMAS Telkom University Surabaya
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}