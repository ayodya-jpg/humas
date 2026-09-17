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

import PublicDirectorCalendar from '../../components/PublicDirectorCalendar';

import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const USER_ROLE =
    'user';

const isRedirectAllowedForRole =
    (
        path,
        role
    ) => {
        if (
            typeof path !==
                'string' ||
            path.trim() ===
                ''
        ) {
            return false;
        }

        if (
            role ===
            USER_ROLE
        ) {
            return (
                path ===
                    '/user' ||
                path.startsWith(
                    '/user/'
                )
            );
        }

        return (
            path ===
                '/admin' ||
            path.startsWith(
                '/admin/'
            )
        );
    };

const canAccessRequestedPath =
    (
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

        /*
         * Jadwal Direktur tersedia
         * untuk seluruh akun login.
         */
        if (
            path ===
                '/user/director-schedule' ||
            path.startsWith(
                '/user/director-schedule/'
            ) ||
            path ===
                '/admin/director-schedule' ||
            path.startsWith(
                '/admin/director-schedule/'
            )
        ) {
            return true;
        }

        const permissionRoutes = [
            {
                prefix:
                    '/user/dashboard',

                permission:
                    'dashboard.view',
            },

            {
                prefix:
                    '/admin/dashboard',

                permission:
                    'dashboard.view',
            },

            {
                prefix:
                    '/user/request/merchandise',

                permission:
                    'request.merchandise.create',
            },

            {
                prefix:
                    '/admin/request/merchandise',

                permission:
                    'request.merchandise.create',
            },

            {
                prefix:
                    '/user/request/humas-service',

                permission:
                    'request.humas.create',
            },

            {
                prefix:
                    '/admin/request/humas-service',

                permission:
                    'request.humas.create',
            },

            {
                prefix:
                    '/user/request/sekpim-borrowing',

                permission:
                    'request.borrowing.create',
            },

            {
                prefix:
                    '/admin/request/sekpim-borrowing',

                permission:
                    'request.borrowing.create',
            },

            {
                prefix:
                    '/user/my-requests',

                permission:
                    'request.history.view',
            },

            {
                prefix:
                    '/admin/my-requests',

                permission:
                    'request.history.view',
            },

            {
                prefix:
                    '/admin/orders',

                permission:
                    'approval.merchandise.view',
            },

            {
                prefix:
                    '/admin/humas-services',

                permission:
                    'approval.humas.view',
            },

            {
                prefix:
                    '/admin/borrow-requests',

                permission:
                    'approval.borrowing.view',
            },

            {
                prefix:
                    '/admin/categories',

                permission:
                    'categories.view',
            },

            {
                prefix:
                    '/admin/products',

                permission:
                    'products.view',
            },

            {
                prefix:
                    '/admin/users',

                permission: [
                    'users.view',
                    'users.manage',
                ],
            },
        ];

        const matchedRoute =
            permissionRoutes.find(
                (
                    route
                ) =>
                    path ===
                        route.prefix ||
                    path.startsWith(
                        `${route.prefix}/`
                    )
            );

        if (
            !matchedRoute
        ) {
            return false;
        }

        return hasPermission(
            user,
            matchedRoute
                .permission
        );
    };

const clearLocalSession =
    () => {
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
    ] =
        useState({
            username:
                '',

            password:
                '',
        });

    const [
        showPassword,
        setShowPassword,
    ] =
        useState(
            false
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );

    /*
    |--------------------------------------------------------------------------
    | REDIRECT
    |--------------------------------------------------------------------------
    */

    const getRedirectAfterLogin =
        useCallback(
            (
                user
            ) => {
                const requestedPath =
                    location
                        .state
                        ?.from;

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
            [
                location.state,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | SESSION SYNC
    |--------------------------------------------------------------------------
    */

    useEffect(
        () => {
            let isMounted =
                true;

            const synchronizeSession =
                async () => {
                    const token =
                        localStorage.getItem(
                            'admin_token'
                        );

                    if (
                        !token
                    ) {
                        return;
                    }

                    try {
                        const response =
                            await api.get(
                                '/admin/me'
                            );

                        const authenticatedUser =
                            response
                                ?.data
                                ?.data;

                        if (
                            !authenticatedUser
                                ?.role
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

                        if (
                            isMounted
                        ) {
                            navigate(
                                getRedirectAfterLogin(
                                    authenticatedUser
                                ),
                                {
                                    replace:
                                        true,
                                }
                            );
                        }
                    } catch (
                        error
                    ) {
                        if (
                            error
                                ?.response
                                ?.status !==
                            401
                        ) {
                            console.error(
                                'Session synchronization error:',
                                error
                                    ?.response
                                    ?.data ||
                                    error
                            );
                        }

                        clearLocalSession();
                    }
                };

            synchronizeSession();

            return () => {
                isMounted =
                    false;
            };
        },
        [
            getRedirectAfterLogin,
            navigate,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    const handleChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            setForm(
                (
                    previous
                ) => ({
                    ...previous,

                    [name]:
                        value,
                })
            );
        };

    const validateForm =
        () => {
            if (
                !form
                    .username
                    .trim()
            ) {
                showWarningAlert(
                    'Username Wajib Diisi',
                    'Masukkan username terlebih dahulu.'
                );

                return false;
            }

            if (
                !form
                    .password
            ) {
                showWarningAlert(
                    'Password Wajib Diisi',
                    'Masukkan password terlebih dahulu.'
                );

                return false;
            }

            return true;
        };

    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                !validateForm()
            ) {
                return;
            }

            try {
                setLoading(
                    true
                );

                showLoadingAlert(
                    'Login',
                    'Memeriksa akun kamu...'
                );

                const loginResponse =
                    await api.post(
                        '/admin/login',
                        {
                            username:
                                form
                                    .username
                                    .trim(),

                            password:
                                form
                                    .password,
                        }
                    );

                const loginData =
                    loginResponse
                        ?.data
                        ?.data;

                if (
                    !loginData
                        ?.token ||
                    !loginData
                        ?.user
                        ?.role
                ) {
                    throw new Error(
                        'Response login tidak lengkap.'
                    );
                }

                localStorage.setItem(
                    'admin_token',
                    loginData.token
                );

                localStorage.setItem(
                    'admin_user',
                    JSON.stringify(
                        loginData.user
                    )
                );

                const meResponse =
                    await api.get(
                        '/admin/me'
                    );

                const authenticatedUser =
                    meResponse
                        ?.data
                        ?.data;

                if (
                    !authenticatedUser
                        ?.role
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
                        replace:
                            true,
                    }
                );
            } catch (
                error
            ) {
                console.error(
                    'Login error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                clearLocalSession();

                closeAlert();

                await showErrorAlert(
                    'Login Gagal',
                    error
                        ?.response
                        ?.data
                        ?.message ||
                        error
                            ?.message ||
                        'Username atau password tidak sesuai.'
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | DEMO ACCOUNT
    |--------------------------------------------------------------------------
    */

    const fillDemoAccount =
        (
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

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    return (
        <main className="director-login-page">
            <div className="director-login-glow director-login-glow-1" />

            <div className="director-login-glow director-login-glow-2" />

            <div className="container-fluid px-3 px-lg-5">
                <div className="row min-vh-100 align-items-center g-4 g-xl-5 py-4 py-xl-5">
                    {/* =====================================================
                        CALENDAR
                    ===================================================== */}

                    <div className="col-xl-8">
                        <div className="director-login-brand">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className="director-login-logo">
                                    <img
                                        src="/images/logo-putih-tus.png"
                                        alt="Telkom University Surabaya"
                                        onError={(
                                            event
                                        ) => {
                                            event
                                                .currentTarget
                                                .style
                                                .display =
                                                'none';
                                        }}
                                    />
                                </div>

                                <div>
                                    <div className="director-login-brand-title">
                                        HUMAS &amp; SEKPiM
                                    </div>

                                    <div className="director-login-brand-subtitle">
                                        Telkom University Surabaya
                                    </div>
                                </div>
                            </div>
                        </div>

                        <PublicDirectorCalendar />
                    </div>

                    {/* =====================================================
                        LOGIN
                    ===================================================== */}

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-lg rounded-5 director-login-card">
                            <div className="card-body p-4 p-lg-5">
                                <div className="text-center mb-4">
                                    <div className="login-icon mx-auto mb-3">
                                        <i className="bi bi-shield-lock-fill" />
                                    </div>

                                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-3">
                                        Sistem Layanan Internal
                                    </span>

                                    <h2 className="fw-black mb-2">
                                        Selamat Datang
                                    </h2>

                                    <p className="text-muted mb-0">
                                        Masukkan username dan password untuk masuk ke sistem.
                                    </p>
                                </div>

                                {storedUser
                                    ?.role && (
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
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-person-fill text-danger" />
                                            </span>

                                            <input
                                                id="username"
                                                type="text"
                                                name="username"
                                                className="form-control border-start-0"
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
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-key-fill text-danger" />
                                            </span>

                                            <input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                name="password"
                                                className="form-control border-start-0 border-end-0"
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
                                                className="btn btn-outline-secondary border-start-0"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (
                                                            previous
                                                        ) =>
                                                            !previous
                                                    )
                                                }
                                                disabled={
                                                    loading
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
                                        Akun Testing
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
                            © HUMAS &amp; SEKPiM Telkom University Surabaya
                        </p>
                    </div>
                </div>
            </div>

            <style>
                {`
                    .director-login-page {
                        min-height: 100vh;
                        position: relative;
                        overflow-x: hidden;
                        background:
                            radial-gradient(
                                circle at top left,
                                rgba(239, 68, 68, .22),
                                transparent 34%
                            ),
                            linear-gradient(
                                135deg,
                                #450a0a 0%,
                                #7f1d1d 42%,
                                #111827 100%
                            );
                    }

                    .director-login-glow {
                        position: fixed;
                        border-radius: 999px;
                        filter: blur(80px);
                        pointer-events: none;
                        opacity: .35;
                    }

                    .director-login-glow-1 {
                        width: 420px;
                        height: 420px;
                        background: #ef4444;
                        top: -180px;
                        right: 12%;
                    }

                    .director-login-glow-2 {
                        width: 380px;
                        height: 380px;
                        background: #991b1b;
                        left: -160px;
                        bottom: -140px;
                    }

                    .director-login-brand {
                        color: white;
                    }

                    .director-login-logo {
                        width: 58px;
                        height: 58px;
                        border-radius: 18px;
                        background: rgba(255,255,255,.13);
                        backdrop-filter: blur(12px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 9px;
                    }

                    .director-login-logo img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }

                    .director-login-brand-title {
                        font-size: 1.15rem;
                        font-weight: 900;
                        letter-spacing: .03em;
                    }

                    .director-login-brand-subtitle {
                        color: rgba(255,255,255,.62);
                        font-size: .85rem;
                    }

                    .director-login-card {
                        background: rgba(255,255,255,.985);
                    }

                    @media (min-width: 1400px) {
                        .director-login-page .container-fluid {
                            max-width: 1800px;
                        }
                    }

                    @media (max-width: 1199.98px) {
                        .director-login-page {
                            overflow-y: auto;
                        }

                        .director-login-card {
                            max-width: 650px;
                            margin-left: auto;
                            margin-right: auto;
                        }
                    }
                `}
            </style>
        </main>
    );
}