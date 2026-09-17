import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import themePlugin from '@fullcalendar/react/themes/monarch';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/monarch/theme.css';
import '@fullcalendar/react/themes/monarch/palettes/red.css';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const AGENDA_TYPES = [
    'Rapat',
    'Kunjungan',
    'Internal',
    'Eksternal',
    'Seremonial',
    'Akademik',
    'Lainnya',
];

const getStoredUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const getEmptyForm = (
    date = ''
) => ({
    id: null,
    title: '',
    description: '',
    event_date: date,
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    agenda_type: 'Rapat',
    color: '#7F1D1D',
    is_public: true,
});

const extractErrorMessage = (
    error
) => {
    const data =
        error?.response?.data;

    if (data?.errors) {
        const firstError =
            Object.values(
                data.errors
            )
                .flat()
                .find(Boolean);

        if (firstError) {
            return firstError;
        }
    }

    return (
        data?.message ||
        'Terjadi kesalahan pada server.'
    );
};

const formatDate = (
    value
) => {
    if (!value) {
        return '-';
    }

    if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [
            year,
            month,
            day,
        ] = value
            .split('-')
            .map(Number);

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }
        );
    }

    return '-';
};

export default function DirectorSchedulePage() {
    const currentUser =
        useMemo(
            () =>
                getStoredUser(),
            []
        );

    const [
        events,
        setEvents,
    ] = useState([]);

    const [
        canManage,
        setCanManage,
    ] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        modalOpen,
        setModalOpen,
    ] = useState(false);

    const [
        detailMode,
        setDetailMode,
    ] = useState(false);

    const [
        selectedEvent,
        setSelectedEvent,
    ] = useState(null);

    const [
        form,
        setForm,
    ] = useState(
        getEmptyForm()
    );

    const [
        saving,
        setSaving,
    ] = useState(false);

    const userCanPotentiallyManage =
        [
            'admin',
            'admin_humas',
            'admin_sekpim',
            'superadmin',
        ].includes(
            currentUser?.role
        );

    /*
    |--------------------------------------------------------------------------
    | LOAD EVENTS
    |--------------------------------------------------------------------------
    */

    const loadEvents =
        useCallback(
            async () => {
                try {
                    setLoading(true);

                    const response =
                        await api.get(
                            '/event-schedules'
                        );

                    const data =
                        response?.data?.data ||
                        {};

                    setEvents(
                        Array.isArray(
                            data.events
                        )
                            ? data.events
                            : []
                    );

                    setCanManage(
                        Boolean(
                            data.can_manage
                        )
                    );
                } catch (error) {
                    console.error(
                        'Load director schedule error:',
                        error?.response?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Jadwal',
                        extractErrorMessage(
                            error
                        )
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(
        () => {
            loadEvents();
        },
        [
            loadEvents,
        ]
    );

    /*
    |--------------------------------------------------------------------------
    | MODAL
    |--------------------------------------------------------------------------
    */

    const openCreateModal = (
        date = ''
    ) => {
        setSelectedEvent(null);
        setDetailMode(false);

        setForm(
            getEmptyForm(
                date
            )
        );

        setModalOpen(true);
    };

    const openDetailModal = (
        event
    ) => {
        setSelectedEvent(
            event
        );

        setForm({
            id:
                event.id,

            title:
                event.title ||
                '',

            description:
                event.description ||
                '',

            event_date:
                event.event_date ||
                '',

            start_time:
                event.start_time ||
                '09:00',

            end_time:
                event.end_time ||
                '10:00',

            all_day:
                Boolean(
                    event.all_day
                ),

            location:
                event.location ||
                '',

            agenda_type:
                event.agenda_type ||
                'Rapat',

            color:
                event.color ||
                '#7F1D1D',

            is_public:
                Boolean(
                    event.is_public
                ),
        });

        setDetailMode(true);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) {
            return;
        }

        setModalOpen(false);
        setSelectedEvent(null);
        setDetailMode(false);
    };

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    const handleFormChange = (
        field,
        value
    ) => {
        setForm(
            (
                previous
            ) => ({
                ...previous,
                [field]: value,
            })
        );
    };

    const validateForm =
        async () => {
            if (
                !form.title.trim()
            ) {
                await showWarningAlert(
                    'Judul Belum Diisi',
                    'Judul agenda wajib diisi.'
                );

                return false;
            }

            if (!form.event_date) {
                await showWarningAlert(
                    'Tanggal Belum Dipilih',
                    'Tanggal agenda wajib dipilih.'
                );

                return false;
            }

            if (!form.all_day) {
                if (
                    !form.start_time ||
                    !form.end_time
                ) {
                    await showWarningAlert(
                        'Jam Belum Lengkap',
                        'Jam mulai dan jam selesai wajib diisi.'
                    );

                    return false;
                }

                if (
                    form.end_time <=
                    form.start_time
                ) {
                    await showWarningAlert(
                        'Jam Tidak Valid',
                        'Jam selesai harus setelah jam mulai.'
                    );

                    return false;
                }
            }

            return true;
        };

    /*
    |--------------------------------------------------------------------------
    | CALENDAR ACTION
    |--------------------------------------------------------------------------
    */

    const handleDateClick = (
        info
    ) => {
        if (!canManage) {
            return;
        }

        openCreateModal(
            info.dateStr
        );
    };

    const handleEventClick = (
        info
    ) => {
        const id =
            Number(
                info.event.id
            );

        const event =
            events.find(
                (
                    item
                ) =>
                    Number(
                        item.id
                    ) ===
                    id
            );

        if (event) {
            openDetailModal(
                event
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    const handleSave =
        async () => {
            if (
                !canManage ||
                !userCanPotentiallyManage
            ) {
                await showErrorAlert(
                    'Akses Ditolak',
                    'Akun tidak memiliki izin mengelola Jadwal Direktur.'
                );

                return;
            }

            if (
                !(await validateForm())
            ) {
                return;
            }

            const isEdit =
                Boolean(
                    form.id
                );

            const confirmation =
                await showConfirmAlert({
                    title:
                        isEdit
                            ? 'Simpan Perubahan Agenda?'
                            : 'Tambahkan Agenda?',

                    text:
                        isEdit
                            ? 'Perubahan akan langsung tampil di kalender.'
                            : 'Agenda akan langsung ditambahkan ke kalender.',

                    confirmButtonText:
                        isEdit
                            ? 'Ya, simpan'
                            : 'Ya, tambahkan',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#7f1d1d',
                });

            if (
                !confirmation.isConfirmed
            ) {
                return;
            }

            const payload = {
                title:
                    form.title.trim(),

                description:
                    form.description.trim() ||
                    null,

                event_date:
                    form.event_date,

                all_day:
                    Boolean(
                        form.all_day
                    ),

                start_time:
                    form.all_day
                        ? null
                        : form.start_time,

                end_time:
                    form.all_day
                        ? null
                        : form.end_time,

                location:
                    form.location.trim() ||
                    null,

                agenda_type:
                    form.agenda_type,

                color:
                    form.color,

                is_public:
                    Boolean(
                        form.is_public
                    ),
            };

            try {
                setSaving(true);

                showLoadingAlert(
                    isEdit
                        ? 'Menyimpan Agenda'
                        : 'Menambahkan Agenda',

                    'Mohon tunggu sebentar.'
                );

                const response =
                    isEdit
                        ? await api.put(
                              `/event-schedules/${form.id}`,
                              payload
                          )
                        : await api.post(
                              '/event-schedules',
                              payload
                          );

                closeAlert();

                await showSuccessAlert(
                    isEdit
                        ? 'Agenda Diperbarui'
                        : 'Agenda Ditambahkan',

                    response?.data?.message ||
                        'Data agenda berhasil disimpan.'
                );

                setModalOpen(false);
                setSelectedEvent(null);
                setDetailMode(false);

                await loadEvents();
            } catch (error) {
                console.error(
                    'Save director schedule error:',
                    error?.response?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Gagal Menyimpan Agenda',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSaving(false);
            }
        };

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    const handleDelete =
        async () => {
            if (
                !selectedEvent ||
                !canManage
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Hapus Agenda?',

                    text:
                        `Agenda "${selectedEvent.title}" akan dihapus permanen.`,

                    confirmButtonText:
                        'Ya, hapus',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'warning',

                    confirmButtonColor:
                        '#dc2626',
                });

            if (
                !confirmation.isConfirmed
            ) {
                return;
            }

            try {
                setSaving(true);

                showLoadingAlert(
                    'Menghapus Agenda',
                    'Mohon tunggu sebentar.'
                );

                await api.delete(
                    `/event-schedules/${selectedEvent.id}`
                );

                closeAlert();

                await showSuccessAlert(
                    'Agenda Dihapus',
                    'Agenda berhasil dihapus.'
                );

                setModalOpen(false);
                setSelectedEvent(null);
                setDetailMode(false);

                await loadEvents();
            } catch (error) {
                console.error(
                    'Delete director schedule error:',
                    error?.response?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Gagal Menghapus Agenda',
                    extractErrorMessage(
                        error
                    )
                );
            } finally {
                setSaving(false);
            }
        };

    /*
    |--------------------------------------------------------------------------
    | CALENDAR DATA
    |--------------------------------------------------------------------------
    */

    const calendarEvents =
        useMemo(
            () =>
                events.map(
                    (
                        item
                    ) => ({
                        id:
                            String(
                                item.id
                            ),

                        title:
                            item.title,

                        start:
                            item.start,

                        end:
                            item.end,

                        allDay:
                            Boolean(
                                item.allDay ??
                                    item.all_day
                            ),

                        backgroundColor:
                            item.color ||
                            '#7F1D1D',

                        borderColor:
                            item.color ||
                            '#7F1D1D',

                        textColor:
                            '#ffffff',
                    })
                ),
            [
                events,
            ]
        );

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body py-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-black mb-0">
                        Memuat Jadwal Direktur
                    </h5>
                </div>
            </div>
        );
    }

    return (
        <div className="director-schedule-page">
            {/* =====================================================
                HEADER
            ===================================================== */}

            <section className="director-schedule-top">
                <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                            SEKRETARIAT PIMPINAN
                        </span>

                        <span className="badge rounded-pill bg-white text-dark border px-3 py-2">
                            <i className="bi bi-calendar-event me-2" />

                            {events.length} Agenda
                        </span>
                    </div>

                    <h2 className="fw-black mb-1">
                        Jadwal Direktur
                    </h2>

                    <p className="text-muted mb-0">
                        Kalender agenda dan kegiatan Direktur Telkom University Surabaya.
                    </p>
                </div>

                {canManage && (
                    <button
                        type="button"
                        className="btn btn-danger rounded-pill director-add-button"
                        onClick={() =>
                            openCreateModal()
                        }
                    >
                        <i className="bi bi-plus-lg me-2" />

                        Tambah Agenda
                    </button>
                )}
            </section>

            {/* =====================================================
                CALENDAR
            ===================================================== */}

            <section className="card border-0 shadow-sm director-calendar-card">
                <div className="card-body director-calendar-body">
                    <div className="director-calendar-viewport">
                        <FullCalendar
                            plugins={[
                                themePlugin,
                                dayGridPlugin,
                                timeGridPlugin,
                                interactionPlugin,
                            ]}
                            initialView="dayGridMonth"
                            locale="id"
                            firstDay={1}
                            height="100%"
                            expandRows
                            events={
                                calendarEvents
                            }
                            dateClick={
                                handleDateClick
                            }
                            eventClick={
                                handleEventClick
                            }
                            headerToolbar={{
                                start:
                                    'prev,next today',

                                center:
                                    'title',

                                end:
                                    'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            buttons={{
                                today: {
                                    text:
                                        'Hari Ini',
                                },

                                dayGridMonth: {
                                    text:
                                        'Bulan',
                                },

                                timeGridWeek: {
                                    text:
                                        'Minggu',
                                },

                                timeGridDay: {
                                    text:
                                        'Hari',
                                },
                            }}
                            eventTimeFormat={{
                                hour:
                                    '2-digit',

                                minute:
                                    '2-digit',

                                hour12:
                                    false,
                            }}
                            slotLabelFormat={{
                                hour:
                                    '2-digit',

                                minute:
                                    '2-digit',

                                hour12:
                                    false,
                            }}
                            slotMinTime="06:00:00"
                            slotMaxTime="22:00:00"
                            slotDuration="00:30:00"
                            nowIndicator
                            navLinks
                            selectable={
                                canManage
                            }
                            dayMaxEvents={3}
                            fixedWeekCount={
                                false
                            }
                        />
                    </div>
                </div>
            </section>

            {/* =====================================================
                MODAL
            ===================================================== */}

            {modalOpen && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{
                        background:
                            'rgba(15, 23, 42, .58)',
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            <div
                                style={{
                                    height:
                                        7,

                                    background:
                                        form.color ||
                                        '#7F1D1D',
                                }}
                            />

                            <div className="modal-header border-0 p-4 pb-2">
                                <div>
                                    <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2 mb-2">
                                        {form.id
                                            ? 'DETAIL AGENDA'
                                            : 'AGENDA BARU'}
                                    </span>

                                    <h4 className="fw-black mb-0">
                                        {form.id
                                            ? form.title
                                            : 'Tambah Agenda Direktur'}
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                />
                            </div>

                            <div className="modal-body p-4">
                                {detailMode ? (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="p-4 rounded-4 bg-light">
                                                <div className="text-muted mb-1">
                                                    Judul Agenda
                                                </div>

                                                <div className="fs-4 fw-black">
                                                    {form.title}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Tanggal
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {formatDate(
                                                        form.event_date
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Waktu
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {form.all_day
                                                        ? 'Sepanjang Hari'
                                                        : `${form.start_time} - ${form.end_time}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Kategori
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {form.agenda_type}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light h-100">
                                                <div className="text-muted mb-1">
                                                    Lokasi
                                                </div>

                                                <div className="fw-black fs-5">
                                                    {form.location ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 rounded-4 bg-light">
                                                <div className="text-muted mb-1">
                                                    Deskripsi
                                                </div>

                                                <div
                                                    style={{
                                                        whiteSpace:
                                                            'pre-line',

                                                        lineHeight:
                                                            1.8,
                                                    }}
                                                >
                                                    {form.description ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <span
                                                className={`badge rounded-pill px-3 py-2 fs-6 ${
                                                    form.is_public
                                                        ? 'bg-success-subtle text-success'
                                                        : 'bg-secondary-subtle text-secondary'
                                                }`}
                                            >
                                                <i
                                                    className={`bi ${
                                                        form.is_public
                                                            ? 'bi-globe2'
                                                            : 'bi-lock-fill'
                                                    } me-2`}
                                                />

                                                {form.is_public
                                                    ? 'Tampil di Login'
                                                    : 'Hanya Internal'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Judul Agenda
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.title
                                                }
                                                maxLength="255"
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'title',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Tanggal
                                            </label>

                                            <input
                                                type="date"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.event_date
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'event_date',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Kategori
                                            </label>

                                            <select
                                                className="form-select form-select-lg"
                                                value={
                                                    form.agenda_type
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'agenda_type',
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {AGENDA_TYPES.map(
                                                    (
                                                        agendaType
                                                    ) => (
                                                        <option
                                                            key={
                                                                agendaType
                                                            }
                                                            value={
                                                                agendaType
                                                            }
                                                        >
                                                            {agendaType}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="agendaAllDay"
                                                    checked={
                                                        form.all_day
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'all_day',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="agendaAllDay"
                                                >
                                                    Sepanjang Hari
                                                </label>
                                            </div>
                                        </div>

                                        {!form.all_day && (
                                            <>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">
                                                        Jam Mulai
                                                    </label>

                                                    <input
                                                        type="time"
                                                        className="form-control form-control-lg"
                                                        value={
                                                            form.start_time
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleFormChange(
                                                                'start_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">
                                                        Jam Selesai
                                                    </label>

                                                    <input
                                                        type="time"
                                                        className="form-control form-control-lg"
                                                        value={
                                                            form.end_time
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            handleFormChange(
                                                                'end_time',
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="col-md-8">
                                            <label className="form-label fw-bold">
                                                Lokasi
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                value={
                                                    form.location
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'location',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-bold">
                                                Warna Agenda
                                            </label>

                                            <input
                                                type="color"
                                                className="form-control form-control-color w-100"
                                                style={{
                                                    height:
                                                        48,
                                                }}
                                                value={
                                                    form.color
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'color',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Deskripsi
                                            </label>

                                            <textarea
                                                className="form-control"
                                                rows="5"
                                                value={
                                                    form.description
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'description',
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="agendaPublic"
                                                    checked={
                                                        form.is_public
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'is_public',
                                                            event.target.checked
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="agendaPublic"
                                                >
                                                    Tampilkan di halaman Login
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0 p-4 pt-2">
                                {detailMode ? (
                                    <>
                                        {canManage && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={
                                                        handleDelete
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                >
                                                    <i className="bi bi-trash-fill me-2" />

                                                    Hapus
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    onClick={() =>
                                                        setDetailMode(
                                                            false
                                                        )
                                                    }
                                                    disabled={
                                                        saving
                                                    }
                                                >
                                                    <i className="bi bi-pencil-fill me-2" />

                                                    Edit Agenda
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={
                                                closeModal
                                            }
                                        >
                                            Tutup
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-light border rounded-pill"
                                            onClick={
                                                closeModal
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            Batal
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill px-4"
                                            onClick={
                                                handleSave
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />

                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-floppy-fill me-2" />

                                                    Simpan Agenda
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                STYLE
            ===================================================== */}

            <style>
                {`
                    /*
                    |--------------------------------------------------------------------------
                    | PAGE
                    |--------------------------------------------------------------------------
                    */

                    .director-schedule-page {
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                        min-height: 0;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | HEADER
                    |--------------------------------------------------------------------------
                    */

                    .director-schedule-top {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 16px;

                        margin-bottom: 0;

                        flex-shrink: 0;
                    }

                    .director-schedule-top h2 {
                        font-size: 2rem;
                        line-height: 1.1;
                    }

                    .director-schedule-top p {
                        font-size: 1rem;
                    }

                    .director-add-button {
                        min-height: 46px;
                        padding-left: 24px;
                        padding-right: 24px;
                        font-size: 1rem;
                        font-weight: 800;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | CALENDAR CARD
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card {
                        border-radius: 24px !important;
                        overflow: hidden;
                        min-height: 0;
                    }

                    .director-calendar-body {
                        padding: 16px !important;
                        min-height: 0;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | 1 SCREEN CALENDAR
                    |--------------------------------------------------------------------------
                    |
                    | Ini bagian terpenting.
                    |
                    | Tinggi kalender mengikuti tinggi viewport,
                    | bukan tinggi content tanggal.
                    |
                    */

                    .director-calendar-viewport {
                        height: calc(100vh - 255px);
                        min-height: 500px;
                        max-height: 760px;
                    }

                    .director-calendar-viewport > div,
                    .director-calendar-viewport .fc {
                        height: 100%;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | BASE FONT
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc {
                        font-size: 1.08rem;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | TOOLBAR
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc-toolbar {
                        margin-bottom: 14px !important;
                        gap: 12px;
                    }

                    .director-calendar-card .fc-toolbar-title {
                        font-size: 2rem !important;
                        font-weight: 900 !important;
                        line-height: 1 !important;
                        text-transform: capitalize;
                    }

                    .director-calendar-card .fc-button {
                        min-height: 42px;
                        border-radius: 999px !important;

                        font-size: .95rem !important;
                        font-weight: 800 !important;

                        padding-left: 17px !important;
                        padding-right: 17px !important;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | DAY NAME
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc-col-header-cell {
                        background: #f8fafc;

                        padding-top: 9px;
                        padding-bottom: 9px;
                    }

                    .director-calendar-card .fc-col-header-cell-cushion {
                        font-size: 1rem;
                        font-weight: 900;

                        color: #475569;

                        text-decoration: none;

                        text-transform: uppercase;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MONTH CELLS
                    |--------------------------------------------------------------------------
                    |
                    | JANGAN kasih min-height besar di sini.
                    | FullCalendar akan membagi tinggi otomatis.
                    |
                    */

                    .director-calendar-card .fc-daygrid-day-frame {
                        min-height: 0 !important;
                    }

                    .director-calendar-card .fc-daygrid-day-number {
                        padding: 8px 10px;

                        font-size: 1.05rem;
                        font-weight: 900;

                        color: #1f2937;

                        text-decoration: none;
                    }

                    .director-calendar-card .fc-day-today {
                        background: #fff7f7 !important;
                    }

                    .director-calendar-card .fc-day-today .fc-daygrid-day-number {
                        min-width: 30px;
                        min-height: 30px;

                        display: inline-flex;
                        align-items: center;
                        justify-content: center;

                        border-radius: 999px;

                        background: #7f1d1d;
                        color: #ffffff !important;

                        margin: 4px;
                        padding: 4px 8px;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | EVENTS
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc-event {
                        border-radius: 7px !important;

                        padding: 3px 5px !important;
                        margin: 2px 4px !important;

                        font-size: .92rem !important;
                        font-weight: 800;

                        line-height: 1.3;

                        cursor: pointer;
                    }

                    .director-calendar-card .fc-event-main {
                        overflow: hidden;
                    }

                    .director-calendar-card .fc-event-time {
                        font-size: .9rem !important;
                        font-weight: 900;
                    }

                    .director-calendar-card .fc-event-title {
                        font-size: .92rem !important;
                        font-weight: 800;

                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }

                    .director-calendar-card .fc-daygrid-more-link {
                        margin-left: 5px;

                        color: #b91c1c;

                        font-size: .85rem;
                        font-weight: 900;

                        text-decoration: none;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | GRID
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc-scrollgrid {
                        border-radius: 14px;
                        overflow: hidden;
                    }

                    .director-calendar-card .fc-theme-standard td,
                    .director-calendar-card .fc-theme-standard th {
                        border-color: #e5e7eb;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | WEEK / DAY VIEW
                    |--------------------------------------------------------------------------
                    */

                    .director-calendar-card .fc-timegrid-axis {
                        font-size: .9rem;
                        font-weight: 700;
                    }

                    .director-calendar-card .fc-timegrid-slot-label {
                        font-size: .9rem;
                        font-weight: 700;
                    }

                    .director-calendar-card .fc-timegrid-slot {
                        height: 2.7rem;
                    }

                    .director-calendar-card .fc-timegrid-event {
                        font-size: .9rem !important;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | LARGE SCREEN
                    |--------------------------------------------------------------------------
                    */

                    @media (min-width: 1500px) {
                        .director-calendar-viewport {
                            height: calc(100vh - 245px);
                            max-height: 820px;
                        }

                        .director-calendar-card .fc-toolbar-title {
                            font-size: 2.15rem !important;
                        }

                        .director-calendar-card .fc-col-header-cell-cushion {
                            font-size: 1.05rem;
                        }

                        .director-calendar-card .fc-daygrid-day-number {
                            font-size: 1.08rem;
                        }

                        .director-calendar-card .fc-event {
                            font-size: .95rem !important;
                        }

                        .director-calendar-card .fc-event-title {
                            font-size: .95rem !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | LAPTOP
                    |--------------------------------------------------------------------------
                    */

                    @media (
                        min-width: 992px
                    ) and (
                        max-height: 800px
                    ) {
                        .director-schedule-top h2 {
                            font-size: 1.7rem;
                        }

                        .director-schedule-top p {
                            font-size: .9rem;
                        }

                        .director-calendar-viewport {
                            height: calc(100vh - 225px);
                            min-height: 460px;
                        }

                        .director-calendar-card .fc-toolbar {
                            margin-bottom: 8px !important;
                        }

                        .director-calendar-card .fc-toolbar-title {
                            font-size: 1.7rem !important;
                        }

                        .director-calendar-card .fc-col-header-cell {
                            padding-top: 6px;
                            padding-bottom: 6px;
                        }

                        .director-calendar-card .fc-event {
                            font-size: .82rem !important;
                            padding: 2px 4px !important;
                        }

                        .director-calendar-card .fc-event-title {
                            font-size: .82rem !important;
                        }

                        .director-calendar-card .fc-event-time {
                            font-size: .8rem !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | TABLET
                    |--------------------------------------------------------------------------
                    */

                    @media (max-width: 991.98px) {
                        .director-calendar-viewport {
                            height: auto;
                            min-height: 720px;
                            max-height: none;
                        }

                        .director-calendar-card .fc-toolbar {
                            flex-direction: column;
                        }

                        .director-calendar-card .fc-toolbar-chunk {
                            display: flex;
                            justify-content: center;
                        }

                        .director-calendar-card .fc-daygrid-day-frame {
                            min-height: 90px !important;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MOBILE
                    |--------------------------------------------------------------------------
                    */

                    @media (max-width: 767.98px) {
                        .director-schedule-top h2 {
                            font-size: 1.6rem;
                        }

                        .director-calendar-body {
                            padding: 10px !important;
                        }

                        .director-calendar-card .fc {
                            font-size: .82rem;
                        }

                        .director-calendar-card .fc-toolbar-title {
                            font-size: 1.35rem !important;
                        }

                        .director-calendar-card .fc-button {
                            min-height: 36px;

                            padding-left: 10px !important;
                            padding-right: 10px !important;

                            font-size: .72rem !important;
                        }

                        .director-calendar-card .fc-col-header-cell-cushion {
                            font-size: .75rem;
                        }

                        .director-calendar-card .fc-daygrid-day-number {
                            font-size: .8rem;

                            padding: 5px;
                        }

                        .director-calendar-card .fc-event {
                            padding: 2px 3px !important;

                            font-size: .65rem !important;
                        }

                        .director-calendar-card .fc-event-title,
                        .director-calendar-card .fc-event-time {
                            font-size: .65rem !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}