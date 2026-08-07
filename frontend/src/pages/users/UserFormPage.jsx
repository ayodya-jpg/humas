import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const ROLE_CONFIG = {
    superadmin: {
        value: 'superadmin',
        label: 'Super Admin',
        description:
            'Akses penuh ke seluruh fitur, approval, master data, dan manajemen user.',
        icon: 'bi-shield-lock-fill',
        color: 'danger',
    },

    admin: {
        value: 'admin',
        label: 'Admin',
        description:
            'Admin umum yang dapat diberi akses HUMAS, SEKPiM, serta fitur pengajuan.',
        icon: 'bi-person-badge-fill',
        color: 'primary',
    },

    admin_humas: {
        value: 'admin_humas',
        label: 'Admin Humas',
        description:
            'Admin utama untuk merchandise, layanan Humas, dan master data terkait.',
        icon: 'bi-megaphone-fill',
        color: 'danger',
    },

    admin_sekpim: {
        value: 'admin_sekpim',
        label: 'Admin SEKPiM',
        description:
            'Admin utama untuk layanan peminjaman perlengkapan SEKPiM.',
        icon: 'bi-briefcase-fill',
        color: 'success',
    },

    user: {
        value: 'user',
        label: 'User',
        description:
            'Pengguna biasa yang dapat membuat dan memantau pengajuan.',
        icon: 'bi-person-fill',
        color: 'secondary',
    },
};

const PERMISSION_GROUPS = [
    {
        key: 'general',
        label: 'Akses Umum',
        description:
            'Hak akses dasar untuk membuka halaman utama sistem.',
        icon: 'bi-grid-fill',

        permissions: [
            {
                value: 'dashboard.view',
                label: 'Lihat Dashboard',
                description:
                    'Dapat membuka halaman dashboard.',
            },
        ],
    },

    {
        key: 'request',
        label: 'Pengajuan',
        description:
            'Mengatur layanan yang dapat diajukan oleh akun.',
        icon: 'bi-send-fill',

        permissions: [
            {
                value:
                    'request.merchandise.create',
                label:
                    'Ajukan Merchandise',
                description:
                    'Dapat membuat pengajuan merchandise.',
            },

            {
                value:
                    'request.humas.create',
                label:
                    'Request Liputan Humas',
                description:
                    'Dapat membuat request liputan dan publikasi Humas.',
            },

            {
                value:
                    'request.borrowing.create',
                label:
                    'Ajukan Peminjaman SEKPiM',
                description:
                    'Dapat membuat pengajuan peminjaman perlengkapan.',
            },

            {
                value:
                    'request.history.view',
                label:
                    'Lihat Riwayat Pengajuan',
                description:
                    'Dapat melihat pengajuan pribadi dan detail statusnya.',
            },
        ],
    },

    {
        key: 'merchandise',
        label: 'Approval Merchandise',
        description:
            'Hak akses untuk memeriksa dan memproses pengajuan merchandise.',
        icon: 'bi-gift-fill',

        permissions: [
            {
                value:
                    'approval.merchandise.view',
                label:
                    'Lihat Approval Merchandise',
                description:
                    'Dapat membuka daftar dan detail pengajuan merchandise.',
            },

            {
                value:
                    'approval.merchandise.process',
                label:
                    'Proses Approval Merchandise',
                description:
                    'Dapat menyetujui, menolak, dan menyelesaikan merchandise.',
            },
        ],
    },

    {
        key: 'humas',
        label: 'Approval Liputan Humas',
        description:
            'Hak akses untuk memeriksa dan memproses request Humas.',
        icon: 'bi-camera-reels-fill',

        permissions: [
            {
                value:
                    'approval.humas.view',
                label:
                    'Lihat Approval Liputan',
                description:
                    'Dapat membuka daftar dan detail request Humas.',
            },

            {
                value:
                    'approval.humas.process',
                label:
                    'Proses Approval Liputan',
                description:
                    'Dapat menyetujui, menolak, dan menyelesaikan request Humas.',
            },
        ],
    },

    {
        key: 'borrowing',
        label: 'Approval Peminjaman SEKPiM',
        description:
            'Hak akses untuk memeriksa dan memproses peminjaman.',
        icon: 'bi-box-seam-fill',

        permissions: [
            {
                value:
                    'approval.borrowing.view',
                label:
                    'Lihat Approval Peminjaman',
                description:
                    'Dapat membuka daftar dan detail pengajuan peminjaman.',
            },

            {
                value:
                    'approval.borrowing.process',
                label:
                    'Proses Approval Peminjaman',
                description:
                    'Dapat menyetujui, menolak, menyerahkan, dan menerima pengembalian barang.',
            },
        ],
    },

    {
        key: 'category',
        label: 'Master Kategori',
        description:
            'Hak akses untuk melihat dan mengelola kategori.',
        icon: 'bi-tags-fill',

        permissions: [
            {
                value:
                    'categories.view',
                label:
                    'Lihat Data Kategori',
                description:
                    'Dapat membuka daftar kategori.',
            },

            {
                value:
                    'categories.manage',
                label:
                    'Kelola Data Kategori',
                description:
                    'Dapat menambah, mengubah, dan menghapus kategori.',
            },
        ],
    },

    {
        key: 'product',
        label: 'Master Produk',
        description:
            'Hak akses untuk melihat dan mengelola produk.',
        icon: 'bi-boxes',

        permissions: [
            {
                value:
                    'products.view',
                label:
                    'Lihat Data Produk',
                description:
                    'Dapat membuka daftar produk dan stok.',
            },

            {
                value:
                    'products.manage',
                label:
                    'Kelola Data Produk',
                description:
                    'Dapat menambah, mengubah, dan menghapus produk.',
            },
        ],
    },

    {
        key: 'user',
        label: 'Manajemen User',
        description:
            'Hak akses untuk melihat atau mengelola akun.',
        icon: 'bi-people-fill',

        permissions: [
            {
                value:
                    'users.view',
                label:
                    'Lihat Data User',
                description:
                    'Dapat membuka daftar dan rincian akun.',
            },

            {
                value:
                    'users.manage',
                label:
                    'Kelola User',
                description:
                    'Permission pengelolaan user pada sistem.',
            },
        ],
    },
];

const LOCAL_AVAILABLE_PERMISSIONS =
    PERMISSION_GROUPS.flatMap(
        (group) =>
            group.permissions.map(
                (permission) =>
                    permission.value
            )
    );

const LOCAL_AVAILABLE_ROLES = [
    'superadmin',
    'admin',
    'admin_humas',
    'admin_sekpim',
    'user',
];

const LOCAL_DEFAULT_PERMISSIONS = {
    superadmin:
        LOCAL_AVAILABLE_PERMISSIONS,

    admin: [
        'dashboard.view',
        'request.merchandise.create',
        'request.humas.create',
        'request.borrowing.create',
        'request.history.view',
        'approval.merchandise.view',
        'approval.merchandise.process',
        'approval.humas.view',
        'approval.humas.process',
        'approval.borrowing.view',
        'approval.borrowing.process',
        'products.view',
    ],

    admin_humas: [
        'dashboard.view',
        'request.merchandise.create',
        'request.humas.create',
        'request.borrowing.create',
        'request.history.view',
        'approval.merchandise.view',
        'approval.merchandise.process',
        'approval.humas.view',
        'approval.humas.process',
        'categories.view',
        'categories.manage',
        'products.view',
        'products.manage',
    ],

    admin_sekpim: [
        'dashboard.view',
        'request.merchandise.create',
        'request.humas.create',
        'request.borrowing.create',
        'request.history.view',
        'approval.borrowing.view',
        'approval.borrowing.process',
        'categories.view',
        'categories.manage',
        'products.view',
        'products.manage',
    ],

    user: [
        'dashboard.view',
        'request.merchandise.create',
        'request.humas.create',
        'request.borrowing.create',
        'request.history.view',
    ],
};

const LOCAL_IMPLIED_PERMISSIONS = {
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

const INITIAL_FORM = {
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user',
    permissions: [],
};

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem(
                'admin_user'
            ) || '{}'
        );
    } catch {
        return {};
    }
};

const createUsername = (value) => {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9\s._-]/g,
            ''
        )
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '');
};

const normalizePermissions = (
    permissions,
    availablePermissions =
        LOCAL_AVAILABLE_PERMISSIONS
) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    const allowedPermissions =
        Array.isArray(
            availablePermissions
        )
            ? availablePermissions
            : LOCAL_AVAILABLE_PERMISSIONS;

    return [
        ...new Set(
            permissions.filter(
                (permission) =>
                    typeof permission ===
                        'string' &&
                    allowedPermissions.includes(
                        permission
                    )
            )
        ),
    ];
};

const expandImpliedPermissions = (
    permissions,
    impliedPermissions,
    availablePermissions
) => {
    let expandedPermissions =
        normalizePermissions(
            permissions,
            availablePermissions
        );

    let changed = true;

    while (changed) {
        const beforeCount =
            expandedPermissions.length;

        Object.entries(
            impliedPermissions || {}
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

                if (
                    !Array.isArray(
                        childPermissions
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
                expandedPermissions,
                availablePermissions
            );

        changed =
            expandedPermissions.length >
            beforeCount;
    }

    return expandedPermissions;
};

const getBackendErrorMessage = (
    error,
    fallbackMessage =
        'Proses gagal dilakukan.'
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

const getRoleConfig = (role) => {
    return (
        ROLE_CONFIG[role] || {
            value: role,
            label:
                role ||
                'Tidak diketahui',
            description:
                'Role akun sistem.',
            icon: 'bi-person-fill',
            color: 'secondary',
        }
    );
};

export default function UserFormPage() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const isEdit =
        Boolean(id);

    const currentUser =
        useMemo(
            () => getCurrentUser(),
            []
        );

    const canManage =
        currentUser?.role ===
        'superadmin';

    const [
        form,
        setForm,
    ] = useState(INITIAL_FORM);

    const [
        availableRoles,
        setAvailableRoles,
    ] = useState(
        LOCAL_AVAILABLE_ROLES
    );

    const [
        availablePermissions,
        setAvailablePermissions,
    ] = useState(
        LOCAL_AVAILABLE_PERMISSIONS
    );

    const [
        defaultPermissions,
        setDefaultPermissions,
    ] = useState(
        LOCAL_DEFAULT_PERMISSIONS
    );

    const [
        impliedPermissions,
        setImpliedPermissions,
    ] = useState(
        LOCAL_IMPLIED_PERMISSIONS
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        loadError,
        setLoadError,
    ] = useState('');

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        showPasswordConfirmation,
        setShowPasswordConfirmation,
    ] = useState(false);

    const [
        originalUser,
        setOriginalUser,
    ] = useState(null);

    const fetchFormData =
        useCallback(
            async () => {
                if (!canManage) {
                    setLoading(false);

                    setLoadError(
                        'Hanya superadmin yang dapat mengakses form manajemen user.'
                    );

                    return;
                }

                try {
                    setLoading(true);
                    setLoadError('');

                    const requests = [
                        api.get(
                            '/admin/users/permissions'
                        ),
                    ];

                    if (isEdit) {
                        requests.push(
                            api.get(
                                `/admin/users/${id}`
                            )
                        );
                    }

                    const responses =
                        await Promise.all(
                            requests
                        );

                    const configuration =
                        responses[0]
                            ?.data?.data ||
                        {};

                    const backendRoles =
                        Array.isArray(
                            configuration.available_roles
                        )
                            ? configuration.available_roles
                            : LOCAL_AVAILABLE_ROLES;

                    const backendPermissions =
                        Array.isArray(
                            configuration.available_permissions
                        )
                            ? configuration.available_permissions
                            : LOCAL_AVAILABLE_PERMISSIONS;

                    const backendDefaults =
                        configuration.default_permissions &&
                        typeof configuration.default_permissions ===
                            'object'
                            ? configuration.default_permissions
                            : LOCAL_DEFAULT_PERMISSIONS;

                    const backendImplied =
                        configuration.implied_permissions &&
                        typeof configuration.implied_permissions ===
                            'object'
                            ? configuration.implied_permissions
                            : LOCAL_IMPLIED_PERMISSIONS;

                    setAvailableRoles(
                        backendRoles
                    );

                    setAvailablePermissions(
                        backendPermissions
                    );

                    setDefaultPermissions(
                        backendDefaults
                    );

                    setImpliedPermissions(
                        backendImplied
                    );

                    if (!isEdit) {
                        const initialPermissions =
                            normalizePermissions(
                                backendDefaults.user ||
                                    [],
                                backendPermissions
                            );

                        setForm({
                            ...INITIAL_FORM,
                            role: 'user',
                            permissions:
                                initialPermissions,
                        });

                        setOriginalUser(null);

                        return;
                    }

                    const user =
                        responses[1]
                            ?.data?.data;

                    if (!user) {
                        throw new Error(
                            'Data user tidak ditemukan.'
                        );
                    }

                    const userRole =
                        user.role ||
                        'user';

                    /*
                     * Checkbox menggunakan stored_permissions.
                     *
                     * Fallback ke permissions hanya untuk mendukung
                     * response backend versi lama.
                     */
                    const storedPermissions =
                        userRole ===
                        'superadmin'
                            ? backendPermissions
                            : normalizePermissions(
                                Array.isArray(
                                    user.stored_permissions
                                )
                                    ? user.stored_permissions
                                    : user.permissions,
                                backendPermissions
                            );

                    setOriginalUser(user);

                    setForm({
                        name:
                            user.name ||
                            '',

                        username:
                            user.username ||
                            '',

                        email:
                            user.email ||
                            '',

                        password:
                            '',

                        password_confirmation:
                            '',

                        role:
                            userRole,

                        permissions:
                            storedPermissions,
                    });
                } catch (error) {
                    console.error(
                        'Fetch user form error:',
                        error?.response?.data ||
                            error
                    );

                    const message =
                        getBackendErrorMessage(
                            error,
                            error?.message ||
                                'Data form user gagal dimuat.'
                        );

                    setLoadError(
                        message
                    );

                    await showErrorAlert(
                        'Gagal Memuat Form',
                        message
                    );
                } finally {
                    setLoading(false);
                }
            },
            [
                canManage,
                id,
                isEdit,
            ]
        );

    useEffect(() => {
        fetchFormData();
    }, [fetchFormData]);

    const roleOptions =
        useMemo(() => {
            return availableRoles.map(
                (role) =>
                    getRoleConfig(role)
            );
        }, [availableRoles]);

    const selectedRole =
        useMemo(
            () =>
                getRoleConfig(
                    form.role
                ),
            [form.role]
        );

    const effectivePermissions =
        useMemo(
            () =>
                form.role ===
                'superadmin'
                    ? availablePermissions
                    : expandImpliedPermissions(
                        form.permissions,
                        impliedPermissions,
                        availablePermissions
                    ),
            [
                form.permissions,
                form.role,
                impliedPermissions,
                availablePermissions,
            ]
        );

    const storedPermissionCount =
        form.permissions.length;

    const effectivePermissionCount =
        effectivePermissions.length;

    const isSuperadminRole =
        form.role ===
        'superadmin';

    const isCurrentAccount =
        isEdit &&
        Number(currentUser?.id) ===
            Number(id);

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (previousForm) => {
                const nextForm = {
                    ...previousForm,
                    [name]: value,
                };

                if (
                    name === 'name' &&
                    !isEdit &&
                    !previousForm.username
                ) {
                    nextForm.username =
                        createUsername(
                            value
                        );
                }

                return nextForm;
            }
        );
    };

    const handleRoleChange = async (
        roleValue
    ) => {
        if (
            isCurrentAccount &&
            originalUser?.role ===
                'superadmin' &&
            roleValue !==
                'superadmin'
        ) {
            await showWarningAlert(
                'Role Tidak Dapat Diubah',
                'Role akun superadmin yang sedang digunakan tidak dapat diturunkan.'
            );

            return;
        }

        const rolePermissions =
            roleValue ===
            'superadmin'
                ? availablePermissions
                : normalizePermissions(
                    defaultPermissions[
                        roleValue
                    ] || [],
                    availablePermissions
                );

        setForm(
            (previousForm) => ({
                ...previousForm,
                role:
                    roleValue,
                permissions:
                    rolePermissions,
            })
        );
    };

    const getDependentParents = (
        permissionValue
    ) => {
        return Object.entries(
            impliedPermissions || {}
        )
            .filter(
                ([
                    parentPermission,
                    childPermissions,
                ]) =>
                    Array.isArray(
                        childPermissions
                    ) &&
                    childPermissions.includes(
                        permissionValue
                    ) &&
                    form.permissions.includes(
                        parentPermission
                    )
            )
            .map(
                ([
                    parentPermission,
                ]) =>
                    parentPermission
            );
    };

    const handlePermissionToggle =
        async (
            permissionValue
        ) => {
            if (
                isSuperadminRole
            ) {
                return;
            }

            const isChecked =
                form.permissions.includes(
                    permissionValue
                );

            /*
             * Permission view tidak dapat dilepas selama permission
             * process/manage yang membutuhkannya masih aktif.
             */
            if (isChecked) {
                const dependentParents =
                    getDependentParents(
                        permissionValue
                    );

                if (
                    dependentParents.length >
                    0
                ) {
                    await showWarningAlert(
                        'Permission Masih Dibutuhkan',
                        `Permission ini masih dibutuhkan oleh: ${dependentParents.join(', ')}. Nonaktifkan permission process/manage tersebut terlebih dahulu.`
                    );

                    return;
                }
            }

            setForm(
                (previousForm) => {
                    let nextPermissions =
                        previousForm.permissions;

                    if (isChecked) {
                        nextPermissions =
                            previousForm.permissions.filter(
                                (permission) =>
                                    permission !==
                                    permissionValue
                            );
                    } else {
                        nextPermissions = [
                            ...previousForm.permissions,
                            permissionValue,
                        ];

                        const impliedChildren =
                            impliedPermissions[
                                permissionValue
                            ];

                        if (
                            Array.isArray(
                                impliedChildren
                            )
                        ) {
                            nextPermissions = [
                                ...nextPermissions,
                                ...impliedChildren,
                            ];
                        }
                    }

                    return {
                        ...previousForm,

                        permissions:
                            normalizePermissions(
                                nextPermissions,
                                availablePermissions
                            ),
                    };
                }
            );
        };

    const handleGroupToggle =
        async (group) => {
            if (
                isSuperadminRole
            ) {
                return;
            }

            const groupPermissions =
                group.permissions
                    .map(
                        (permission) =>
                            permission.value
                    )
                    .filter(
                        (permission) =>
                            availablePermissions.includes(
                                permission
                            )
                    );

            const isGroupFullySelected =
                groupPermissions.every(
                    (permission) =>
                        form.permissions.includes(
                            permission
                        )
                );

            if (
                isGroupFullySelected
            ) {
                const remainingPermissions =
                    form.permissions.filter(
                        (permission) =>
                            !groupPermissions.includes(
                                permission
                            )
                    );

                /*
                 * Setelah grup dilepas, perluasan ulang hanya dilakukan
                 * pada permission yang masih tersisa.
                 */
                setForm(
                    (previousForm) => ({
                        ...previousForm,

                        permissions:
                            expandImpliedPermissions(
                                remainingPermissions,
                                impliedPermissions,
                                availablePermissions
                            ),
                    })
                );

                return;
            }

            const expandedGroup =
                expandImpliedPermissions(
                    [
                        ...form.permissions,
                        ...groupPermissions,
                    ],
                    impliedPermissions,
                    availablePermissions
                );

            setForm(
                (previousForm) => ({
                    ...previousForm,

                    permissions:
                        expandedGroup,
                })
            );
        };

    const applyDefaultPermissions = () => {
        const permissions =
            form.role ===
            'superadmin'
                ? availablePermissions
                : normalizePermissions(
                    defaultPermissions[
                        form.role
                    ] || [],
                    availablePermissions
                );

        setForm(
            (previousForm) => ({
                ...previousForm,
                permissions,
            })
        );
    };

    const selectAllPermissions = () => {
        if (
            isSuperadminRole
        ) {
            return;
        }

        setForm(
            (previousForm) => ({
                ...previousForm,

                permissions: [
                    ...availablePermissions,
                ],
            })
        );
    };

    const clearAllPermissions = () => {
        if (
            isSuperadminRole
        ) {
            return;
        }

        setForm(
            (previousForm) => ({
                ...previousForm,
                permissions: [],
            })
        );
    };

    const validateForm = () => {
        if (!canManage) {
            showErrorAlert(
                'Akses Ditolak',
                'Hanya superadmin yang dapat menyimpan data user.'
            );

            return false;
        }

        if (
            !form.name.trim()
        ) {
            showWarningAlert(
                'Nama Wajib Diisi',
                'Isi nama user terlebih dahulu.'
            );

            return false;
        }

        if (
            form.name.trim().length <
            3
        ) {
            showWarningAlert(
                'Nama Terlalu Pendek',
                'Nama user minimal tiga karakter.'
            );

            return false;
        }

        if (
            !form.username.trim()
        ) {
            showWarningAlert(
                'Username Wajib Diisi',
                'Isi username user terlebih dahulu.'
            );

            return false;
        }

        if (
            !/^[a-zA-Z0-9._-]+$/.test(
                form.username.trim()
            )
        ) {
            showWarningAlert(
                'Username Tidak Valid',
                'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.'
            );

            return false;
        }

        if (
            form.username.trim().length <
            3
        ) {
            showWarningAlert(
                'Username Terlalu Pendek',
                'Username minimal tiga karakter.'
            );

            return false;
        }

        if (
            !form.email.trim()
        ) {
            showWarningAlert(
                'Email Wajib Diisi',
                'Isi email user terlebih dahulu.'
            );

            return false;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.email.trim()
            )
        ) {
            showWarningAlert(
                'Email Tidak Valid',
                'Masukkan alamat email yang valid.'
            );

            return false;
        }

        if (
            !availableRoles.includes(
                form.role
            )
        ) {
            showWarningAlert(
                'Role Tidak Valid',
                'Pilih role yang tersedia.'
            );

            return false;
        }

        if (
            !isEdit &&
            !form.password
        ) {
            showWarningAlert(
                'Password Wajib Diisi',
                'Password wajib diisi saat membuat user baru.'
            );

            return false;
        }

        if (
            form.password &&
            form.password.length <
                6
        ) {
            showWarningAlert(
                'Password Terlalu Pendek',
                'Password minimal enam karakter.'
            );

            return false;
        }

        if (
            form.password &&
            form.password !==
                form.password_confirmation
        ) {
            showWarningAlert(
                'Konfirmasi Password Tidak Sama',
                'Password dan konfirmasi password harus sama.'
            );

            return false;
        }

        /*
         * Array permission kosong diperbolehkan.
         * Ini sesuai backend dan pilihan superadmin.
         */

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
            setSubmitting(true);

            showLoadingAlert(
                isEdit
                    ? 'Memperbarui User'
                    : 'Menyimpan User',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                name:
                    form.name.trim(),

                username:
                    form.username.trim(),

                email:
                    form.email
                        .trim()
                        .toLowerCase(),

                role:
                    form.role,

                /*
                 * Selalu kirim permissions, termasuk [].
                 * Dengan demikian array kosong tidak diganti default role.
                 */
                permissions:
                    form.role ===
                    'superadmin'
                        ? [
                            ...availablePermissions,
                        ]
                        : normalizePermissions(
                            form.permissions,
                            availablePermissions
                        ),
            };

            if (
                form.password
            ) {
                payload.password =
                    form.password;

                payload.password_confirmation =
                    form.password_confirmation;
            }

            let response;

            if (isEdit) {
                response =
                    await api.put(
                        `/admin/users/${id}`,
                        payload
                    );
            } else {
                response =
                    await api.post(
                        '/admin/users',
                        payload
                    );
            }

            closeAlert();

            await showSuccessAlert(
                isEdit
                    ? 'User Diperbarui'
                    : 'User Ditambahkan',

                response?.data?.message ||
                    (
                        isEdit
                            ? 'Data dan hak akses user berhasil diperbarui.'
                            : 'User baru berhasil ditambahkan.'
                    )
            );

            /*
             * Apabila akun aktif sendiri diperbarui,
             * sinkronkan informasi terbaru ke localStorage.
             */
            if (
                isEdit &&
                isCurrentAccount &&
                response?.data?.data
            ) {
                localStorage.setItem(
                    'admin_user',
                    JSON.stringify(
                        response.data.data
                    )
                );
            }

            navigate(
                '/admin/users',
                {
                    replace: true,
                }
            );
        } catch (error) {
            console.error(
                'Save user error:',
                error?.response?.data ||
                    error
            );

            closeAlert();

            await showErrorAlert(
                isEdit
                    ? 'Update Gagal'
                    : 'Tambah Gagal',

                getBackendErrorMessage(
                    error,
                    'Data user gagal disimpan.'
                )
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat form user
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-4"
                        style={{
                            width: 88,
                            height: 88,
                        }}
                    >
                        <i className="bi bi-shield-lock-fill fs-1" />
                    </div>

                    <h3 className="fw-black mb-2">
                        Akses Ditolak
                    </h3>

                    <p className="text-muted mx-auto mb-4">
                        Hanya superadmin yang dapat menambah atau mengubah akun dan hak akses.
                    </p>

                    <Link
                        to="/admin/users"
                        className="btn btn-danger rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Data User
                    </Link>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center mb-4"
                        style={{
                            width: 88,
                            height: 88,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h3 className="fw-black mb-2">
                        Form Gagal Dimuat
                    </h3>

                    <p className="text-muted mx-auto mb-4">
                        {loadError}
                    </p>

                    <div className="d-flex flex-wrap justify-content-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill"
                            onClick={
                                fetchFormData
                            }
                        >
                            <i className="bi bi-arrow-clockwise me-2" />

                            Coba Lagi
                        </button>

                        <Link
                            to="/admin/users"
                            className="btn btn-danger rounded-pill"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-danger px-3 py-2 mb-3">
                                {isEdit
                                    ? 'Edit User'
                                    : 'Tambah User'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {isEdit
                                    ? 'Perbarui akun dan hak akses.'
                                    : 'Tambahkan akun baru.'}
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{
                                    maxWidth: 780,
                                    lineHeight: 1.8,
                                }}
                            >
                                Atur identitas, role, serta menu dan fitur yang dapat digunakan oleh akun.
                            </p>
                        </div>

                        <Link
                            to="/admin/users"
                            className="btn btn-light rounded-pill px-4"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            {isCurrentAccount && (
                <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Ini akun yang sedang digunakan
                            </div>

                            <div className="small">
                                Role superadmin pada akun aktif tidak dapat diturunkan.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <form
                onSubmit={
                    handleSubmit
                }
            >
                <div className="row g-4">
                    <div className="col-xl-8">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Informasi Akun
                                        </h4>

                                        <p className="text-muted mb-0">
                                            Lengkapi identitas dan kredensial akun.
                                        </p>
                                    </div>

                                    <div className="icon-box bg-danger-subtle text-danger">
                                        <i className="bi bi-person-vcard-fill" />
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label
                                            htmlFor="name"
                                            className="form-label fw-bold"
                                        >
                                            Nama Lengkap
                                        </label>

                                        <input
                                            id="name"
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Ayodya Ganas Wasesa"
                                            value={
                                                form.name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="username"
                                            className="form-label fw-bold"
                                        >
                                            Username
                                        </label>

                                        <input
                                            id="username"
                                            type="text"
                                            name="username"
                                            className="form-control rounded-pill"
                                            placeholder="contoh: ayodya"
                                            value={
                                                form.username
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="100"
                                            required
                                        />

                                        <div className="form-text">
                                            Gunakan huruf, angka, titik, garis bawah, atau tanda hubung.
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label
                                            htmlFor="email"
                                            className="form-label fw-bold"
                                        >
                                            Email
                                        </label>

                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            className="form-control rounded-pill"
                                            placeholder="nama@email.com"
                                            value={
                                                form.email
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                submitting
                                            }
                                            maxLength="255"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="password"
                                            className="form-label fw-bold"
                                        >
                                            {isEdit
                                                ? 'Password Baru'
                                                : 'Password'}
                                        </label>

                                        <div className="input-group">
                                            <input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                name="password"
                                                className="form-control rounded-start-pill"
                                                placeholder={
                                                    isEdit
                                                        ? 'Kosongkan jika tidak diganti'
                                                        : 'Minimal 6 karakter'
                                                }
                                                value={
                                                    form.password
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    submitting
                                                }
                                                maxLength="255"
                                                required={
                                                    !isEdit
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-end-pill"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (
                                                            previousValue
                                                        ) =>
                                                            !previousValue
                                                    )
                                                }
                                                disabled={
                                                    submitting
                                                }
                                                aria-label="Tampilkan atau sembunyikan password"
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

                                        {isEdit && (
                                            <div className="form-text">
                                                Kosongkan apabila password tidak ingin diganti.
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="password_confirmation"
                                            className="form-label fw-bold"
                                        >
                                            Konfirmasi Password
                                        </label>

                                        <div className="input-group">
                                            <input
                                                id="password_confirmation"
                                                type={
                                                    showPasswordConfirmation
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                name="password_confirmation"
                                                className="form-control rounded-start-pill"
                                                placeholder="Ulangi password"
                                                value={
                                                    form.password_confirmation
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    submitting
                                                }
                                                maxLength="255"
                                                required={
                                                    !isEdit ||
                                                    Boolean(
                                                        form.password
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-end-pill"
                                                onClick={() =>
                                                    setShowPasswordConfirmation(
                                                        (
                                                            previousValue
                                                        ) =>
                                                            !previousValue
                                                    )
                                                }
                                                disabled={
                                                    submitting
                                                }
                                                aria-label="Tampilkan atau sembunyikan konfirmasi password"
                                            >
                                                <i
                                                    className={`bi ${
                                                        showPasswordConfirmation
                                                            ? 'bi-eye-slash-fill'
                                                            : 'bi-eye-fill'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Hak Akses Fitur
                                        </h4>

                                        <p className="text-muted mb-0">
                                            Permission kosong diperbolehkan. Akun tersebut tidak akan memiliki akses fitur.
                                        </p>
                                    </div>

                                    <div className="d-flex flex-wrap gap-2">
                                        <span className="badge rounded-pill text-bg-light border text-dark px-3 py-2">
                                            {
                                                storedPermissionCount
                                            }{' '}
                                            tersimpan
                                        </span>

                                        <span className="badge rounded-pill text-bg-danger px-3 py-2">
                                            {
                                                effectivePermissionCount
                                            }{' '}
                                            efektif
                                        </span>
                                    </div>
                                </div>

                                {isSuperadminRole && (
                                    <div className="alert alert-danger border-0 rounded-4">
                                        <div className="d-flex gap-3">
                                            <i className="bi bi-shield-lock-fill fs-4" />

                                            <div>
                                                <div className="fw-black">
                                                    Superadmin memiliki akses penuh
                                                </div>

                                                <div className="small">
                                                    Seluruh permission otomatis aktif dan tidak dapat dinonaktifkan.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex flex-wrap gap-2 mb-4">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger rounded-pill"
                                        onClick={
                                            applyDefaultPermissions
                                        }
                                        disabled={
                                            submitting
                                        }
                                    >
                                        <i className="bi bi-arrow-counterclockwise me-2" />

                                        Default Role
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary rounded-pill"
                                        onClick={
                                            selectAllPermissions
                                        }
                                        disabled={
                                            submitting ||
                                            isSuperadminRole
                                        }
                                    >
                                        <i className="bi bi-check2-all me-2" />

                                        Pilih Semua
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary rounded-pill"
                                        onClick={
                                            clearAllPermissions
                                        }
                                        disabled={
                                            submitting ||
                                            isSuperadminRole
                                        }
                                    >
                                        <i className="bi bi-x-lg me-2" />

                                        Kosongkan
                                    </button>
                                </div>

                                <div className="row g-4">
                                    {PERMISSION_GROUPS.map(
                                        (group) => {
                                            const visiblePermissions =
                                                group.permissions.filter(
                                                    (
                                                        permission
                                                    ) =>
                                                        availablePermissions.includes(
                                                            permission.value
                                                        )
                                                );

                                            if (
                                                visiblePermissions.length ===
                                                0
                                            ) {
                                                return null;
                                            }

                                            const groupPermissionValues =
                                                visiblePermissions.map(
                                                    (
                                                        permission
                                                    ) =>
                                                        permission.value
                                                );

                                            const selectedInGroup =
                                                groupPermissionValues.filter(
                                                    (
                                                        permission
                                                    ) =>
                                                        form.permissions.includes(
                                                            permission
                                                        )
                                                ).length;

                                            const isGroupFullySelected =
                                                selectedInGroup ===
                                                groupPermissionValues.length;

                                            return (
                                                <div
                                                    className="col-12 col-lg-6"
                                                    key={
                                                        group.key
                                                    }
                                                >
                                                    <div className="border rounded-4 h-100 overflow-hidden">
                                                        <div className="p-3 bg-light border-bottom">
                                                            <div className="d-flex align-items-start justify-content-between gap-3">
                                                                <div className="d-flex align-items-start gap-3">
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
                                                                                group.description
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className={`btn btn-sm rounded-pill ${
                                                                        isGroupFullySelected
                                                                            ? 'btn-danger'
                                                                            : 'btn-outline-danger'
                                                                    }`}
                                                                    onClick={() =>
                                                                        handleGroupToggle(
                                                                            {
                                                                                ...group,

                                                                                permissions:
                                                                                    visiblePermissions,
                                                                            }
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        submitting ||
                                                                        isSuperadminRole
                                                                    }
                                                                >
                                                                    {
                                                                        selectedInGroup
                                                                    }
                                                                    /
                                                                    {
                                                                        groupPermissionValues.length
                                                                    }
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="p-3">
                                                            <div className="d-flex flex-column gap-3">
                                                                {visiblePermissions.map(
                                                                    (
                                                                        permission
                                                                    ) => {
                                                                        const isStored =
                                                                            form.permissions.includes(
                                                                                permission.value
                                                                            );

                                                                        const isEffective =
                                                                            effectivePermissions.includes(
                                                                                permission.value
                                                                            );

                                                                        const impliedBy =
                                                                            Object.entries(
                                                                                impliedPermissions
                                                                            )
                                                                                .filter(
                                                                                    ([
                                                                                        parentPermission,
                                                                                        childPermissions,
                                                                                    ]) =>
                                                                                        Array.isArray(
                                                                                            childPermissions
                                                                                        ) &&
                                                                                        childPermissions.includes(
                                                                                            permission.value
                                                                                        ) &&
                                                                                        form.permissions.includes(
                                                                                            parentPermission
                                                                                        )
                                                                                )
                                                                                .map(
                                                                                    ([
                                                                                        parentPermission,
                                                                                    ]) =>
                                                                                        parentPermission
                                                                                );

                                                                        return (
                                                                            <label
                                                                                key={
                                                                                    permission.value
                                                                                }
                                                                                className={`p-3 rounded-4 border ${
                                                                                    isEffective
                                                                                        ? 'border-danger bg-danger-subtle'
                                                                                        : 'bg-white'
                                                                                }`}
                                                                                style={{
                                                                                    cursor:
                                                                                        isSuperadminRole
                                                                                            ? 'default'
                                                                                            : 'pointer',
                                                                                }}
                                                                            >
                                                                                <div className="d-flex align-items-start gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="form-check-input mt-1"
                                                                                        checked={
                                                                                            isEffective
                                                                                        }
                                                                                        onChange={() =>
                                                                                            handlePermissionToggle(
                                                                                                permission.value
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            submitting ||
                                                                                            isSuperadminRole
                                                                                        }
                                                                                    />

                                                                                    <div className="flex-grow-1">
                                                                                        <div className="d-flex flex-wrap align-items-center gap-2">
                                                                                            <div className="fw-bold">
                                                                                                {
                                                                                                    permission.label
                                                                                                }
                                                                                            </div>

                                                                                            {!isStored &&
                                                                                                isEffective && (
                                                                                                    <span className="badge rounded-pill text-bg-info">
                                                                                                        Turunan
                                                                                                    </span>
                                                                                                )}
                                                                                        </div>

                                                                                        <div className="small text-muted">
                                                                                            {
                                                                                                permission.description
                                                                                            }
                                                                                        </div>

                                                                                        {impliedBy.length >
                                                                                            0 && (
                                                                                            <div className="small text-info-emphasis mt-2">
                                                                                                Otomatis aktif karena
                                                                                                {' '}
                                                                                                <strong>
                                                                                                    {impliedBy.join(
                                                                                                        ', '
                                                                                                    )}
                                                                                                </strong>
                                                                                                .
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-4">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Role Utama
                                </h4>

                                <p className="text-muted mb-4">
                                    Mengganti role akan menerapkan permission default role tersebut.
                                </p>

                                <div className="d-flex flex-column gap-3">
                                    {roleOptions.map(
                                        (
                                            roleOption
                                        ) => {
                                            const selected =
                                                form.role ===
                                                roleOption.value;

                                            const disabled =
                                                submitting ||
                                                (
                                                    isCurrentAccount &&
                                                    originalUser?.role ===
                                                        'superadmin' &&
                                                    roleOption.value !==
                                                        'superadmin'
                                                );

                                            return (
                                                <label
                                                    key={
                                                        roleOption.value
                                                    }
                                                    className={`p-3 rounded-4 border ${
                                                        selected
                                                            ? `border-${roleOption.color} bg-${roleOption.color}-subtle`
                                                            : 'bg-white'
                                                    }`}
                                                    style={{
                                                        cursor:
                                                            disabled
                                                                ? 'not-allowed'
                                                                : 'pointer',

                                                        opacity:
                                                            disabled
                                                                ? 0.65
                                                                : 1,
                                                    }}
                                                >
                                                    <div className="d-flex align-items-start gap-3">
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            value={
                                                                roleOption.value
                                                            }
                                                            checked={
                                                                selected
                                                            }
                                                            onChange={() =>
                                                                handleRoleChange(
                                                                    roleOption.value
                                                                )
                                                            }
                                                            disabled={
                                                                disabled
                                                            }
                                                            className="form-check-input mt-1"
                                                        />

                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 fw-black">
                                                                <i
                                                                    className={`bi ${roleOption.icon}`}
                                                                />

                                                                {
                                                                    roleOption.label
                                                                }
                                                            </div>

                                                            <div className="small text-muted mt-1">
                                                                {
                                                                    roleOption.description
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-3">
                                    Preview Akun
                                </h4>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="profile-avatar bg-danger text-white">
                                            {(
                                                form.name ||
                                                'U'
                                            )
                                                .charAt(
                                                    0
                                                )
                                                .toUpperCase()}
                                        </div>

                                        <div className="min-w-0">
                                            <h5 className="fw-black mb-1 text-truncate">
                                                {form.name ||
                                                    'Nama User'}
                                            </h5>

                                            <p className="text-muted mb-0 text-truncate">
                                                @
                                                {form.username ||
                                                    'username'}
                                            </p>
                                        </div>
                                    </div>

                                    <hr />

                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                        <span
                                            className={`badge rounded-pill bg-${selectedRole.color}-subtle text-${selectedRole.color} px-3 py-2`}
                                        >
                                            <i
                                                className={`bi ${selectedRole.icon} me-2`}
                                            />

                                            {
                                                selectedRole.label
                                            }
                                        </span>

                                        <span className="badge rounded-pill text-bg-dark">
                                            {
                                                effectivePermissionCount
                                            }{' '}
                                            akses
                                        </span>
                                    </div>

                                    <div className="small text-muted text-break">
                                        {form.email ||
                                            'Email belum diisi'}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-danger rounded-pill"
                                        disabled={
                                            submitting
                                        }
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />

                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-save-fill me-2" />

                                                {isEdit
                                                    ? 'Update User'
                                                    : 'Simpan User'}
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/users"
                                        className="btn btn-outline-dark rounded-pill"
                                    >
                                        Batal
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
}