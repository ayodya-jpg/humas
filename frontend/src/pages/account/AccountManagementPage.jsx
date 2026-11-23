import {
    useEffect,
    useState,
} from 'react';

import api, {
    clearLocalSession,
} from '../../api/axios';

import AccountSecurityPage from '../security/AccountSecurityPage';

const EMPTY_PROFILE = {
    name: '',
    username: '',
    email: '',
    phone_number: '',
    unit_name: '',
    job_title: '',
    role: '',
    current_password: '',
};

const PROFILE_FIELDS = [
    {
        name: 'name',
        label: 'Nama lengkap',
        type: 'text',
        required: true,
        maxLength: 255,
        placeholder: 'Masukkan nama lengkap',
    },
    {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        maxLength: 255,
        placeholder: 'nama@domain.com',
    },
    {
        name: 'phone_number',
        label: 'Nomor HP / WhatsApp',
        type: 'tel',
        maxLength: 30,
        placeholder: 'Contoh: 081234567890',
    },
    {
        name: 'unit_name',
        label: 'Unit kerja / Bagian',
        type: 'text',
        maxLength: 150,
        placeholder: 'Contoh: HUMAS',
    },
    {
        name: 'job_title',
        label: 'Jabatan',
        type: 'text',
        maxLength: 150,
        placeholder: 'Contoh: Staf Administrasi',
    },
];

const ROLE_LABELS = {
    user: 'User',
    admin: 'Admin',
    admin_humas: 'Admin HUMAS',
    admin_sekpim: 'Admin SEKPiM',
    superadmin: 'Superadmin',
};

function getErrorMessage(error) {
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
        'Terjadi kesalahan. Silakan coba kembali.'
    );
}

function normalizeProfile(data = {}) {
    return {
        name: String(data.name ?? ''),
        username: String(data.username ?? ''),
        email: String(data.email ?? ''),
        phone_number: String(data.phone_number ?? ''),
        unit_name: String(data.unit_name ?? ''),
        job_title: String(data.job_title ?? ''),
        role: String(data.role ?? ''),
        current_password: '',
    };
}

export default function AccountManagementPage() {
    const [activeTab, setActiveTab] = useState('profile');

    const [form, setForm] = useState(
        EMPTY_PROFILE
    );

    const [originalProfile, setOriginalProfile] = useState(
        EMPTY_PROFILE
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [profileLoaded, setProfileLoaded] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | LOAD PROFILE
    |--------------------------------------------------------------------------
    */

    const loadProfile = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get(
                '/account/profile'
            );

            const profile = normalizeProfile(
                response?.data?.data
            );

            setForm(profile);
            setOriginalProfile(profile);
            setProfileLoaded(true);
        } catch (err) {
            setError(getErrorMessage(err));
            setProfileLoaded(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        const fetchInitialProfile = async () => {
            try {
                const response = await api.get(
                    '/account/profile'
                );

                if (!active) {
                    return;
                }

                const profile = normalizeProfile(
                    response?.data?.data
                );

                setForm(profile);
                setOriginalProfile(profile);
                setProfileLoaded(true);
            } catch (err) {
                if (!active) {
                    return;
                }

                setError(getErrorMessage(err));
                setProfileLoaded(false);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchInitialProfile();

        return () => {
            active = false;
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | HANDLE INPUT
    |--------------------------------------------------------------------------
    */

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (error) {
            setError('');
        }

        if (success) {
            setSuccess('');
        }
    };

    /*
    |--------------------------------------------------------------------------
    | DETEKSI PERUBAHAN PROFIL
    |--------------------------------------------------------------------------
    */

    const editableFields = [
        'name',
        'email',
        'phone_number',
        'unit_name',
        'job_title',
    ];

    const hasChanges = editableFields.some(
        (field) =>
            String(form[field] ?? '').trim() !==
            String(originalProfile[field] ?? '').trim()
    );

    const emailChanged =
        form.email.trim().toLowerCase() !==
        originalProfile.email.trim().toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | RESET FORM
    |--------------------------------------------------------------------------
    */

    const handleReset = () => {
        setForm({
            ...originalProfile,
            current_password: '',
        });

        setError('');
        setSuccess('');
    };

    /*
    |--------------------------------------------------------------------------
    | SINKRONISASI DATA USER DI LOCAL STORAGE
    |--------------------------------------------------------------------------
    |
    | Data di localStorage hanya digunakan
    | untuk memperbarui tampilan.
    |
    | Hak akses tetap ditentukan oleh Laravel.
    |
    */

    const updateStoredUser = (profile) => {
        try {
            const raw = localStorage.getItem(
                'admin_user'
            );

            if (!raw) {
                return;
            }

            const currentUser = JSON.parse(raw);

            if (
                !currentUser ||
                typeof currentUser !== 'object'
            ) {
                return;
            }

            const updatedUser = {
                ...currentUser,

                name: profile.name,
                email: profile.email,

                phone_number: profile.phone_number,
                unit_name: profile.unit_name,
                job_title: profile.job_title,
            };

            localStorage.setItem(
                'admin_user',
                JSON.stringify(updatedUser)
            );
        } catch (err) {
            console.error(
                'Gagal menyinkronkan tampilan profil:',
                err
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE PROFILE
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving || !hasChanges) {
            return;
        }

        setError('');
        setSuccess('');

        if (!form.name.trim()) {
            setError('Nama lengkap wajib diisi.');
            return;
        }

        if (form.name.trim().length < 3) {
            setError(
                'Nama lengkap minimal 3 karakter.'
            );
            return;
        }

        if (!form.email.trim()) {
            setError('Email wajib diisi.');
            return;
        }

        if (!form.current_password) {
            setError(
                'Masukkan password saat ini untuk menyimpan perubahan.'
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
                '/account/profile',
                payload
            );

            const result = response?.data;

            if (result?.success !== true) {
                throw new Error(
                    result?.message ||
                    'Perubahan profil gagal disimpan.'
                );
            }

            const updatedProfile = normalizeProfile(
                result.data
            );

            /*
             * Backend mencabut seluruh token
             * jika email berubah.
             *
             * Karena token sudah tidak valid,
             * user harus login ulang.
             */

            if (result.session_revoked === true) {
                clearLocalSession();

                window.location.replace(
                    '/login'
                );

                return;
            }

            /*
             * Perbarui tampilan lokal setelah
             * perubahan berhasil disimpan.
             */

            updateStoredUser(updatedProfile);

            setForm(updatedProfile);
            setOriginalProfile(updatedProfile);

            setSuccess(
                result.message ||
                'Profil berhasil diperbarui.'
            );

            /*
             * Informasikan komponen lain bahwa
             * profil telah diperbarui.
             */

            window.dispatchEvent(
                new CustomEvent(
                    'humas:profile:updated',
                    {
                        detail: {
                            name: updatedProfile.name,
                        },
                    }
                )
            );
        } catch (err) {
            setError(
                getErrorMessage(err)
            );
        } finally {
            setSaving(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | TAB NAVIGATION
    |--------------------------------------------------------------------------
    */

    const changeTab = (tab) => {
        setActiveTab(tab);
        setError('');
        setSuccess('');
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <div
            className="container-fluid px-0"
            style={{
                maxWidth: 1100,
            }}
        >
            {/* HEADER */}

            <div className="mb-4">
                <h2 className="h4 fw-bold mb-2">
                    Manajemen Akun
                </h2>

                <p className="text-muted mb-0">
                    Kelola informasi profil dan
                    pengaturan keamanan akun Anda.
                </p>
            </div>

            {/* NAVIGATION */}

            <div
                className="border-bottom mb-4"
                role="tablist"
                aria-label="Pengaturan akun"
            >
                <div className="d-flex flex-wrap gap-1">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={
                            activeTab === 'profile'
                        }
                        onClick={() =>
                            changeTab('profile')
                        }
                        className={`btn rounded-0 border-0 border-bottom border-3 px-3 py-3 ${
                            activeTab === 'profile'
                                ? 'border-danger text-danger fw-semibold'
                                : 'border-transparent text-secondary'
                        }`}
                    >
                        <i className="bi bi-person-lines-fill me-2" />
                        Profil Saya
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={
                            activeTab === 'security'
                        }
                        onClick={() =>
                            changeTab('security')
                        }
                        className={`btn rounded-0 border-0 border-bottom border-3 px-3 py-3 ${
                            activeTab === 'security'
                                ? 'border-danger text-danger fw-semibold'
                                : 'border-transparent text-secondary'
                        }`}
                    >
                        <i className="bi bi-shield-lock me-2" />
                        Keamanan Akun
                    </button>
                </div>
            </div>

            {/* SECURITY TAB */}

            {activeTab === 'security' && (
                <AccountSecurityPage />
            )}

            {/* PROFILE TAB */}

            {activeTab === 'profile' && (
                <div className="card border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 p-lg-5">

                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                            <div>
                                <h3 className="h5 fw-bold mb-1">
                                    Informasi Pribadi
                                </h3>

                                <p className="text-muted small mb-0">
                                    Perbarui identitas dan informasi kontak Anda.
                                </p>
                            </div>

                            <span className="badge text-bg-light border px-3 py-2">
                                <i className="bi bi-person-check me-2" />
                                Profil Akun
                            </span>
                        </div>

                        {/* ERROR */}

                        {error && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                <i className="bi bi-exclamation-circle me-2" />
                                {error}
                            </div>
                        )}

                        {/* SUCCESS */}

                        {success && (
                            <div
                                className="alert alert-success"
                                role="status"
                            >
                                <i className="bi bi-check-circle me-2" />
                                {success}
                            </div>
                        )}

                        {/* LOADING */}

                        {loading && (
                            <div className="py-5 text-center">
                                <div
                                    className="spinner-border text-danger"
                                    role="status"
                                >
                                    <span className="visually-hidden">
                                        Memuat...
                                    </span>
                                </div>

                                <p className="text-muted mt-3 mb-0">
                                    Memuat informasi akun...
                                </p>
                            </div>
                        )}

                        {/* RETRY */}

                        {!loading && !profileLoaded && (
                            <div className="text-center py-4">
                                <p className="text-muted">
                                    Profil belum berhasil dimuat.
                                </p>

                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={loadProfile}
                                >
                                    <i className="bi bi-arrow-clockwise me-2" />
                                    Coba Lagi
                                </button>
                            </div>
                        )}

                        {/* PROFILE FORM */}

                        {!loading && profileLoaded && (
                            <form onSubmit={handleSubmit}>

                                {/* ACCOUNT IDENTITY */}

                                <div className="row g-3 mb-4">

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="account-username"
                                            className="form-label fw-semibold"
                                        >
                                            Username
                                        </label>

                                        <input
                                            id="account-username"
                                            type="text"
                                            className="form-control bg-light"
                                            value={form.username}
                                            readOnly
                                        />

                                        <div className="form-text">
                                            Username dikelola oleh Superadmin.
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label
                                            htmlFor="account-role"
                                            className="form-label fw-semibold"
                                        >
                                            Role Akun
                                        </label>

                                        <input
                                            id="account-role"
                                            type="text"
                                            className="form-control bg-light"
                                            value={
                                                ROLE_LABELS[form.role] ||
                                                form.role
                                            }
                                            readOnly
                                        />

                                        <div className="form-text">
                                            Hak akses tidak dapat diubah sendiri.
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-4" />

                                {/* EDITABLE PROFILE */}

                                <h4 className="h6 fw-bold mb-3">
                                    Data Profil
                                </h4>

                                <div className="row g-3">
                                    {PROFILE_FIELDS.map((field) => (
                                        <div
                                            className="col-md-6"
                                            key={field.name}
                                        >
                                            <label
                                                htmlFor={`account-${field.name}`}
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
                                                id={`account-${field.name}`}
                                                name={field.name}
                                                type={field.type}
                                                className="form-control"
                                                required={
                                                    Boolean(field.required)
                                                }
                                                minLength={
                                                    field.name === 'name'
                                                        ? 3
                                                        : undefined
                                                }
                                                maxLength={
                                                    field.maxLength
                                                }
                                                placeholder={
                                                    field.placeholder
                                                }
                                                value={
                                                    form[field.name]
                                                }
                                                onChange={handleChange}
                                                autoComplete={
                                                    field.name === 'name'
                                                        ? 'name'
                                                        : field.name === 'email'
                                                            ? 'email'
                                                            : field.name === 'phone_number'
                                                                ? 'tel'
                                                                : 'off'
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* SECURITY CONFIRMATION */}

                                <div className="mt-4 p-3 border rounded-3 bg-light">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="bi bi-lock text-secondary" />

                                        <h4 className="h6 fw-bold mb-0">
                                            Konfirmasi Keamanan
                                        </h4>
                                    </div>

                                    <p className="small text-muted mb-3">
                                        Masukkan password akun saat ini
                                        untuk mengonfirmasi perubahan profil.
                                    </p>

                                    {emailChanged && (
                                        <div className="alert alert-warning small">
                                            Perubahan email akan mengakhiri
                                            seluruh sesi login akun ini.
                                            Anda harus login ulang setelah
                                            perubahan berhasil.
                                        </div>
                                    )}

                                    <label
                                        htmlFor="account-current-password"
                                        className="form-label fw-semibold"
                                    >
                                        Password Saat Ini
                                    </label>

                                    <input
                                        id="account-current-password"
                                        name="current_password"
                                        type="password"
                                        className="form-control"
                                        required={hasChanges}
                                        autoComplete="current-password"
                                        value={form.current_password}
                                        onChange={handleChange}
                                        placeholder="Masukkan password akun"
                                    />

                                    <div className="form-text">
                                        Password hanya digunakan untuk
                                        verifikasi dan tidak ditampilkan
                                        kembali oleh server.
                                    </div>
                                </div>

                                {/* ACTIONS */}

                                <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">

                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-pill px-4"
                                        onClick={handleReset}
                                        disabled={
                                            saving ||
                                            !hasChanges
                                        }
                                    >
                                        Batal
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-danger rounded-pill px-4"
                                        disabled={
                                            saving ||
                                            !hasChanges
                                        }
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check2-circle me-2" />
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </button>

                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
