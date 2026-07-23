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

const ROLE_OPTIONS = [
    {
        value: 'superadmin',
        label: 'Super Admin',
        description:
            'Akses penuh ke seluruh fitur, approval, master data, dan manajemen user.',
        icon: 'bi-shield-lock-fill',
        color: 'danger',
    },
    {
        value: 'admin',
        label: 'Admin',
        description:
            'Admin umum yang dapat diberi akses HUMAS, SEKPiM, serta fitur pengajuan.',
        icon: 'bi-person-badge-fill',
        color: 'primary',
    },
    {
        value: 'admin_humas',
        label: 'Admin Humas',
        description:
            'Admin utama untuk merchandise, liputan Humas, dan pengelolaan produk.',
        icon: 'bi-megaphone-fill',
        color: 'danger',
    },
    {
        value: 'admin_sekpim',
        label: 'Admin SEKPiM',
        description:
            'Admin utama untuk layanan peminjaman perlengkapan SEKPiM.',
        icon: 'bi-briefcase-fill',
        color: 'success',
    },
    {
        value: 'user',
        label: 'User',
        description:
            'Pengguna biasa yang dapat membuat dan memantau pengajuan.',
        icon: 'bi-person-fill',
        color: 'secondary',
    },
];

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
            'Mengatur layanan apa saja yang dapat diajukan oleh akun.',
        icon: 'bi-send-fill',
        permissions: [
            {
                value: 'request.merchandise.create',
                label: 'Ajukan Merchandise',
                description:
                    'Dapat membuat pengajuan merchandise.',
            },
            {
                value: 'request.humas.create',
                label: 'Request Liputan Humas',
                description:
                    'Dapat membuat request liputan dan publikasi Humas.',
            },
            {
                value: 'request.borrowing.create',
                label: 'Ajukan Peminjaman SEKPiM',
                description:
                    'Dapat membuat pengajuan peminjaman perlengkapan.',
            },
            {
                value: 'request.history.view',
                label: 'Lihat Riwayat Pengajuan',
                description:
                    'Dapat melihat pengajuan pribadi dan detail statusnya.',
            },
        ],
    },
    {
        key: 'merchandise',
        label: 'Approval Merchandise',
        description:
            'Hak akses untuk memeriksa dan memproses merchandise.',
        icon: 'bi-gift-fill',
        permissions: [
            {
                value: 'approval.merchandise.view',
                label: 'Lihat Approval Merchandise',
                description:
                    'Dapat membuka daftar dan detail pengajuan merchandise.',
            },
            {
                value: 'approval.merchandise.process',
                label: 'Proses Approval Merchandise',
                description:
                    'Dapat menyetujui, menolak, dan menyelesaikan pengajuan merchandise.',
            },
        ],
    },
    {
        key: 'humas',
        label: 'Approval Liputan Humas',
        description:
            'Hak akses untuk memeriksa dan memproses request liputan.',
        icon: 'bi-camera-reels-fill',
        permissions: [
            {
                value: 'approval.humas.view',
                label: 'Lihat Approval Liputan',
                description:
                    'Dapat membuka daftar dan detail request liputan Humas.',
            },
            {
                value: 'approval.humas.process',
                label: 'Proses Approval Liputan',
                description:
                    'Dapat menyetujui, menolak, dan menyelesaikan request liputan.',
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
                value: 'approval.borrowing.view',
                label: 'Lihat Approval Peminjaman',
                description:
                    'Dapat membuka daftar dan detail pengajuan peminjaman.',
            },
            {
                value: 'approval.borrowing.process',
                label: 'Proses Approval Peminjaman',
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
                value: 'categories.view',
                label: 'Lihat Data Kategori',
                description:
                    'Dapat membuka daftar kategori.',
            },
            {
                value: 'categories.manage',
                label: 'Kelola Data Kategori',
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
                value: 'products.view',
                label: 'Lihat Data Produk',
                description:
                    'Dapat membuka daftar produk dan stok.',
            },
            {
                value: 'products.manage',
                label: 'Kelola Data Produk',
                description:
                    'Dapat menambah, mengubah, dan menghapus produk.',
            },
        ],
    },
    {
        key: 'user',
        label: 'Manajemen User',
        description:
            'Hak akses sensitif untuk mengelola akun sistem.',
        icon: 'bi-people-fill',
        permissions: [
            {
                value: 'users.view',
                label: 'Lihat Data User',
                description:
                    'Dapat membuka daftar dan detail akun.',
            },
            {
                value: 'users.manage',
                label: 'Kelola User dan Hak Akses',
                description:
                    'Dapat menambah, mengubah, menghapus, dan mengatur permission akun.',
            },
        ],
    },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(
    (group) =>
        group.permissions.map(
            (permission) => permission.value
        )
);

const DEFAULT_PERMISSIONS = {
    superadmin: ALL_PERMISSIONS,

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

const INITIAL_FORM = {
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user',
    permissions: DEFAULT_PERMISSIONS.user,
};

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const createUsername = (value) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s._-]/g, '')
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '');
};

const normalizePermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(
                (permission) =>
                    ALL_PERMISSIONS.includes(permission)
            )
        ),
    ];
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

export default function UserFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = Boolean(id);

    const currentUser = useMemo(
        () => getCurrentUser(),
        []
    );

    const [form, setForm] =
        useState(INITIAL_FORM);

    const [loading, setLoading] =
        useState(isEdit);

    const [submitting, setSubmitting] =
        useState(false);

    const [showPassword, setShowPassword] =
        useState(false);

    const [
        showPasswordConfirmation,
        setShowPasswordConfirmation,
    ] = useState(false);

    const selectedRole = useMemo(() => {
        return (
            ROLE_OPTIONS.find(
                (role) =>
                    role.value === form.role
            ) || ROLE_OPTIONS[4]
        );
    }, [form.role]);

    const selectedPermissionCount =
        form.permissions.length;

    const isSuperadminRole =
        form.role === 'superadmin';

    const isCurrentAccount =
        currentUser.id === Number(id);

    const fetchUser = useCallback(
        async () => {
            if (!isEdit) {
                setForm(INITIAL_FORM);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const response =
                    await api.get(
                        `/admin/users/${id}`
                    );

                const user =
                    response?.data?.data;

                if (!user) {
                    throw new Error(
                        'Data user tidak ditemukan.'
                    );
                }

                const userRole =
                    user.role || 'user';

                const permissions =
                    userRole === 'superadmin'
                        ? ALL_PERMISSIONS
                        : normalizePermissions(
                              user.permissions
                          );

                setForm({
                    name: user.name || '',
                    username:
                        user.username || '',
                    email: user.email || '',
                    password: '',
                    password_confirmation: '',
                    role: userRole,
                    permissions,
                });
            } catch (error) {
                console.error(
                    'Fetch user form error:',
                    error?.response?.data ||
                        error
                );

                await showErrorAlert(
                    'Gagal Memuat Form',
                    getBackendErrorMessage(
                        error,
                        'Data user gagal dimuat.'
                    )
                );

                navigate('/admin/users', {
                    replace: true,
                });
            } finally {
                setLoading(false);
            }
        },
        [
            id,
            isEdit,
            navigate,
        ]
    );

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((previousForm) => {
            const nextForm = {
                ...previousForm,
                [name]: value,
            };

            if (
                name === 'name' &&
                !isEdit
            ) {
                nextForm.username =
                    createUsername(value);
            }

            return nextForm;
        });
    };

    const handleRoleChange = (
        roleValue
    ) => {
        if (
            isCurrentAccount &&
            form.role === 'superadmin' &&
            roleValue !== 'superadmin'
        ) {
            showWarningAlert(
                'Role Tidak Dapat Diubah',
                'Role akun superadmin yang sedang digunakan tidak dapat diturunkan.'
            );

            return;
        }

        setForm((previousForm) => ({
            ...previousForm,
            role: roleValue,
            permissions:
                roleValue === 'superadmin'
                    ? ALL_PERMISSIONS
                    : [
                          ...(
                              DEFAULT_PERMISSIONS[
                                  roleValue
                              ] || []
                          ),
                      ],
        }));
    };

    const handlePermissionToggle = (
        permissionValue
    ) => {
        if (isSuperadminRole) {
            return;
        }

        setForm((previousForm) => {
            const isChecked =
                previousForm.permissions.includes(
                    permissionValue
                );

            const nextPermissions = isChecked
                ? previousForm.permissions.filter(
                      (permission) =>
                          permission !==
                          permissionValue
                  )
                : [
                      ...previousForm.permissions,
                      permissionValue,
                  ];

            return {
                ...previousForm,
                permissions:
                    normalizePermissions(
                        nextPermissions
                    ),
            };
        });
    };

    const handleGroupToggle = (
        group
    ) => {
        if (isSuperadminRole) {
            return;
        }

        const groupPermissions =
            group.permissions.map(
                (permission) =>
                    permission.value
            );

        const isGroupFullySelected =
            groupPermissions.every(
                (permission) =>
                    form.permissions.includes(
                        permission
                    )
            );

        setForm((previousForm) => {
            let nextPermissions;

            if (isGroupFullySelected) {
                nextPermissions =
                    previousForm.permissions.filter(
                        (permission) =>
                            !groupPermissions.includes(
                                permission
                            )
                    );
            } else {
                nextPermissions = [
                    ...previousForm.permissions,
                    ...groupPermissions,
                ];
            }

            return {
                ...previousForm,
                permissions:
                    normalizePermissions(
                        nextPermissions
                    ),
            };
        });
    };

    const applyDefaultPermissions = () => {
        setForm((previousForm) => ({
            ...previousForm,
            permissions:
                previousForm.role ===
                'superadmin'
                    ? ALL_PERMISSIONS
                    : [
                          ...(
                              DEFAULT_PERMISSIONS[
                                  previousForm.role
                              ] || []
                          ),
                      ],
        }));
    };

    const selectAllPermissions = () => {
        if (isSuperadminRole) {
            return;
        }

        setForm((previousForm) => ({
            ...previousForm,
            permissions: [
                ...ALL_PERMISSIONS,
            ],
        }));
    };

    const clearAllPermissions = () => {
        if (isSuperadminRole) {
            return;
        }

        setForm((previousForm) => ({
            ...previousForm,
            permissions: [],
        }));
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            showWarningAlert(
                'Nama Wajib Diisi',
                'Isi nama user terlebih dahulu.'
            );

            return false;
        }

        if (!form.username.trim()) {
            showWarningAlert(
                'Username Wajib Diisi',
                'Isi username user terlebih dahulu.'
            );

            return false;
        }

        if (!form.email.trim()) {
            showWarningAlert(
                'Email Wajib Diisi',
                'Isi email user terlebih dahulu.'
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
            form.password.length < 6
        ) {
            showWarningAlert(
                'Password Terlalu Pendek',
                'Password minimal 6 karakter.'
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

        if (
            form.role !== 'superadmin' &&
            form.permissions.length === 0
        ) {
            showWarningAlert(
                'Hak Akses Belum Dipilih',
                'Pilih minimal satu hak akses untuk akun ini.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'approval.merchandise.process'
            ) &&
            !form.permissions.includes(
                'approval.merchandise.view'
            )
        ) {
            showWarningAlert(
                'Akses Merchandise Belum Lengkap',
                'Permission proses merchandise membutuhkan permission lihat approval merchandise.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'approval.humas.process'
            ) &&
            !form.permissions.includes(
                'approval.humas.view'
            )
        ) {
            showWarningAlert(
                'Akses Humas Belum Lengkap',
                'Permission proses liputan membutuhkan permission lihat approval liputan.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'approval.borrowing.process'
            ) &&
            !form.permissions.includes(
                'approval.borrowing.view'
            )
        ) {
            showWarningAlert(
                'Akses Peminjaman Belum Lengkap',
                'Permission proses peminjaman membutuhkan permission lihat approval peminjaman.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'categories.manage'
            ) &&
            !form.permissions.includes(
                'categories.view'
            )
        ) {
            showWarningAlert(
                'Akses Kategori Belum Lengkap',
                'Permission kelola kategori membutuhkan permission lihat kategori.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'products.manage'
            ) &&
            !form.permissions.includes(
                'products.view'
            )
        ) {
            showWarningAlert(
                'Akses Produk Belum Lengkap',
                'Permission kelola produk membutuhkan permission lihat produk.'
            );

            return false;
        }

        if (
            form.permissions.includes(
                'users.manage'
            ) &&
            !form.permissions.includes(
                'users.view'
            )
        ) {
            showWarningAlert(
                'Akses User Belum Lengkap',
                'Permission kelola user membutuhkan permission lihat data user.'
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
            setSubmitting(true);

            showLoadingAlert(
                isEdit
                    ? 'Memperbarui User'
                    : 'Menyimpan User',
                'Mohon tunggu sebentar.'
            );

            const payload = {
                name: form.name.trim(),
                username:
                    form.username.trim(),
                email: form.email.trim(),
                role: form.role,
                permissions:
                    form.role ===
                    'superadmin'
                        ? ALL_PERMISSIONS
                        : normalizePermissions(
                              form.permissions
                          ),
            };

            if (form.password) {
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

                if (isCurrentAccount) {
                    const updatedUser =
                        response?.data?.data;

                    if (updatedUser) {
                        localStorage.setItem(
                            'admin_user',
                            JSON.stringify(
                                updatedUser
                            )
                        );
                    }
                }
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
                isEdit
                    ? 'Data dan hak akses user berhasil diperbarui.'
                    : 'User baru beserta hak aksesnya berhasil ditambahkan.'
            );

            navigate('/admin/users', {
                replace: true,
            });
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
                                Superadmin dapat mengatur identitas,
                                role, serta menentukan menu dan fitur
                                yang dapat digunakan oleh setiap akun.
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
                                Ini adalah akun yang sedang digunakan
                            </div>

                            <div className="small">
                                Role superadmin pada akun aktif tidak dapat diturunkan
                                untuk mencegah kehilangan akses sistem.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
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
                                        <label className="form-label fw-bold">
                                            Nama Lengkap
                                        </label>

                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control rounded-pill"
                                            placeholder="Contoh: Ayodya Ganas Wasesa"
                                            value={form.name}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Username
                                        </label>

                                        <input
                                            type="text"
                                            name="username"
                                            className="form-control rounded-pill"
                                            placeholder="contoh: ayodya"
                                            value={form.username}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">
                                            Email
                                        </label>

                                        <input
                                            type="email"
                                            name="email"
                                            className="form-control rounded-pill"
                                            placeholder="nama@email.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            disabled={submitting}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            {isEdit
                                                ? 'Password Baru'
                                                : 'Password'}
                                        </label>

                                        <div className="input-group">
                                            <input
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
                                                value={form.password}
                                                onChange={handleChange}
                                                disabled={submitting}
                                                required={!isEdit}
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-end-pill"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (previousValue) =>
                                                            !previousValue
                                                    )
                                                }
                                                disabled={submitting}
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
                                                Kosongkan jika password tidak ingin diganti.
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">
                                            Konfirmasi Password
                                        </label>

                                        <div className="input-group">
                                            <input
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
                                                onChange={handleChange}
                                                disabled={submitting}
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
                                                disabled={submitting}
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
                                            Menu yang tidak dicentang tidak akan
                                            ditampilkan pada akun tersebut.
                                        </p>
                                    </div>

                                    <span className="badge rounded-pill text-bg-danger px-3 py-2">
                                        {selectedPermissionCount} dari{' '}
                                        {ALL_PERMISSIONS.length} akses
                                    </span>
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
                                                    Seluruh permission otomatis aktif dan
                                                    tidak dapat dinonaktifkan.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex flex-wrap gap-2 mb-4">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger rounded-pill"
                                        onClick={applyDefaultPermissions}
                                        disabled={submitting}
                                    >
                                        <i className="bi bi-arrow-counterclockwise me-2" />
                                        Default Role
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary rounded-pill"
                                        onClick={selectAllPermissions}
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
                                        onClick={clearAllPermissions}
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
                                            const groupPermissionValues =
                                                group.permissions.map(
                                                    (permission) =>
                                                        permission.value
                                                );

                                            const selectedInGroup =
                                                groupPermissionValues.filter(
                                                    (permission) =>
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
                                                    key={group.key}
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
                                                                            {group.label}
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
                                                                            group
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        submitting ||
                                                                        isSuperadminRole
                                                                    }
                                                                >
                                                                    {selectedInGroup}/
                                                                    {
                                                                        groupPermissionValues.length
                                                                    }
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="p-3">
                                                            <div className="d-flex flex-column gap-3">
                                                                {group.permissions.map(
                                                                    (
                                                                        permission
                                                                    ) => {
                                                                        const isChecked =
                                                                            form.permissions.includes(
                                                                                permission.value
                                                                            );

                                                                        return (
                                                                            <label
                                                                                key={
                                                                                    permission.value
                                                                                }
                                                                                className={`p-3 rounded-4 border ${
                                                                                    isChecked
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
                                                                                            isChecked
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

                                                                                    <div>
                                                                                        <div className="fw-bold">
                                                                                            {
                                                                                                permission.label
                                                                                            }
                                                                                        </div>

                                                                                        <div className="small text-muted">
                                                                                            {
                                                                                                permission.description
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
                                    Role menentukan jenis akun dan route utama setelah login.
                                </p>

                                <div className="d-flex flex-column gap-3">
                                    {ROLE_OPTIONS.map(
                                        (roleOption) => {
                                            const selected =
                                                form.role ===
                                                roleOption.value;

                                            const disabled =
                                                submitting ||
                                                (
                                                    isCurrentAccount &&
                                                    form.role ===
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
                                                        cursor: disabled
                                                            ? 'not-allowed'
                                                            : 'pointer',
                                                        opacity: disabled
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
                                                            checked={selected}
                                                            onChange={() =>
                                                                handleRoleChange(
                                                                    roleOption.value
                                                                )
                                                            }
                                                            disabled={disabled}
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
                                            {(form.name || 'U')
                                                .charAt(0)
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

                                    <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
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
                                                selectedPermissionCount
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
                                        disabled={submitting}
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