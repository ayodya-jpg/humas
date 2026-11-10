
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const DIRECTORATES = [
    { value: 'direktorat', label: 'Direktorat Bersama' },
    { value: 'direktur', label: 'Direktur' },
    { value: 'wakil_direktur_1', label: 'Wakil Direktur I' },
    { value: 'wakil_direktur_2', label: 'Wakil Direktur II' },
];

const EMPTY_MEETING = {
    event_schedule_id: '',
    title: '',
    directorate: 'direktorat',
    meeting_date: '',
    realization_status: 'held',
    participants_count: '0',
    notes: '',
    decisions: '',
    follow_up: '',
    follow_up_pic: '',
    follow_up_due_date: '',
};

const dateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const initialPeriod = () => {
    const today = new Date();
    return {
        start_date: `${today.getFullYear()}-01-01`,
        end_date: dateLocal(today),
    };
};

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    error?.message ||
    'Terjadi kesalahan.';

const formatNumber = (value) =>
    Number(value || 0).toLocaleString('id-ID');

const directorateLabel = (value) =>
    DIRECTORATES.find((item) => item.value === value)?.label || value;

const kpiItems = [
    { key: 'total_requests', label: 'Total Pengajuan', icon: 'bi-files', color: 'primary' },
    { key: 'pending', label: 'Menunggu', icon: 'bi-hourglass-split', color: 'warning' },
    { key: 'processed', label: 'Diproses', icon: 'bi-check-circle', color: 'success' },
    { key: 'agendas', label: 'Agenda Direktorat', icon: 'bi-calendar-event', color: 'info' },
    { key: 'meetings_held', label: 'Rapat Terlaksana', icon: 'bi-people', color: 'success' },
    { key: 'meetings_cancelled', label: 'Rapat Dibatalkan', icon: 'bi-calendar-x', color: 'danger' },
];

export default function UnifiedAnalyticsPanel() {
    const [draftPeriod, setDraftPeriod] = useState(initialPeriod);
    const [period, setPeriod] = useState(initialPeriod);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [meeting, setMeeting] = useState(EMPTY_MEETING);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get('/unified-analytics', {
                params: period,
            });

            setData(response?.data?.data || null);
        } catch (err) {
            setError(getError(err));
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const applyPeriod = (event) => {
        event.preventDefault();

        if (
            draftPeriod.start_date > draftPeriod.end_date ||
            draftPeriod.start_date.slice(0, 4) !==
                draftPeriod.end_date.slice(0, 4)
        ) {
            setError('Pilih tanggal mulai dan selesai dalam satu tahun yang sama.');
            return;
        }

        setError('');
        setPeriod({ ...draftPeriod });
    };

    const exportExcel = async () => {
        if (exporting) return;

        try {
            setExporting(true);
            setError('');

            const response = await api.get('/unified-analytics/export', {
                params: period,
                responseType: 'blob',
                timeout: 120000,
            });

            const blob = new Blob(
                [response.data],
                {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }
            );

            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');

            anchor.href = downloadUrl;
            anchor.download =
                `Analytics_HUMAS_SEKPIM_${period.start_date}_sd_${period.end_date}.xlsx`;

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            window.setTimeout(
                () => window.URL.revokeObjectURL(downloadUrl),
                1000
            );
        } catch (err) {
            setError(getError(err));
        } finally {
            setExporting(false);
        }
    };

    const startCreate = () => {
        setEditingId(null);
        setMeeting({
            ...EMPTY_MEETING,
            meeting_date: dateLocal(new Date()),
        });
        setMessage('');
        setShowForm(true);
    };

    const startEdit = (record) => {
        setEditingId(record.id);

        setMeeting({
            event_schedule_id: record.event_schedule_id
                ? String(record.event_schedule_id)
                : '',
            title: record.title || '',
            directorate: record.directorate || 'direktorat',
            meeting_date: String(record.meeting_date || '').slice(0, 10),
            realization_status: record.realization_status || 'held',
            participants_count: String(record.participants_count ?? 0),
            notes: record.notes || '',
            decisions: record.decisions || '',
            follow_up: record.follow_up || '',
            follow_up_pic: record.follow_up_pic || '',
            follow_up_due_date: String(
                record.follow_up_due_date || ''
            ).slice(0, 10),
        });

        setShowForm(true);
        setMessage('');
    };

    const setField = (field, value) => {
        setMeeting((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const chooseAgenda = (value) => {
        const agenda = (data?.available_agendas || [])
            .find((item) => String(item.id) === String(value));

        setMeeting((previous) => ({
            ...previous,
            event_schedule_id: value,
            title: agenda?.title || previous.title,
            directorate: agenda?.directorate || previous.directorate,
            meeting_date: agenda?.event_date || previous.meeting_date,
        }));
    };

    const saveMeeting = async (event) => {
        event.preventDefault();
        if (saving) return;

        if (
            !meeting.title.trim() ||
            !meeting.meeting_date ||
            !Number.isInteger(Number(meeting.participants_count)) ||
            Number(meeting.participants_count) < 0
        ) {
            setError('Periksa judul, tanggal, dan jumlah peserta rapat.');
            return;
        }

        const payload = {
            ...meeting,
            event_schedule_id: meeting.event_schedule_id
                ? Number(meeting.event_schedule_id)
                : null,
            title: meeting.title.trim(),
            participants_count: Number(meeting.participants_count),
            notes: meeting.notes.trim() || null,
            decisions: meeting.decisions.trim() || null,
            follow_up: meeting.follow_up.trim() || null,
            follow_up_pic: meeting.follow_up_pic.trim() || null,
            follow_up_due_date: meeting.follow_up_due_date || null,
        };

        try {
            setSaving(true);
            setError('');

            if (editingId) {
                await api.put(
                    `/unified-analytics/meetings/${editingId}`,
                    payload
                );
            } else {
                await api.post(
                    '/unified-analytics/meetings',
                    payload
                );
            }

            setShowForm(false);
            setEditingId(null);
            setMessage('Catatan rapat berhasil disimpan.');
            await loadAnalytics();
        } catch (err) {
            setError(getError(err));
        } finally {
            setSaving(false);
        }
    };

    const deleteMeeting = async (record) => {
        if (deletingId !== null) return;

        if (!window.confirm(
            `Hapus catatan rapat "${record.title}"?`
        )) return;

        try {
            setDeletingId(record.id);
            setError('');

            await api.delete(
                `/unified-analytics/meetings/${record.id}`
            );

            setMessage('Catatan rapat berhasil dihapus.');
            await loadAnalytics();
        } catch (err) {
            setError(getError(err));
        } finally {
            setDeletingId(null);
        }
    };

    const maxTrend = useMemo(() => {
        const values = (data?.trend || []).flatMap((item) => [
            Number(item.current || 0),
            Number(item.previous || 0),
        ]);

        return Math.max(1, ...values);
    }, [data]);

    return (
        <section className="mt-4 mb-5">
            <div
                className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3"
                style={{
                    background:
                        'linear-gradient(115deg,#7f1d1d,#0f172a)',
                }}
            >
                <div className="card-body p-4 text-white">
                    <div className="d-flex justify-content-between flex-wrap gap-3">
                        <div>
                            <span className="badge bg-white text-danger rounded-pill mb-2">
                                ANALYTICS TERINTEGRASI
                            </span>

                            <h3 className="fw-bold mb-1">
                                Rekap Seluruh Layanan HUMAS &amp; SEKPiM
                            </h3>

                            <p className="small opacity-75 mb-0">
                                Laporan layanan, aktivitas Direktorat,
                                realisasi rapat, dan perbandingan tahunan.
                            </p>
                        </div>

                        <div className="d-flex align-items-start gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-light text-danger fw-semibold rounded-pill"
                                onClick={startCreate}
                            >
                                <i className="bi bi-plus-lg me-2" />
                                Catat Rapat
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-light rounded-pill"
                                disabled={exporting || loading}
                                onClick={exportExcel}
                            >
                                <i className="bi bi-file-earmark-excel me-2" />
                                {exporting
                                    ? 'Membuat Excel...'
                                    : 'Export Seluruh Layanan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-3">
                <div className="card-body p-3 p-lg-4">
                    <form onSubmit={applyPeriod}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">
                                    Tanggal Mulai
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    required
                                    value={draftPeriod.start_date}
                                    onChange={(e) =>
                                        setDraftPeriod((previous) => ({
                                            ...previous,
                                            start_date: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">
                                    Tanggal Selesai
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    required
                                    value={draftPeriod.end_date}
                                    onChange={(e) =>
                                        setDraftPeriod((previous) => ({
                                            ...previous,
                                            end_date: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="col-md-4 d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-danger flex-grow-1"
                                >
                                    <i className="bi bi-funnel me-2" />
                                    Terapkan
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    title="Refresh data"
                                    onClick={loadAnalytics}
                                >
                                    <i className="bi bi-arrow-clockwise" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger rounded-4">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {error}
                </div>
            )}

            {message && (
                <div className="alert alert-success rounded-4">
                    <i className="bi bi-check-circle me-2" />
                    {message}
                </div>
            )}

            {loading && !data ? (
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                    <div>
                        <span className="spinner-border text-danger" />
                    </div>
                    <p className="text-muted mt-2 mb-0">
                        Memuat analytics seluruh layanan...
                    </p>
                </div>
            ) : data && (
                <>
                    <div className="row g-3 mb-3">
                        {kpiItems.map((item) => (
                            <div
                                className="col-md-6 col-xl-4"
                                key={item.key}
                            >
                                <div className="card border-0 shadow-sm rounded-4 h-100">
                                    <div className="card-body p-3 d-flex align-items-center gap-3">
                                        <div className={`rounded-3 bg-${item.color}-subtle text-${item.color} p-3`}>
                                            <i className={`bi ${item.icon} fs-4`} />
                                        </div>

                                        <div>
                                            <div className="small text-muted">
                                                {item.label}
                                            </div>
                                            <div className="fs-3 fw-bold">
                                                {formatNumber(
                                                    data.summary?.[item.key]
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-body p-3 p-lg-4">
                            <h5 className="fw-bold mb-1">
                                Perbandingan Year-on-Year
                            </h5>

                            <p className="small text-muted mb-3">
                                {data.period.previous_start}
                                {' s.d. '}
                                {data.period.previous_end}
                                {' dibanding '}
                                {data.period.start_date}
                                {' s.d. '}
                                {data.period.end_date}
                            </p>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Layanan</th>
                                            <th className="text-end">
                                                {data.period.previous_year}
                                            </th>
                                            <th className="text-end">
                                                {data.period.current_year}
                                            </th>
                                            <th className="text-end">
                                                Selisih
                                            </th>
                                            <th className="text-end">
                                                YoY
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(data.yoy || []).map((item) => (
                                            <tr key={item.service}>
                                                <td className="fw-semibold">
                                                    {item.label}
                                                </td>
                                                <td className="text-end">
                                                    {formatNumber(item.previous)}
                                                </td>
                                                <td className="text-end">
                                                    {formatNumber(item.current)}
                                                </td>
                                                <td className="text-end">
                                                    {item.difference > 0 ? '+' : ''}
                                                    {formatNumber(item.difference)}
                                                </td>
                                                <td className="text-end">
                                                    {item.growth_percent === null ? (
                                                        <span className="text-muted">
                                                            N/A
                                                        </span>
                                                    ) : (
                                                        <span className={`badge ${
                                                            item.growth_percent >= 0
                                                                ? 'bg-success-subtle text-success'
                                                                : 'bg-danger-subtle text-danger'
                                                        }`}>
                                                            {item.growth_percent > 0 ? '+' : ''}
                                                            {item.growth_percent}%
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="small text-muted">
                                N/A berarti tahun pembanding bernilai 0,
                                sehingga persentase pertumbuhan tidak dapat dihitung.
                                Pengajuan jadwal dan agenda dihitung sebagai
                                indikator berbeda, bukan dijumlahkan sebagai
                                satu transaksi.
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-body p-3 p-lg-4">
                            <h5 className="fw-bold mb-1">
                                Tren Aktivitas Bulanan
                            </h5>
                            <p className="small text-muted">
                                Perbandingan jumlah aktivitas tercatat
                                berdasarkan kategori pada periode yang dipilih.
                            </p>

                            <div className="d-flex gap-4 small mb-3">
                                <span>
                                    <i className="bi bi-square-fill text-secondary me-2" />
                                    {data.period.previous_year}
                                </span>
                                <span>
                                    <i className="bi bi-square-fill text-danger me-2" />
                                    {data.period.current_year}
                                </span>
                            </div>

                            <div className="d-flex gap-2 align-items-end overflow-auto pb-2" style={{ minHeight: 190 }}>
                                {(data.trend || []).map((item) => (
                                    <div
                                        key={item.month}
                                        className="flex-fill text-center"
                                        style={{ minWidth: 44 }}
                                    >
                                        <div
                                            className="d-flex justify-content-center align-items-end gap-1"
                                            style={{ height: 140 }}
                                        >
                                            <div
                                                className="bg-secondary rounded-top"
                                                title={`${data.period.previous_year}: ${item.previous}`}
                                                style={{
                                                    width: 15,
                                                    height: `${Math.max(2, Number(item.previous) / maxTrend * 135)}px`,
                                                    opacity: 0.55,
                                                }}
                                            />
                                            <div
                                                className="bg-danger rounded-top"
                                                title={`${data.period.current_year}: ${item.current}`}
                                                style={{
                                                    width: 15,
                                                    height: `${Math.max(2, Number(item.current) / maxTrend * 135)}px`,
                                                }}
                                            />
                                        </div>
                                        <div className="small text-muted mt-2">
                                            {item.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-body p-3 p-lg-4">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="fw-bold mb-1">
                                        Pencatatan Rapat
                                    </h5>
                                    <p className="small text-muted mb-0">
                                        Catatan realisasi, keputusan, dan tindak lanjut rapat Direktorat.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-danger rounded-pill"
                                    onClick={startCreate}
                                >
                                    <i className="bi bi-plus-lg me-2" />
                                    Catat Rapat
                                </button>
                            </div>

                            {(data.meeting_records || []).length === 0 ? (
                                <div className="bg-light p-4 rounded-4 text-center text-muted">
                                    Belum ada catatan rapat pada periode ini.
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Tanggal</th>
                                                <th>Judul Rapat</th>
                                                <th>Direktorat</th>
                                                <th>Status</th>
                                                <th>Peserta</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.meeting_records.map((record) => (
                                                <tr key={record.id}>
                                                    <td>
                                                        {String(record.meeting_date).slice(0, 10)}
                                                    </td>
                                                    <td className="fw-semibold">
                                                        {record.title}
                                                    </td>
                                                    <td>
                                                        {directorateLabel(record.directorate)}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${
                                                            record.realization_status === 'held'
                                                                ? 'text-bg-success'
                                                                : record.realization_status === 'postponed'
                                                                  ? 'text-bg-warning'
                                                                  : 'text-bg-danger'
                                                        }`}>
                                                            {{
                                                                held: 'Terlaksana',
                                                                postponed: 'Ditunda',
                                                                cancelled: 'Dibatalkan',
                                                            }[record.realization_status]}
                                                        </span>
                                                    </td>
                                                    <td>{record.participants_count}</td>
                                                    <td>
                                                        <div className="d-flex gap-1">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => startEdit(record)}
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                disabled={deletingId !== null}
                                                                onClick={() => deleteMeeting(record)}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {showForm && (
                <div
                    className="modal fade show d-block"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Form Pencatatan Rapat"
                    style={{
                        background: 'rgba(15,23,42,.65)',
                        zIndex: 1080,
                        overflowY: 'auto',
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <form onSubmit={saveMeeting}>
                                <div className="modal-header border-0 px-4 pt-4">
                                    <div>
                                        <span className="small text-danger fw-bold">
                                            PENCATATAN RAPAT
                                        </span>
                                        <h4 className="fw-bold mb-0 mt-1">
                                            {editingId ? 'Edit Catatan Rapat' : 'Catat Rapat Baru'}
                                        </h4>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                    />
                                </div>

                                <div className="modal-body px-4">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-semibold">
                                                Pilih Agenda Kalender (opsional)
                                            </label>
                                            <select
                                                className="form-select"
                                                value={meeting.event_schedule_id}
                                                onChange={(e) => chooseAgenda(e.target.value)}
                                                disabled={saving}
                                            >
                                                <option value="">Tanpa agenda / pencatatan historis</option>
                                                {(data?.available_agendas || []).map((agenda) => (
                                                    <option key={agenda.id} value={agenda.id}>
                                                        {agenda.event_date} — {agenda.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <small className="text-muted">
                                                Agenda yang dipilih akan menentukan judul,
                                                Direktorat, dan tanggal sesuai data kalender.
                                            </small>
                                        </div>

                                        <div className="col-md-8">
                                            <label className="form-label fw-semibold">Judul Rapat *</label>
                                            <input
                                                className="form-control"
                                                required
                                                minLength={3}
                                                value={meeting.title}
                                                readOnly={Boolean(meeting.event_schedule_id)}
                                                onChange={(e) => setField('title', e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Tanggal *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                value={meeting.meeting_date}
                                                readOnly={Boolean(meeting.event_schedule_id)}
                                                onChange={(e) => setField('meeting_date', e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Direktorat *</label>
                                            <select
                                                className="form-select"
                                                required
                                                value={meeting.directorate}
                                                disabled={saving || Boolean(meeting.event_schedule_id)}
                                                onChange={(e) => setField('directorate', e.target.value)}
                                            >
                                                {DIRECTORATES.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label fw-semibold">Realisasi *</label>
                                            <select
                                                className="form-select"
                                                required
                                                value={meeting.realization_status}
                                                onChange={(e) => setField('realization_status', e.target.value)}
                                            >
                                                <option value="held">Terlaksana</option>
                                                <option value="postponed">Ditunda</option>
                                                <option value="cancelled">Dibatalkan</option>
                                            </select>
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label fw-semibold">Jumlah Peserta</label>
                                            <input
                                                type="number" min="0" step="1"
                                                className="form-control"
                                                required
                                                value={meeting.participants_count}
                                                onChange={(e) => setField('participants_count', e.target.value)}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Catatan / Notulensi</label>
                                            <textarea
                                                className="form-control" rows={3}
                                                maxLength={10000}
                                                value={meeting.notes}
                                                onChange={(e) => setField('notes', e.target.value)}
                                                placeholder="Ringkasan pembahasan rapat"
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Keputusan Rapat</label>
                                            <textarea
                                                className="form-control" rows={3}
                                                maxLength={10000}
                                                value={meeting.decisions}
                                                onChange={(e) => setField('decisions', e.target.value)}
                                                placeholder="Keputusan yang dihasilkan"
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold">Tindak Lanjut</label>
                                            <textarea
                                                className="form-control" rows={2}
                                                maxLength={10000}
                                                value={meeting.follow_up}
                                                onChange={(e) => setField('follow_up', e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">PIC Tindak Lanjut</label>
                                            <input
                                                className="form-control"
                                                maxLength={255}
                                                value={meeting.follow_up_pic}
                                                onChange={(e) => setField('follow_up_pic', e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Tenggat Tindak Lanjut</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={meeting.follow_up_due_date}
                                                onChange={(e) => setField('follow_up_due_date', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer border-0 px-4 pb-4">
                                    <button
                                        type="button"
                                        className="btn btn-light rounded-pill"
                                        disabled={saving}
                                        onClick={() => setShowForm(false)}
                                    >
                                        Batal
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-danger rounded-pill px-4"
                                        disabled={saving}
                                    >
                                        {saving ? 'Menyimpan...' : 'Simpan Catatan Rapat'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
