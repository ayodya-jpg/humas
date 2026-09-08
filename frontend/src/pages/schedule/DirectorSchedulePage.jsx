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
import '@fullcalendar/react/themes/monarch/palettes/purple.css';
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
            localStorage.getItem(
                'admin_user'
            ) || '{}'
        );
    } catch {
        return {};
    }
};

const formatDate = (
    value
) => {
    if (
        !value
    ) {
        return '-';
    }

    if (
        typeof value ===
        'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        const [
            year,
            month,
            day,
        ] =
            value
                .split('-')
                .map(
                    Number
                );

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric',
            }
        );
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '-';
    }

    return date
        .toLocaleDateString(
            'id-ID',
            {
                day:
                    '2-digit',

                month:
                    'long',

                year:
                    'numeric',
            }
        );
};

const extractErrorMessage = (
    error
) => {
    const data =
        error
            ?.response
            ?.data;

    if (
        data
            ?.errors
    ) {
        const firstError =
            Object.values(
                data.errors
            )
                .flat()
                .find(
                    Boolean
                );

        if (
            firstError
        ) {
            return firstError;
        }
    }

    return (
        data
            ?.message ||
        'Terjadi kesalahan pada server.'
    );
};

const getEmptyForm = (
    date = ''
) => ({
    id:
        null,

    title:
        '',

    description:
        '',

    event_date:
        date,

    start_time:
        '09:00',

    end_time:
        '10:00',

    all_day:
        false,

    location:
        '',

    agenda_type:
        'Rapat',

    color:
        '#7F1D1D',

    is_public:
        true,
});

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
    ] =
        useState(
            []
        );

    const [
        canManage,
        setCanManage,
    ] =
        useState(
            false
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(
            false
        );

    const [
        detailMode,
        setDetailMode,
    ] =
        useState(
            false
        );

    const [
        form,
        setForm,
    ] =
        useState(
            getEmptyForm()
        );

    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );

    const [
        selectedEvent,
        setSelectedEvent,
    ] =
        useState(
            null
        );

    const userCanPotentiallyManage =
        [
            'admin',
            'admin_humas',
            'admin_sekpim',
            'superadmin',
        ].includes(
            currentUser
                ?.role
        );

    /*
    |--------------------------------------------------------------------------
    | LOAD
    |--------------------------------------------------------------------------
    */

    const loadEvents =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await api.get(
                            '/event-schedules'
                        );

                    const data =
                        response
                            ?.data
                            ?.data ||
                        {};

                    const nextEvents =
                        Array.isArray(
                            data
                                ?.events
                        )
                            ? data
                                .events
                            : [];

                    setEvents(
                        nextEvents
                    );

                    setCanManage(
                        Boolean(
                            data
                                ?.can_manage
                        )
                    );
                } catch (
                error
                ) {
                    console.error(
                        'Load director schedule error:',
                        error
                            ?.response
                            ?.data ||
                        error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Jadwal',
                        extractErrorMessage(
                            error
                        )
                    );
                } finally {
                    setLoading(
                        false
                    );
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

    const openCreateModal =
        (
            date = ''
        ) => {
            setSelectedEvent(
                null
            );

            setDetailMode(
                false
            );

            setForm(
                getEmptyForm(
                    date
                )
            );

            setModalOpen(
                true
            );
        };

    const openDetailModal =
        (
            eventData
        ) => {
            setSelectedEvent(
                eventData
            );

            setForm({
                id:
                    eventData
                        .id,

                title:
                    eventData
                        .title ||
                    '',

                description:
                    eventData
                        .description ||
                    '',

                event_date:
                    eventData
                        .event_date ||
                    '',

                start_time:
                    eventData
                        .start_time ||
                    '09:00',

                end_time:
                    eventData
                        .end_time ||
                    '10:00',

                all_day:
                    Boolean(
                        eventData
                            .all_day
                    ),

                location:
                    eventData
                        .location ||
                    '',

                agenda_type:
                    eventData
                        .agenda_type ||
                    'Rapat',

                color:
                    eventData
                        .color ||
                    '#7F1D1D',

                is_public:
                    Boolean(
                        eventData
                            .is_public
                    ),
            });

            setDetailMode(
                true
            );

            setModalOpen(
                true
            );
        };

    const closeModal =
        () => {
            if (
                saving
            ) {
                return;
            }

            setModalOpen(
                false
            );

            setSelectedEvent(
                null
            );

            setDetailMode(
                false
            );
        };

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    const handleFormChange =
        (
            field,
            value
        ) => {
            setForm(
                (
                    previous
                ) => ({
                    ...previous,

                    [field]:
                        value,
                })
            );
        };

    /*
    |--------------------------------------------------------------------------
    | CALENDAR ACTION
    |--------------------------------------------------------------------------
    */

    const handleDateClick =
        (
            info
        ) => {
            if (
                !canManage
            ) {
                return;
            }

            openCreateModal(
                info.dateStr
            );
        };

    const handleEventClick =
        (
            info
        ) => {
            const eventId =
                Number(
                    info
                        .event
                        .id
                );

            const eventData =
                events.find(
                    (
                        item
                    ) =>
                        Number(
                            item
                                .id
                        ) ===
                        eventId
                );

            if (
                !eventData
            ) {
                return;
            }

            openDetailModal(
                eventData
            );
        };

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    const validateForm =
        async () => {
            if (
                !form
                    .title
                    .trim()
            ) {
                await showWarningAlert(
                    'Judul Belum Diisi',
                    'Judul agenda wajib diisi.'
                );

                return false;
            }

            if (
                !form
                    .event_date
            ) {
                await showWarningAlert(
                    'Tanggal Belum Dipilih',
                    'Tanggal agenda wajib dipilih.'
                );

                return false;
            }

            if (
                !form
                    .all_day
            ) {
                if (
                    !form
                        .start_time ||
                    !form
                        .end_time
                ) {
                    await showWarningAlert(
                        'Jam Belum Lengkap',
                        'Jam mulai dan jam selesai wajib diisi.'
                    );

                    return false;
                }

                if (
                    form
                        .end_time <=
                    form
                        .start_time
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
                    'Akun tidak memiliki izin untuk mengelola Jadwal Direktur.'
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
                    form
                        .id
                );

            const confirmation =
                await showConfirmAlert({
                    title:
                        isEdit
                            ? 'Simpan Perubahan Agenda?'
                            : 'Tambahkan Agenda?',

                    text:
                        isEdit
                            ? 'Perubahan agenda akan langsung tampil pada kalender.'
                            : 'Agenda baru akan langsung tampil pada kalender.',

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
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            const payload = {
                title:
                    form
                        .title
                        .trim(),

                description:
                    form
                        .description
                        .trim() ||
                    null,

                event_date:
                    form
                        .event_date,

                start_time:
                    form
                        .all_day
                        ? null
                        : form
                            .start_time,

                end_time:
                    form
                        .all_day
                        ? null
                        : form
                            .end_time,

                all_day:
                    Boolean(
                        form
                            .all_day
                    ),

                location:
                    form
                        .location
                        .trim() ||
                    null,

                agenda_type:
                    form
                        .agenda_type,

                color:
                    form
                        .color,

                is_public:
                    Boolean(
                        form
                            .is_public
                    ),
            };

            try {
                setSaving(
                    true
                );

                showLoadingAlert(
                    isEdit
                        ? 'Menyimpan Perubahan'
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

                    response
                        ?.data
                        ?.message ||
                    (
                        isEdit
                            ? 'Agenda berhasil diperbarui.'
                            : 'Agenda berhasil ditambahkan.'
                    )
                );

                setModalOpen(
                    false
                );

                setSelectedEvent(
                    null
                );

                setDetailMode(
                    false
                );

                await loadEvents();
            } catch (
            error
            ) {
                console.error(
                    'Save agenda error:',
                    error
                        ?.response
                        ?.data ||
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
                setSaving(
                    false
                );
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
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setSaving(
                    true
                );

                showLoadingAlert(
                    'Menghapus Agenda',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.delete(
                        `/event-schedules/${selectedEvent.id}`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Agenda Dihapus',
                    response
                        ?.data
                        ?.message ||
                    'Agenda berhasil dihapus.'
                );

                setModalOpen(
                    false
                );

                setSelectedEvent(
                    null
                );

                setDetailMode(
                    false
                );

                await loadEvents();
            } catch (
            error
            ) {
                console.error(
                    'Delete agenda error:',
                    error
                        ?.response
                        ?.data ||
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
                setSaving(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | FULLCALENDAR DATA
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
                                item
                                    .id
                            ),

                        title:
                            item
                                .title,

                        start:
                            item
                                .start,

                        end:
                            item
                                .end,

                        allDay:
                            Boolean(
                                item
                                    .allDay
                            ),

                        backgroundColor:
                            item
                                .backgroundColor ||
                            item
                                .color,

                        borderColor:
                            item
                                .borderColor ||
                            item
                                .color,
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

    if (
        loading
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat Jadwal Direktur
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    return (
        <div className="container-fluid px-0">
            {/* HERO */}

            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, #111827 0%, #7f1d1d 58%, #dc2626 120%)',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                                JADWAL DIREKTUR
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Agenda &amp; Jadwal Direktur
                            </h1>

                            <p
                                className="text-white-50 mb-0"
                                style={{
                                    maxWidth:
                                        760,

                                    lineHeight:
                                        1.8,
                                }}
                            >
                                Lihat agenda Direktur dalam tampilan kalender bulanan, mingguan, atau harian.
                            </p>
                        </div>

                        <div className="col-lg-4 text-lg-end">
                            {canManage && (
                                <button
                                    type="button"
                                    className="btn btn-light text-danger fw-bold rounded-pill px-4"
                                    onClick={() =>
                                        openCreateModal()
                                    }
                                >
                                    <i className="bi bi-plus-lg me-2" />

                                    Tambah Agenda
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* SUMMARY */}

            <section className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Total Agenda
                            </div>

                            <div className="fs-2 fw-black">
                                {
                                    events.length
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Agenda Publik
                            </div>

                            <div className="fs-2 fw-black text-success">
                                {
                                    events.filter(
                                        (
                                            item
                                        ) =>
                                            item
                                                .is_public
                                    ).length
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <div className="small text-muted mb-1">
                                Mode Akses
                            </div>

                            <div className="fs-5 fw-black">
                                {canManage
                                    ? 'Kelola Agenda'
                                    : 'Lihat Agenda'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALENDAR */}

            <section className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-3 p-lg-4">
                    <FullCalendar
                        plugins={[
                            themePlugin,
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView="dayGridMonth"
                        firstDay={1}
                        height="auto"
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
                        dayMaxEvents
                        nowIndicator
                        navLinks
                        selectable={
                            canManage
                        }
                    />
                </div>
            </section>

            {/* MODAL */}

            {modalOpen && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{
                        background:
                            'rgba(15, 23, 42, .55)',
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            <div className="modal-header border-0 p-4 pb-2">
                                <div>
                                    <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 mb-2">
                                        {form.id
                                            ? 'DETAIL AGENDA'
                                            : 'AGENDA BARU'}
                                    </span>

                                    <h4 className="modal-title fw-black">
                                        {form.id
                                            ? form
                                                .title ||
                                            'Detail Agenda'
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
                                            <div className="p-4 rounded-4 bg-light border">
                                                <div className="small text-muted mb-1">
                                                    Judul Agenda
                                                </div>

                                                <div className="fs-5 fw-black">
                                                    {
                                                        form.title
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light border h-100">
                                                <div className="small text-muted mb-1">
                                                    Tanggal
                                                </div>

                                                <div className="fw-bold">
                                                    {formatDate(
                                                        form
                                                            .event_date
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light border h-100">
                                                <div className="small text-muted mb-1">
                                                    Waktu
                                                </div>

                                                <div className="fw-bold">
                                                    {form
                                                        .all_day
                                                        ? 'Sepanjang Hari'
                                                        : `${form.start_time} - ${form.end_time}`}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light border h-100">
                                                <div className="small text-muted mb-1">
                                                    Kategori
                                                </div>

                                                <div className="fw-bold">
                                                    {
                                                        form.agenda_type
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <div className="p-3 rounded-4 bg-light border h-100">
                                                <div className="small text-muted mb-1">
                                                    Lokasi
                                                </div>

                                                <div className="fw-bold">
                                                    {form
                                                        .location ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="p-3 rounded-4 bg-light border">
                                                <div className="small text-muted mb-1">
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
                                                    {form
                                                        .description ||
                                                        '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <span
                                                className={`badge rounded-pill px-3 py-2 ${form
                                                        .is_public
                                                        ? 'bg-success-subtle text-success'
                                                        : 'bg-secondary-subtle text-secondary'
                                                    }`}
                                            >
                                                <i
                                                    className={`bi ${form
                                                            .is_public
                                                            ? 'bi-globe2'
                                                            : 'bi-lock-fill'
                                                        } me-2`}
                                                />

                                                {form
                                                    .is_public
                                                    ? 'Agenda Publik'
                                                    : 'Hanya User Login'}
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
                                                className="form-control"
                                                maxLength="255"
                                                value={
                                                    form
                                                        .title
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'title',
                                                        event
                                                            .target
                                                            .value
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
                                                className="form-control"
                                                value={
                                                    form
                                                        .event_date
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'event_date',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Kategori
                                            </label>

                                            <select
                                                className="form-select"
                                                value={
                                                    form
                                                        .agenda_type
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'agenda_type',
                                                        event
                                                            .target
                                                            .value
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
                                                            {
                                                                agendaType
                                                            }
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
                                                    checked={
                                                        form
                                                            .all_day
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'all_day',
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    }
                                                    id="allDaySchedule"
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="allDaySchedule"
                                                >
                                                    Agenda sepanjang hari
                                                </label>
                                            </div>
                                        </div>

                                        {!form
                                            .all_day && (
                                                <>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-bold">
                                                            Jam Mulai
                                                        </label>

                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={
                                                                form
                                                                    .start_time
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                handleFormChange(
                                                                    'start_time',
                                                                    event
                                                                        .target
                                                                        .value
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
                                                            className="form-control"
                                                            value={
                                                                form
                                                                    .end_time
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                handleFormChange(
                                                                    'end_time',
                                                                    event
                                                                        .target
                                                                        .value
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
                                                className="form-control"
                                                maxLength="255"
                                                value={
                                                    form
                                                        .location
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'location',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Contoh: Ruang Direktur"
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-bold">
                                                Warna Event
                                            </label>

                                            <input
                                                type="color"
                                                className="form-control form-control-color w-100"
                                                value={
                                                    form
                                                        .color
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'color',
                                                        event
                                                            .target
                                                            .value
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
                                                maxLength="5000"
                                                value={
                                                    form
                                                        .description
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleFormChange(
                                                        'description',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={
                                                        form
                                                            .is_public
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleFormChange(
                                                            'is_public',
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    }
                                                    id="publicSchedule"
                                                />

                                                <label
                                                    className="form-check-label fw-bold"
                                                    htmlFor="publicSchedule"
                                                >
                                                    Tampilkan di halaman login
                                                </label>
                                            </div>

                                            <div className="form-text">
                                                Jika dimatikan, agenda hanya dapat dilihat setelah user login.
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
                                                    <i className="bi bi-pencil-square me-2" />

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
        </div>
    );
}