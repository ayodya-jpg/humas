import {
    Navigate,
    useLocation,
} from 'react-router-dom';

const ALL_AUTHENTICATED_ROLES = [
    'user',
    'admin',
    'admin_humas',
    'admin_sekpim',
    'superadmin',
];

const USER_ROLE =
    'user';

const SUPERADMIN_ROLE =
    'superadmin';

const IMPLIED_PERMISSIONS = {
    'approval.merchandise.process': [
        'approval.merchandise.view',
    ],

    'approval.humas.process': [
        'approval.humas.view',
    ],

    'approval.borrowing.process': [
        'approval.borrowing.view',
    ],

    'categories.manage': [
        'categories.view',
    ],

    'products.manage': [
        'products.view',
    ],

    'users.manage': [
        'users.view',
    ],
};

/**
 * Mengambil data user dari localStorage secara aman.
 */
const getStoredUser = () => {
    try {
        const storedUser =
            localStorage.getItem(
                'admin_user'
            );

        if (!storedUser) {
            return {};
        }

        const parsedUser =
            JSON.parse(storedUser);

        if (
            !parsedUser ||
            typeof parsedUser !==
                'object' ||
            Array.isArray(parsedUser)
        ) {
            return {};
        }

        return parsedUser;
    } catch {
        return {};
    }
};

/**
 * Membersihkan daftar permission.
 */
const normalizePermissions = (
    permissions
) => {
    if (
        !Array.isArray(
            permissions
        )
    ) {
        return [];
    }

    return [
        ...new Set(
            permissions
                .filter(
                    (permission) =>
                        typeof permission ===
                            'string' &&
                        permission.trim() !==
                            ''
                )
                .map(
                    (permission) =>
                        permission.trim()
                )
        ),
    ];
};

/**
 * Menambahkan permission turunan.
 *
 * Contoh:
 * products.manage otomatis memiliki products.view.
 */
const expandPermissions = (
    permissions
) => {
    let expandedPermissions =
        normalizePermissions(
            permissions
        );

    let changed = true;

    while (changed) {
        const beforeCount =
            expandedPermissions.length;

        Object.entries(
            IMPLIED_PERMISSIONS
        ).forEach(
            ([
                parentPermission,
                childPermissions,
            ]) => {
                if (
                    !expandedPermissions.includes(
                        parentPermission
                    )
                ) {
                    return;
                }

                expandedPermissions = [
                    ...expandedPermissions,
                    ...childPermissions,
                ];
            }
        );

        expandedPermissions =
            normalizePermissions(
                expandedPermissions
            );

        changed =
            expandedPermissions.length >
            beforeCount;
    }

    return expandedPermissions;
};

/**
 * Mengambil permission efektif user.
 */
const getUserPermissions = (
    currentUser
) => {
    if (
        currentUser?.role ===
        SUPERADMIN_ROLE
    ) {
        return [
            '*',
        ];
    }

    return expandPermissions(
        currentUser?.permissions
    );
};

/**
 * Memeriksa satu permission atau salah satu permission.
 *
 * String:
 * requiredPermission="products.view"
 *
 * Array:
 * requiredPermission={[
 *     'products.view',
 *     'products.manage',
 * ]}
 *
 * Array menggunakan logika OR.
 */
const hasPermission = (
    currentUser,
    requiredPermission
) => {
    if (!requiredPermission) {
        return true;
    }

    if (
        currentUser?.role ===
        SUPERADMIN_ROLE
    ) {
        return true;
    }

    const permissions =
        getUserPermissions(
            currentUser
        );

    if (
        Array.isArray(
            requiredPermission
        )
    ) {
        const normalizedRequirements =
            normalizePermissions(
                requiredPermission
            );

        if (
            normalizedRequirements.length ===
            0
        ) {
            return true;
        }

        return normalizedRequirements.some(
            (permission) =>
                permissions.includes(
                    permission
                )
        );
    }

    if (
        typeof requiredPermission !==
            'string' ||
        requiredPermission.trim() ===
            ''
    ) {
        return true;
    }

    return permissions.includes(
        requiredPermission.trim()
    );
};

/**
 * Memeriksa seluruh permission.
 *
 * Array menggunakan logika AND.
 */
const hasAllPermissions = (
    currentUser,
    requiredPermissions
) => {
    if (
        !Array.isArray(
            requiredPermissions
        ) ||
        requiredPermissions.length ===
            0
    ) {
        return true;
    }

    if (
        currentUser?.role ===
        SUPERADMIN_ROLE
    ) {
        return true;
    }

    const permissions =
        getUserPermissions(
            currentUser
        );

    const normalizedRequirements =
        normalizePermissions(
            requiredPermissions
        );

    if (
        normalizedRequirements.length ===
        0
    ) {
        return true;
    }

    return normalizedRequirements.every(
        (permission) =>
            permissions.includes(
                permission
            )
    );
};

/**
 * Memeriksa apakah path merupakan area user.
 */
const isUserArea = (
    pathname
) => {
    return (
        pathname === '/user' ||
        pathname.startsWith(
            '/user/'
        )
    );
};

/**
 * Memeriksa apakah path merupakan area admin.
 */
const isAdminArea = (
    pathname
) => {
    return (
        pathname === '/admin' ||
        pathname.startsWith(
            '/admin/'
        )
    );
};

/**
 * Path unauthorized berdasarkan role.
 */
const getUnauthorizedPath = (
    role
) => {
    return role ===
        USER_ROLE
        ? '/user/unauthorized'
        : '/admin/unauthorized';
};

/**
 * Path dashboard berdasarkan role.
 */
const getDashboardPath = (
    role
) => {
    return role ===
        USER_ROLE
        ? '/user/dashboard'
        : '/admin/dashboard';
};

/**
 * Menentukan halaman awal berdasarkan permission user.
 *
 * Hal ini mencegah akun tanpa dashboard.view terus diarahkan
 * ke dashboard lalu masuk halaman unauthorized berulang kali.
 */
const getDefaultPath = (
    currentUser
) => {
    const role =
        currentUser?.role;

    if (
        role ===
        SUPERADMIN_ROLE
    ) {
        return '/admin/dashboard';
    }

    if (
        role ===
        USER_ROLE
    ) {
        if (
            hasPermission(
                currentUser,
                'dashboard.view'
            )
        ) {
            return '/user/dashboard';
        }

        if (
            hasPermission(
                currentUser,
                'request.merchandise.create'
            )
        ) {
            return '/user/request/merchandise';
        }

        if (
            hasPermission(
                currentUser,
                'request.humas.create'
            )
        ) {
            return '/user/request/humas-service';
        }

        if (
            hasPermission(
                currentUser,
                'request.borrowing.create'
            )
        ) {
            return '/user/request/sekpim-borrowing';
        }

        if (
            hasPermission(
                currentUser,
                'request.history.view'
            )
        ) {
            return '/user/my-requests';
        }

        return '/user/unauthorized';
    }

    if (
        hasPermission(
            currentUser,
            'dashboard.view'
        )
    ) {
        return '/admin/dashboard';
    }

    if (
        hasPermission(
            currentUser,
            'approval.merchandise.view'
        )
    ) {
        return '/admin/orders';
    }

    if (
        hasPermission(
            currentUser,
            'approval.humas.view'
        )
    ) {
        return '/admin/humas-services';
    }

    if (
        hasPermission(
            currentUser,
            'approval.borrowing.view'
        )
    ) {
        return '/admin/borrow-requests';
    }

    if (
        hasPermission(
            currentUser,
            'request.merchandise.create'
        )
    ) {
        return '/admin/request/merchandise';
    }

    if (
        hasPermission(
            currentUser,
            'request.humas.create'
        )
    ) {
        return '/admin/request/humas-service';
    }

    if (
        hasPermission(
            currentUser,
            'request.borrowing.create'
        )
    ) {
        return '/admin/request/sekpim-borrowing';
    }

    if (
        hasPermission(
            currentUser,
            'request.history.view'
        )
    ) {
        return '/admin/my-requests';
    }

    if (
        hasPermission(
            currentUser,
            'categories.view'
        )
    ) {
        return '/admin/categories';
    }

    if (
        hasPermission(
            currentUser,
            'products.view'
        )
    ) {
        return '/admin/products';
    }

    if (
        hasPermission(
            currentUser,
            [
                'users.view',
                'users.manage',
            ]
        )
    ) {
        return '/admin/users';
    }

    return '/admin/unauthorized';
};

/**
 * Menghapus sesi lokal yang tidak valid.
 */
const clearLocalSession = () => {
    localStorage.removeItem(
        'admin_token'
    );

    localStorage.removeItem(
        'admin_user'
    );
};

export default function ProtectedRoute({
    children,

    allowedRoles =
        ALL_AUTHENTICATED_ROLES,

    requiredPermission =
        null,

    requiredPermissions =
        [],
}) {
    const location =
        useLocation();

    const token =
        localStorage.getItem(
            'admin_token'
        );

    const currentUser =
        getStoredUser();

    const role =
        currentUser?.role;

    /*
    |--------------------------------------------------------------------------
    | Belum login
    |--------------------------------------------------------------------------
    */

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Data sesi lokal tidak lengkap atau rusak
    |--------------------------------------------------------------------------
    */

    if (
        !role ||
        !ALL_AUTHENTICATED_ROLES.includes(
            role
        )
    ) {
        clearLocalSession();

        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | User biasa tidak boleh masuk area admin
    |--------------------------------------------------------------------------
    */

    if (
        role ===
            USER_ROLE &&
        isAdminArea(
            location.pathname
        )
    ) {
        return (
            <Navigate
                to={getDefaultPath(
                    currentUser
                )}
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Role admin tidak boleh masuk area user
    |--------------------------------------------------------------------------
    */

    if (
        role !==
            USER_ROLE &&
        isUserArea(
            location.pathname
        )
    ) {
        return (
            <Navigate
                to={getDefaultPath(
                    currentUser
                )}
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Pemeriksaan role
    |--------------------------------------------------------------------------
    */

    const normalizedAllowedRoles =
        Array.isArray(
            allowedRoles
        )
            ? allowedRoles
            : [];

    if (
        normalizedAllowedRoles.length >
            0 &&
        !normalizedAllowedRoles.includes(
            role
        )
    ) {
        return (
            <Navigate
                to={getUnauthorizedPath(
                    role
                )}
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Pemeriksaan satu permission atau salah satu permission
    |--------------------------------------------------------------------------
    */

    if (
        !hasPermission(
            currentUser,
            requiredPermission
        )
    ) {
        return (
            <Navigate
                to={getUnauthorizedPath(
                    role
                )}
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Pemeriksaan seluruh permission
    |--------------------------------------------------------------------------
    */

    if (
        !hasAllPermissions(
            currentUser,
            requiredPermissions
        )
    ) {
        return (
            <Navigate
                to={getUnauthorizedPath(
                    role
                )}
                replace
                state={{
                    from:
                        location.pathname,
                }}
            />
        );
    }

    return children;
}

export {
    ALL_AUTHENTICATED_ROLES,
    IMPLIED_PERMISSIONS,
    expandPermissions,
    getDashboardPath,
    getDefaultPath,
    getStoredUser,
    getUserPermissions,
    hasAllPermissions,
    hasPermission,
    normalizePermissions,
};