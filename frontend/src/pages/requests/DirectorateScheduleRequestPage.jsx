
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const DIRECTORATES = [
    {
        value: 'direktorat',
        label: 'Direktorat',
        icon: 'bi-people-fill',
        description: 'Agenda bersama pimpinan',
    },
    {
        value: 'direktur',
        label: 'Direktur',
        icon: 'bi-person-badge-fill',
        description: 'Agenda khusus Direktur',
    },
    {
        value: 'wakil_direktur_1',
        label: 'Wakil Direktur I',
        icon: 'bi-person-workspace',
        description: 'Agenda Wakil Direktur I',
    },
    {
        value: 'wakil_direktur_2',
        label: 'Wakil Direktur II',
        icon: 'bi-person-workspace',
        description: 'Agenda Wakil Direktur II',
    },
];

const AGENDA_TYPES = [
    'Rapat',
    'Kunjungan',
    'Internal',
    'Eksternal',
    'Seremonial',
    'Akademik',
    'Lainnya',
];

const INITIAL_FORM = {
    requester_unit: '',
    pic_name: '',
    directorate: '',
    title: '',
    description: '',
    event_date: '',
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    agenda_type: 'Rapat',
    is_public: false,
};

const ACCEPTED_EXTENSIONS = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const formatSize = (bytes) =>
    `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const getErrorMessage = (error) =>
    Object.values(error?.response?.data?.errors || {})
        .flat()
        .find(Boolean) ||
    error?.response?.data?.message ||
    'Pengajuan gagal dikirim.';

function FormField({
    label,
    required = false,
    children,
    hint,
}) {
    return (
        <div className="mb-3">
            <label className="form-label fw-bold">
                {label}
                {required && (
                    <span className="text-danger ms-1">*</span>
                )}
            </label>

            {children}

            {hint && (
                <div className="form-text">{hint}</div>
            )}
        </div>
    );
}

function FileUpload({
    id,
    label,
    required,
    file,
    onChange,
    onRemove,
    disabled,
}) {
    return (
        <div className="border rounded-4 p-3 h-100">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <span className="small fw-bold">
                    {label}
                </span>

                <span
                    className={
                        required
                            ? 'badge rounded-pill bg-danger-subtle text-danger'
                            : 'badge rounded-pill bg-light text-secondary'
                    }
                >
                    {required ? 'Wajib' : 'Opsional'}
                </span>
            </div>

            <label
                htmlFor={id}
                className="d-flex align-items-center justify-content-center gap-2 border border-2 border-dashed rounded-4 bg-light px-3 py-3 w-100"
                style={{
                    cursor: disabled
                        ? 'not-allowed'
                        : 'pointer',
                    minHeight: 68,
                }}
            >
                <i className="bi bi-cloud-arrow-up text-danger fs-5" />
                <span className="small fw-semibold">
                    {file ? 'Ganti Dokumen' : 'Pilih Dokumen'}
                </span>
            </label>

            <input
                id={id}
                type="file"
                className="d-none"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={onChange}
                disabled={disabled}
            />

            {file ? (
                <div className="d-flex align-items-center gap-2 mt-3">
                    <i className="bi bi-file-earmark-check-fill text-success" />

                    <div className="flex-grow-1 min-w-0">
                        <div
                            className="small fw-bold text-truncate"
                            title={file.name}
                        >
                            {file.name}
                        </div>

                        <div className="small text-muted">
                            {formatSize(file.size)}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-circle"
                        disabled={disabled}
                        title="Hapus dokumen"
                        onClick={onRemove}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
            ) : (
                <div className="small text-muted mt-2">
                    PDF, Word, Excel · Maks. 5 MB
                </div>
            )}
        </div>
    );
}

export default function DirectorateScheduleRequestPage() {
    const navigate = useNavigate();

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(
                localStorage.getItem('admin_user') || '{}'
            );
        } catch {
            return {};
        }
    }, []);

    const basePath =
        currentUser.role === 'user'
            ? '/user'
            : '/admin';

    const historyPath = `${basePath}/my-requests`;
    const calendarPath = `${basePath}/director-schedule`;

    const [form, setForm] = useState({
        ...INITIAL_FORM,
    });

    const [rundown, setRundown] = useState(null);
    const [tor, setTor] = useState(null);
    const [saving, setSaving] = useState(false);

    const changeField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const selectedDirectorate = DIRECTORATES.find(
        (item) => item.value === form.directorate
    );

    const handleFileChange = (
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

            showWarningAlert(
                'Format Tidak Didukung',
                `${label} harus berformat PDF, DOC, DOCX, XLS, atau XLSX.`
            );
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            event.target.value = '';
            setter(null);

            showWarningAlert(
                'File Terlalu Besar',
                `${label} maksimal 5 MB.`
            );
            return;
        }

        setter(file);
    };

    const removeFile = (id, setter) => {
        setter(null);

        const input = document.getElementById(id);

        if (input) {
            input.value = '';
        }
    };

    const resetForm = () => {
        setForm({ ...INITIAL_FORM });
        removeFile('directorate_rundown', setRundown);
        removeFile('directorate_tor', setTor);
    };

    const validateForm = async () => {
        if (
            !form.requester_unit.trim() ||
            !form.pic_name.trim()
        ) {
            await showWarningAlert(
                'Informasi Belum Lengkap',
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
                'Agenda Belum Lengkap',
                'Pilih pimpinan serta isi judul dan tanggal kegiatan.'
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

        if (!rundown) {
            await showWarningAlert(
                'Rundown Wajib',
                'Lampirkan rundown kegiatan sebelum mengirim pengajuan.'
            );
            return false;
        }

        return true;
    };

    const isFormValid = Boolean(
        form.requester_unit.trim() &&
        form.pic_name.trim() &&
        form.directorate &&
        form.title.trim() &&
        form.event_date &&
        rundown &&
        (
            form.all_day ||
            (
                form.start_time &&
                form.end_time &&
                form.end_time > form.start_time
            )
        )
    );

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving || !(await validateForm())) {
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Kirim Pengajuan Jadwal?',
            text:
                `Agenda "${form.title.trim()}" akan dikirim ` +
                'untuk persetujuan admin Direktorat.',
            icon: 'question',
            confirmButtonText: 'Ya, Kirim Pengajuan',
            cancelButtonText: 'Batal',
        });

        if (!confirmation?.isConfirmed) {
            return;
        }

        const data = new FormData();

        data.append('requester_unit', form.requester_unit.trim());
        data.append('pic_name', form.pic_name.trim());
        data.append('directorate', form.directorate);
        data.append('title', form.title.trim());
        data.append('event_date', form.event_date);
        data.append('agenda_type', form.agenda_type);
        data.append('all_day', form.all_day ? '1' : '0');
        data.append('is_public', form.is_public ? '1' : '0');

        if (form.description.trim()) {
            data.append('description', form.description.trim());
        }

        if (form.location.trim()) {
            data.append('location', form.location.trim());
        }

        if (!form.all_day) {
            data.append('start_time', form.start_time);
            data.append('end_time', form.end_time);
        }

        data.append('rundown', rundown);

        if (tor) {
            data.append('tor', tor);
        }

        try {
            setSaving(true);

            await api.post(
                '/event-schedule-requests',
                data
            );

            await showSuccessAlert(
                'Pengajuan Berhasil',
                'Pengajuan jadwal berhasil dikirim dan menunggu persetujuan.'
            );

            navigate(historyPath);
        } catch (error) {
            console.error(
                'Submit Directorate Schedule:',
                error?.response?.data || error
            );

            await showErrorAlert(
                'Gagal Mengirim Pengajuan',
                getErrorMessage(error)
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container-fluid px-0">
            <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-3">
                        SEKRETARIAT PIMPINAN
                    </span>

                    <h2 className="fw-black mb-2">
                        Request Jadwal Direktorat
                    </h2>

                    <p className="text-muted mb-0">
                        Ajukan agenda dengan pimpinan
                        Telkom University Surabaya.
                    </p>
                </div>

                <div className="d-flex flex-wrap gap-2">
                    <Link
                        to={historyPath}
                        className="btn btn-outline-danger rounded-pill"
                    >
                        <i className="bi bi-clock-history me-2" />
                        Riwayat Pengajuan
                    </Link>

                    <Link
                        to={calendarPath}
                        className="btn btn-light border rounded-pill"
                    >
                        <i className="bi bi-calendar3 me-2" />
                        Lihat Kalender
                    </Link>
                </div>
            </header>

            <div className="row g-4">
                <div className="col-xl-8">
                    <form onSubmit={handleSubmit}>
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h5 className="fw-black mb-4">
                                    <i className="bi bi-person-lines-fill text-danger me-2" />
                                    Informasi Pengaju
                                </h5>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <FormField label="Unit Pengaju" required>
                                            <input
                                                className="form-control"
                                                value={form.requester_unit}
                                                onChange={(e) =>
                                                    changeField(
                                                        'requester_unit',
                                                        e.target.value
                                                    )
                                                }
                                                maxLength={255}
                                                placeholder="Nama unit atau bagian"
                                                required
                                            />
                                        </FormField>
                                    </div>

                                    <div className="col-md-6">
                                        <FormField label="Nama PIC" required>
                                            <input
                                                className="form-control"
                                                value={form.pic_name}
                                                onChange={(e) =>
                                                    changeField(
                                                        'pic_name',
                                                        e.target.value
                                                    )
                                                }
                                                maxLength={255}
                                                placeholder="Penanggung jawab kegiatan"
                                                required
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h5 className="fw-black mb-4">
                                    <i className="bi bi-calendar2-event-fill text-danger me-2" />
                                    Informasi Agenda
                                </h5>

                                <FormField label="Agenda Untuk" required>
                                    <div className="row g-2">
                                        {DIRECTORATES.map((item) => (
                                            <div
                                                className="col-12 col-md-6"
                                                key={item.value}
                                            >
                                                <button
                                                    type="button"
                                                    className={
                                                        form.directorate === item.value
                                                            ? 'btn btn-outline-danger border-2 rounded-4 p-3 text-start w-100 h-100 bg-danger-subtle'
                                                            : 'btn btn-light border rounded-4 p-3 text-start w-100 h-100'
                                                    }
                                                    onClick={() =>
                                                        changeField(
                                                            'directorate',
                                                            item.value
                                                        )
                                                    }
                                                >
                                                    <div className="d-flex align-items-center gap-3">
                                                        <i className={`bi ${item.icon} fs-4 text-danger`} />
                                                        <span>
                                                            <strong className="d-block">
                                                                {item.label}
                                                            </strong>
                                                            <small className="text-muted">
                                                                {item.description}
                                                            </small>
                                                        </span>
                                                    </div>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </FormField>

                                <FormField label="Judul / Nama Kegiatan" required>
                                    <input
                                        className="form-control"
                                        value={form.title}
                                        onChange={(e) =>
                                            changeField('title', e.target.value)
                                        }
                                        maxLength={255}
                                        required
                                    />
                                </FormField>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <FormField label="Tanggal Kegiatan" required>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={form.event_date}
                                                onChange={(e) =>
                                                    changeField(
                                                        'event_date',
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </FormField>
                                    </div>

                                    <div className="col-md-6">
                                        <FormField label="Kategori Agenda">
                                            <select
                                                className="form-select"
                                                value={form.agenda_type}
                                                onChange={(e) =>
                                                    changeField(
                                                        'agenda_type',
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                {AGENDA_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center rounded-4 bg-light p-3 mb-3">
                                    <div>
                                        <strong>Sepanjang Hari</strong>
                                        <div className="small text-muted">
                                            Aktifkan untuk kegiatan seharian.
                                        </div>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={form.all_day}
                                            onChange={(e) =>
                                                changeField(
                                                    'all_day',
                                                    e.target.checked
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                {!form.all_day && (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <FormField label="Jam Mulai" required>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={form.start_time}
                                                    onChange={(e) =>
                                                        changeField(
                                                            'start_time',
                                                            e.target.value
                                                        )
                                                    }
                                                    required
                                                />
                                            </FormField>
                                        </div>

                                        <div className="col-md-6">
                                            <FormField label="Jam Selesai" required>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={form.end_time}
                                                    onChange={(e) =>
                                                        changeField(
                                                            'end_time',
                                                            e.target.value
                                                        )
                                                    }
                                                    required
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                )}

                                <FormField label="Lokasi Kegiatan">
                                    <input
                                        className="form-control"
                                        value={form.location}
                                        onChange={(e) =>
                                            changeField(
                                                'location',
                                                e.target.value
                                            )
                                        }
                                        maxLength={255}
                                    />
                                </FormField>

                                <FormField label="Deskripsi / Keperluan">
                                    <textarea
                                        rows={4}
                                        className="form-control"
                                        maxLength={5000}
                                        value={form.description}
                                        onChange={(e) =>
                                            changeField(
                                                'description',
                                                e.target.value
                                            )
                                        }
                                    />
                                </FormField>

                                <div className="d-flex justify-content-between align-items-center bg-light rounded-4 p-3">
                                    <div>
                                        <strong>Agenda Publik</strong>
                                        <div className="small text-muted">
                                            Tampilkan agenda setelah disetujui.
                                        </div>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={form.is_public}
                                            onChange={(e) =>
                                                changeField(
                                                    'is_public',
                                                    e.target.checked
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h5 className="fw-black mb-2">
                                    <i className="bi bi-paperclip text-danger me-2" />
                                    Lampiran Kegiatan
                                </h5>

                                <p className="small text-muted mb-3">
                                    Rundown wajib dilampirkan. TOR dapat
                                    ditambahkan jika tersedia.
                                </p>

                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <FileUpload
                                            id="directorate_rundown"
                                            label="Rundown Kegiatan"
                                            required
                                            file={rundown}
                                            disabled={saving}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    e,
                                                    setRundown,
                                                    'Rundown'
                                                )
                                            }
                                            onRemove={() =>
                                                removeFile(
                                                    'directorate_rundown',
                                                    setRundown
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <FileUpload
                                            id="directorate_tor"
                                            label="TOR (Term of Reference)"
                                            file={tor}
                                            disabled={saving}
                                            onChange={(e) =>
                                                handleFileChange(
                                                    e,
                                                    setTor,
                                                    'TOR'
                                                )
                                            }
                                            onRemove={() =>
                                                removeFile(
                                                    'directorate_tor',
                                                    setTor
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="alert alert-info border-0 rounded-4">
                            <i className="bi bi-info-circle-fill me-2" />
                            Jadwal baru masuk kalender setelah
                            disetujui oleh admin.
                        </div>

                        <div className="d-flex justify-content-end flex-wrap gap-2 mb-4">
                            <button
                                type="button"
                                className="btn btn-light border rounded-pill px-4"
                                disabled={saving}
                                onClick={resetForm}
                            >
                                Reset
                            </button>

                            <button
                                type="submit"
                                className="btn btn-danger rounded-pill px-4"
                                disabled={saving || !isFormValid}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send-fill me-2" />
                                        Kirim Pengajuan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h5 className="fw-black mb-3">
                                Ringkasan Pengajuan
                            </h5>

                            <div className="small text-muted mb-2">
                                Judul Kegiatan
                            </div>
                            <h6 className="fw-black">
                                {form.title || 'Belum diisi'}
                            </h6>

                            <hr />

                            {[
                                [
                                    'Unit Pengaju',
                                    form.requester_unit,
                                ],
                                [
                                    'Nama PIC',
                                    form.pic_name,
                                ],
                                [
                                    'Agenda Untuk',
                                    selectedDirectorate?.label,
                                ],
                                [
                                    'Tanggal',
                                    form.event_date,
                                ],
                                [
                                    'Waktu',
                                    form.all_day
                                        ? 'Sepanjang Hari'
                                        : `${form.start_time} - ${form.end_time}`,
                                ],
                                [
                                    'Kategori',
                                    form.agenda_type,
                                ],
                                [
                                    'Lokasi',
                                    form.location,
                                ],
                                [
                                    'Rundown',
                                    rundown?.name,
                                ],
                                [
                                    'TOR',
                                    tor?.name || 'Tidak dilampirkan',
                                ],
                            ].map(([label, value]) => (
                                <div className="mb-3" key={label}>
                                    <div className="small text-muted">
                                        {label}
                                    </div>
                                    <div className="fw-semibold text-break">
                                        {value || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .fw-black {
                    font-weight: 900 !important;
                }
            `}</style>
        </div>
    );
}
