
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { Link } from 'react-router-dom';
import api from '../../api/axios';

import DirectorateDocuments from '../../components/DirectorateDocuments';

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

const ACCEPTED_EXTENSIONS = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getDirectorateLabel = (value) =>
    DIRECTORATES.find((item) => item.value === value)?.label || '-';

const getError = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Terjadi kesalahan saat memproses pengajuan.';

const formatDate = (value) => {
    if (!value) return '-';

    const [year, month, day] = String(value)
        .slice(0, 10)
        .split('-')
        .map(Number);

    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
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

const formatFileSize = (size) =>
    `${(size / 1024 / 1024).toFixed(2)} MB`;

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
        <div className="col-12 col-md-6">
            <div className="bg-light rounded-4 p-3 h-100">
                <div className="small text-muted mb-1">
                    {label}
                </div>

                <div className="fw-semibold text-break">
                    {value || '-'}
                </div>
            </div>
        </div>
    );
}

function EditField({
    label,
    children,
    required = false,
    span = 'col-md-6',
}) {
    return (
        <div className={span}>
            <label className="form-label fw-bold">
                {label}
                {required && (
                    <span className="text-danger ms-1">*</span>
                )}
            </label>

            {children}
        </div>
    );
}

function EditDocument({
    id,
    title,
    existingName,
    file,
    required,
    disabled,
    onChange,
    onRemove,
}) {
    return (
        <div className="col-12 col-md-6">
            <div className="border rounded-4 p-3 h-100">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                    <strong className="small">
                        {title}
                    </strong>

                    <span
                        className={
                            required
                                ? 'badge bg-danger-subtle text-danger rounded-pill'
                                : 'badge bg-light text-secondary rounded-pill'
                        }
                    >
                        {required ? 'Wajib' : 'Opsional'}
                    </span>
                </div>

                <div className="small text-muted mb-3">
                    <div className="fw-semibold mb-1">
                        Dokumen saat ini:
                    </div>

                    {existingName ? (
                        <div className="d-flex align-items-start gap-2">
                            <i className="bi bi-file-earmark-check text-success" />
                            <span className="text-break">
                                {existingName}
                            </span>
                        </div>
                    ) : (
                        <span>
                            Belum ada dokumen.
                        </span>
                    )}
                </div>

                <label
                    htmlFor={id}
                    className="d-flex align-items-center justify-content-center gap-2 border border-2 border-dashed rounded-4 bg-light p-3 w-100"
                    style={{
                        minHeight: 64,
                        cursor: disabled
                            ? 'not-allowed'
                            : 'pointer',
                    }}
                >
                    <i className="bi bi-cloud-arrow-up text-danger fs-5" />

                    <span className="small fw-semibold">
                        {file
                            ? 'Ganti File Pilihan'
                            : 'Pilih File Pengganti'}
                    </span>
                </label>

                <input
                    id={id}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="d-none"
                    disabled={disabled}
                    onChange={onChange}
                />

                {file ? (
                    <div className="d-flex align-items-center gap-2 mt-3">
                        <i className="bi bi-file-earmark-arrow-up-fill text-success" />

                        <div className="flex-grow-1 min-w-0">
                            <div
                                className="small fw-bold text-truncate"
                                title={file.name}
                            >
                                {file.name}
                            </div>

                            <div className="small text-muted">
                                {formatFileSize(file.size)}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-circle"
                            disabled={disabled}
                            title="Batalkan penggantian"
                            onClick={onRemove}
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                ) : (
                    <div className="small text-muted mt-2">
                        PDF, Word, Excel · Maksimal 5 MB
                    </div>
                )}

                <div className="small text-muted mt-2">
                    Jika tidak memilih file baru,
                    dokumen lama tetap digunakan.
                </div>
            </div>
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

    const [newRundown, setNewRundown] = useState(null);
    const [newTor, setNewTor] = useState(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get(
                '/event-schedule-requests'
            );

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
            console.error(
                'Load Directorate Requests:',
                error?.response?.data || error
            );

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

            if (!keyword) {
                return true;
            }

            return [
                item.title,
                item.requester_name,
                item.requester_unit,
                item.pic_name,
                item.location,
                item.description,
                getDirectorateLabel(item.directorate),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        });
    }, [
        requests,
        statusFilter,
        directorateFilter,
        search,
    ]);

    const resetReplacementFiles = () => {
        setNewRundown(null);
        setNewTor(null);

        ['edit_rundown', 'edit_tor'].forEach((id) => {
            const input = document.getElementById(id);

            if (input) {
                input.value = '';
            }
        });
    };

    const openDetail = (item) => {
        setSelected(item);
        setForm(toForm(item));
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
        setNewRundown(null);
        setNewTor(null);
    };

    const closeDetail = () => {
        if (processing) {
            return;
        }

        setSelected(null);
        setForm(null);
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
        resetReplacementFiles();
    };

    const closeAfterAction = () => {
        setSelected(null);
        setForm(null);
        setEditing(false);
        setRejectOpen(false);
        setRejectionReason('');
        resetReplacementFiles();
    };

    const startEdit = () => {
        if (!selected || selected.status !== 'pending') {
            return;
        }

        setForm(toForm(selected));
        resetReplacementFiles();
        setRejectOpen(false);
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setForm(toForm(selected));
        resetReplacementFiles();
    };

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const handleAttachmentChange = async (
        event,
        setter,
        label
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            setter(null);
            return;
        }

        const extension = file.name
            .split('.')
            .pop()
            ?.toLowerCase();

        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
            event.target.value = '';
            setter(null);

            await showWarningAlert(
                'Format File Tidak Didukung',
                `${label} harus berformat PDF, DOC, DOCX, XLS, atau XLSX.`
            );
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            event.target.value = '';
            setter(null);

            await showWarningAlert(
                'Ukuran File Terlalu Besar',
                `${label} maksimal 5 MB.`
            );
            return;
        }

        setter(file);
    };

    const removeAttachment = (id, setter) => {
        setter(null);

        const input = document.getElementById(id);

        if (input) {
            input.value = '';
        }
    };

    const validateEdit = async () => {
        if (
            !form.requester_unit.trim() ||
            !form.pic_name.trim()
        ) {
            await showWarningAlert(
                'Informasi Pengaju Belum Lengkap',
                'Unit pengaju dan nama PIC wajib diisi.'
            );

            return false;
        }

        if (
            !form.directorate ||
            !form.title.trim() ||
            !form.event_date
        ) {
            await showWarningAlert(
                'Informasi Agenda Belum Lengkap',
                'Pimpinan, judul, dan tanggal kegiatan wajib diisi.'
            );

            return false;
        }

        if (
            !form.all_day &&
            (
                !form.start_time ||
                !form.end_time ||
                form.end_time <= form.start_time
            )
        ) {
            await showWarningAlert(
                'Jam Tidak Valid',
                'Jam selesai harus setelah jam mulai.'
            );

            return false;
        }

        // Data lama bisa belum punya Rundown.
        // Untuk data lama, admin boleh melengkapinya
        // dengan file pengganti.
        // Untuk data baru, Rundown sudah divalidasi
        // wajib ketika pengajuan dibuat.

        if (
            !selected?.rundown_name &&
            !selected?.rundown_path &&
            !newRundown
        ) {
            await showWarningAlert(
                'Rundown Belum Tersedia',
                'Pengajuan ini belum memiliki Rundown. Unggah Rundown terlebih dahulu.'
            );

            return false;
        }

        return true;
    };

    const saveEdit = async () => {
        if (
            !selected ||
            processing ||
            !(await validateEdit())
        ) {
            return;
        }

        const fileChanges = [
            newRundown ? 'Rundown' : null,
            newTor ? 'TOR' : null,
        ].filter(Boolean);

        const confirmation = await showConfirmAlert({
            title: 'Simpan Perubahan?',
            text:
                fileChanges.length > 0
                    ? `Data jadwal dan dokumen ${fileChanges.join(' serta ')} akan diperbarui. Status pengajuan tetap pending.`
                    : 'Perubahan jadwal akan disimpan. Dokumen lama tetap digunakan dan status tetap pending.',
            icon: 'question',
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            const payload = new FormData();

            // Laravel menangani update multipart
            // menggunakan method spoofing.
            payload.append('_method', 'PUT');

            payload.append(
                'requester_unit',
                form.requester_unit.trim()
            );

            payload.append(
                'pic_name',
                form.pic_name.trim()
            );

            payload.append(
                'directorate',
                form.directorate
            );

            payload.append(
                'title',
                form.title.trim()
            );

            payload.append(
                'event_date',
                form.event_date
            );

            payload.append(
                'agenda_type',
                form.agenda_type
            );

            payload.append(
                'all_day',
                form.all_day ? '1' : '0'
            );

            payload.append(
                'is_public',
                form.is_public ? '1' : '0'
            );

            if (form.description.trim()) {
                payload.append(
                    'description',
                    form.description.trim()
                );
            }

            if (form.location.trim()) {
                payload.append(
                    'location',
                    form.location.trim()
                );
            }

            if (!form.all_day) {
                payload.append(
                    'start_time',
                    form.start_time
                );

                payload.append(
                    'end_time',
                    form.end_time
                );
            }

            if (newRundown) {
                payload.append(
                    'rundown',
                    newRundown
                );
            }

            if (newTor) {
                payload.append(
                    'tor',
                    newTor
                );
            }

            const response = await api.post(
                `/event-schedule-requests/${selected.id}`,
                payload
            );

            const updated = response?.data?.data;

            if (updated) {
                setSelected(updated);
                setForm(toForm(updated));
            }

            setEditing(false);
            resetReplacementFiles();

            await loadRequests();

            await showSuccessAlert(
                'Pengajuan Diperbarui',
                'Jadwal dan lampiran berhasil disimpan. Status pengajuan tetap menunggu persetujuan.'
            );
        } catch (error) {
            console.error(
                'Update Directorate Request:',
                error?.response?.data || error
            );

            await showErrorAlert(
                'Gagal Menyimpan Perubahan',
                getError(error)
            );
        } finally {
            setProcessing(false);
        }
    };

    const approve = async () => {
        if (!selected || processing) {
            return;
        }

        if (editing) {
            await showWarningAlert(
                'Selesaikan Edit',
                'Simpan atau batalkan perubahan terlebih dahulu.'
            );
            return;
        }

        if (
            !selected.requester_unit ||
            !selected.pic_name
        ) {
            await showWarningAlert(
                'Informasi Pengaju Belum Lengkap',
                'Isi Unit Pengaju dan Nama PIC melalui Edit terlebih dahulu.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Setujui Pengajuan Jadwal?',
            text: `Agenda "${selected.title}" akan dimasukkan ke kalender Direktorat.`,
            confirmButtonText: 'Ya, Setujui',
            cancelButtonText: 'Batal',
            icon: 'question',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            await api.put(
                `/event-schedule-requests/${selected.id}/approve`
            );

            closeAfterAction();
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
                    `Pengajuan tidak dapat disetujui karena berbenturan dengan "${conflict.title || '-'}" pada ${formatDate(conflict.event_date)}.

Pemilik: ${getDirectorateLabel(conflict.directorate)}
Waktu: ${
                        conflict.all_day
                            ? 'Sepanjang Hari'
                            : `${formatTime(conflict.start_time)} - ${formatTime(conflict.end_time)}`
                    }

Silakan edit jadwal pengajuan terlebih dahulu.`
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
        if (!selected || processing) {
            return;
        }

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
            confirmButtonText: 'Ya, Tolak',
            cancelButtonText: 'Batal',
            icon: 'warning',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            await api.put(
                `/event-schedule-requests/${selected.id}/reject`,
                {
                    rejection_reason:
                        rejectionReason.trim(),
                }
            );

            closeAfterAction();
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
        <div className="container-fluid px-0">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-3">
                        SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-bold mb-2">
                        Approval Jadwal Direktorat
                    </h2>

                    <p className="text-muted mb-0">
                        Periksa informasi agenda, lampiran,
                        dan proses persetujuan jadwal pimpinan.
                    </p>
                </div>

                <Link
                    to="/admin/director-schedule"
                    className="btn btn-outline-danger rounded-pill px-4"
                >
                    <i className="bi bi-calendar3 me-2" />
                    Lihat Kalender
                </Link>
            </header>

            <div className="row g-3 mb-4">
                {[
                    ['total', 'Semua Pengajuan', 'bi-grid-fill'],
                    ['pending', 'Menunggu Approval', 'bi-hourglass-split'],
                    ['approved', 'Disetujui', 'bi-check-circle'],
                    ['rejected', 'Ditolak', 'bi-x-circle'],
                ].map(([key, label, icon]) => (
                    <div
                        className="col-12 col-sm-6 col-xl-3"
                        key={key}
                    >
                        <button
                            type="button"
                            className="card border-0 shadow-sm rounded-4 w-100 text-start h-100"
                            onClick={() =>
                                setStatusFilter(
                                    key === 'total' ? 'all' : key
                                )
                            }
                        >
                            <span className="card-body d-flex align-items-center gap-3">
                                <i className={`bi ${icon} fs-3 text-danger`} />

                                <span>
                                    <span className="small text-muted d-block mb-1">
                                        {label}
                                    </span>

                                    <strong className="fs-3">
                                        {summary[key] || 0}
                                    </strong>
                                </span>
                            </span>
                        </button>
                    </div>
                ))}
            </div>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <h5 className="fw-bold mb-0">
                            Daftar Pengajuan Jadwal
                        </h5>

                        <button
                            type="button"
                            className="btn btn-light border rounded-pill"
                            disabled={loading}
                            onClick={loadRequests}
                        >
                            <i className="bi bi-arrow-clockwise me-2" />
                            Refresh
                        </button>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-12 col-lg-5">
                            <input
                                type="search"
                                className="form-control"
                                placeholder="Cari judul, unit, PIC, lokasi..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>

                        <div className="col-12 col-md-6 col-lg-4">
                            <select
                                className="form-select"
                                value={directorateFilter}
                                onChange={(event) =>
                                    setDirectorateFilter(event.target.value)
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

                        <div className="col-12 col-md-6 col-lg-3">
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
                                    Menunggu
                                </option>
                                <option value="approved">
                                    Disetujui
                                </option>
                                <option value="rejected">
                                    Ditolak
                                </option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-danger" />
                            <p className="text-muted mt-3 mb-0">
                                Memuat pengajuan...
                            </p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-3" />
                            Tidak ada pengajuan yang sesuai filter.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle">
                                <thead>
                                    <tr>
                                        <th>Pengajuan</th>
                                        <th>Unit / PIC</th>
                                        <th>Direktorat</th>
                                        <th>Tanggal</th>
                                        <th>Status</th>
                                        <th className="text-end">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRequests.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>
                                                    {item.title}
                                                </strong>

                                                <div className="small text-muted mt-1">
                                                    {item.requester_name || '-'}
                                                </div>
                                            </td>

                                            <td>
                                                {item.requester_unit || '-'}

                                                <div className="small text-muted">
                                                    {item.pic_name || '-'}
                                                </div>
                                            </td>

                                            <td>
                                                {getDirectorateLabel(
                                                    item.directorate
                                                )}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    item.event_date
                                                )}
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                            </td>

                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                    onClick={() =>
                                                        openDetail(item)
                                                    }
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
                </div>
            </section>

            {selected && (
                <div
                    className="modal d-block"
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    style={{
                        background: 'rgba(15,23,42,.65)',
                    }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-4">
                            <div className="modal-header p-4">
                                <div className="min-w-0">
                                    <h5 className="modal-title fw-bold text-break">
                                        {selected.title}
                                    </h5>

                                    <div className="mt-2">
                                        <StatusBadge
                                            status={selected.status}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    disabled={processing}
                                    onClick={closeDetail}
                                    aria-label="Tutup"
                                />
                            </div>

                            <div className="modal-body p-4">
                                {editing && form ? (
                                    <div className="row g-3">
                                        <EditField
                                            label="Unit Pengaju"
                                            required
                                        >
                                            <input
                                                className="form-control"
                                                maxLength={255}
                                                value={form.requester_unit}
                                                onChange={(event) =>
                                                    updateField(
                                                        'requester_unit',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <EditField
                                            label="Nama PIC"
                                            required
                                        >
                                            <input
                                                className="form-control"
                                                maxLength={255}
                                                value={form.pic_name}
                                                onChange={(event) =>
                                                    updateField(
                                                        'pic_name',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </EditField>

                                        <EditField
                                            label="Agenda Untuk"
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
                                            label="Kategori Agenda"
                                        >
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

                                        <EditField
                                            label="Judul Agenda"
                                            required
                                            span="col-12"
                                        >
                                            <input
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
                                            label="Tanggal Kegiatan"
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

                                        <EditField
                                            label="Lokasi"
                                        >
                                            <input
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

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={form.all_day}
                                                    onChange={(event) =>
                                                        updateField(
                                                            'all_day',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label className="form-check-label fw-bold">
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

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Deskripsi / Keperluan
                                            </label>

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
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={form.is_public}
                                                    onChange={(event) =>
                                                        updateField(
                                                            'is_public',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label className="form-check-label fw-bold">
                                                    Tampilkan di Kalender Publik
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <hr className="my-2" />

                                            <h6 className="fw-bold mb-1">
                                                <i className="bi bi-paperclip text-danger me-2" />
                                                Edit Lampiran Kegiatan
                                            </h6>

                                            <p className="small text-muted mb-3">
                                                Unggah file baru hanya jika
                                                ingin mengganti dokumen lama.
                                            </p>
                                        </div>

                                        <EditDocument
                                            id="edit_rundown"
                                            title="Rundown Kegiatan"
                                            existingName={
                                                selected.rundown_name
                                            }
                                            file={newRundown}
                                            required
                                            disabled={processing}
                                            onChange={(event) =>
                                                handleAttachmentChange(
                                                    event,
                                                    setNewRundown,
                                                    'Rundown'
                                                )
                                            }
                                            onRemove={() =>
                                                removeAttachment(
                                                    'edit_rundown',
                                                    setNewRundown
                                                )
                                            }
                                        />

                                        <EditDocument
                                            id="edit_tor"
                                            title="TOR (Term of Reference)"
                                            existingName={
                                                selected.tor_name
                                            }
                                            file={newTor}
                                            disabled={processing}
                                            onChange={(event) =>
                                                handleAttachmentChange(
                                                    event,
                                                    setNewTor,
                                                    'TOR'
                                                )
                                            }
                                            onRemove={() =>
                                                removeAttachment(
                                                    'edit_tor',
                                                    setNewTor
                                                )
                                            }
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="row g-3 mb-4">
                                            <DetailItem
                                                label="Pemohon"
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
                                                label="Judul Agenda"
                                                value={selected.title}
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
                                                        ? 'Sepanjang Hari'
                                                        : `${formatTime(
                                                              selected.start_time
                                                          )} - ${formatTime(
                                                              selected.end_time
                                                          )}`
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

                                        <div className="bg-light rounded-4 p-3 mb-4">
                                            <strong className="d-block mb-2">
                                                Deskripsi / Keperluan
                                            </strong>

                                            <div
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {selected.description || '-'}
                                            </div>
                                        </div>

                                        <DirectorateDocuments
                                            request={selected}
                                            compact
                                        />

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

                                                <p className="mb-0 mt-2">
                                                    {selected.rejection_reason || '-'}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {rejectOpen && !editing && (
                                    <div className="border rounded-4 p-3 mt-3">
                                        <label className="form-label fw-bold">
                                            Alasan Penolakan
                                        </label>

                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            maxLength={2000}
                                            value={rejectionReason}
                                            onChange={(event) =>
                                                setRejectionReason(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Masukkan alasan penolakan..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer p-3">
                                <button
                                    type="button"
                                    className="btn btn-light border rounded-pill"
                                    disabled={processing}
                                    onClick={closeDetail}
                                >
                                    Tutup
                                </button>

                                {selected.status === 'pending' && (
                                    editing ? (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-pill"
                                                disabled={processing}
                                                onClick={cancelEdit}
                                            >
                                                Batal Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-primary rounded-pill"
                                                disabled={processing}
                                                onClick={saveEdit}
                                            >
                                                {processing ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" />
                                                        Menyimpan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-save me-2" />
                                                        Simpan Perubahan
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-pill"
                                                disabled={processing}
                                                onClick={startEdit}
                                            >
                                                <i className="bi bi-pencil-square me-2" />
                                                Edit
                                            </button>

                                            {rejectOpen ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    disabled={processing}
                                                    onClick={reject}
                                                >
                                                    Konfirmasi Tolak
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    disabled={processing}
                                                    onClick={() =>
                                                        setRejectOpen(true)
                                                    }
                                                >
                                                    Tolak
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-success rounded-pill"
                                                disabled={processing}
                                                onClick={approve}
                                            >
                                                <i className="bi bi-check-circle me-2" />
                                                Setujui
                                            </button>
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
