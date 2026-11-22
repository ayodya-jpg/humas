
import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import api from '../../api/axios';

import {
    getStoredUser,
} from '../../components/ProtectedRoute';

export default function AdminRecoveryRequestsPage() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [notes, setNotes] = useState({});
    const [verified, setVerified] = useState({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const currentUser = getStoredUser();

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const response = await api.get(
                '/admin/recovery-requests'
            );

            setRecords(response.data.data || []);
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    'Data pemulihan gagal dimuat.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const decide = async (id, action) => {
        if (
            (
                action === 'approve' &&
                !verified[id]
            ) ||
            (notes[id] || '').trim().length < 15
        ) {
            setError(
                'Sebelum menyetujui, verifikasi identitas dan isi catatan minimal 15 karakter. Penolakan memerlukan catatan.'
            );
            return;
        }

        if (
            !window.confirm(
                action === 'approve'
                    ? 'Identitas telah diverifikasi secara independen. Setujui pemulihan akun?'
                    : 'Tolak permintaan pemulihan akun ini?'
            )
        ) {
            return;
        }

        setError('');
        setMessage('');
        setBusy(id);

        try {
            const response = await api.post(
                `/admin/recovery-requests/${id}/decide`,
                {
                    action,
                    identity_verified:
                        action === 'approve' &&
                        Boolean(verified[id]),
                    note: notes[id].trim(),
                }
            );

            setMessage(response.data.message);

            await load();
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    'Keputusan gagal disimpan.'
            );
        } finally {
            setBusy('');
        }
    };

    return (
        <div className="container-fluid px-0">
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                    <div className="d-flex justify-content-between flex-wrap gap-3 mb-3">
                        <div>
                            <h2 className="h4 fw-bold">
                                Persetujuan Pemulihan Akun
                            </h2>

                            <p className="text-muted mb-0">
                                Khusus Superadmin. Tidak ada jawaban
                                rahasia atau kode pemulihan yang
                                ditampilkan.
                            </p>
                        </div>

                        <button
                            className="btn btn-outline-danger rounded-pill"
                            onClick={load}
                            disabled={loading}
                        >
                            Muat Ulang
                        </button>
                    </div>

                    <div className="alert alert-warning small">
                        <strong>
                            Wajib verifikasi identitas di luar aplikasi
                        </strong>{' '}
                        melalui saluran resmi kampus yang sudah
                        dikenal. Jangan menerima kode pemulihan
                        atau jawaban rahasia dari pemohon.
                        Jangan menyetujui hanya berdasarkan jawaban
                        pertanyaan keamanan.
                    </div>

                    {message && (
                        <div
                            className="alert alert-success"
                            role="status"
                        >
                            {message}
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

                    {loading && (
                        <p className="text-muted">
                            Memuat data...
                        </p>
                    )}

                    {!loading && records.length === 0 && (
                        <p className="text-muted">
                            Belum ada permintaan pemulihan.
                        </p>
                    )}

                    <div className="d-grid gap-3">
                        {records.map((item) => {
                            const pending =
                                item.status === 'pending';

                            const own =
                                Number(item.user_id) ===
                                Number(currentUser.id);

                            return (
                                <div
                                    key={item.id}
                                    className="border rounded-4 p-3"
                                >
                                    <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                                        <div>
                                            <div className="fw-bold">
                                                {item.name}{' '}
                                                <span className="text-muted">
                                                    (@{item.username})
                                                </span>
                                            </div>

                                            <div className="small text-muted">
                                                Role: {item.role}
                                                {' · '}
                                                Diajukan:{' '}
                                                {new Date(
                                                    item.created_at
                                                ).toLocaleString('id-ID')}
                                            </div>
                                        </div>

                                        <span
                                            className={`badge align-self-start ${
                                                pending
                                                    ? 'bg-warning text-dark'
                                                    : 'bg-secondary'
                                            }`}
                                        >
                                            {pending
                                                ? 'Menunggu'
                                                : item.status}
                                        </span>
                                    </div>

                                    {item.review_note && (
                                        <p className="small mb-1">
                                            Catatan: {item.review_note}
                                        </p>
                                    )}

                                    {item.reviewed_by_name && (
                                        <p className="small text-muted">
                                            Diproses oleh:{' '}
                                            {item.reviewed_by_name}
                                        </p>
                                    )}

                                    {pending && !own && (
                                        <>
                                            <label className="form-label fw-semibold small">
                                                Catatan verifikasi
                                                identitas
                                            </label>

                                            <textarea
                                                className="form-control mb-2"
                                                rows={2}
                                                minLength={15}
                                                maxLength={2000}
                                                placeholder="Contoh: Sudah diverifikasi melalui prosedur resmi administrasi akun..."
                                                value={
                                                    notes[item.id] || ''
                                                }
                                                onChange={(e) =>
                                                    setNotes((p) => ({
                                                        ...p,
                                                        [item.id]:
                                                            e.target.value,
                                                    }))
                                                }
                                            />

                                            <label className="form-check mb-3">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={Boolean(
                                                        verified[item.id]
                                                    )}
                                                    onChange={(e) =>
                                                        setVerified((p) => ({
                                                            ...p,
                                                            [item.id]:
                                                                e.target.checked,
                                                        }))
                                                    }
                                                />

                                                <span className="form-check-label small">
                                                    Saya telah memverifikasi
                                                    identitas pemohon melalui
                                                    saluran resmi, terpisah
                                                    dari jawaban pertanyaan
                                                    keamanan.
                                                </span>
                                            </label>

                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-success rounded-pill"
                                                    disabled={
                                                        busy === item.id
                                                    }
                                                    onClick={() =>
                                                        decide(
                                                            item.id,
                                                            'approve'
                                                        )
                                                    }
                                                >
                                                    Setujui
                                                </button>

                                                <button
                                                    className="btn btn-outline-danger rounded-pill"
                                                    disabled={
                                                        busy === item.id
                                                    }
                                                    onClick={() =>
                                                        decide(
                                                            item.id,
                                                            'reject'
                                                        )
                                                    }
                                                >
                                                    Tolak
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {own && pending && (
                                        <p className="text-danger small mb-0">
                                            Tidak dapat menyetujui
                                            pemulihan akun sendiri.
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
