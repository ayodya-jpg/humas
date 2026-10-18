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
        description: 'Agenda bersama seluruh pimpinan.',
        icon: 'bi-people-fill',
    },
    {
        value: 'direktur',
        label: 'Direktur',
        description: 'Agenda khusus Direktur.',
        icon: 'bi-person-badge-fill',
    },
    {
        value: 'wakil_direktur_1',
        label: 'Wakil Direktur I',
        description: 'Agenda khusus Wakil Direktur I.',
        icon: 'bi-person-workspace',
    },
    {
        value: 'wakil_direktur_2',
        label: 'Wakil Direktur II',
        description: 'Agenda khusus Wakil Direktur II.',
        icon: 'bi-person-workspace',
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

const AGENDA_COLORS = {
    Rapat: '#7F1D1D',
    Kunjungan: '#1D4ED8',
    Internal: '#4338CA',
    Eksternal: '#047857',
    Seremonial: '#C2410C',
    Akademik: '#7E22CE',
    Lainnya: '#475569',
};

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

function getCurrentUser() {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
}

function getErrorMessage(error) {
    const data = error?.response?.data;

    return (
        Object.values(data?.errors || {})
            .flat()
            .find(Boolean) ||
        data?.message ||
        'Terjadi kesalahan saat mengirim pengajuan.'
    );
}

function formatDate(value) {
    if (!value) return '-';

    const [year, month, day] = value
        .split('-')
        .map(Number);

    return new Date(
        year,
        month - 1,
        day
    ).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function FormField({
    label,
    required = false,
    hint,
    children,
}) {
    return (
        <div>
            <label className="form-label fw-bold mb-2">
                {label}
                {required && (
                    <span className="text-danger ms-1">*</span>
                )}
            </label>

            {children}

            {hint && (
                <div className="form-text mt-2">
                    {hint}
                </div>
            )}
        </div>
    );
}

function PreviewItem({ icon, label, value }) {
    return (
        <div className="dsrq-preview-row">
            <i className={`bi ${icon}`} />

            <div>
                <small>{label}</small>
                <strong>{value || '-'}</strong>
            </div>
        </div>
    );
}

export default function DirectorateScheduleRequestPage() {
    const navigate = useNavigate();

    const currentUser = useMemo(
        () => getCurrentUser(),
        []
    );

    const basePath =
        currentUser.role === 'user'
            ? '/user'
            : '/admin';

    const historyPath = `${basePath}/my-requests`;
    const calendarPath = `${basePath}/director-schedule`;

    const [form, setForm] = useState({
        ...INITIAL_FORM,
    });

    const [saving, setSaving] = useState(false);

    const selectedDirectorate = DIRECTORATES.find(
        (item) => item.value === form.directorate
    );

    const agendaColor =
        AGENDA_COLORS[form.agenda_type] ||
        AGENDA_COLORS.Lainnya;

    const changeField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const isFormValid =
        form.requester_unit.trim().length > 0 &&
        form.pic_name.trim().length > 0 &&
        form.directorate !== '' &&
        form.title.trim().length > 0 &&
        form.event_date !== '' &&
        (
            form.all_day ||
            (
                form.start_time !== '' &&
                form.end_time !== '' &&
                form.end_time > form.start_time
            )
        );

    const validateForm = async () => {
        if (!form.requester_unit.trim()) {
            await showWarningAlert(
                'Unit Pengaju Belum Diisi',
                'Masukkan nama unit yang mengajukan agenda.'
            );
            return false;
        }

        if (!form.pic_name.trim()) {
            await showWarningAlert(
                'Nama PIC Belum Diisi',
                'Masukkan nama penanggung jawab kegiatan.'
            );
            return false;
        }

        if (!form.directorate) {
            await showWarningAlert(
                'Pilih Agenda Untuk',
                'Pilih pimpinan yang dituju.'
            );
            return false;
        }

        if (!form.title.trim() || !form.event_date) {
            await showWarningAlert(
                'Data Belum Lengkap',
                'Judul dan tanggal kegiatan wajib diisi.'
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

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving || !(await validateForm())) {
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Kirim Pengajuan Jadwal?',
            text:
                `Agenda "${form.title.trim()}" dari ` +
                `${form.requester_unit.trim()} ` +
                `dengan PIC ${form.pic_name.trim()} ` +
                'akan dikirim untuk persetujuan admin.',
            icon: 'question',
            confirmButtonText: 'Ya, Kirim Pengajuan',
            cancelButtonText: 'Batal',
        });

        if (!confirmation?.isConfirmed) return;

        const payload = {
            requester_unit: form.requester_unit.trim(),
            pic_name: form.pic_name.trim(),
            directorate: form.directorate,
            title: form.title.trim(),
            description:
                form.description.trim() || null,
            event_date: form.event_date,
            start_time: form.all_day
                ? null
                : form.start_time,
            end_time: form.all_day
                ? null
                : form.end_time,
            all_day: Boolean(form.all_day),
            location:
                form.location.trim() || null,
            agenda_type: form.agenda_type,
            is_public: Boolean(form.is_public),
        };

        try {
            setSaving(true);

            await api.post(
                '/event-schedule-requests',
                payload
            );

            await showSuccessAlert(
                'Pengajuan Berhasil',
                'Pengajuan jadwal berhasil dikirim. Pantau statusnya di Riwayat Pengajuan.'
            );

            navigate(historyPath);
        } catch (error) {
            console.error(
                'Submit schedule request:',
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
        <div className="dsrq-page">
            {/* HEADER */}

            <header className="dsrq-header">
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

                <div className="dsrq-header-actions">
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
                {/* FORM */}

                <div className="col-xl-8">
                    <form
                        className="dsrq-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="dsrq-section-heading">
                            <div className="dsrq-section-icon">
                                <i className="bi bi-person-lines-fill" />
                            </div>

                            <div>
                                <h5 className="fw-black mb-1">
                                    Informasi Pengaju
                                </h5>
                                <p className="text-muted small mb-0">
                                    Identitas unit dan penanggung jawab kegiatan.
                                </p>
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            {/* FIELD BARU: UNIT */}

                            <div className="col-md-6">
                                <FormField
                                    label="Unit Pengaju"
                                    required
                                    hint="Isi Nama Unit / Bagian / Divisi yang mengajukan agenda."
                                >
                                    <input
                                        type="text"
                                        className="form-control form-control-lg"
                                        placeholder="Contoh: Unit Sekretariat Pimpinan"
                                        maxLength={255}
                                        value={form.requester_unit}
                                        onChange={(event) =>
                                            changeField(
                                                'requester_unit',
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                            </div>

                            {/* FIELD BARU: PIC */}

                            <div className="col-md-6">
                                <FormField
                                    label="Nama PIC"
                                    required
                                    hint="Penanggung jawab kegiatan."
                                >
                                    <input
                                        type="text"
                                        className="form-control form-control-lg"
                                        placeholder="Nama lengkap PIC"
                                        maxLength={255}
                                        value={form.pic_name}
                                        onChange={(event) =>
                                            changeField(
                                                'pic_name',
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="dsrq-section-heading">
                            <div className="dsrq-section-icon">
                                <i className="bi bi-calendar2-event-fill" />
                            </div>

                            <div>
                                <h5 className="fw-black mb-1">
                                    Informasi Agenda
                                </h5>
                                <p className="text-muted small mb-0">
                                    Tentukan jadwal dan pimpinan yang dituju.
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <FormField
                                label="Agenda Untuk"
                                required
                            >
                                <div className="dsrq-directorates">
                                    {DIRECTORATES.map((item) => {
                                        const active =
                                            form.directorate ===
                                            item.value;

                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                className={`dsrq-directorate ${
                                                    active ? 'active' : ''
                                                }`}
                                                onClick={() =>
                                                    changeField(
                                                        'directorate',
                                                        item.value
                                                    )
                                                }
                                            >
                                                <span className="dsrq-directorate-icon">
                                                    <i
                                                        className={`bi ${item.icon}`}
                                                    />
                                                </span>

                                                <span className="flex-grow-1">
                                                    <strong className="d-block">
                                                        {item.label}
                                                    </strong>
                                                    <small>
                                                        {item.description}
                                                    </small>
                                                </span>

                                                {active && (
                                                    <i className="bi bi-check-circle-fill text-danger" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FormField>
                        </div>

                        <div className="mb-4">
                            <FormField
                                label="Judul / Nama Kegiatan"
                                required
                            >
                                <input
                                    type="text"
                                    className="form-control form-control-lg"
                                    placeholder="Contoh: Rapat Koordinasi Program Kerja"
                                    maxLength={255}
                                    value={form.title}
                                    onChange={(event) =>
                                        changeField(
                                            'title',
                                            event.target.value
                                        )
                                    }
                                    required
                                />
                            </FormField>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <FormField
                                    label="Tanggal Kegiatan"
                                    required
                                >
                                    <input
                                        type="date"
                                        className="form-control form-control-lg"
                                        value={form.event_date}
                                        onChange={(event) =>
                                            changeField(
                                                'event_date',
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                            </div>

                            <div className="col-md-6">
                                <FormField label="Kategori Agenda">
                                    <select
                                        className="form-select form-select-lg"
                                        value={form.agenda_type}
                                        onChange={(event) =>
                                            changeField(
                                                'agenda_type',
                                                event.target.value
                                            )
                                        }
                                    >
                                        {AGENDA_TYPES.map((type) => (
                                            <option
                                                key={type}
                                                value={type}
                                            >
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="dsrq-switch mb-4">
                            <div>
                                <strong className="d-block">
                                    Sepanjang Hari
                                </strong>
                                <small className="text-muted">
                                    Aktifkan jika agenda berlangsung seharian.
                                </small>
                            </div>

                            <div className="form-check form-switch">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={form.all_day}
                                    onChange={(event) =>
                                        changeField(
                                            'all_day',
                                            event.target.checked
                                        )
                                    }
                                    aria-label="Agenda sepanjang hari"
                                />
                            </div>
                        </div>

                        {!form.all_day && (
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <FormField
                                        label="Jam Mulai"
                                        required
                                    >
                                        <input
                                            type="time"
                                            className="form-control form-control-lg"
                                            value={form.start_time}
                                            onChange={(event) =>
                                                changeField(
                                                    'start_time',
                                                    event.target.value
                                                )
                                            }
                                            required
                                        />
                                    </FormField>
                                </div>

                                <div className="col-md-6">
                                    <FormField
                                        label="Jam Selesai"
                                        required
                                    >
                                        <input
                                            type="time"
                                            className="form-control form-control-lg"
                                            value={form.end_time}
                                            onChange={(event) =>
                                                changeField(
                                                    'end_time',
                                                    event.target.value
                                                )
                                            }
                                            required
                                        />
                                    </FormField>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <FormField label="Lokasi Kegiatan">
                                <input
                                    type="text"
                                    className="form-control form-control-lg"
                                    placeholder="Contoh: Ruang Rapat Harmony"
                                    maxLength={255}
                                    value={form.location}
                                    onChange={(event) =>
                                        changeField(
                                            'location',
                                            event.target.value
                                        )
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="mb-4">
                            <FormField
                                label="Deskripsi / Keperluan"
                                hint="Tuliskan informasi pendukung untuk admin."
                            >
                                <textarea
                                    className="form-control"
                                    rows={5}
                                    maxLength={5000}
                                    value={form.description}
                                    onChange={(event) =>
                                        changeField(
                                            'description',
                                            event.target.value
                                        )
                                    }
                                    placeholder="Tujuan dan rincian kegiatan..."
                                />
                            </FormField>
                        </div>

                        <div className="dsrq-switch mb-4">
                            <div>
                                <strong className="d-block">
                                    Agenda Publik
                                </strong>
                                <small className="text-muted">
                                    Agenda yang disetujui boleh ditampilkan
                                    pada kalender publik.
                                </small>
                            </div>

                            <div className="form-check form-switch">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={form.is_public}
                                    onChange={(event) =>
                                        changeField(
                                            'is_public',
                                            event.target.checked
                                        )
                                    }
                                    aria-label="Agenda publik"
                                />
                            </div>
                        </div>

                        <div className="alert alert-info border-0 rounded-4 mb-4">
                            <i className="bi bi-info-circle-fill me-2" />
                            Jadwal belum masuk kalender sebelum disetujui.
                            Status dapat dipantau melalui Riwayat Pengajuan.
                        </div>

                        <div className="dsrq-actions">
                            <button
                                type="button"
                                className="btn btn-light border rounded-pill px-4"
                                disabled={saving}
                                onClick={() =>
                                    setForm({ ...INITIAL_FORM })
                                }
                            >
                                <i className="bi bi-arrow-counterclockwise me-2" />
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

                {/* RINGKASAN */}

                <div className="col-xl-4">
                    <div className="dsrq-preview">
                        <div className="dsrq-preview-heading">
                            <div className="dsrq-section-icon">
                                <i className="bi bi-calendar2-check-fill" />
                            </div>

                            <div>
                                <h5 className="fw-black mb-1">
                                    Ringkasan Pengajuan
                                </h5>
                                <p className="small text-muted mb-0">
                                    Pratinjau sebelum dikirim.
                                </p>
                            </div>
                        </div>

                        <div
                            style={{
                                height: 6,
                                background: agendaColor,
                            }}
                        />

                        <div className="p-4">
                            <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-3">
                                Draft Pengajuan
                            </span>

                            <h5 className="fw-black mb-3">
                                {form.title.trim() ||
                                    'Judul agenda belum diisi'}
                            </h5>

                            <PreviewItem
                                icon="bi-building"
                                label="Unit Pengaju"
                                value={form.requester_unit}
                            />

                            <PreviewItem
                                icon="bi-person-check"
                                label="Nama PIC"
                                value={form.pic_name}
                            />

                            <PreviewItem
                                icon="bi-person-badge"
                                label="Agenda Untuk"
                                value={
                                    selectedDirectorate?.label ||
                                    'Belum dipilih'
                                }
                            />

                            <PreviewItem
                                icon="bi-calendar3"
                                label="Tanggal"
                                value={formatDate(form.event_date)}
                            />

                            <PreviewItem
                                icon="bi-clock"
                                label="Waktu"
                                value={
                                    form.all_day
                                        ? 'Sepanjang Hari'
                                        : `${form.start_time} - ${form.end_time} WIB`
                                }
                            />

                            <PreviewItem
                                icon="bi-tag"
                                label="Kategori"
                                value={form.agenda_type}
                            />

                            <PreviewItem
                                icon="bi-geo-alt"
                                label="Lokasi"
                                value={form.location || 'Belum ditentukan'}
                            />

                            <PreviewItem
                                icon="bi-globe2"
                                label="Visibilitas"
                                value={
                                    form.is_public
                                        ? 'Publik'
                                        : 'Internal'
                                }
                            />
                        </div>
                    </div>

                    <div className="dsrq-help">
                        <div className="dsrq-section-icon mx-auto mb-3">
                            <i className="bi bi-clock-history" />
                        </div>

                        <h6 className="fw-black mb-2">
                            Pantau Pengajuan
                        </h6>

                        <p className="text-muted small">
                            Riwayat Jadwal Direktorat sudah digabung
                            dengan riwayat layanan lainnya.
                        </p>

                        <Link
                            to={historyPath}
                            className="btn btn-outline-danger rounded-pill w-100"
                        >
                            Buka Riwayat Pengajuan
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
                .dsrq-page {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    min-width: 0;
                }

                .dsrq-page .fw-black {
                    font-weight: 900 !important;
                }

                .dsrq-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 18px;
                }

                .dsrq-header h2 {
                    font-size: 1.9rem;
                }

                .dsrq-header-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .dsrq-form,
                .dsrq-preview,
                .dsrq-help {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 22px;
                    box-shadow: 0 6px 20px rgba(15, 23, 42, .04);
                }

                .dsrq-form {
                    padding: 25px;
                }

                .dsrq-section-heading,
                .dsrq-preview-heading {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding-bottom: 16px;
                    margin-bottom: 22px;
                    border-bottom: 1px solid #f1f5f9;
                }

                .dsrq-preview-heading {
                    padding: 20px;
                    margin: 0;
                }

                .dsrq-section-icon {
                    width: 46px;
                    height: 46px;
                    flex: 0 0 46px;
                    display: grid;
                    place-items: center;
                    border-radius: 14px;
                    background: #fff1f2;
                    color: #7f1d1d;
                    font-size: 1.2rem;
                }

                .dsrq-directorates {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .dsrq-directorate {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    min-width: 0;
                    min-height: 80px;
                    padding: 12px;
                    text-align: left;
                    background: #fff;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    border-radius: 15px;
                }

                .dsrq-directorate.active {
                    border-color: #7f1d1d;
                    background: #fff7f7;
                    color: #7f1d1d;
                }

                .dsrq-directorate-icon {
                    width: 42px;
                    height: 42px;
                    flex: 0 0 42px;
                    display: grid;
                    place-items: center;
                    border-radius: 12px;
                    background: #f1f5f9;
                    color: #64748b;
                }

                .dsrq-directorate.active .dsrq-directorate-icon {
                    background: #7f1d1d;
                    color: #fff;
                }

                .dsrq-directorate small {
                    display: block;
                    margin-top: 3px;
                    color: #94a3b8;
                    font-size: .72rem;
                }

                .dsrq-switch {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 15px;
                    background: #f8fafc;
                }

                .dsrq-switch .form-check-input {
                    width: 2.5rem;
                    height: 1.35rem;
                    cursor: pointer;
                }

                .dsrq-actions {
                    display: flex;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding-top: 18px;
                    border-top: 1px solid #f1f5f9;
                }

                .dsrq-actions .btn {
                    min-height: 44px;
                    font-weight: 800;
                }

                .dsrq-preview {
                    overflow: hidden;
                    margin-bottom: 16px;
                }

                .dsrq-preview-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px 0;
                    border-bottom: 1px solid #f1f5f9;
                }

                .dsrq-preview-row:last-child {
                    border-bottom: 0;
                }

                .dsrq-preview-row > i {
                    color: #7f1d1d;
                    margin-top: 2px;
                }

                .dsrq-preview-row > div {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                }

                .dsrq-preview-row small {
                    font-size: .71rem;
                    font-weight: 800;
                    color: #94a3b8;
                }

                .dsrq-preview-row strong {
                    font-size: .85rem;
                    color: #334155;
                    overflow-wrap: anywhere;
                }

                .dsrq-help {
                    padding: 22px;
                    text-align: center;
                }

                @media (max-width: 767px) {
                    .dsrq-header h2 {
                        font-size: 1.5rem;
                    }

                    .dsrq-header-actions {
                        width: 100%;
                    }

                    .dsrq-header-actions .btn {
                        flex: 1;
                        font-size: .8rem;
                    }

                    .dsrq-form {
                        padding: 17px;
                    }

                    .dsrq-directorates {
                        grid-template-columns: 1fr;
                    }

                    .dsrq-actions {
                        flex-direction: column-reverse;
                    }

                    .dsrq-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}