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

const USER_ROLE = 'user';
const SUPERADMIN_ROLE = 'superadmin';

const getStoredUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const getDashboardPath = (role) => {
    return role === USER_ROLE
        ? '/user/dashboard'
        : '/admin/dashboard';
};

const getUnauthorizedPath = (role) => {
    return role === USER_ROLE
        ? '/user/unauthorized'
        : '/admin/unauthorized';
};

const isUserArea = (pathname) => {
    return (
        pathname === '/user' ||
        pathname.startsWith('/user/')
    );
};

const isAdminArea = (pathname) => {
    return (
        pathname === '/admin' ||
        pathname.startsWith('/admin/')
    );
};

const normalizePermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(Boolean)
        ),
    ];
};

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
        normalizePermissions(
            currentUser?.permissions
        );

    if (
        Array.isArray(
            requiredPermission
        )
    ) {
        return requiredPermission.some(
            (permission) =>
                permissions.includes(
                    permission
                )
        );
    }

    return permissions.includes(
        requiredPermission
    );
};

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
        normalizePermissions(
            currentUser?.permissions
        );

    return requiredPermissions.every(
        (permission) =>
            permissions.includes(
                permission
            )
    );
};

export default function ProtectedRoute({
    children,
    allowedRoles =
        ALL_AUTHENTICATED_ROLES,
    requiredPermission = null,
    requiredPermissions = [],
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
    | Sesi lokal tidak lengkap
    |--------------------------------------------------------------------------
    */

    if (!role) {
        localStorage.removeItem(
            'admin_token'
        );

        localStorage.removeItem(
            'admin_user'
        );

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
    | User biasa tidak boleh masuk prefix /admin
    |--------------------------------------------------------------------------
    */

    if (
        role === USER_ROLE &&
        isAdminArea(
            location.pathname
        )
    ) {
        return (
            <Navigate
                to="/user/dashboard"
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Role admin tidak memakai prefix /user
    |--------------------------------------------------------------------------
    */

    if (
        role !== USER_ROLE &&
        isUserArea(
            location.pathname
        )
    ) {
        return (
            <Navigate
                to="/admin/dashboard"
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Pemeriksaan role
    |--------------------------------------------------------------------------
    */

    if (
        !allowedRoles.includes(role)
    ) {
        return (
            <Navigate
                to={getUnauthorizedPath(
                    role
                )}
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Pemeriksaan satu permission atau salah satu permission
    |--------------------------------------------------------------------------
    |
    | String:
    | requiredPermission="products.view"
    |
    | Array:
    | requiredPermission={[
    |     'products.view',
    |     'products.manage',
    | ]}
    |
    | Jika berupa array, user cukup memiliki salah satu permission.
    |
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
    |
    | User wajib memiliki seluruh permission yang disebutkan.
    |
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
    getDashboardPath,
    getStoredUser,
    hasPermission,
    hasAllPermissions,
};