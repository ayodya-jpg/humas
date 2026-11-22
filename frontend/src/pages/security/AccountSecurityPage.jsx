import { useEffect, useState } from 'react';
import api from '../../api/axios';

const errorMessage = (error) =>
    error?.response?.data?.message ||
    'Permintaan gagal diproses.';

export default function AccountSecurityPage() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        current_password: '',
        question_id: '',
        answer: '',
    });

    const load = async () => {
        try {
            setLoading(true);

            const response = await api.get(
                '/account/security-question'
            );

            setSettings(response.data.data);

            setForm((prev) => ({
                ...prev,
                question_id: String(
                    response.data.data.question_id || ''
                ),
            }));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const submit = async (event) => {
        event.preventDefault();

        setNotice('');
        setError('');

        try {
            setSaving(true);

            const response = await api.post(
                '/account/security-question',
                {
                    ...form,
                    question_id: Number(form.question_id),
                }
            );

            setNotice(response.data.message);

            setForm((prev) => ({
                ...prev,
                answer: '',
                current_password: '',
            }));

            await load();
        } catch (err) {
            const details = err?.response?.data?.errors;

            setError(
                details
                    ? Object.values(details).flat()[0]
                    : errorMessage(err)
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="container-fluid px-0"
            style={{ maxWidth: 920 }}
        >
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div
                    className="p-4 text-white"
                    style={{
                        background:
                            'linear-gradient(125deg,#7f1d1d,#dc2626)',
                    }}
                >
                    <i className="bi bi-shield-lock fs-2" />

                    <h2 className="h4 fw-bold mt-2">
                        Keamanan Akun
                    </h2>

                    <p className="mb-0 opacity-75">
                        Atur pertanyaan pemulihan sebelum lupa password.
                    </p>
                </div>

                <div className="card-body p-4">
                    {notice && (
                        <div
                            className="alert alert-success"
                            role="status"
                        >
                            {notice}
                        </div>
                    )}

                    {error && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <p>Memuat pengaturan...</p>
                    ) : (
                        <>
                            <div
                                className={`alert ${
                                    settings?.configured
                                        ? 'alert-success'
                                        : 'alert-warning'
                                }`}
                            >
                                {settings?.configured
                                    ? 'Pertanyaan keamanan sudah aktif. Anda dapat memperbaruinya.'
                                    : 'Pertanyaan keamanan belum disetel. Pemulihan tanpa email belum dapat digunakan.'}
                            </div>

                            <p className="text-muted small">
                                Pilih pertanyaan yang jawabannya sulit
                                ditebak orang lain. Jawaban disimpan
                                sebagai hash, bukan teks asli. Setelah
                                mengirim jawaban saat lupa password,
                                permintaan tetap harus disetujui
                                Superadmin setelah verifikasi identitas.
                            </p>

                            <form onSubmit={submit}>
                                <div className="mb-3">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="secQuestion"
                                    >
                                        Pertanyaan keamanan
                                    </label>

                                    <select
                                        id="secQuestion"
                                        className="form-select"
                                        required
                                        value={form.question_id}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                question_id:
                                                    e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">
                                            Pilih pertanyaan
                                        </option>

                                        {(settings?.questions || []).map(
                                            (item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="secAnswer"
                                    >
                                        Jawaban rahasia
                                    </label>

                                    <input
                                        id="secAnswer"
                                        type="password"
                                        className="form-control"
                                        required
                                        minLength={8}
                                        maxLength={200}
                                        autoComplete="off"
                                        placeholder="Minimal 8 karakter"
                                        value={form.answer}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                answer: e.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div className="mb-4">
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="secPassword"
                                    >
                                        Password akun saat ini
                                    </label>

                                    <input
                                        id="secPassword"
                                        type="password"
                                        className="form-control"
                                        required
                                        autoComplete="current-password"
                                        value={form.current_password}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                current_password:
                                                    e.target.value,
                                            }))
                                        }
                                    />

                                    <div className="form-text">
                                        Diperlukan untuk memastikan pemilik
                                        akun yang mengubah pengaturan.
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-danger rounded-pill px-4"
                                >
                                    {saving
                                        ? 'Menyimpan...'
                                        : 'Simpan Pertanyaan Keamanan'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
