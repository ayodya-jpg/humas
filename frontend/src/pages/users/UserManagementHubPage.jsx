import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useSearchParams,
} from 'react-router-dom';

import api, {
    clearLocalSession,
} from '../../api/axios';

import {
    getStoredUser,
} from '../../components/ProtectedRoute';

import UserManagementPage from './UserManagementPage';

import AdminRecoveryRequestsPage from '../security/AdminRecoveryRequestsPage';

/*
|--------------------------------------------------------------------------
| KONSTANTA
|--------------------------------------------------------------------------
*/

const EMPTY_FORM = {
    name: '',
    email: '',
    phone_number: '',
    unit_name: '',
    job_title: '',
    current_password: '',
};

const PROFILE_FIELDS = [
    {
        name: 'name',
        label: 'Nama Lengkap',
        type: 'text',
        required: true,
        maxLength: 255,
    },
    {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        maxLength: 255,
    },
    {
        name: 'phone_number',
        label: 'Nomor HP / WhatsApp',
        type: 'tel',
        required: false,
        maxLength: 30,
    },
    {
        name: 'unit_name',
        label: 'Unit Kerja / Bagian',
        type: 'text',
        required: false,
        maxLength: 150,
    },
    {
        name: 'job_title',
        label: 'Jabatan',
        type: 'text',
        required: false,
        maxLength: 150,
    },
];

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin HUMAS',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Superadmin',
};

const getErrorMessage = (error) => {
    const errors = error?.response?.data?.errors;

    if (errors && typeof errors === 'object') {
        const firstError = Object.values(errors)
            .flat()
            .find((value) => typeof value === 'string');

        if (firstError) {
            return firstError;
        }
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        'Terjadi kesalahan saat memproses permintaan.'
    );
};

const normalizeForm = (user) => ({
    name: String(user?.name ?? ''),
    email: String(user?.email ?? ''),
    phone_number: String(user?.phone_number ?? ''),
    unit_name: String(user?.unit_name ?? ''),
    job_title: String(user?.job_title ?? ''),
    current_password: '',
});

/*
|--------------------------------------------------------------------------
| EDIT PROFIL USER
|--------------------------------------------------------------------------
|
| Hanya Superadmin yang dapat menggunakan fitur ini.
|
| Keamanan utama dilakukan oleh Laravel:
| - Auth Sanctum
| - Verifikasi role Superadmin
| - Validasi field
| - Konfirmasi password Superadmin
| - Audit log
|
*/

function UserProfileEditor() {
    const currentUser = getStoredUser();

    const [users, setUsers] = useState([]);
    const [selectedId, setSelectedId] = useState('');

    const [search, setSearch] = useState('');

    const [form, setForm] = useState(EMPTY_FORM);
    const [originalForm, setOriginalForm] = useState(
        EMPTY_FORM
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    /*
    |--------------------------------------------------------------------------
    | LOAD USERS
    |--------------------------------------------------------------------------
    */

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(
                '/admin/user-profiles'
            );

            const records = response?.data?.data;

            setUsers(
                Array.isArray(records)
                    ? records
                    : []
            );
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    /*
    |--------------------------------------------------------------------------
    | SELECTED USER
    |--------------------------------------------------------------------------
    */

    const selectedUser = useMemo(
        () =>
            users.find(
                (user) =>
                    String(user.id) ===
                    String(selectedId)
            ) || null,
        [users, selectedId]
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER USERS
    |--------------------------------------------------------------------------
    */

    const filteredUsers = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        if (!keyword) {
            return users;
        }

        return users.filter((user) => {
            const searchableText = [
                user.name,
                user.username,
                user.email,
                user.role,
                user.unit_name,
                user.job_title,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(keyword);
        });
    }, [users, search]);

    /*
    |--------------------------------------------------------------------------
    | PILIH AKUN
    |--------------------------------------------------------------------------
    */

    const handleSelectUser = (event) => {
        const id = event.target.value;

        setSelectedId(id);

        const user = users.find(
            (item) =>
                String(item.id) === String(id)
        );

        const nextForm = user
            ? normalizeForm(user)
            : { ...EMPTY_FORM };

        setForm(nextForm);
        setOriginalForm(nextForm);

        setError('');
        setSuccess('');
    };

    /*
    |--------------------------------------------------------------------------
    | HANDLE INPUT
    |--------------------------------------------------------------------------
    */

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError('');
        setSuccess('');
    };

    /*
    |--------------------------------------------------------------------------
    | DETEKSI PERUBAHAN
    |--------------------------------------------------------------------------
    */

    const hasChanges = PROFILE_FIELDS.some(
        (field) =>
            String(form[field.name] ?? '').trim() !==
            String(originalForm[field.name] ?? '').trim()
    );

    const emailChanged =
        form.email.trim().toLowerCase() !==
        originalForm.email.trim().toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | BATALKAN PERUBAHAN
    |--------------------------------------------------------------------------
    */

    const resetForm = () => {
        setForm({
            ...originalForm,
            current_password: '',
        });

        setError('');
        setSuccess('');
    };

    /*
    |--------------------------------------------------------------------------
    | SIMPAN PROFIL USER
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !selectedUser ||
            !hasChanges ||
            saving
        ) {
            return;
        }

        setError('');
        setSuccess('');

        if (!form.current_password) {
            setError(
                'Masukkan password Superadmin untuk mengonfirmasi perubahan.'
            );
            return;
        }

        setSaving(true);

        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),

                phone_number:
                    form.phone_number.trim(),

                unit_name:
                    form.unit_name.trim(),

                job_title:
                    form.job_title.trim(),

                current_password:
                    form.current_password,
            };

            const response = await api.put(
                `/admin/user-profiles/${selectedUser.id}`,
                payload
            );

            const result = response?.data;

            if (result?.success !== true) {
                throw new Error(
                    result?.message ||
                    'Profil user gagal diperbarui.'
                );
            }

            const updatedUser = result.data;

            /*
             * Sinkronisasi daftar user
             * setelah perubahan berhasil.
             */

            setUsers((previous) =>
                previous.map((user) =>
                    Number(user.id) ===
                    Number(updatedUser.id)
                        ? {
                            ...user,
                            ...updatedUser,
                        }
                        : user
                )
            );

            const updatedForm = normalizeForm(
                updatedUser
            );

            setForm(updatedForm);
            setOriginalForm(updatedForm);

            /*
             * Jika Superadmin mengubah
             * profil akunnya sendiri,
             * sinkronkan data tampilan.
             */

            const isOwnAccount =
                Number(currentUser?.id) ===
                Number(updatedUser.id);

            if (isOwnAccount) {
                try {
                    const raw = localStorage.getItem(
                        'admin_user'
                    );

                    const storedUser = raw
                        ? JSON.parse(raw)
                        : {};

                    localStorage.setItem(
                        'admin_user',
                        JSON.stringify({
                            ...storedUser,
                            name: updatedUser.name,
                            email: updatedUser.email,
                        })
                    );
                } catch {
                    // Data tampilan akan diperbarui
                    // saat login berikutnya.
                }
            }

            /*
             * Jika email Superadmin sendiri
             * berubah, backend mencabut token.
             */

            if (
                isOwnAccount &&
                result.session_revoked === true
            ) {
                clearLocalSession();

                window.location.replace('/login');
                return;
            }

            setSuccess(
                emailChanged
                    ? 'Profil diperbarui. Akun yang emailnya berubah harus login ulang.'
                    : 'Profil pengguna berhasil diperbarui.'
            );

            /*
             * Hindari menyimpan password
             * pada state setelah request.
             */

        } catch (err) {
            setError(getErrorMessage(err));

            setForm((previous) => ({
                ...previous,
                current_password: '',
            }));
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <section className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 p-lg-5">

                {/* HEADER */}

                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                    <div>
                        <h2 className="h5 fw-bold mb-2">
                            Edit Profil Pengguna
                        </h2>

                        <p className="text-muted mb-0">
                            Kelola informasi identitas dan kontak akun pengguna.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={loadUsers}
                        disabled={loading || saving}
                    >
                        <i className="bi bi-arrow-clockwise me-2" />
                        Muat Ulang
                    </button>
                </div>

                {/* ERROR */}

                {error && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* SUCCESS */}

                {success && (
                    <div
                        className="alert alert-success"
                        role="status"
                    >
                        {success}
                    </div>
                )}

                {/* LOADING */}

                {loading ? (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border text-danger"
                            role="status"
                        />

                        <p className="text-muted mt-3 mb-0">
                            Memuat data pengguna...
                        </p>
                    </div>
                ) : (
                    <>
                        {/* SEARCH */}

                        <div className="row g-3 mb-4">
                            <div className="col-lg-6">
                                <label
                                    htmlFor="user-profile-search"
                                    className="form-label fw-semibold"
                                >
                                    Cari User
                                </label>

                                <div className="input-group">
                                    <span className="input-group-text bg-white">
                                        <i className="bi bi-search" />
                                    </span>

                                    <input
                                        id="user-profile-search"
                                        type="search"
                                        className="form-control"
                                        placeholder="Nama, username, email, atau unit"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="col-lg-6">
                                <label
                                    htmlFor="user-profile-select"
                                    className="form-label fw-semibold"
                                >
                                    Pilih User
                                </label>

                                <select
                                    id="user-profile-select"
                                    className="form-select"
                                    value={selectedId}
                                    onChange={handleSelectUser}
                                >
                                    <option value="">
                                        Pilih akun pengguna
                                    </option>

                                    {filteredUsers.map((user) => (
                                        <option
                                            key={user.id}
                                            value={user.id}
                                        >
                                            {user.name} (@{user.username})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* EMPTY SELECTION */}

                        {!selectedUser && (
                            <div className="border rounded-3 p-4 text-center text-muted">
                                <i className="bi bi-person-lines-fill fs-3 d-block mb-2" />
                                Pilih pengguna untuk melihat atau mengedit profil.
                            </div>
                        )}

                        {/* EDIT FORM */}

                        {selectedUser && (
                            <form onSubmit={handleSubmit}>

                                {/* ACCOUNT INFO */}

                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                                    <div>
                                        <h3 className="h6 fw-bold mb-1">
                                            {selectedUser.name}
                                        </h3>

                                        <div className="small text-muted">
                                            @{selectedUser.username}
                                            {' · '}
                                            {ROLE_LABELS[selectedUser.role] ||
                                                selectedUser.role}
                                        </div>
                                    </div>

                                    <Link
                                        to={`/admin/users/${selectedUser.id}/edit`}
                                        className="btn btn-outline-secondary btn-sm"
                                    >
                                        <i className="bi bi-gear me-2" />
                                        Username, Password & Hak Akses
                                    </Link>
                                </div>

                                <div className="row g-3">
                                    {PROFILE_FIELDS.map((field) => (
                                        <div
                                            key={field.name}
                                            className="col-md-6"
                                        >
                                            <label
                                                htmlFor={`user-profile-${field.name}`}
                                                className="form-label fw-semibold"
                                            >
                                                {field.label}

                                                {field.required && (
                                                    <span className="text-danger ms-1">
                                                        *
                                                    </span>
                                                )}
                                            </label>

                                            <input
                                                id={`user-profile-${field.name}`}
                                                name={field.name}
                                                type={field.type}
                                                className="form-control"
                                                required={
                                                    field.required
                                                }
                                                maxLength={
                                                    field.maxLength
                                                }
                                                minLength={
                                                    field.name === 'name'
                                                        ? 3
                                                        : undefined
                                                }
                                                value={
                                                    form[field.name]
                                                }
                                                onChange={handleChange}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* PASSWORD CONFIRMATION */}

                                <div className="border rounded-3 p-3 mt-4 bg-light">
                                    <h4 className="h6 fw-bold mb-2">
                                        Konfirmasi Perubahan
                                    </h4>

                                    <p className="small text-muted mb-3">
                                        Untuk melindungi data pengguna,
                                        setiap perubahan profil harus
                                        dikonfirmasi menggunakan password
                                        Superadmin yang sedang login.
                                    </p>

                                    {emailChanged && (
                                        <div className="alert alert-warning small">
                                            Email pengguna akan berubah.
                                            Sesi login akun terkait akan
                                            diakhiri oleh sistem.
                                        </div>
                                    )}

                                    <label
                                        htmlFor="admin-profile-password"
                                        className="form-label fw-semibold"
                                    >
                                        Password Superadmin
                                    </label>

                                    <input
                                        id="admin-profile-password"
                                        name="current_password"
                                        type="password"
                                        className="form-control"
                                        autoComplete="current-password"
                                        required={hasChanges}
                                        value={
                                            form.current_password
                                        }
                                        onChange={handleChange}
                                        placeholder="Masukkan password akun Superadmin"
                                    />
                                </div>

                                {/* ACTION BUTTONS */}

                                <div className="d-flex justify-content-end flex-wrap gap-2 mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary px-4"
                                        onClick={resetForm}
                                        disabled={
                                            saving ||
                                            !hasChanges
                                        }
                                    >
                                        Batal
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-danger px-4"
                                        disabled={
                                            saving ||
                                            !hasChanges
                                        }
                                    >
                                        {saving
                                            ? 'Menyimpan...'
                                            : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| MANAJEMEN USER TERPADU
|--------------------------------------------------------------------------
*/

export default function UserManagementHubPage() {
    const [searchParams, setSearchParams] =
        useSearchParams();

    const currentUser = getStoredUser();

    const isSuperadmin =
        currentUser?.role === 'superadmin';

    /*
    |--------------------------------------------------------------------------
    | TAB YANG TERSEDIA
    |--------------------------------------------------------------------------
    */

    const tabs = [
        {
            key: 'users',
            label: 'Daftar User & Hak Akses',
            icon: 'bi-people',
        },

        ...(isSuperadmin
            ? [
                {
                    key: 'profiles',
                    label: 'Edit Profil User',
                    icon: 'bi-pencil-square',
                },
                {
                    key: 'recovery',
                    label: 'Persetujuan Pemulihan',
                    icon: 'bi-shield-check',
                },
            ]
            : []),
    ];

    const requestedTab =
        searchParams.get('tab') || 'users';

    const activeTab = tabs.some(
        (tab) => tab.key === requestedTab
    )
        ? requestedTab
        : 'users';

    /*
    |--------------------------------------------------------------------------
    | HANDLE TAB
    |--------------------------------------------------------------------------
    */

    const handleTabChange = (tab) => {
        if (
            !tabs.some(
                (item) => item.key === tab
            )
        ) {
            return;
        }

        setSearchParams(
            tab === 'users'
                ? {}
                : { tab }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">

            {/* NAVIGATION */}

            <div
                className="border-bottom mb-4"
                role="tablist"
                aria-label="Manajemen User"
            >
                <div className="d-flex flex-wrap gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={
                                activeTab === tab.key
                            }
                            onClick={() =>
                                handleTabChange(tab.key)
                            }
                            className={`btn rounded-0 border-0 border-bottom border-3 px-3 py-3 ${
                                activeTab === tab.key
                                    ? 'border-danger text-danger fw-semibold'
                                    : 'border-transparent text-secondary'
                            }`}
                        >
                            <i
                                className={`bi ${tab.icon} me-2`}
                            />

                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DAFTAR USER */}

            {activeTab === 'users' && (
                <UserManagementPage />
            )}

            {/* EDIT PROFIL */}

            {activeTab === 'profiles' &&
                isSuperadmin && (
                    <UserProfileEditor />
                )}

            {/* PERSETUJUAN PEMULIHAN */}

            {activeTab === 'recovery' &&
                isSuperadmin && (
                    <AdminRecoveryRequestsPage />
                )}

        </div>
    );
}
