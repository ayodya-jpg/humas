import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Link } from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

const ROLE_OPTIONS = [
    {
        value: 'superadmin',
        label: 'Super Admin',
        icon: 'bi-shield-lock-fill',
        color: 'danger',
    },
    {
        value: 'admin',
        label: 'Admin',
        icon: 'bi-person-badge-fill',
        color: 'primary',
    },
    {
        value: 'admin_humas',
        label: 'Admin Humas',
        icon: 'bi-megaphone-fill',
        color: 'danger',
    },
    {
        value: 'admin_sekpim',
        label: 'Admin SEKPiM',
        icon: 'bi-briefcase-fill',
        color: 'success',
    },
    {
        value: 'user',
        label: 'User',
        icon: 'bi-person-fill',
        color: 'secondary',
    },
];

const PERMISSION_LABELS = {
    'dashboard.view': {
        label: 'Dashboard',
        icon: 'bi-speedometer2',
    },

    'request.merchandise.create': {
        label: 'Ajukan Merchandise',
        icon: 'bi-gift-fill',
    },

    'request.humas.create': {
        label: 'Request Liputan',
        icon: 'bi-camera-reels-fill',
    },

    'request.borrowing.create': {
        label: 'Ajukan Peminjaman',
        icon: 'bi-box-seam-fill',
    },

    'request.history.view': {
        label: 'Riwayat Pengajuan',
        icon: 'bi-clock-history',
    },

    'approval.merchandise.view': {
        label: 'Lihat Approval Merchandise',
        icon: 'bi-eye-fill',
    },

    'approval.merchandise.process': {
        label: 'Proses Merchandise',
        icon: 'bi-check-circle-fill',
    },

    'approval.humas.view': {
        label: 'Lihat Approval Liputan',
        icon: 'bi-eye-fill',
    },

    'approval.humas.process': {
        label: 'Proses Liputan Humas',
        icon: 'bi-check-circle-fill',
    },

    'approval.borrowing.view': {
        label: 'Lihat Approval Peminjaman',
        icon: 'bi-eye-fill',
    },

    'approval.borrowing.process': {
        label: 'Proses Peminjaman',
        icon: 'bi-check-circle-fill',
    },

    'categories.view': {
        label: 'Lihat Kategori',
        icon: 'bi-tags-fill',
    },

    'categories.manage': {
        label: 'Kelola Kategori',
        icon: 'bi-pencil-square',
    },

    'products.view': {
        label: 'Lihat Produk',
        icon: 'bi-boxes',
    },

    'products.manage': {
        label: 'Kelola Produk',
        icon: 'bi-pencil-square',
    },

    'users.view': {
        label: 'Lihat Data User',
        icon: 'bi-people-fill',
    },

    'users.manage': {
        label: 'Kelola User',
        icon: 'bi-person-gear',
    },
};

const PERMISSION_GROUPS = [
    {
        label: 'Umum',
        icon: 'bi-grid-fill',
        permissions: [
            'dashboard.view',
        ],
    },
    {
        label: 'Pengajuan',
        icon: 'bi-send-fill',
        permissions: [
            'request.merchandise.create',
            'request.humas.create',
            'request.borrowing.create',
            'request.history.view',
        ],
    },
    {
        label: 'Approval Merchandise',
        icon: 'bi-gift-fill',
        permissions: [
            'approval.merchandise.view',
            'approval.merchandise.process',
        ],
    },
    {
        label: 'Approval Humas',
        icon: 'bi-camera-reels-fill',
        permissions: [
            'approval.humas.view',
            'approval.humas.process',
        ],
    },
    {
        label: 'Approval SEKPiM',
        icon: 'bi-box-seam-fill',
        permissions: [
            'approval.borrowing.view',
            'approval.borrowing.process',
        ],
    },
    {
        label: 'Master Data',
        icon: 'bi-database-fill',
        permissions: [
            'categories.view',
            'categories.manage',
            'products.view',
            'products.manage',
        ],
    },
    {
        label: 'Manajemen User',
        icon: 'bi-people-fill',
        permissions: [
            'users.view',
            'users.manage',
        ],
    },
];

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const getRoleConfig = (role) => {
    return (
        ROLE_OPTIONS.find(
            (option) => option.value === role
        ) || {
            value: role,
            label: role || 'Tidak diketahui',
            icon: 'bi-person-fill',
            color: 'secondary',
        }
    );
};

const getBackendErrorMessage = (
    error,
    fallbackMessage = 'Proses gagal dilakukan.'
) => {
    const responseData =
        error?.response?.data;

    if (responseData?.errors) {
        const firstError =
            Object.values(
                responseData.errors
            )?.[0]?.[0];

        if (firstError) {
            return firstError;
        }
    }

    if (responseData?.message) {
        return responseData.message;
    }

    return fallbackMessage;
};

const formatDateTime = (date) => {
    if (!date) {
        return '-';
    }

    const parsedDate = new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate.toLocaleString(
        'id-ID',
        {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    );
};

const normalizePermissions = (
    permissions
) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(Boolean)
        ),
    ];
};

const getPermissionGroupSummary = (
    userPermissions
) => {
    const normalizedPermissions =
        normalizePermissions(
            userPermissions
        );

    return PERMISSION_GROUPS
        .map((group) => {
            const selectedPermissions =
                group.permissions.filter(
                    (permission) =>
                        normalizedPermissions.includes(
                            permission
                        )
                );

            return {
                ...group,
                selectedPermissions,
                count:
                    selectedPermissions.length,
            };
        })
        .filter(
            (group) =>
                group.count > 0
        );
};

export default function UserManagementPage() {
    const currentUser = useMemo(
        () => getCurrentUser(),
        []
    );

    const [
        users,
        setUsers,
    ] = useState([]);

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        selectedRole,
        setSelectedRole,
    ] = useState('all');

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        expandedUsers,
        setExpandedUsers,
    ] = useState([]);

    const fetchUsers = useCallback(
        async (isRefresh = false) => {
            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                const response =
                    await api.get(
                        '/admin/users'
                    );

                const responseData =
                    response?.data?.data;

                setUsers(
                    Array.isArray(
                        responseData
                    )
                        ? responseData
                        : []
                );
            } catch (error) {
                console.error(
                    'Fetch users error:',
                    error?.response?.data ||
                        error
                );

                await showErrorAlert(
                    'Gagal Memuat Data',
                    getBackendErrorMessage(
                        error,
                        'Data user gagal dimuat dari server.'
                    )
                );

                setUsers([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return users.filter(
                (user) => {
                    const roleConfig =
                        getRoleConfig(
                            user.role
                        );

                    const permissions =
                        normalizePermissions(
                            user.permissions
                        );

                    const permissionText =
                        permissions
                            .map(
                                (permission) =>
                                    PERMISSION_LABELS[
                                        permission
                                    ]?.label ||
                                    permission
                            )
                            .join(' ')
                            .toLowerCase();

                    const matchSearch =
                        !searchValue ||
                        user.name
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        user.username
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        user.email
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        user.role
                            ?.toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        roleConfig.label
                            .toLowerCase()
                            .includes(
                                searchValue
                            ) ||
                        permissionText.includes(
                            searchValue
                        );

                    const matchRole =
                        selectedRole ===
                            'all' ||
                        user.role ===
                            selectedRole;

                    return (
                        matchSearch &&
                        matchRole
                    );
                }
            );
        }, [
            users,
            search,
            selectedRole,
        ]);

    const summary = useMemo(() => {
        return {
            total: users.length,

            superadmin:
                users.filter(
                    (user) =>
                        user.role ===
                        'superadmin'
                ).length,

            admin:
                users.filter(
                    (user) =>
                        user.role ===
                        'admin'
                ).length,

            admin_humas:
                users.filter(
                    (user) =>
                        user.role ===
                        'admin_humas'
                ).length,

            admin_sekpim:
                users.filter(
                    (user) =>
                        user.role ===
                        'admin_sekpim'
                ).length,

            user:
                users.filter(
                    (user) =>
                        user.role ===
                        'user'
                ).length,
        };
    }, [users]);

    const toggleExpandedUser = (
        userId
    ) => {
        setExpandedUsers(
            (previousUsers) => {
                if (
                    previousUsers.includes(
                        userId
                    )
                ) {
                    return previousUsers.filter(
                        (id) =>
                            id !== userId
                    );
                }

                return [
                    ...previousUsers,
                    userId,
                ];
            }
        );
    };

    const handleDelete = async (
        user
    ) => {
        if (
            Number(currentUser.id) ===
            Number(user.id)
        ) {
            await showErrorAlert(
                'Tidak Bisa Dihapus',
                'Akun yang sedang digunakan tidak bisa dihapus dari halaman ini.'
            );

            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Hapus User?',
                text: `Akun "${user.name}" akan dihapus permanen dari sistem.`,
                confirmButtonText:
                    'Ya, hapus',
                icon: 'warning',
                confirmButtonColor:
                    '#dc2626',
            });

        if (
            !confirmation.isConfirmed
        ) {
            return;
        }

        try {
            showLoadingAlert(
                'Menghapus User',
                'Mohon tunggu sebentar.'
            );

            await api.delete(
                `/admin/users/${user.id}`
            );

            closeAlert();

            await showSuccessAlert(
                'User Dihapus',
                'Data user berhasil dihapus.'
            );

            await fetchUsers(true);
        } catch (error) {
            console.error(
                'Delete user error:',
                error?.response?.data ||
                    error
            );

            closeAlert();

            await showErrorAlert(
                'Hapus Gagal',
                getBackendErrorMessage(
                    error,
                    'User gagal dihapus.'
                )
            );
        }
    };

    const resetFilters = () => {
        setSearch('');
        setSelectedRole('all');
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-xl-7">
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                Manajemen User
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Kelola akun dan hak akses.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 760,
                                    lineHeight: 1.8,
                                }}
                            >
                                Superadmin dapat menambahkan akun,
                                mengubah role, serta menentukan menu dan
                                fitur yang dapat digunakan oleh setiap
                                pengguna.
                            </p>
                        </div>

                        <div className="col-xl-5">
                            <div className="row g-3">
                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.total}
                                        </div>

                                        <div className="small text-white-50">
                                            Total Akun
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.superadmin}
                                        </div>

                                        <div className="small text-white-50">
                                            Super Admin
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.admin}
                                        </div>

                                        <div className="small text-white-50">
                                            Admin
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.admin_humas}
                                        </div>

                                        <div className="small text-white-50">
                                            Admin Humas
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.admin_sekpim}
                                        </div>

                                        <div className="small text-white-50">
                                            Admin SEKPiM
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-md-4">
                                    <div className="bg-white bg-opacity-10 rounded-4 p-3 h-100">
                                        <div className="fs-3 fw-black">
                                            {summary.user}
                                        </div>

                                        <div className="small text-white-50">
                                            User
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">
                                Cari user
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-white">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Nama, username, email, role, atau akses..."
                                    value={search}
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <label className="form-label fw-bold">
                                Filter role
                            </label>

                            <select
                                className="form-select"
                                value={
                                    selectedRole
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSelectedRole(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="all">
                                    Semua Role
                                </option>

                                {ROLE_OPTIONS.map(
                                    (role) => (
                                        <option
                                            key={
                                                role.value
                                            }
                                            value={
                                                role.value
                                            }
                                        >
                                            {
                                                role.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="col-md-6 col-lg-4">
                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill"
                                    onClick={
                                        resetFilters
                                    }
                                >
                                    <i className="bi bi-arrow-counterclockwise me-2" />
                                    Reset
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-danger rounded-pill"
                                    onClick={() =>
                                        fetchUsers(
                                            true
                                        )
                                    }
                                    disabled={
                                        refreshing
                                    }
                                >
                                    {refreshing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Memuat...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-arrow-clockwise me-2" />
                                            Refresh
                                        </>
                                    )}
                                </button>

                                <Link
                                    to="/admin/users/create"
                                    className="btn btn-danger rounded-pill"
                                >
                                    <i className="bi bi-person-plus-fill me-2" />
                                    Tambah User
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-danger mb-3" />

                        <h5 className="fw-bold mb-1">
                            Memuat data user
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            ) : filteredUsers.length ===
              0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light text-secondary"
                            style={{
                                width: 82,
                                height: 82,
                            }}
                        >
                            <i className="bi bi-inbox fs-1" />
                        </div>

                        <h5 className="fw-black mb-2">
                            User tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Tidak ada user berdasarkan filter yang dipilih.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill"
                            onClick={
                                resetFilters
                            }
                        >
                            Tampilkan Semua
                        </button>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredUsers.map(
                        (user) => {
                            const roleConfig =
                                getRoleConfig(
                                    user.role
                                );

                            const permissions =
                                normalizePermissions(
                                    user.permissions
                                );

                            const permissionGroups =
                                getPermissionGroupSummary(
                                    permissions
                                );

                            const isCurrentAccount =
                                Number(
                                    currentUser.id
                                ) ===
                                Number(
                                    user.id
                                );

                            const isExpanded =
                                expandedUsers.includes(
                                    user.id
                                );

                            const isSuperadmin =
                                user.role ===
                                    'superadmin' ||
                                user.is_superadmin ===
                                    true;

                            return (
                                <div
                                    className="col-12"
                                    key={
                                        user.id
                                    }
                                >
                                    <article className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                        <div className="card-body p-4">
                                            <div className="row g-4 align-items-center">
                                                <div className="col-xl-4">
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div className="profile-avatar bg-danger text-white flex-shrink-0">
                                                            {(
                                                                user.name ||
                                                                'U'
                                                            )
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase()}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                                <span
                                                                    className={`badge rounded-pill bg-${roleConfig.color}-subtle text-${roleConfig.color} px-3 py-2`}
                                                                >
                                                                    <i
                                                                        className={`bi ${roleConfig.icon} me-2`}
                                                                    />

                                                                    {
                                                                        roleConfig.label
                                                                    }
                                                                </span>

                                                                {isCurrentAccount && (
                                                                    <span className="badge rounded-pill text-bg-warning px-3 py-2">
                                                                        Akun
                                                                        Saat
                                                                        Ini
                                                                    </span>
                                                                )}

                                                                {isSuperadmin && (
                                                                    <span className="badge rounded-pill text-bg-dark px-3 py-2">
                                                                        Akses
                                                                        Penuh
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h5 className="fw-black mb-1 text-truncate">
                                                                {
                                                                    user.name
                                                                }
                                                            </h5>

                                                            <p className="text-muted mb-1">
                                                                @
                                                                {user.username ||
                                                                    '-'}
                                                            </p>

                                                            <div className="small text-muted text-break">
                                                                <i className="bi bi-envelope-fill me-2" />

                                                                {user.email ||
                                                                    '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-xl-2">
                                                    <div className="small text-muted fw-bold mb-1">
                                                        Hak
                                                        Akses
                                                    </div>

                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="fs-4 fw-black text-danger">
                                                            {
                                                                permissions.length
                                                            }
                                                        </div>

                                                        <div className="small text-muted">
                                                            permission
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 col-xl-3">
                                                    <div className="small text-muted fw-bold mb-1">
                                                        Dibuat
                                                    </div>

                                                    <div className="fw-bold">
                                                        {formatDateTime(
                                                            user.created_at
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-xl-3">
                                                    <div className="d-flex flex-wrap justify-content-xl-end gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-dark rounded-pill"
                                                            onClick={() =>
                                                                toggleExpandedUser(
                                                                    user.id
                                                                )
                                                            }
                                                        >
                                                            <i
                                                                className={`bi ${
                                                                    isExpanded
                                                                        ? 'bi-chevron-up'
                                                                        : 'bi-chevron-down'
                                                                } me-2`}
                                                            />

                                                            {isExpanded
                                                                ? 'Tutup Akses'
                                                                : 'Lihat Akses'}
                                                        </button>

                                                        <Link
                                                            to={`/admin/users/${user.id}/edit`}
                                                            className="btn btn-outline-primary rounded-pill"
                                                        >
                                                            <i className="bi bi-pencil-square me-2" />
                                                            Edit
                                                        </Link>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger rounded-pill"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    user
                                                                )
                                                            }
                                                            disabled={
                                                                isCurrentAccount
                                                            }
                                                        >
                                                            <i className="bi bi-trash me-2" />
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {isCurrentAccount && (
                                                <div className="mt-4 p-3 rounded-4 bg-warning-subtle border border-warning-subtle">
                                                    <div className="d-flex align-items-start gap-3">
                                                        <i className="bi bi-exclamation-triangle-fill text-warning-emphasis fs-5" />

                                                        <div>
                                                            <div className="fw-bold text-warning-emphasis">
                                                                Ini
                                                                akun
                                                                yang
                                                                sedang
                                                                digunakan
                                                            </div>

                                                            <div className="small text-muted">
                                                                Tombol
                                                                hapus
                                                                dinonaktifkan
                                                                untuk
                                                                mencegah
                                                                akun
                                                                aktif
                                                                terhapus.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-top">
                                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                                                        <div>
                                                            <h5 className="fw-black mb-1">
                                                                Rincian
                                                                Hak
                                                                Akses
                                                            </h5>

                                                            <p className="text-muted mb-0">
                                                                Menu
                                                                dan
                                                                fitur
                                                                yang
                                                                dapat
                                                                digunakan
                                                                oleh
                                                                akun
                                                                ini.
                                                            </p>
                                                        </div>

                                                        <span className="badge rounded-pill text-bg-danger px-3 py-2">
                                                            {
                                                                permissions.length
                                                            }{' '}
                                                            akses
                                                            aktif
                                                        </span>
                                                    </div>

                                                    {permissionGroups.length ===
                                                    0 ? (
                                                        <div className="alert alert-warning border-0 rounded-4 mb-0">
                                                            <i className="bi bi-exclamation-triangle-fill me-2" />
                                                            Akun
                                                            ini
                                                            belum
                                                            memiliki
                                                            permission.
                                                        </div>
                                                    ) : (
                                                        <div className="row g-3">
                                                            {permissionGroups.map(
                                                                (
                                                                    group
                                                                ) => (
                                                                    <div
                                                                        className="col-md-6 col-xl-4"
                                                                        key={
                                                                            group.label
                                                                        }
                                                                    >
                                                                        <div className="h-100 p-3 rounded-4 bg-light border">
                                                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                                                <div className="icon-box bg-white text-danger">
                                                                                    <i
                                                                                        className={`bi ${group.icon}`}
                                                                                    />
                                                                                </div>

                                                                                <div>
                                                                                    <div className="fw-black">
                                                                                        {
                                                                                            group.label
                                                                                        }
                                                                                    </div>

                                                                                    <div className="small text-muted">
                                                                                        {
                                                                                            group.count
                                                                                        }{' '}
                                                                                        akses
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="d-flex flex-column gap-2">
                                                                                {group.selectedPermissions.map(
                                                                                    (
                                                                                        permission
                                                                                    ) => {
                                                                                        const permissionConfig =
                                                                                            PERMISSION_LABELS[
                                                                                                permission
                                                                                            ] || {
                                                                                                label: permission,
                                                                                                icon: 'bi-check-circle-fill',
                                                                                            };

                                                                                        return (
                                                                                            <div
                                                                                                className="d-flex align-items-start gap-2 small"
                                                                                                key={
                                                                                                    permission
                                                                                                }
                                                                                            >
                                                                                                <i className="bi bi-check-circle-fill text-success mt-1" />

                                                                                                <span>
                                                                                                    {
                                                                                                        permissionConfig.label
                                                                                                    }
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                </div>
                            );
                        }
                    )}
                </div>
            )}

            {!loading &&
                filteredUsers.length >
                    0 && (
                    <div className="mt-4 small text-muted text-center">
                        Menampilkan{' '}

                        <strong>
                            {
                                filteredUsers.length
                            }
                        </strong>{' '}

                        dari{' '}

                        <strong>
                            {users.length}
                        </strong>{' '}

                        akun.
                    </div>
                )}
        </div>
    );
}