import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const DIRECTORATES = [
    { value: 'direktorat', label: 'Direktorat' },
    { value: 'direktur', label: 'Direktur' },
    { value: 'wakil_direktur_1', label: 'Wakil Direktur I' },
    { value: 'wakil_direktur_2', label: 'Wakil Direktur II' },
];

const TYPES = [
    'Rapat',
    'Kunjungan',
    'Internal',
    'Eksternal',
    'Seremonial',
    'Akademik',
    'Lainnya',
];

const STATUS = {
    pending: {
        label: 'Menunggu Approval',
        color: 'warning',
        icon: 'bi-hourglass-split',
    },
    approved: {
        label: 'Disetujui',
        color: 'success',
        icon: 'bi-check-circle-fill',
    },
    rejected: {
        label: 'Ditolak',
        color: 'danger',
        icon: 'bi-x-circle-fill',
    },
};

const getDirectorateLabel = (value) =>
    DIRECTORATES.find((item) => item.value === value)?.label || '-';

const formatDate = (value) => {
    if (!value) return '-';

    const [year, month, day] = String(value)
        .slice(0, 10)
        .split('-')
        .map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

const formatTime = (value) =>
    value ? String(value).slice(0, 5) : '';

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Terjadi kesalahan saat memproses pengajuan.';

const toForm = (item) => ({
    requester_unit: item.requester_unit || '',
    pic_name: item.pic_name || '',
    directorate: item.directorate || '',
    title: item.title || '',
    description: item.description || '',
    event_date: String(item.event_date || '').slice(0, 10),
    start_time: formatTime(item.start_time) || '09:00',
    end_time: formatTime(item.end_time) || '10:00',
    all_day: Boolean(item.all_day),
    location: item.location || '',
    agenda_type: item.agenda_type || 'Rapat',
    is_public: Boolean(item.is_public),
});

function StatusBadge({ status }) {
    const item = STATUS[status] || STATUS.pending;

    return (
        <span
            className={`badge rounded-pill bg-${item.color}-subtle text-${item.color} px-3 py-2`}
        >
            <i className={`bi ${item.icon} me-2`} />
            {item.label}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="dsap-detail-item">
            <small>{label}</small>
            <strong>{value || '-'}</strong>
        </div>
    );
}

function EditField({
    label,
    children,
    span = 'col-md-6',
    required = false,
}) {
    return (
        <div className={span}>
            <label className="form-label fw-bold">
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </label>
            {children}
        </div>
    );
}

export default function DirectorateScheduleApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    });

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [statusFilter, setStatusFilter] = useState('pending');
    const [directorateFilter, setDirectorateFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get('/event-schedule-requests');
            const data = response?.data?.data || {};

            setRequests(
                Array.isArray(data.requests)
                    ? data.requests
                    : []
            );

            setSummary(
                data.summary || {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                }
            );
        } catch (error) {
            console.error('Load schedule approvals:', error);

            await showErrorAlert(
                'Gagal Memuat Pengajuan',
                getError(error)
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const filteredRequests = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return requests.filter((item) => {
            if (
                statusFilter !== 'all' &&
                item.status !== statusFilter
            ) {
                return false;
            }

            if (
                directorateFilter !== 'all' &&
                item.directorate !== directorateFilter
            ) {
                return false;
            }

            if (!keyword) return true;

            return [
                item.title,
                item.requester_name,
                item.requester_unit,
                item.pic_name,
                item.description,
                item.location,
                getDirectorateLabel(item.directorate),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        });
    }, [requests, statusFilter, directorateFilter, search]);

    const openDetail = (item) => {
        setSelected(item);
        setForm(toForm(item));
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
    };

    const closeDetail = () => {
        if (processing) return;

        setSelected(null);
        setForm(null);
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
    };

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const validateForm = async () => {
        if (!form.requester_unit.trim()) {
            await showWarningAlert(
                'Unit Pengaju Belum Diisi',
                'Unit pengaju wajib diisi.'
            );
            return false;
        }

        if (!form.pic_name.trim()) {
            await showWarningAlert(
                'Nama PIC Belum Diisi',
                'Nama penanggung jawab kegiatan wajib diisi.'
            );
            return false;
        }

        if (
            !form.directorate ||
            !form.title.trim() ||
            !form.event_date
        ) {
            await showWarningAlert(
                'Data Belum Lengkap',
                'Pemilik jadwal, judul, dan tanggal wajib diisi.'
            );
            return false;
        }

        if (
            !form.all_day &&
            (!form.start_time ||
                !form.end_time ||
                form.end_time <= form.start_time)
        ) {
            await showWarningAlert(
                'Jam Tidak Valid',
                'Jam selesai harus lebih besar dari jam mulai.'
            );
            return false;
        }

        return true;
    };

    const saveEdit = async () => {
        if (
            !selected ||
            processing ||
            !(await validateForm())
        ) {
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Simpan Perubahan?',
            text: 'Perubahan disimpan dan status tetap pending.',
            confirmButtonText: 'Ya, simpan',
            cancelButtonText: 'Batal',
            icon: 'question',
        });

        if (!confirmation?.isConfirmed) return;

        try {
            setProcessing(true);

            const response = await api.put(
                `/event-schedule-requests/${selected.id}`,
                {
                    ...form,
                    requester_unit: form.requester_unit.trim(),
                    pic_name: form.pic_name.trim(),
                    title: form.title.trim(),
                    description:
                        form.description.trim() || null,
                    location: form.location.trim() || null,
                    start_time: form.all_day
                        ? null
                        : form.start_time,
                    end_time: form.all_day
                        ? null
                        : form.end_time,
                }
            );

            const updated = response?.data?.data;

            if (updated) {
                setSelected(updated);
                setForm(toForm(updated));
            }

            setEditing(false);
            await loadRequests();

            await showSuccessAlert(
                'Pengajuan Diperbarui',
                'Data berhasil disimpan. Pengajuan masih menunggu keputusan.'
            );
        } catch (error) {
            await showErrorAlert(
                'Gagal Menyimpan Perubahan',
                getError(error)
            );
        } finally {
            setProcessing(false);
        }
    };

    const closeDetailAfterAction = () => {
        setSelected(null);
        setForm(null);
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
    };

    const approve = async () => {
        if (!selected || processing) return;

        if (editing) {
            await showWarningAlert(
                'Selesaikan Edit',
                'Simpan perubahan terlebih dahulu.'
            );
            return;
        }

        // Data lama bisa saja belum memiliki unit/PIC.
        if (!selected.requester_unit || !selected.pic_name) {
            await showWarningAlert(
                'Informasi Pengaju Belum Lengkap',
                'Isi Unit Pengaju dan Nama PIC melalui tombol Edit sebelum menyetujui.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Setujui Pengajuan Jadwal?',
            text: `Agenda "${selected.title}" akan dimasukkan ke kalender Direktorat.`,
            confirmButtonText: 'Ya, setujui',
            cancelButtonText: 'Batal',
            icon: 'question',
        });

        if (!confirmation?.isConfirmed) return;

        try {
            setProcessing(true);

            await api.put(
                `/event-schedule-requests/${selected.id}/approve`
            );

            closeDetailAfterAction();
            await loadRequests();

            await showSuccessAlert(
                'Pengajuan Disetujui',
                'Agenda berhasil dimasukkan ke kalender Direktorat.'
            );
        } catch (error) {
            const data = error?.response?.data;

            if (
                error?.response?.status === 409 &&
                data?.code === 'SCHEDULE_CONFLICT'
            ) {
                const conflict = data?.data?.conflict || {};

                await showWarningAlert(
                    'Jadwal Bentrok',
                    `${data.message || 'Jadwal tidak dapat disetujui.'}

Bentrok dengan: ${conflict.title || '-'}
Pemilik: ${getDirectorateLabel(conflict.directorate)}
Tanggal: ${formatDate(conflict.event_date)}
Waktu: ${
                        conflict.all_day
                            ? 'Sepanjang hari'
                            : `${formatTime(conflict.start_time)} - ${formatTime(conflict.end_time)}`
                    }

Silakan edit tanggal atau waktu pengajuan terlebih dahulu.`
                );
            } else {
                await showErrorAlert(
                    'Gagal Menyetujui Jadwal',
                    getError(error)
                );
            }
        } finally {
            setProcessing(false);
        }
    };

    const reject = async () => {
        if (!selected || processing) return;

        if (!rejectionReason.trim()) {
            await showWarningAlert(
                'Alasan Belum Diisi',
                'Alasan penolakan wajib diisi.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Tolak Pengajuan Jadwal?',
            text: 'Pengajuan akan ditolak tanpa proses revisi.',
            confirmButtonText: 'Ya, tolak',
            cancelButtonText: 'Batal',
            icon: 'warning',
        });

        if (!confirmation?.isConfirmed) return;

        try {
            setProcessing(true);

            await api.put(
                `/event-schedule-requests/${selected.id}/reject`,
                {
                    rejection_reason: rejectionReason.trim(),
                }
            );

            closeDetailAfterAction();
            await loadRequests();

            await showSuccessAlert(
                'Pengajuan Ditolak',
                'Pengajuan jadwal berhasil ditolak.'
            );
        } catch (error) {
            await showErrorAlert(
                'Gagal Menolak Pengajuan',
                getError(error)
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="dsap-page">
            {/* HEADER */}

            <header className="dsap-header">
                <div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-2">
                        SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-black mb-1">
                        Approval Jadwal Direktorat
                    </h2>

                    <p className="text-muted mb-0">
                        Periksa unit pengaju, PIC, jadwal,
                        dan putuskan pengajuan agenda pimpinan.
                    </p>
                </div>

                <Link
                    to="/admin/director-schedule"
                    className="btn btn-outline-danger rounded-pill px-4 fw-bold"
                >
                    <i className="bi bi-calendar3 me-2" />
                    Lihat Kalender
                </Link>
            </header>

            {/* STATISTIK */}

            <section className="dsap-statistics">
                {[
                    ['total', 'Semua Pengajuan', 'bi-grid-fill'],
                    ['pending', 'Menunggu Approval', 'bi-hourglass-split'],
                    ['approved', 'Disetujui', 'bi-check-circle'],
                    ['rejected', 'Ditolak', 'bi-x-circle'],
                ].map(([key, label, icon]) => (
                    <button
                        key={key}
                        type="button"
                        className={`dsap-stat ${
                            statusFilter ===
                            (key === 'total' ? 'all' : key)
                                ? 'active'
                                : ''
                        }`}
                        onClick={() =>
                            setStatusFilter(
                                key === 'total' ? 'all' : key
                            )
                        }
                    >
                        <span className={`dsap-stat-icon ${key}`}>
                            <i className={`bi ${icon}`} />
                        </span>

                        <span className="dsap-stat-text">
                            <small>{label}</small>
                            <strong>{summary[key] || 0}</strong>
                        </span>
                    </button>
                ))}
            </section>

            {/* TABEL */}

            <section className="dsap-card">
                <div className="dsap-card-heading">
                    <div>
                        <h5 className="fw-black mb-1">
                            Daftar Pengajuan Jadwal
                        </h5>

                        <p className="small text-muted mb-0">
                            Klik Detail untuk memeriksa
                            dan memproses pengajuan.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-light border rounded-pill px-3"
                        onClick={loadRequests}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise me-2" />
                        Refresh
                    </button>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-lg-5">
                        <label className="form-label small fw-bold">
                            Cari Pengajuan
                        </label>

                        <input
                            type="search"
                            className="form-control"
                            placeholder="Judul, unit, PIC, pengaju, lokasi..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />
                    </div>

                    <div className="col-md-6 col-lg-4">
                        <label className="form-label small fw-bold">
                            Direktorat
                        </label>

                        <select
                            className="form-select"
                            value={directorateFilter}
                            onChange={(event) =>
                                setDirectorateFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                Semua Direktorat
                            </option>

                            {DIRECTORATES.map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <label className="form-label small fw-bold">
                            Status
                        </label>

                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="all">
                                Semua Status
                            </option>
                            <option value="pending">
                                Pending
                            </option>
                            <option value="approved">
                                Approved
                            </option>
                            <option value="rejected">
                                Rejected
                            </option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="dsap-empty">
                        <div className="spinner-border text-danger mb-3" />
                        <p>Memuat pengajuan jadwal...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="dsap-empty">
                        <i className="bi bi-inbox" />
                        <h5 className="fw-bold">
                            Tidak ada pengajuan
                        </h5>
                        <p className="text-muted">
                            Belum ada pengajuan sesuai filter.
                        </p>
                    </div>
                ) : (
                    <div className="dsap-table-wrapper">
                        <table className="table align-middle dsap-table">
                            <thead>
                                <tr>
                                    <th>Pengajuan</th>
                                    <th>Unit / PIC</th>
                                    <th>Pengaju Akun</th>
                                    <th>Agenda Untuk</th>
                                    <th>Jadwal</th>
                                    <th>Status</th>
                                    <th className="text-end">Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRequests.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong className="d-block">
                                                {item.title}
                                            </strong>
                                            <small className="text-muted">
                                                #{item.id} •{' '}
                                                {formatDateTime(
                                                    item.created_at
                                                )}
                                            </small>
                                        </td>

                                        <td>
                                            <strong className="d-block">
                                                {item.requester_unit || '-'}
                                            </strong>
                                            <small className="text-muted">
                                                PIC: {item.pic_name || '-'}
                                            </small>
                                        </td>

                                        <td>
                                            {item.requester_name || '-'}
                                        </td>

                                        <td>
                                            {getDirectorateLabel(
                                                item.directorate
                                            )}
                                        </td>

                                        <td>
                                            <strong className="d-block">
                                                {formatDate(item.event_date)}
                                            </strong>
                                            <small className="text-muted">
                                                {item.all_day
                                                    ? 'Sepanjang hari'
                                                    : `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`}
                                            </small>
                                        </td>

                                        <td>
                                            <StatusBadge status={item.status} />
                                        </td>

                                        <td className="text-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                                onClick={() => openDetail(item)}
                                            >
                                                <i className="bi bi-eye me-1" />
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* MODAL DETAIL */}

            {selected && form && (
                <div
                    className="modal fade show d-block dsap-modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    tabIndex={-1}
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow-lg">
                            <div className="modal-header border-0 px-4 pt-4 pb-2">
                                <div>
                                    <StatusBadge status={selected.status} />

                                    <h4 className="fw-black mt-2 mb-1">
                                        {selected.title}
                                    </h4>

                                    <div className="small text-muted">
                                        Pengajuan #{selected.id} oleh{' '}
                                        {selected.requester_name || '-'}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeDetail}
                                    disabled={processing}
                                    aria-label="Tutup detail"
                                />
                            </div>

                            <div className="modal-body px-4 pb-2">
                                {editing ? (
                                    <div className="row g-3">
                                        {/* UNIT PENGAJU BARU */}

                                        <EditField
                                            label="Unit Pengaju"
                                            required
                                        >
                                            <input
                                                type="text"
                                                className="form-control"
                                                maxLength={255}
                                                value={form.requester_unit}
                                                onChange={(event) =>
                                                    updateField(
                                                        'requester_unit',
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Contoh: Unit Sekretariat Pimpinan"
                                            />
                                        </EditField>

                                        {/* NAMA PIC BARU */}

                                        <EditField
                                            label="Nama PIC"
                                            required
                                        >
                                            <input
                                                type="text"
                                                className="form-control"
                                                maxLength={255}
                                                value={form.pic_name}
                                                onChange={(event) =>
                                                    updateField(
                                                        'pic_name',
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Nama penanggung jawab kegiatan"
                                            />
                                        </EditField>

                                        <EditField
                                            label="Agenda Untuk"
                                            span="col-12"
                                            required
                                        >
                                            <select
                                                className="form-select"
                                                value={form.directorate}
                                                onChange={(event) =>
                                                    updateField(
                                                        'directorate',
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {DIRECTORATES.map((item) => (
                                                    <option
                                                        key={item.value}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </EditField>

                                        <EditField
                                            label="Judul Agenda"
                                            span="col-12"
                                            required
                                        >
                                            <input
                                                type="text"
                                                className="form-control"
                                                maxLength={255}
                                                value={form.title}
                                                onChange={(event) =>
                                                    updateField(
                                                        'title',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <EditField
                                            label="Tanggal"
                                            required
                                        >
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={form.event_date}
                                                onChange={(event) =>
                                                    updateField(
                                                        'event_date',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <EditField label="Kategori">
                                            <select
                                                className="form-select"
                                                value={form.agenda_type}
                                                onChange={(event) =>
                                                    updateField(
                                                        'agenda_type',
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {TYPES.map((type) => (
                                                    <option
                                                        key={type}
                                                        value={type}
                                                    >
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </EditField>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    id="approvalAllDay"
                                                    className="form-check-input"
                                                    checked={form.all_day}
                                                    onChange={(event) =>
                                                        updateField(
                                                            'all_day',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    htmlFor="approvalAllDay"
                                                    className="form-check-label fw-bold"
                                                >
                                                    Sepanjang Hari
                                                </label>
                                            </div>
                                        </div>

                                        {!form.all_day && (
                                            <>
                                                <EditField label="Jam Mulai">
                                                    <input
                                                        type="time"
                                                        className="form-control"
                                                        value={form.start_time}
                                                        onChange={(event) =>
                                                            updateField(
                                                                'start_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </EditField>

                                                <EditField label="Jam Selesai">
                                                    <input
                                                        type="time"
                                                        className="form-control"
                                                        value={form.end_time}
                                                        onChange={(event) =>
                                                            updateField(
                                                                'end_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </EditField>
                                            </>
                                        )}

                                        <EditField
                                            label="Lokasi"
                                            span="col-12"
                                        >
                                            <input
                                                type="text"
                                                className="form-control"
                                                maxLength={255}
                                                value={form.location}
                                                onChange={(event) =>
                                                    updateField(
                                                        'location',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <EditField
                                            label="Deskripsi"
                                            span="col-12"
                                        >
                                            <textarea
                                                rows={4}
                                                className="form-control"
                                                maxLength={5000}
                                                value={form.description}
                                                onChange={(event) =>
                                                    updateField(
                                                        'description',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="approvalPublic"
                                                    checked={form.is_public}
                                                    onChange={(event) =>
                                                        updateField(
                                                            'is_public',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    htmlFor="approvalPublic"
                                                    className="form-check-label fw-bold"
                                                >
                                                    Tampilkan di Kalender Publik
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dsap-detail-grid">
                                            <DetailItem
                                                label="Pengaju Akun"
                                                value={selected.requester_name}
                                            />

                                            <DetailItem
                                                label="Unit Pengaju"
                                                value={selected.requester_unit}
                                            />

                                            <DetailItem
                                                label="Nama PIC"
                                                value={selected.pic_name}
                                            />

                                            <DetailItem
                                                label="Agenda Untuk"
                                                value={getDirectorateLabel(
                                                    selected.directorate
                                                )}
                                            />

                                            <DetailItem
                                                label="Tanggal"
                                                value={formatDate(
                                                    selected.event_date
                                                )}
                                            />

                                            <DetailItem
                                                label="Waktu"
                                                value={
                                                    selected.all_day
                                                        ? 'Sepanjang hari'
                                                        : `${formatTime(selected.start_time)} - ${formatTime(selected.end_time)}`
                                                }
                                            />

                                            <DetailItem
                                                label="Kategori"
                                                value={selected.agenda_type}
                                            />

                                            <DetailItem
                                                label="Lokasi"
                                                value={selected.location}
                                            />

                                            <DetailItem
                                                label="Visibilitas"
                                                value={
                                                    selected.is_public
                                                        ? 'Publik'
                                                        : 'Internal'
                                                }
                                            />

                                            <DetailItem
                                                label="Tanggal Pengajuan"
                                                value={formatDateTime(
                                                    selected.created_at
                                                )}
                                            />
                                        </div>

                                        <div className="dsap-description mt-3">
                                            <small className="d-block text-muted fw-bold mb-2">
                                                DESKRIPSI / KEPERLUAN
                                            </small>

                                            <div
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {selected.description || '-'}
                                            </div>
                                        </div>

                                        {selected.edited_by && (
                                            <div className="small text-muted mt-3">
                                                <i className="bi bi-pencil-square me-2" />
                                                Terakhir diedit oleh{' '}
                                                <strong>
                                                    {selected.editor_name || '-'}
                                                </strong>
                                                {' • '}
                                                {formatDateTime(
                                                    selected.edited_at
                                                )}
                                            </div>
                                        )}

                                        {selected.reviewed_by && (
                                            <div className="small text-muted mt-2">
                                                <i className="bi bi-person-check me-2" />
                                                Diproses oleh{' '}
                                                <strong>
                                                    {selected.reviewer_name || '-'}
                                                </strong>
                                                {' • '}
                                                {formatDateTime(
                                                    selected.reviewed_at
                                                )}
                                            </div>
                                        )}

                                        {selected.status === 'rejected' && (
                                            <div className="alert alert-danger border-0 rounded-4 mt-3 mb-0">
                                                <strong>
                                                    Alasan Penolakan
                                                </strong>
                                                <p className="mb-0 mt-1">
                                                    {selected.rejection_reason || '-'}
                                                </p>
                                            </div>
                                        )}

                                        {selected.status === 'approved' && (
                                            <div className="alert alert-success border-0 rounded-4 mt-3 mb-0">
                                                <i className="bi bi-check-circle-fill me-2" />
                                                Pengajuan sudah disetujui
                                                dan masuk kalender.

                                                {selected.approved_schedule_id && (
                                                    <span className="ms-1">
                                                        ID Agenda #
                                                        {selected.approved_schedule_id}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {rejectOpen &&
                                    selected.status === 'pending' &&
                                    !editing && (
                                        <div className="dsap-reject mt-3">
                                            <h6 className="fw-black mb-2">
                                                <i className="bi bi-exclamation-triangle-fill me-2" />
                                                Alasan Penolakan
                                            </h6>

                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                maxLength={2000}
                                                placeholder="Tuliskan alasan pengajuan tidak dapat disetujui..."
                                                value={rejectionReason}
                                                onChange={(event) =>
                                                    setRejectionReason(
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-light border rounded-pill"
                                                    onClick={() =>
                                                        setRejectOpen(false)
                                                    }
                                                    disabled={processing}
                                                >
                                                    Batal
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    onClick={reject}
                                                    disabled={
                                                        processing ||
                                                        !rejectionReason.trim()
                                                    }
                                                >
                                                    <i className="bi bi-x-circle me-2" />
                                                    Konfirmasi Penolakan
                                                </button>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* ACTION */}

                            <div className="modal-footer border-0 px-4 py-3">
                                {editing ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill px-3"
                                            disabled={processing}
                                            onClick={() => {
                                                setEditing(false);
                                                setForm(toForm(selected));
                                            }}
                                        >
                                            Batal Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill px-4"
                                            disabled={processing}
                                            onClick={saveEdit}
                                        >
                                            <i className="bi bi-floppy-fill me-2" />
                                            Simpan Perubahan
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {selected.status === 'pending' &&
                                            !rejectOpen && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary rounded-pill"
                                                        disabled={processing}
                                                        onClick={() =>
                                                            setEditing(true)
                                                        }
                                                    >
                                                        <i className="bi bi-pencil-square me-2" />
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger rounded-pill"
                                                        disabled={processing}
                                                        onClick={() =>
                                                            setRejectOpen(true)
                                                        }
                                                    >
                                                        <i className="bi bi-x-lg me-2" />
                                                        Tolak
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-success rounded-pill px-4"
                                                        disabled={processing}
                                                        onClick={approve}
                                                    >
                                                        {processing ? (
                                                            <span className="spinner-border spinner-border-sm me-2" />
                                                        ) : (
                                                            <i className="bi bi-check-lg me-2" />
                                                        )}
                                                        Setujui
                                                    </button>
                                                </>
                                            )}

                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={closeDetail}
                                            disabled={processing}
                                        >
                                            Tutup
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .dsap-page {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                }

                .dsap-page .fw-black {
                    font-weight: 900 !important;
                }

                .dsap-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .dsap-header h2 {
                    font-size: 1.8rem;
                }

                .dsap-statistics {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                }

                .dsap-stat {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 17px;
                    background: #fff;
                    text-align: left;
                    color: #475569;
                    min-width: 0;
                }

                .dsap-stat.active {
                    background: #fff7f7;
                    border-color: #7f1d1d;
                }

                .dsap-stat-icon {
                    width: 42px;
                    height: 42px;
                    flex: 0 0 42px;
                    display: grid;
                    place-items: center;
                    border-radius: 12px;
                    background: #f1f5f9;
                    color: #334155;
                }

                .dsap-stat-icon.pending {
                    background: #fffbeb;
                    color: #a16207;
                }

                .dsap-stat-icon.approved {
                    background: #ecfdf5;
                    color: #047857;
                }

                .dsap-stat-icon.rejected {
                    background: #fef2f2;
                    color: #b91c1c;
                }

                .dsap-stat-text {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .dsap-stat-text small {
                    color: #64748b;
                    font-weight: 800;
                    font-size: .68rem;
                }

                .dsap-stat-text strong {
                    font-size: 1.5rem;
                    color: #0f172a;
                }

                .dsap-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 20px;
                    box-shadow: 0 5px 20px rgba(15, 23, 42, .04);
                }

                .dsap-card-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 18px;
                }

                .dsap-table-wrapper {
                    overflow-x: auto;
                }

                .dsap-table {
                    min-width: 900px;
                    margin-bottom: 0;
                }

                .dsap-table thead th {
                    background: #f8fafc;
                    color: #64748b;
                    font-size: .69rem;
                    text-transform: uppercase;
                    letter-spacing: .04em;
                    padding: 13px;
                    white-space: nowrap;
                }

                .dsap-table td {
                    padding: 14px 13px;
                    font-size: .82rem;
                    color: #334155;
                }

                .dsap-empty {
                    text-align: center;
                    padding: 65px 10px;
                    color: #64748b;
                }

                .dsap-empty > i {
                    display: block;
                    color: #cbd5e1;
                    font-size: 2.5rem;
                    margin-bottom: 14px;
                }

                .dsap-modal-backdrop {
                    background: rgba(15, 23, 42, .64);
                    z-index: 1050;
                }

                .dsap-detail-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .dsap-detail-item {
                    border-radius: 12px;
                    padding: 12px 14px;
                    background: #f8fafc;
                    min-width: 0;
                }

                .dsap-detail-item small {
                    display: block;
                    color: #94a3b8;
                    font-weight: 800;
                    margin-bottom: 5px;
                }

                .dsap-detail-item strong {
                    display: block;
                    color: #334155;
                    font-size: .84rem;
                    word-break: break-word;
                }

                .dsap-description {
                    padding: 14px;
                    border-radius: 12px;
                    background: #f8fafc;
                    font-size: .84rem;
                }

                .dsap-reject {
                    border: 1px solid #fecaca;
                    background: #fff7f7;
                    padding: 15px;
                    border-radius: 15px;
                }

                @media (max-width: 1100px) {
                    .dsap-statistics {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 767px) {
                    .dsap-header h2 {
                        font-size: 1.5rem;
                    }

                    .dsap-stat {
                        padding: 12px;
                    }

                    .dsap-card {
                        padding: 12px;
                    }

                    .dsap-detail-grid {
                        grid-template-columns: 1fr;
                    }

                    .dsap-modal-backdrop .modal-footer {
                        justify-content: stretch;
                    }

                    .dsap-modal-backdrop .modal-footer button {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
}