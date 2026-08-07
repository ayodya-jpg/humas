import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    Link,
    Navigate,
    useNavigate,
    useParams,
} from 'react-router-dom';

import api from '../../api/axios';

import {
    getDefaultPath,
    getStoredUser,
    hasPermission,
} from '../../components/ProtectedRoute';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass: 'bg-warning-subtle text-warning-emphasis',
        icon: 'bi-hourglass-split',
    },
    revision: {
        label: 'Perlu Revisi',
        badgeClass: 'bg-info-subtle text-info-emphasis',
        icon: 'bi-pencil-square',
    },
    approved: {
        label: 'Disetujui',
        badgeClass: 'bg-primary-subtle text-primary',
        icon: 'bi-check-circle-fill',
    },
    rejected: {
        label: 'Ditolak',
        badgeClass: 'bg-danger-subtle text-danger',
        icon: 'bi-x-circle-fill',
    },
    completed: {
        label: 'Selesai',
        badgeClass: 'bg-success-subtle text-success',
        icon: 'bi-check2-all',
    },
};

const getBackendErrorMessage = (
    error,
    fallbackMessage
) => {
    const responseData = error?.response?.data;

    if (responseData?.errors) {
        const firstError =
            Object.values(responseData.errors)?.[0]?.[0];

        if (firstError) {
            return firstError;
        }
    }

    return responseData?.message || fallbackMessage;
};

const formatDate = (date) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        const [year, month, day] = date
            .split('-')
            .map(Number);

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return '-';
    }

    return parsedDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const formatDateTime = (date) => {
    if (!date) {
        return '-';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return '-';
    }

    return parsedDate.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const InfoBox = ({
    label,
    value,
    icon = 'bi-info-circle',
}) => {
    return (
        <div className="p-3 rounded-4 bg-light h-100">
            <div className="d-flex align-items-start gap-3">
                <div
                    className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width: 42,
                        height: 42,
                    }}
                >
                    <i className={`bi ${icon}`} />
                </div>

                <div className="min-w-0">
                    <div className="small text-muted mb-1">
                        {label}
                    </div>

                    <div className="fw-bold text-break">
                        {value || '-'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TimelineItem = ({
    label,
    value,
    icon,
    active = false,
}) => {
    return (
        <div
            className={`request-timeline-item ${
                active ? 'active' : 'done'
            }`}
        >
            <div className="request-timeline-marker">
                <i className={`bi ${icon}`} />
            </div>

            <div className="request-timeline-content">
                <div className="fw-black mb-1">
                    {label}
                </div>

                <div className="small text-muted">
                    {value || '-'}
                </div>
            </div>
        </div>
    );
};

export default function MerchandiseApprovalDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const currentUser = getStoredUser();

    const defaultPath = getDefaultPath(currentUser);

    const canView = hasPermission(
        currentUser,
        'approval.merchandise.view'
    );

    const canProcess = hasPermission(
        currentUser,
        'approval.merchandise.process'
    );

    const [order, setOrder] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchOrder = useCallback(async () => {
        if (!canView) {
            setOrder(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await api.get(
                `/orders/${id}`
            );

            const responseData =
                response?.data?.data || null;

            setOrder(responseData);
            setAdminNote(
                responseData?.admin_note || ''
            );
        } catch (error) {
            console.error(
                'Fetch merchandise detail error:',
                error?.response?.data || error
            );

            await showErrorAlert(
                'Gagal Memuat Detail',
                getBackendErrorMessage(
                    error,
                    'Detail pengajuan merchandise gagal dimuat.'
                )
            );

            navigate('/admin/orders', {
                replace: true,
            });
        } finally {
            setLoading(false);
        }
    }, [
        canView,
        id,
        navigate,
    ]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const ensureProcessAccess = async () => {
        if (canProcess) {
            return true;
        }

        await showErrorAlert(
            'Akses Ditolak',
            'Akun hanya memiliki izin melihat approval dan tidak dapat memproses pengajuan.'
        );

        return false;
    };

    const validatePendingStatus = async () => {
        if (order?.status === 'pending') {
            return true;
        }

        await showWarningAlert(
            'Status Tidak Sesuai',
            'Aksi ini hanya dapat dilakukan saat pengajuan berstatus menunggu.'
        );

        return false;
    };

    const handleApprove = async () => {
        if (
            !(await ensureProcessAccess()) ||
            !(await validatePendingStatus())
        ) {
            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Setujui Pengajuan?',
                text:
                    `Pengajuan ${order.order_code} akan disetujui dan stok merchandise akan dikurangi.`,
                confirmButtonText: 'Ya, setujui',
                cancelButtonText: 'Batal',
                icon: 'question',
                confirmButtonColor: '#2563eb',
            });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Memproses Approval',
                'Mohon tunggu sebentar.'
            );

            const response = await api.put(
                `/orders/${order.id}/approve`
            );

            closeAlert();

            await showSuccessAlert(
                'Approval Berhasil',
                response?.data?.message ||
                    'Pengajuan merchandise berhasil disetujui.'
            );

            await fetchOrder();
        } catch (error) {
            console.error(
                'Approve merchandise error:',
                error?.response?.data || error
            );

            closeAlert();

            await showErrorAlert(
                'Approval Gagal',
                getBackendErrorMessage(
                    error,
                    'Pengajuan merchandise gagal disetujui.'
                )
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleRevision = async () => {
        if (
            !(await ensureProcessAccess()) ||
            !(await validatePendingStatus())
        ) {
            return;
        }

        const normalizedNote = adminNote.trim();

        if (normalizedNote.length < 5) {
            await showWarningAlert(
                'Catatan Revisi Belum Lengkap',
                'Catatan revisi minimal lima karakter.'
            );

            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Minta Revisi?',
                text:
                    `Pengajuan ${order.order_code} akan dikembalikan kepada pemohon untuk diperbaiki.`,
                confirmButtonText:
                    'Ya, minta revisi',
                cancelButtonText: 'Batal',
                icon: 'warning',
                confirmButtonColor: '#0ea5e9',
            });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Meminta Revisi',
                'Mohon tunggu sebentar.'
            );

            const response = await api.put(
                `/orders/${order.id}/revision`,
                {
                    admin_note: normalizedNote,
                }
            );

            closeAlert();

            await showSuccessAlert(
                'Revisi Diminta',
                response?.data?.message ||
                    'Pengajuan dikembalikan kepada pemohon untuk diperbaiki.'
            );

            await fetchOrder();
        } catch (error) {
            console.error(
                'Revision merchandise error:',
                error?.response?.data || error
            );

            closeAlert();

            await showErrorAlert(
                'Permintaan Revisi Gagal',
                getBackendErrorMessage(
                    error,
                    'Permintaan revisi gagal diproses.'
                )
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (
            !(await ensureProcessAccess()) ||
            !(await validatePendingStatus())
        ) {
            return;
        }

        const normalizedNote = adminNote.trim();

        if (normalizedNote.length < 5) {
            await showWarningAlert(
                'Alasan Belum Lengkap',
                'Alasan penolakan minimal lima karakter.'
            );

            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Tolak Pengajuan?',
                text:
                    `Pengajuan ${order.order_code} akan ditolak secara permanen.`,
                confirmButtonText: 'Ya, tolak',
                cancelButtonText: 'Batal',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Menolak Pengajuan',
                'Mohon tunggu sebentar.'
            );

            const response = await api.put(
                `/orders/${order.id}/reject`,
                {
                    admin_note: normalizedNote,
                }
            );

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Ditolak',
                response?.data?.message ||
                    'Pengajuan merchandise berhasil ditolak.'
            );

            await fetchOrder();
        } catch (error) {
            console.error(
                'Reject merchandise error:',
                error?.response?.data || error
            );

            closeAlert();

            await showErrorAlert(
                'Penolakan Gagal',
                getBackendErrorMessage(
                    error,
                    'Pengajuan merchandise gagal ditolak.'
                )
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleComplete = async () => {
        if (!(await ensureProcessAccess())) {
            return;
        }

        if (order?.status !== 'approved') {
            await showWarningAlert(
                'Status Tidak Sesuai',
                'Pengajuan hanya dapat diselesaikan setelah disetujui.'
            );

            return;
        }

        const confirmation =
            await showConfirmAlert({
                title: 'Tandai Selesai?',
                text:
                    `Pengajuan ${order.order_code} akan ditandai selesai.`,
                confirmButtonText: 'Ya, selesai',
                cancelButtonText: 'Batal',
                icon: 'question',
                confirmButtonColor: '#16a34a',
            });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Memproses Data',
                'Mohon tunggu sebentar.'
            );

            const response = await api.put(
                `/orders/${order.id}/complete`,
                {
                    admin_note:
                        adminNote.trim() || null,
                }
            );

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Selesai',
                response?.data?.message ||
                    'Pengajuan merchandise berhasil ditandai selesai.'
            );

            await fetchOrder();
        } catch (error) {
            console.error(
                'Complete merchandise error:',
                error?.response?.data || error
            );

            closeAlert();

            await showErrorAlert(
                'Proses Gagal',
                getBackendErrorMessage(
                    error,
                    'Pengajuan gagal ditandai selesai.'
                )
            );
        } finally {
            setProcessing(false);
        }
    };

    if (!canView) {
        return (
            <Navigate
                to={defaultPath}
                replace
            />
        );
    }

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-primary mb-3" />

                    <h5 className="fw-bold mb-1">
                        Memuat detail pengajuan
                    </h5>

                    <p className="text-muted mb-0">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                        style={{
                            width: 84,
                            height: 84,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h4 className="fw-black mb-2">
                        Data tidak ditemukan
                    </h4>

                    <p className="text-muted mb-4">
                        Detail pengajuan merchandise tidak tersedia.
                    </p>

                    <Link
                        to="/admin/orders"
                        className="btn btn-primary rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Approval Merchandise
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig =
        STATUS_CONFIG[order.status] || {
            label:
                order.status ||
                'Tidak diketahui',
            badgeClass:
                'bg-secondary-subtle text-secondary',
            icon:
                'bi-info-circle-fill',
        };

    const orderItems =
        Array.isArray(order.items)
            ? order.items
            : [];

    return (
        <div className="container-fluid px-0">
            <header className="approval-detail-header mb-4">
                <div className="approval-detail-heading">
                    <Link
                        to="/admin/orders"
                        className="approval-detail-back-link"
                    >
                        <i className="bi bi-arrow-left" />

                        <span>
                            Kembali ke Approval Merchandise
                        </span>
                    </Link>

                    <h2 className="approval-detail-title">
                        Detail Pengajuan Merchandise
                    </h2>

                    <div className="approval-detail-meta">
                        <span className="fw-bold text-muted">
                            {order.order_code ||
                                `MER-${order.id}`}
                        </span>

                        <span
                            className={`badge rounded-pill px-3 py-2 ${statusConfig.badgeClass}`}
                        >
                            <i
                                className={`bi ${statusConfig.icon} me-2`}
                            />

                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                <div className="approval-detail-date">
                    <span className="small text-muted">
                        Dikirim
                    </span>

                    <strong>
                        {formatDateTime(
                            order.submitted_at ||
                                order.created_at
                        )}
                    </strong>
                </div>
            </header>

            {!canProcess && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-eye-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Mode hanya lihat
                            </div>

                            <div className="small">
                                Akun dapat melihat detail pengajuan,
                                tetapi tidak dapat menyetujui,
                                meminta revisi, menolak, atau
                                menyelesaikannya.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {order.status === 'revision' && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <div className="icon-box bg-white text-info">
                            <i className="bi bi-pencil-square" />
                        </div>

                        <div>
                            <h5 className="fw-black mb-1">
                                Menunggu Perbaikan Pemohon
                            </h5>

                            <p
                                className="mb-0"
                                style={{
                                    whiteSpace: 'pre-line',
                                }}
                            >
                                {order.admin_note ||
                                    'Pengajuan telah dikembalikan kepada pemohon untuk diperbaiki.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Informasi Kegiatan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Informasi kegiatan, tamu,
                                        dan dokumen pendukung.
                                    </p>
                                </div>

                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-calendar-event-fill" />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama Kegiatan"
                                        value={order.event_name}
                                        icon="bi-calendar-event-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Kegiatan"
                                        value={formatDate(
                                            order.activity_date
                                        )}
                                        icon="bi-calendar-date-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama Pemohon"
                                        value={
                                            order.user?.name ||
                                            '-'
                                        }
                                        icon="bi-person-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Instansi Tamu"
                                        value={
                                            order.institution_name
                                        }
                                        icon="bi-buildings-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama Tamu"
                                        value={order.guest_name}
                                        icon="bi-person-badge-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Jabatan Tamu"
                                        value={order.guest_position}
                                        icon="bi-briefcase-fill"
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="d-flex align-items-start gap-3">
                                            <div
                                                className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                                                style={{
                                                    width: 42,
                                                    height: 42,
                                                }}
                                            >
                                                <i className="bi bi-file-earmark-text-fill" />
                                            </div>

                                            <div className="min-w-0 flex-grow-1">
                                                <div className="small text-muted mb-1">
                                                    Lampiran
                                                </div>

                                                {order.proof_file_url ? (
                                                    <a
                                                        href={
                                                            order.proof_file_url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="fw-bold text-primary text-decoration-none"
                                                    >
                                                        {order.proof_file_name ||
                                                            'Buka lampiran'}

                                                        <i className="bi bi-box-arrow-up-right ms-2" />
                                                    </a>
                                                ) : (
                                                    <div className="fw-bold">
                                                        Tidak tersedia
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="p-4 rounded-4 border bg-light">
                                        <div className="small fw-bold text-muted mb-2">
                                            Catatan Pemohon
                                        </div>

                                        <div
                                            style={{
                                                whiteSpace:
                                                    'pre-line',
                                                lineHeight: 1.8,
                                            }}
                                        >
                                            {order.user_note ||
                                                '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                <div>
                                    <h4 className="fw-black mb-1">
                                        Item Merchandise
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Daftar merchandise yang diajukan.
                                    </p>
                                </div>

                                <span className="badge rounded-pill text-bg-primary px-3 py-2">
                                    {orderItems.length} item
                                </span>
                            </div>

                            {orderItems.length === 0 ? (
                                <div className="alert alert-warning rounded-4 mb-0">
                                    Tidak ada item merchandise pada
                                    pengajuan ini.
                                </div>
                            ) : (
                                <div className="table-responsive rounded-4 border">
                                    <table className="table align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4 py-3">
                                                    Merchandise
                                                </th>

                                                <th className="py-3">
                                                    Kategori
                                                </th>

                                                <th className="text-end py-3">
                                                    Jumlah
                                                </th>

                                                <th className="text-end pe-4 py-3">
                                                    Stok Saat Ini
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {orderItems.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.id ||
                                                            index
                                                        }
                                                    >
                                                        <td className="ps-4 py-3">
                                                            <div className="fw-black">
                                                                {item
                                                                    .product
                                                                    ?.name ||
                                                                    '-'}
                                                            </div>

                                                            {item
                                                                .product
                                                                ?.description && (
                                                                <div className="small text-muted mt-1">
                                                                    {
                                                                        item
                                                                            .product
                                                                            .description
                                                                    }
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="py-3">
                                                            {item
                                                                .product
                                                                ?.category
                                                                ?.name ||
                                                                '-'}
                                                        </td>

                                                        <td className="text-end py-3 fw-black">
                                                            {Number(
                                                                item.quantity ||
                                                                    0
                                                            )}
                                                        </td>

                                                        <td className="text-end pe-4 py-3">
                                                            {item
                                                                .product
                                                                ?.stock ??
                                                                '-'}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4 p-lg-5">
                            <h4 className="fw-black mb-3">
                                Catatan Admin
                            </h4>

                            <div
                                className={`p-4 rounded-4 border ${
                                    order.admin_note
                                        ? order.status ===
                                          'rejected'
                                            ? 'bg-danger-subtle'
                                            : order.status ===
                                                'revision'
                                              ? 'bg-info-subtle'
                                              : 'bg-light'
                                        : 'bg-light'
                                }`}
                            >
                                <div
                                    style={{
                                        whiteSpace:
                                            'pre-line',
                                        lineHeight: 1.8,
                                    }}
                                >
                                    {order.admin_note ||
                                        'Belum ada catatan admin.'}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{
                            top: 110,
                        }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Status
                                </h4>

                                <p className="text-muted mb-4">
                                    Perkembangan proses pengajuan.
                                </p>

                                <div className="request-timeline">
                                    <TimelineItem
                                        label="Dikirim"
                                        value={formatDateTime(
                                            order.submitted_at ||
                                                order.created_at
                                        )}
                                        icon="bi-send-check-fill"
                                    />

                                    {order.revision_requested_at && (
                                        <TimelineItem
                                            label="Revisi Diminta"
                                            value={formatDateTime(
                                                order.revision_requested_at
                                            )}
                                            icon="bi-pencil-square"
                                        />
                                    )}

                                    {order.resubmitted_at && (
                                        <TimelineItem
                                            label="Dikirim Ulang"
                                            value={formatDateTime(
                                                order.resubmitted_at
                                            )}
                                            icon="bi-arrow-repeat"
                                        />
                                    )}

                                    {order.approved_at && (
                                        <TimelineItem
                                            label="Disetujui"
                                            value={formatDateTime(
                                                order.approved_at
                                            )}
                                            icon="bi-check-circle-fill"
                                        />
                                    )}

                                    {order.rejected_at && (
                                        <TimelineItem
                                            label="Ditolak"
                                            value={formatDateTime(
                                                order.rejected_at
                                            )}
                                            icon="bi-x-circle-fill"
                                        />
                                    )}

                                    {order.completed_at && (
                                        <TimelineItem
                                            label="Selesai"
                                            value={formatDateTime(
                                                order.completed_at
                                            )}
                                            icon="bi-check2-all"
                                        />
                                    )}

                                    {order.status ===
                                        'pending' && (
                                        <TimelineItem
                                            label="Menunggu Pemeriksaan"
                                            value="Admin sedang memeriksa pengajuan."
                                            icon="bi-hourglass-split"
                                            active
                                        />
                                    )}

                                    {order.status ===
                                        'revision' && (
                                        <TimelineItem
                                            label="Menunggu Pemohon"
                                            value="Menunggu pemohon mengirimkan hasil perbaikan."
                                            icon="bi-person-gear"
                                            active
                                        />
                                    )}

                                    {order.status ===
                                        'approved' && (
                                        <TimelineItem
                                            label="Dalam Proses"
                                            value="Merchandise sedang dipersiapkan."
                                            icon="bi-box-seam-fill"
                                            active
                                        />
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Tindakan Admin
                                </h4>

                                <p className="text-muted mb-4">
                                    Proses pengajuan berdasarkan
                                    status saat ini.
                                </p>

                                {!canProcess ? (
                                    <div className="p-4 rounded-4 bg-light border text-center">
                                        <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                        <h6 className="fw-black mt-3 mb-2">
                                            Mode hanya lihat
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Akun tidak memiliki
                                            permission proses approval
                                            merchandise.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {order.status ===
                                            'pending' && (
                                            <>
                                                <label className="form-label fw-bold">
                                                    Catatan Admin
                                                </label>

                                                <textarea
                                                    className="form-control rounded-4 mb-2"
                                                    rows="5"
                                                    maxLength="2000"
                                                    placeholder="Wajib diisi untuk meminta revisi atau menolak pengajuan."
                                                    value={
                                                        adminNote
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setAdminNote(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                />

                                                <div className="small text-muted text-end mb-3">
                                                    {
                                                        adminNote.length
                                                    }
                                                    /2000 karakter
                                                </div>

                                                <div className="d-grid gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary rounded-pill"
                                                        onClick={
                                                            handleApprove
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    >
                                                        <i className="bi bi-check-lg me-2" />

                                                        Setujui Pengajuan
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-info text-white rounded-pill"
                                                        onClick={
                                                            handleRevision
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    >
                                                        <i className="bi bi-pencil-square me-2" />

                                                        Minta Revisi
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger rounded-pill"
                                                        onClick={
                                                            handleReject
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    >
                                                        <i className="bi bi-x-lg me-2" />

                                                        Tolak Pengajuan
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {order.status ===
                                            'revision' && (
                                            <div className="p-4 rounded-4 bg-info-subtle border border-info-subtle">
                                                <div className="fw-black text-info-emphasis mb-2">
                                                    Menunggu Perbaikan
                                                </div>

                                                <p className="small text-muted mb-0">
                                                    Pemohon harus
                                                    memperbaiki dan
                                                    mengirim ulang
                                                    pengajuan sebelum
                                                    dapat diproses
                                                    kembali.
                                                </p>
                                            </div>
                                        )}

                                        {order.status ===
                                            'approved' && (
                                            <>
                                                <div className="p-3 rounded-4 bg-primary-subtle mb-3">
                                                    <div className="fw-black text-primary mb-1">
                                                        Pengajuan Disetujui
                                                    </div>

                                                    <div className="small text-muted">
                                                        Tandai selesai
                                                        setelah
                                                        merchandise
                                                        diserahkan.
                                                    </div>
                                                </div>

                                                <label className="form-label fw-bold">
                                                    Catatan Penyelesaian
                                                    <span className="text-muted fw-normal">
                                                        {' '}
                                                        (Opsional)
                                                    </span>
                                                </label>

                                                <textarea
                                                    className="form-control rounded-4 mb-3"
                                                    rows="4"
                                                    maxLength="2000"
                                                    placeholder="Contoh: Merchandise telah diserahkan kepada pemohon."
                                                    value={
                                                        adminNote
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setAdminNote(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill w-100"
                                                    onClick={
                                                        handleComplete
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-patch-check-fill me-2" />

                                                    Tandai Selesai
                                                </button>
                                            </>
                                        )}

                                        {[
                                            'rejected',
                                            'completed',
                                        ].includes(
                                            order.status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Pengajuan berstatus{' '}

                                                <strong>
                                                    {
                                                        statusConfig.label
                                                    }
                                                </strong>{' '}

                                                dan tidak memiliki
                                                tindakan lanjutan.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}