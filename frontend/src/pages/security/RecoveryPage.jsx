
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const KEY = 'humas_account_recovery_code';

const QUESTION_OPTIONS = [
    {
        id: 1,
        label: 'Siapa nama guru favorit Anda saat sekolah dasar?',
    },
    {
        id: 2,
        label: 'Apa nama hewan peliharaan pertama Anda?',
    },
    {
        id: 3,
        label: 'Apa nama panggilan Anda semasa kecil?',
    },
    {
        id: 4,
        label: 'Apa judul buku yang paling berkesan bagi Anda?',
    },
    {
        id: 5,
        label: 'Apa makanan favorit Anda semasa kecil?',
    },
    {
        id: 6,
        label: 'Apa nama permainan favorit Anda semasa kecil?',
    },
    {
        id: 7,
        label: 'Siapa karakter fiksi favorit Anda?',
    },
    {
        id: 8,
        label: 'Apa nama sahabat pertama Anda saat sekolah?',
    },
];

const getError = (err) => {
    const first = err?.response?.data?.errors;

    return first
        ? Object.values(first).flat()[0]
        : err?.response?.data?.message ||
              'Permintaan gagal. Silakan coba lagi.';
};

export default function RecoveryPage() {
    const [username, setUsername] = useState('');
    const [questionId, setQuestionId] = useState('');
    const [answer, setAnswer] = useState('');

    const [code, setCode] = useState(
        () => sessionStorage.getItem(KEY) || ''
    );

    const [manualCode, setManualCode] = useState('');
    const [status, setStatus] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const saveCode = (value) => {
        const normalized = value.trim().toLowerCase();

        setCode(normalized);
        setStatus('');

        if (normalized) {
            sessionStorage.setItem(KEY, normalized);
        } else {
            sessionStorage.removeItem(KEY);
        }
    };

    const check = async (target = code) => {
        setBusy(true);
        setError('');

        try {
            const response = await api.post(
                '/account/recovery/status',
                {
                    recovery_code: target,
                }
            );

            setStatus(response.data.data.status);
        } catch (err) {
            setError(getError(err));
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        const saved = sessionStorage.getItem(KEY);

        if (saved) {
            check(saved);
        }

        // Periksa otomatis saat halaman pertama dibuka.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitRequest = async (event) => {
        event.preventDefault();

        setBusy(true);
        setError('');
        setNotice('');

        try {
            const response = await api.post(
                '/account/recovery/request',
                {
                    username: username.trim(),
                    question_id: Number(questionId),
                    answer,
                }
            );

            saveCode(response.data.data.recovery_code);
            setAnswer('');
            setStatus('pending');
            setNotice(response.data.message);
        } catch (err) {
            setError(getError(err));
        } finally {
            setBusy(false);
        }
    };

    const reset = async (event) => {
        event.preventDefault();

        setBusy(true);
        setError('');
        setNotice('');

        try {
            const response = await api.post(
                '/account/recovery/reset',
                {
                    recovery_code: code,
                    password,
                    password_confirmation: confirmation,
                }
            );

            setNotice(response.data.message);
            setPassword('');
            setConfirmation('');

            saveCode('');
            setStatus('completed');

            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        } catch (err) {
            setError(getError(err));
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);

            setNotice(
                'Kode disalin. Simpan secara pribadi, jangan bagikan.'
            );
        } catch {
            setNotice(
                'Salin kode secara manual dari kolom di bawah.'
            );
        }
    };

    return (
        <main
            className="min-vh-100 d-flex align-items-center justify-content-center p-3"
            style={{
                background:
                    'linear-gradient(135deg,#450a0a,#7f1d1d,#111827)',
            }}
        >
            <div
                className="card shadow-lg border-0 rounded-4 w-100"
                style={{ maxWidth: 580 }}
            >
                <div className="card-body p-4 p-lg-5">
                    <div className="text-center mb-4">
                        <i className="bi bi-shield-check text-danger fs-1" />

                        <h1 className="h3 fw-bold mt-2">
                            Pemulihan Akun
                        </h1>

                        <p className="text-muted">
                            HUMAS &amp; SEKPiM — tanpa email
                        </p>
                    </div>

                    {error && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {notice && (
                        <div
                            className="alert alert-info"
                            role="status"
                        >
                            {notice}
                        </div>
                    )}

                    {!code && status !== 'completed' && (
                        <>
                            <p className="small text-muted">
                                Pilih pertanyaan yang sebelumnya Anda
                                atur di Keamanan Akun. Jawaban tidak
                                akan dilihat Superadmin. Persetujuan
                                baru diberikan setelah Superadmin
                                memverifikasi identitas Anda melalui
                                jalur resmi.
                            </p>

                            <form onSubmit={submitRequest}>
                                <div className="mb-3">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="recoverUser"
                                    >
                                        Username
                                    </label>

                                    <input
                                        id="recoverUser"
                                        className="form-control"
                                        required
                                        maxLength={100}
                                        autoComplete="username"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="recoverQuestion"
                                    >
                                        Pertanyaan keamanan
                                    </label>

                                    <select
                                        id="recoverQuestion"
                                        className="form-select"
                                        required
                                        value={questionId}
                                        onChange={(e) =>
                                            setQuestionId(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Pilih pertanyaan yang pernah Anda buat
                                        </option>

                                        {QUESTION_OPTIONS.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="recoverAnswer"
                                    >
                                        Jawaban rahasia
                                    </label>

                                    <input
                                        id="recoverAnswer"
                                        type="password"
                                        className="form-control"
                                        required
                                        maxLength={200}
                                        autoComplete="off"
                                        value={answer}
                                        onChange={(e) =>
                                            setAnswer(e.target.value)
                                        }
                                    />
                                </div>

                                <button
                                    className="btn btn-danger w-100 rounded-pill"
                                    disabled={busy}
                                >
                                    {busy
                                        ? 'Mengirim...'
                                        : 'Ajukan Pemulihan ke Superadmin'}
                                </button>
                            </form>

                            <details className="mt-4 small text-muted">
                                <summary>
                                    Sudah memiliki kode pemulihan?
                                </summary>

                                <input
                                    className="form-control mt-2"
                                    placeholder="Tempel kode 64 karakter"
                                    aria-label="Masukkan kode pemulihan yang tersimpan"
                                    value={manualCode}
                                    onChange={(e) =>
                                        setManualCode(e.target.value)
                                    }
                                />

                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm mt-2"
                                    disabled={
                                        !/^[a-f0-9]{64}$/i.test(
                                            manualCode.trim()
                                        )
                                    }
                                    onClick={() => {
                                        const value = manualCode
                                            .trim()
                                            .toLowerCase();

                                        saveCode(value);
                                        check(value);
                                    }}
                                >
                                    Gunakan Kode Ini
                                </button>
                            </details>
                        </>
                    )}

                    {code && (
                        <>
                            <div className="alert alert-warning small">
                                Simpan kode di bawah sampai proses
                                selesai. Kode hanya berlaku 24 jam,
                                tidak boleh dibagikan, dan digunakan
                                sekali. Jika data keamanan tidak cocok,
                                permintaan tidak akan ditampilkan kepada
                                Superadmin.
                            </div>

                            <label
                                className="form-label fw-semibold"
                                htmlFor="savedRecoverCode"
                            >
                                Kode pemulihan pribadi
                            </label>

                            <div className="input-group mb-3">
                                <input
                                    id="savedRecoverCode"
                                    className="form-control font-monospace"
                                    readOnly
                                    value={code}
                                    type="password"
                                />

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={copy}
                                >
                                    <i className="bi bi-copy me-1" />
                                    Salin
                                </button>
                            </div>

                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                <span className="small">
                                    Status:{' '}
                                    <strong>
                                        {({
                                            pending:
                                                'Menunggu persetujuan',
                                            approved: 'Disetujui',
                                            rejected: 'Ditolak',
                                            expired: 'Kedaluwarsa',
                                            completed: 'Selesai',
                                        })[status] ||
                                            'Belum diperiksa'}
                                    </strong>
                                </span>

                                <button
                                    className="btn btn-outline-danger btn-sm rounded-pill"
                                    disabled={busy}
                                    onClick={() => check()}
                                >
                                    Periksa Status
                                </button>
                            </div>

                            {status === 'approved' && (
                                <form onSubmit={reset}>
                                    <div className="alert alert-success">
                                        Permintaan disetujui. Silakan
                                        buat password baru.
                                    </div>

                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="newPass"
                                    >
                                        Password baru
                                    </label>

                                    <input
                                        id="newPass"
                                        className="form-control mb-2"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        minLength={8}
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                    />

                                    <div className="form-text mb-3">
                                        Minimal 8 karakter, termasuk
                                        huruf besar, kecil, dan angka.
                                    </div>

                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="confirmPass"
                                    >
                                        Konfirmasi password
                                    </label>

                                    <input
                                        id="confirmPass"
                                        className="form-control mb-3"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={confirmation}
                                        onChange={(e) =>
                                            setConfirmation(e.target.value)
                                        }
                                    />

                                    <button
                                        disabled={busy}
                                        className="btn btn-success rounded-pill w-100"
                                    >
                                        Simpan Password Baru
                                    </button>
                                </form>
                            )}

                            {['rejected', 'expired'].includes(status) && (
                                <button
                                    className="btn btn-outline-secondary w-100"
                                    onClick={() => {
                                        saveCode('');
                                        setNotice('');
                                    }}
                                >
                                    Ajukan Ulang
                                </button>
                            )}

                            {status === 'pending' && (
                                <p className="small text-muted">
                                    Hubungi pengelola akun melalui
                                    saluran resmi untuk verifikasi
                                    identitas. Superadmin tidak
                                    memerlukan jawaban ataupun kode
                                    pemulihan Anda.
                                </p>
                            )}
                        </>
                    )}

                    {status === 'completed' && !code && (
                        <div className="alert alert-success">
                            Password baru telah disimpan.
                            Silakan login kembali.
                        </div>
                    )}

                    <div className="text-center mt-4">
                        <Link
                            to="/login"
                            className="text-danger fw-semibold text-decoration-none"
                        >
                            <i className="bi bi-arrow-left me-1" />
                            Kembali ke Login
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
