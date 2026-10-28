import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
} from 'react-router-dom';

import api from '../../api/axios';

import {
    showErrorAlert,
} from '../../utils/sweetAlert';

const DIRECTORATES = [
    {
        value:
            'direktorat',

        label:
            'Direktorat',
    },

    {
        value:
            'direktur',

        label:
            'Direktur',
    },

    {
        value:
            'wakil_direktur_1',

        label:
            'Wakil Direktur I',
    },

    {
        value:
            'wakil_direktur_2',

        label:
            'Wakil Direktur II',
    },
];

const ACTIONS = [
    {
        value:
            'all',

        label:
            'Semua',

        icon:
            'bi-grid-fill',

        summaryKey:
            'total',
    },

    {
        value:
            'created',

        label:
            'Dibuat',

        icon:
            'bi-plus-lg',

        summaryKey:
            'created',
    },

    {
        value:
            'updated',

        label:
            'Diperbarui',

        icon:
            'bi-pencil-fill',

        summaryKey:
            'updated',
    },

    {
        value:
            'deleted',

        label:
            'Dihapus',

        icon:
            'bi-trash-fill',

        summaryKey:
            'deleted',
    },
];

const FIELD_LABELS = {
    directorate:
        'Agenda Untuk',

    title:
        'Judul Agenda',

    description:
        'Deskripsi',

    event_date:
        'Tanggal',

    start_time:
        'Jam Mulai',

    end_time:
        'Jam Selesai',

    all_day:
        'Sepanjang Hari',

    location:
        'Lokasi',

    agenda_type:
        'Kategori',

    color:
        'Warna',

    is_public:
        'Visibilitas',
};

const getDirectorateLabel =
    (
        value
    ) => {
        return (
            DIRECTORATES.find(
                (
                    item
                ) =>
                    item.value ===
                    value
            )?.label ||
            value ||
            '-'
        );
    };

const normalizeTime =
    (
        value
    ) => {
        if (
            !value
        ) {
            return null;
        }

        return String(
            value
        ).slice(
            0,
            5
        );
    };

const formatDate =
    (
        value
    ) => {
        if (
            !value
        ) {
            return '-';
        }

        const [
            year,
            month,
            day,
        ] =
            String(
                value
            )
                .slice(
                    0,
                    10
                )
                .split(
                    '-'
                )
                .map(
                    Number
                );

        const date =
            new Date(
                year,
                month - 1,
                day
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return date
            .toLocaleDateString(
                'id-ID',
                {
                    day:
                        '2-digit',

                    month:
                        'short',

                    year:
                        'numeric',
                }
            );
    };

const formatDateTime =
    (
        value
    ) => {
        if (
            !value
        ) {
            return '-';
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
            return value;
        }

        return date
            .toLocaleString(
                'id-ID',
                {
                    day:
                        '2-digit',

                    month:
                        'short',

                    year:
                        'numeric',

                    hour:
                        '2-digit',

                    minute:
                        '2-digit',
                }
            );
    };

const formatAuditValue =
    (
        field,
        value
    ) => {
        if (
            value ===
                null ||
            value ===
                undefined ||
            value ===
                ''
        ) {
            return '-';
        }

        if (
            field ===
            'directorate'
        ) {
            return getDirectorateLabel(
                value
            );
        }

        if (
            field ===
            'event_date'
        ) {
            return formatDate(
                value
            );
        }

        if (
            field ===
                'start_time' ||
            field ===
                'end_time'
        ) {
            return (
                normalizeTime(
                    value
                ) ||
                '-'
            );
        }

        if (
            field ===
            'all_day'
        ) {
            return value
                ? 'Ya'
                : 'Tidak';
        }

        if (
            field ===
            'is_public'
        ) {
            return value
                ? 'Publik'
                : 'Internal';
        }

        return String(
            value
        );
    };

const getHistoryChanges =
    (
        history
    ) => {
        if (
            history
                ?.action !==
            'updated'
        ) {
            return [];
        }

        const oldValues =
            history
                ?.old_values ||
            {};

        const newValues =
            history
                ?.new_values ||
            {};

        const keys =
            Array.from(
                new Set([
                    ...Object.keys(
                        oldValues
                    ),

                    ...Object.keys(
                        newValues
                    ),
                ])
            );

        return keys
            .map(
                (
                    field
                ) => ({
                    field,

                    label:
                        FIELD_LABELS[
                            field
                        ] ||
                        field,

                    oldValue:
                        formatAuditValue(
                            field,
                            oldValues[
                                field
                            ]
                        ),

                    newValue:
                        formatAuditValue(
                            field,
                            newValues[
                                field
                            ]
                        ),
                })
            )
            .filter(
                (
                    item
                ) =>
                    item.oldValue !==
                    item.newValue
            );
    };

const getActionMeta =
    (
        action
    ) => {
        if (
            action ===
            'created'
        ) {
            return {
                label:
                    'Agenda Dibuat',

                icon:
                    'bi-plus-lg',

                className:
                    'created',
            };
        }

        if (
            action ===
            'updated'
        ) {
            return {
                label:
                    'Agenda Diperbarui',

                icon:
                    'bi-pencil-fill',

                className:
                    'updated',
            };
        }

        if (
            action ===
            'deleted'
        ) {
            return {
                label:
                    'Agenda Dihapus',

                icon:
                    'bi-trash-fill',

                className:
                    'deleted',
            };
        }

        return {
            label:
                'Aktivitas Agenda',

            icon:
                'bi-clock-history',

            className:
                'default',
        };
    };

const getSnapshot =
    (
        history
    ) => {
        if (
            history
                ?.action ===
            'created'
        ) {
            return (
                history
                    ?.new_values ||
                {}
            );
        }

        if (
            history
                ?.action ===
            'deleted'
        ) {
            return (
                history
                    ?.old_values ||
                {}
            );
        }

        return {};
    };

const getSnapshotTime =
    (
        snapshot
    ) => {
        if (
            snapshot
                ?.all_day
        ) {
            return 'Sepanjang Hari';
        }

        const start =
            normalizeTime(
                snapshot
                    ?.start_time
            );

        const end =
            normalizeTime(
                snapshot
                    ?.end_time
            );

        if (
            start &&
            end
        ) {
            return `${start} - ${end}`;
        }

        return '-';
    };

const extractErrorMessage =
    (
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
            const message =
                Object
                    .values(
                        data.errors
                    )
                    .flat()
                    .find(
                        Boolean
                    );

            if (
                message
            ) {
                return message;
            }
        }

        return (
            data
                ?.message ||
            'Riwayat jadwal gagal dimuat.'
        );
    };

export default function EventScheduleActivityPage() {
    const [
        histories,
        setHistories,
    ] =
        useState(
            []
        );

    const [
        summary,
        setSummary,
    ] =
        useState({
            total:
                0,

            created:
                0,

            updated:
                0,

            deleted:
                0,
        });

    const [
        pagination,
        setPagination,
    ] =
        useState({
            current_page:
                1,

            last_page:
                1,

            per_page:
                20,

            total:
                0,

            from:
                null,

            to:
                null,
        });

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        actionFilter,
        setActionFilter,
    ] =
        useState(
            'all'
        );

    const [
        directorateFilter,
        setDirectorateFilter,
    ] =
        useState(
            'all'
        );

    const [
        searchInput,
        setSearchInput,
    ] =
        useState(
            ''
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            ''
        );

    const [
        startDate,
        setStartDate,
    ] =
        useState(
            ''
        );

    const [
        endDate,
        setEndDate,
    ] =
        useState(
            ''
        );

    const [
        currentPage,
        setCurrentPage,
    ] =
        useState(
            1
        );

    useEffect(
        () => {
            const timer =
                window
                    .setTimeout(
                        () => {
                            setSearch(
                                searchInput
                                    .trim()
                            );

                            setCurrentPage(
                                1
                            );
                        },
                        350
                    );

            return () => {
                window
                    .clearTimeout(
                        timer
                    );
            };
        },
        [
            searchInput,
        ]
    );

    const loadActivity =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const params = {
                        page:
                            currentPage,

                        per_page:
                            20,
                    };

                    if (
                        actionFilter !==
                        'all'
                    ) {
                        params.action =
                            actionFilter;
                    }

                    if (
                        directorateFilter !==
                        'all'
                    ) {
                        params.directorate =
                            directorateFilter;
                    }

                    if (
                        search
                    ) {
                        params.search =
                            search;
                    }

                    if (
                        startDate
                    ) {
                        params.start_date =
                            startDate;
                    }

                    if (
                        endDate
                    ) {
                        params.end_date =
                            endDate;
                    }

                    const response =
                        await api.get(
                            '/event-schedules/activity',
                            {
                                params,
                            }
                        );

                    const data =
                        response
                            ?.data
                            ?.data ||
                        {};

                    setHistories(
                        Array.isArray(
                            data.histories
                        )
                            ? data.histories
                            : []
                    );

                    setSummary({
                        total:
                            Number(
                                data
                                    ?.summary
                                    ?.total ||
                                0
                            ),

                        created:
                            Number(
                                data
                                    ?.summary
                                    ?.created ||
                                0
                            ),

                        updated:
                            Number(
                                data
                                    ?.summary
                                    ?.updated ||
                                0
                            ),

                        deleted:
                            Number(
                                data
                                    ?.summary
                                    ?.deleted ||
                                0
                            ),
                    });

                    setPagination({
                        current_page:
                            Number(
                                data
                                    ?.pagination
                                    ?.current_page ||
                                1
                            ),

                        last_page:
                            Number(
                                data
                                    ?.pagination
                                    ?.last_page ||
                                1
                            ),

                        per_page:
                            Number(
                                data
                                    ?.pagination
                                    ?.per_page ||
                                20
                            ),

                        total:
                            Number(
                                data
                                    ?.pagination
                                    ?.total ||
                                0
                            ),

                        from:
                            data
                                ?.pagination
                                ?.from ??
                            null,

                        to:
                            data
                                ?.pagination
                                ?.to ??
                            null,
                    });
                } catch (
                    error
                ) {
                    console.error(
                        'Load schedule activity:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    setHistories(
                        []
                    );

                    await showErrorAlert(
                        'Gagal Memuat Riwayat',
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
            [
                actionFilter,
                directorateFilter,
                search,
                startDate,
                endDate,
                currentPage,
            ]
        );

    useEffect(
        () => {
            loadActivity();
        },
        [
            loadActivity,
        ]
    );

    const pageNumbers =
        useMemo(
            () => {
                const lastPage =
                    Math.max(
                        1,
                        pagination
                            .last_page
                    );

                const start =
                    Math.max(
                        1,
                        Math.min(
                            currentPage -
                                2,

                            lastPage -
                                4
                        )
                    );

                const end =
                    Math.min(
                        lastPage,
                        start +
                            4
                    );

                const pages =
                    [];

                for (
                    let page =
                        start;
                    page <=
                    end;
                    page +=
                        1
                ) {
                    pages.push(
                        page
                    );
                }

                return pages;
            },
            [
                currentPage,
                pagination
                    .last_page,
            ]
        );

    const resetFilters =
        () => {
            setActionFilter(
                'all'
            );

            setDirectorateFilter(
                'all'
            );

            setSearchInput(
                ''
            );

            setSearch(
                ''
            );

            setStartDate(
                ''
            );

            setEndDate(
                ''
            );

            setCurrentPage(
                1
            );
        };

    return (
        <div className="schedule-activity-page">
            <section className="activity-header">
                <div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                            SEKRETARIAT PIMPINAN
                        </span>

                        <span className="badge rounded-pill bg-white text-dark border px-3 py-2">
                            <i className="bi bi-shield-check me-2" />

                            Audit Trail
                        </span>
                    </div>

                    <h2 className="fw-black mb-1">
                        Riwayat Jadwal Direktorat
                    </h2>

                    <p className="text-muted mb-0">
                        Catatan pembuatan, perubahan, dan penghapusan agenda Direktorat.
                    </p>
                </div>

                <Link
                    to="/admin/director-schedule"
                    className="btn btn-outline-danger rounded-pill px-4 fw-bold"
                >
                    <i className="bi bi-calendar3 me-2" />

                    Kembali ke Kalender
                </Link>
            </section>

            <section className="activity-summary-grid">
                {ACTIONS.map(
                    (
                        item
                    ) => {
                        const active =
                            actionFilter ===
                            item.value;

                        return (
                            <button
                                type="button"
                                className={`activity-summary-card ${
                                    active
                                        ? 'active'
                                        : ''
                                }`}
                                key={
                                    item.value
                                }
                                onClick={() => {
                                    setActionFilter(
                                        item.value
                                    );

                                    setCurrentPage(
                                        1
                                    );
                                }}
                            >
                                <span
                                    className={`activity-summary-icon action-${item.value}`}
                                >
                                    <i
                                        className={`bi ${item.icon}`}
                                    />
                                </span>

                                <span className="activity-summary-content">
                                    <span className="activity-summary-label">
                                        {item.label}
                                    </span>

                                    <span className="activity-summary-value">
                                        {summary[
                                            item.summaryKey
                                        ] || 0}
                                    </span>
                                </span>
                            </button>
                        );
                    }
                )}
            </section>

            <section className="activity-filter-card">
                <div className="activity-filter-heading">
                    <div>
                        <div className="fw-black">
                            <i className="bi bi-funnel-fill text-danger me-2" />

                            Filter Riwayat
                        </div>

                        <div className="small text-muted">
                            Cari berdasarkan agenda atau nama admin.
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-light border rounded-pill px-3"
                        onClick={
                            resetFilters
                        }
                    >
                        <i className="bi bi-arrow-counterclockwise me-1" />

                        Reset
                    </button>
                </div>

                <div className="row g-3">
                    <div className="col-lg-4">
                        <label className="form-label fw-bold small">
                            Pencarian
                        </label>

                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <i className="bi bi-search text-muted" />
                            </span>

                            <input
                                type="search"
                                className="form-control border-start-0"
                                placeholder="Judul agenda atau admin..."
                                value={
                                    searchInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearchInput(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-2">
                        <label className="form-label fw-bold small">
                            Direktorat
                        </label>

                        <select
                            className="form-select"
                            value={
                                directorateFilter
                            }
                            onChange={(
                                event
                            ) => {
                                setDirectorateFilter(
                                    event
                                        .target
                                        .value
                                );

                                setCurrentPage(
                                    1
                                );
                            }}
                        >
                            <option value="all">
                                Semua
                            </option>

                            {DIRECTORATES.map(
                                (
                                    item
                                ) => (
                                    <option
                                        key={
                                            item.value
                                        }
                                        value={
                                            item.value
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="col-md-6 col-lg-2">
                        <label className="form-label fw-bold small">
                            Aktivitas
                        </label>

                        <select
                            className="form-select"
                            value={
                                actionFilter
                            }
                            onChange={(
                                event
                            ) => {
                                setActionFilter(
                                    event
                                        .target
                                        .value
                                );

                                setCurrentPage(
                                    1
                                );
                            }}
                        >
                            {ACTIONS.map(
                                (
                                    item
                                ) => (
                                    <option
                                        key={
                                            item.value
                                        }
                                        value={
                                            item.value
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="col-md-6 col-lg-2">
                        <label className="form-label fw-bold small">
                            Dari Tanggal
                        </label>

                        <input
                            type="date"
                            className="form-control"
                            value={
                                startDate
                            }
                            onChange={(
                                event
                            ) => {
                                const value =
                                    event
                                        .target
                                        .value;

                                setStartDate(
                                    value
                                );

                                if (
                                    endDate &&
                                    value &&
                                    endDate <
                                        value
                                ) {
                                    setEndDate(
                                        ''
                                    );
                                }

                                setCurrentPage(
                                    1
                                );
                            }}
                        />
                    </div>

                    <div className="col-md-6 col-lg-2">
                        <label className="form-label fw-bold small">
                            Sampai Tanggal
                        </label>

                        <input
                            type="date"
                            className="form-control"
                            min={
                                startDate ||
                                undefined
                            }
                            value={
                                endDate
                            }
                            onChange={(
                                event
                            ) => {
                                setEndDate(
                                    event
                                        .target
                                        .value
                                );

                                setCurrentPage(
                                    1
                                );
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="activity-list-card">
                <div className="activity-list-header">
                    <div>
                        <h5 className="fw-black mb-1">
                            Aktivitas Terbaru
                        </h5>

                        <div className="small text-muted">
                            {pagination.total >
                            0
                                ? `Menampilkan ${
                                      pagination.from ??
                                      0
                                  }-${
                                      pagination.to ??
                                      0
                                  } dari ${
                                      pagination.total
                                  } riwayat.`
                                : 'Belum ada riwayat pada filter ini.'}
                        </div>
                    </div>

                    {loading && (
                        <div className="d-flex align-items-center gap-2 text-danger small fw-bold">
                            <span className="spinner-border spinner-border-sm" />

                            Memuat...
                        </div>
                    )}
                </div>

                {!loading &&
                    histories.length ===
                        0 && (
                    <div className="activity-empty">
                        <div className="activity-empty-icon">
                            <i className="bi bi-clock-history" />
                        </div>

                        <h5 className="fw-black mb-1">
                            Riwayat tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Belum ada aktivitas yang sesuai dengan filter yang dipilih.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill px-4"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset Filter
                        </button>
                    </div>
                )}

                <div className="activity-timeline">
                    {histories.map(
                        (
                            history
                        ) => {
                            const meta =
                                getActionMeta(
                                    history.action
                                );

                            const changes =
                                getHistoryChanges(
                                    history
                                );

                            const snapshot =
                                getSnapshot(
                                    history
                                );

                            const ownerLabel =
                                history
                                    .directorate_label ||
                                getDirectorateLabel(
                                    history
                                        .directorate ||
                                        snapshot
                                            .directorate
                                );

                            return (
                                <article
                                    className={`activity-item ${meta.className}`}
                                    key={
                                        history.id
                                    }
                                >
                                    <div className="activity-marker">
                                        <i
                                            className={`bi ${meta.icon}`}
                                        />
                                    </div>

                                    <div className="activity-item-body">
                                        <div className="activity-item-top">
                                            <div className="min-w-0">
                                                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                    <span
                                                        className={`activity-action-badge ${meta.className}`}
                                                    >
                                                        {
                                                            meta.label
                                                        }
                                                    </span>

                                                    <span className="activity-owner-badge">
                                                        {
                                                            ownerLabel
                                                        }
                                                    </span>

                                                    <span
                                                        className={`activity-status-badge ${
                                                            history
                                                                .event_exists
                                                                ? 'active'
                                                                : 'deleted'
                                                        }`}
                                                    >
                                                        {history
                                                            .event_exists
                                                            ? 'Agenda aktif'
                                                            : 'Agenda sudah dihapus'}
                                                    </span>
                                                </div>

                                                <h5 className="activity-event-title">
                                                    {history
                                                        .event_title ||
                                                        'Agenda tanpa judul'}
                                                </h5>

                                                <div className="activity-user-row">
                                                    <i className="bi bi-person-circle" />

                                                    <strong>
                                                        {history
                                                            .user_name ||
                                                            'User tidak tersedia'}
                                                    </strong>

                                                    <span>
                                                        •
                                                    </span>

                                                    <span>
                                                        {formatDateTime(
                                                            history
                                                                .created_at
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {history.action ===
                                            'updated' && (
                                            <div className="activity-change-grid">
                                                {changes.length >
                                                0 ? (
                                                    changes.map(
                                                        (
                                                            change
                                                        ) => (
                                                            <div
                                                                className="activity-change-card"
                                                                key={
                                                                    change.field
                                                                }
                                                            >
                                                                <div className="activity-change-label">
                                                                    {
                                                                        change.label
                                                                    }
                                                                </div>

                                                                <div className="activity-change-values">
                                                                    <span className="activity-old-value">
                                                                        {
                                                                            change.oldValue
                                                                        }
                                                                    </span>

                                                                    <i className="bi bi-arrow-right" />

                                                                    <span className="activity-new-value">
                                                                        {
                                                                            change.newValue
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    )
                                                ) : (
                                                    <div className="activity-note">
                                                        Agenda diperbarui tanpa perubahan field yang dapat ditampilkan.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(history.action ===
                                            'created' ||
                                            history.action ===
                                                'deleted') && (
                                            <div className="activity-snapshot-grid">
                                                <div className="activity-snapshot-item">
                                                    <span>
                                                        Tanggal
                                                    </span>

                                                    <strong>
                                                        {formatDate(
                                                            snapshot
                                                                .event_date
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="activity-snapshot-item">
                                                    <span>
                                                        Waktu
                                                    </span>

                                                    <strong>
                                                        {getSnapshotTime(
                                                            snapshot
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="activity-snapshot-item">
                                                    <span>
                                                        Lokasi
                                                    </span>

                                                    <strong>
                                                        {snapshot
                                                            .location ||
                                                            '-'}
                                                    </strong>
                                                </div>

                                                <div className="activity-snapshot-item">
                                                    <span>
                                                        Kategori
                                                    </span>

                                                    <strong>
                                                        {snapshot
                                                            .agenda_type ||
                                                            '-'}
                                                    </strong>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        }
                    )}
                </div>

                {pagination.last_page >
                    1 && (
                    <div className="activity-pagination">
                        <div className="small text-muted">
                            Halaman{' '}
                            {
                                pagination.current_page
                            }{' '}
                            dari{' '}
                            {
                                pagination.last_page
                            }
                        </div>

                        <div className="d-flex align-items-center gap-1 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-sm btn-light border rounded-pill"
                                disabled={
                                    currentPage <=
                                        1 ||
                                    loading
                                }
                                onClick={() =>
                                    setCurrentPage(
                                        (
                                            previous
                                        ) =>
                                            Math.max(
                                                1,
                                                previous -
                                                    1
                                            )
                                    )
                                }
                            >
                                <i className="bi bi-chevron-left" />
                            </button>

                            {pageNumbers.map(
                                (
                                    page
                                ) => (
                                    <button
                                        type="button"
                                        key={
                                            page
                                        }
                                        className={`btn btn-sm rounded-pill activity-page-button ${
                                            page ===
                                            currentPage
                                                ? 'active'
                                                : ''
                                        }`}
                                        disabled={
                                            loading
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                page
                                            )
                                        }
                                    >
                                        {page}
                                    </button>
                                )
                            )}

                            <button
                                type="button"
                                className="btn btn-sm btn-light border rounded-pill"
                                disabled={
                                    currentPage >=
                                        pagination.last_page ||
                                    loading
                                }
                                onClick={() =>
                                    setCurrentPage(
                                        (
                                            previous
                                        ) =>
                                            Math.min(
                                                pagination.last_page,
                                                previous +
                                                    1
                                            )
                                    )
                                }
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <style>
                {`
                    .schedule-activity-page {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .activity-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        flex-wrap: wrap;
                    }

                    .activity-header h2 {
                        font-size: 2rem;
                    }

                    .activity-summary-grid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 10px;
                    }

                    .activity-summary-card {
                        display: flex;
                        align-items: center;
                        gap: 11px;
                        min-height: 82px;
                        padding: 13px 14px;
                        border: 1px solid #e2e8f0;
                        border-radius: 18px;
                        background: #ffffff;
                        color: #334155;
                        text-align: left;
                        box-shadow: 0 5px 18px rgba(15, 23, 42, .04);
                        transition: .15s ease;
                    }

                    .activity-summary-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
                    }

                    .activity-summary-card.active {
                        border-color: #7f1d1d;
                        background: #fff7f7;
                    }

                    .activity-summary-icon {
                        width: 45px;
                        height: 45px;
                        flex: 0 0 45px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 14px;
                        background: #f1f5f9;
                        color: #475569;
                    }

                    .activity-summary-icon.action-created {
                        background: #ecfdf5;
                        color: #047857;
                    }

                    .activity-summary-icon.action-updated {
                        background: #eff6ff;
                        color: #1d4ed8;
                    }

                    .activity-summary-icon.action-deleted {
                        background: #fef2f2;
                        color: #dc2626;
                    }

                    .activity-summary-content {
                        display: flex;
                        flex-direction: column;
                    }

                    .activity-summary-label {
                        color: #64748b;
                        font-size: .72rem;
                        font-weight: 800;
                    }

                    .activity-summary-value {
                        color: #0f172a;
                        font-size: 1.35rem;
                        line-height: 1.15;
                        font-weight: 900;
                    }

                    .activity-filter-card,
                    .activity-list-card {
                        border: 1px solid #e2e8f0;
                        border-radius: 22px;
                        background: #ffffff;
                        box-shadow: 0 6px 24px rgba(15, 23, 42, .04);
                    }

                    .activity-filter-card {
                        padding: 17px;
                    }

                    .activity-filter-heading {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        margin-bottom: 14px;
                    }

                    .activity-list-card {
                        padding: 18px;
                    }

                    .activity-list-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding-bottom: 15px;
                        margin-bottom: 15px;
                        border-bottom: 1px solid #f1f5f9;
                    }

                    .activity-empty {
                        min-height: 300px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                    }

                    .activity-empty-icon {
                        width: 62px;
                        height: 62px;
                        margin-bottom: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 20px;
                        background: #fff7f7;
                        color: #7f1d1d;
                        font-size: 1.45rem;
                    }

                    .activity-timeline {
                        display: flex;
                        flex-direction: column;
                    }

                    .activity-item {
                        position: relative;
                        display: grid;
                        grid-template-columns: 46px minmax(0, 1fr);
                        gap: 12px;
                        padding-bottom: 18px;
                    }

                    .activity-item:last-child {
                        padding-bottom: 0;
                    }

                    .activity-item:not(:last-child)::before {
                        content: "";
                        position: absolute;
                        top: 45px;
                        bottom: 0;
                        left: 22px;
                        width: 2px;
                        background: #e2e8f0;
                    }

                    .activity-marker {
                        width: 45px;
                        height: 45px;
                        position: relative;
                        z-index: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 4px solid #ffffff;
                        border-radius: 15px;
                        background: #f1f5f9;
                        color: #475569;
                        box-shadow: 0 0 0 1px #e2e8f0;
                    }

                    .activity-item.created .activity-marker {
                        background: #ecfdf5;
                        color: #047857;
                    }

                    .activity-item.updated .activity-marker {
                        background: #eff6ff;
                        color: #1d4ed8;
                    }

                    .activity-item.deleted .activity-marker {
                        background: #fef2f2;
                        color: #dc2626;
                    }

                    .activity-item-body {
                        min-width: 0;
                        padding: 14px 15px;
                        border: 1px solid #e2e8f0;
                        border-radius: 18px;
                        background: #f8fafc;
                    }

                    .activity-action-badge,
                    .activity-owner-badge,
                    .activity-status-badge {
                        display: inline-flex;
                        align-items: center;
                        min-height: 25px;
                        padding: 0 9px;
                        border-radius: 999px;
                        font-size: .62rem;
                        font-weight: 900;
                    }

                    .activity-action-badge.created {
                        background: #d1fae5;
                        color: #047857;
                    }

                    .activity-action-badge.updated {
                        background: #dbeafe;
                        color: #1d4ed8;
                    }

                    .activity-action-badge.deleted {
                        background: #fee2e2;
                        color: #b91c1c;
                    }

                    .activity-owner-badge {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        color: #475569;
                    }

                    .activity-status-badge.active {
                        background: #ecfdf5;
                        color: #047857;
                    }

                    .activity-status-badge.deleted {
                        background: #f1f5f9;
                        color: #64748b;
                    }

                    .activity-event-title {
                        margin: 0;
                        color: #0f172a;
                        font-size: 1rem;
                        font-weight: 900;
                    }

                    .activity-user-row {
                        display: flex;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 5px;
                        margin-top: 5px;
                        color: #64748b;
                        font-size: .7rem;
                    }

                    .activity-change-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px;
                        margin-top: 13px;
                    }

                    .activity-change-card {
                        padding: 9px 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        background: #ffffff;
                    }

                    .activity-change-label {
                        margin-bottom: 5px;
                        color: #64748b;
                        font-size: .61rem;
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .activity-change-values {
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        font-size: .72rem;
                        font-weight: 800;
                    }

                    .activity-old-value,
                    .activity-new-value {
                        min-width: 0;
                        flex: 1;
                        padding: 6px 8px;
                        border-radius: 8px;
                        word-break: break-word;
                    }

                    .activity-old-value {
                        background: #fef2f2;
                        color: #991b1b;
                    }

                    .activity-new-value {
                        background: #ecfdf5;
                        color: #047857;
                    }

                    .activity-change-values > i {
                        flex-shrink: 0;
                        color: #94a3b8;
                    }

                    .activity-snapshot-grid {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 8px;
                        margin-top: 13px;
                    }

                    .activity-snapshot-item {
                        min-width: 0;
                        padding: 9px 10px;
                        border-radius: 11px;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                    }

                    .activity-snapshot-item span {
                        display: block;
                        margin-bottom: 2px;
                        color: #94a3b8;
                        font-size: .6rem;
                        font-weight: 800;
                        text-transform: uppercase;
                    }

                    .activity-snapshot-item strong {
                        display: block;
                        color: #334155;
                        font-size: .73rem;
                        word-break: break-word;
                    }

                    .activity-note {
                        grid-column: 1 / -1;
                        padding: 10px 12px;
                        border-radius: 11px;
                        background: #ffffff;
                        color: #64748b;
                        font-size: .72rem;
                    }

                    .activity-pagination {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding-top: 16px;
                        margin-top: 17px;
                        border-top: 1px solid #f1f5f9;
                    }

                    .activity-page-button {
                        min-width: 33px;
                        border: 1px solid #e2e8f0;
                        background: #ffffff;
                        color: #475569;
                    }

                    .activity-page-button.active {
                        border-color: #7f1d1d;
                        background: #7f1d1d;
                        color: #ffffff;
                    }

                    @media (max-width: 1199.98px) {
                        .activity-summary-grid {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }

                        .activity-snapshot-grid {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }
                    }

                    @media (max-width: 767.98px) {
                        .activity-header h2 {
                            font-size: 1.5rem;
                        }

                        .activity-summary-grid {
                            grid-template-columns: 1fr 1fr;
                        }

                        .activity-summary-card {
                            min-height: 72px;
                            padding: 10px;
                        }

                        .activity-summary-icon {
                            width: 38px;
                            height: 38px;
                            flex-basis: 38px;
                        }

                        .activity-filter-heading,
                        .activity-list-header,
                        .activity-pagination {
                            align-items: stretch;
                            flex-direction: column;
                        }

                        .activity-item {
                            grid-template-columns: 36px minmax(0, 1fr);
                            gap: 8px;
                        }

                        .activity-marker {
                            width: 36px;
                            height: 36px;
                            border-radius: 11px;
                        }

                        .activity-item:not(:last-child)::before {
                            left: 17px;
                            top: 36px;
                        }

                        .activity-change-grid,
                        .activity-snapshot-grid {
                            grid-template-columns: 1fr;
                        }

                        .activity-change-values {
                            align-items: stretch;
                            flex-direction: column;
                        }

                        .activity-change-values > i {
                            transform: rotate(90deg);
                            align-self: center;
                        }
                    }
                `}
            </style>
        </div>
    );
}