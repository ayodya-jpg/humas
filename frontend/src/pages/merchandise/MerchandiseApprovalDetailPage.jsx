import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass: 'text-bg-warning',
        icon: 'bi-hourglass-split',
    },

    approved: {
        label: 'Disetujui',
        badgeClass: 'text-bg-primary',
        icon: 'bi-check-circle-fill',
    },

    rejected: {
        label: 'Ditolak',
        badgeClass: 'text-bg-danger',
        icon: 'bi-x-circle-fill',
    },

    completed: {
        label: 'Selesai',
        badgeClass: 'text-bg-success',
        icon: 'bi-check2-all',
    },
};

const getCurrentUser = () => {
    try {
        return JSON.parse(
            localStorage.getItem('admin_user') || '{}'
        );
    } catch {
        return {};
    }
};

const normalizePermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [
        ...new Set(
            permissions.filter(Boolean)
        ),
    ];
};

const hasPermission = (
    currentUser,
    permission
) => {
    if (
        currentUser?.role === 'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
};

const formatDate = (date) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        const [
            year,
            month,
            day,
        ] = date
            .split('-')
            .map(Number);

        const parsedDate = new Date(
            year,
            month - 1,
            day
        );

        return parsedDate.toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }
        );
    }

    const parsedDate = new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate.toLocaleDateString(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }
    );
};

const formatDateTime = (date) => {
    if (!date) {
        return '-';
    }

    const parsedDate = new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate.toLocaleString(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    );
};

const getBackendErrorMessage = (
    error,
    fallbackMessage
) => {
    const responseData =
        error?.response?.data;

    if (responseData?.errors) {
        const firstError =
            Object.values(
                responseData.errors
            )?.[0]?.[0];

        if (firstError) {
            return firstError;
        }
    }

    if (responseData?.message) {
        return responseData.message;
    }

    return fallbackMessage;
};

const InfoBox = ({
    label,
    value,
}) => {
    return (
        <div className="p-3 rounded-4 bg-light h-100">
            <div className="small text-muted mb-1">
                {label}
            </div>

            <div className="fw-bold text-break">
                {value || '-'}
            </div>
        </div>
    );
};

export default function MerchandiseApprovalDetailPage() {
    const { id } = useParams();

    const navigate =
        useNavigate();

    const currentUser =
        useMemo(
            () => getCurrentUser(),
            []
        );

    const canProcess =
        hasPermission(
            currentUser,
            'approval.merchandise.process'
        );

    const [
        order,
        setOrder,
    ] = useState(null);

    const [
        adminNote,
        setAdminNote,
    ] = useState('');

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        processing,
        setProcessing,
    ] = useState(false);

    const fetchOrder =
        useCallback(
            async () => {
                try {
                    setLoading(true);

                    const response =
                        await api.get(
                            `/orders/${id}`
                        );

                    const responseData =
                        response?.data?.data;

                    setOrder(
                        responseData || null
                    );

                    setAdminNote(
                        responseData?.admin_note ||
                            ''
                    );
                } catch (error) {
                    console.error(
                        'Fetch merchandise detail error:',
                        error?.response?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Detail',
                        getBackendErrorMessage(
                            error,
                            'Detail pengajuan merchandise gagal dimuat.'
                        )
                    );

                    navigate(
                        '/admin/orders',
                        {
                            replace: true,
                        }
                    );
                } finally {
                    setLoading(false);
                }
            },
            [
                id,
                navigate,
            ]
        );

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const ensureProcessAccess = () => {
        if (canProcess) {
            return true;
        }

        showErrorAlert(
            'Akses Ditolak',
            'Akun hanya memiliki izin melihat approval dan tidak dapat memproses pengajuan.'
        );

        return false;
    };

    const handleApprove = async () => {
        if (
            !ensureProcessAccess()
        ) {
            return;
        }

        const confirmation =
            await showConfirmAlert({
                title:
                    'Setujui Pengajuan?',

                text:
                    `Pengajuan ${order.order_code} akan disetujui dan stok merchandise akan dikurangi.`,

                confirmButtonText:
                    'Ya, setujui',

                icon:
                    'question',

                confirmButtonColor:
                    '#2563eb',
            });

        if (
            !confirmation.isConfirmed
        ) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Memproses Approval',
                'Mohon tunggu sebentar.'
            );

            const response =
                await api.put(
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
                error?.response?.data ||
                    error
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

    const handleReject = async () => {
        if (
            !ensureProcessAccess()
        ) {
            return;
        }

        if (
            !adminNote.trim()
        ) {
            await showErrorAlert(
                'Catatan Wajib Diisi',
                'Isi alasan penolakan terlebih dahulu.'
            );

            return;
        }

        const confirmation =
            await showConfirmAlert({
                title:
                    'Tolak Pengajuan?',

                text:
                    `Pengajuan ${order.order_code} akan ditolak.`,

                confirmButtonText:
                    'Ya, tolak',

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
            setProcessing(true);

            showLoadingAlert(
                'Menolak Pengajuan',
                'Mohon tunggu sebentar.'
            );

            const response =
                await api.put(
                    `/orders/${order.id}/reject`,
                    {
                        admin_note:
                            adminNote.trim(),
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
                error?.response?.data ||
                    error
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
        if (
            !ensureProcessAccess()
        ) {
            return;
        }

        const confirmation =
            await showConfirmAlert({
                title:
                    'Tandai Selesai?',

                text:
                    `Pengajuan ${order.order_code} akan ditandai selesai.`,

                confirmButtonText:
                    'Ya, selesai',

                icon:
                    'question',

                confirmButtonColor:
                    '#0f766e',
            });

        if (
            !confirmation.isConfirmed
        ) {
            return;
        }

        try {
            setProcessing(true);

            showLoadingAlert(
                'Memproses Data',
                'Mohon tunggu sebentar.'
            );

            const response =
                await api.put(
                    `/orders/${order.id}/complete`
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
                error?.response?.data ||
                    error
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
                            width: 82,
                            height: 82,
                        }}
                    >
                        <i className="bi bi-exclamation-circle-fill fs-1" />
                    </div>

                    <h5 className="fw-black mb-3">
                        Data tidak ditemukan
                    </h5>

                    <Link
                        to="/admin/orders"
                        className="btn btn-primary rounded-pill px-4"
                    >
                        Kembali ke Approval Merchandise
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig =
        STATUS_CONFIG[
            order.status
        ] || {
            label:
                order.status ||
                'Tidak diketahui',

            badgeClass:
                'text-bg-secondary',

            icon:
                'bi-info-circle-fill',
        };

    const orderItems =
        Array.isArray(
            order.items
        )
            ? order.items
            : [];

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Detail Approval Merchandise
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {order.event_name ||
                                    'Pengajuan Merchandise'}
                            </h1>

                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="badge rounded-pill text-bg-primary">
                                    {order.order_code ||
                                        `MER-${order.id}`}
                                </span>

                                <span
                                    className={`badge rounded-pill ${statusConfig.badgeClass}`}
                                >
                                    <i
                                        className={`bi ${statusConfig.icon} me-2`}
                                    />

                                    {
                                        statusConfig.label
                                    }
                                </span>

                                <span className="badge rounded-pill text-bg-light text-primary">
                                    Submit:{' '}

                                    {formatDateTime(
                                        order.submitted_at ||
                                            order.created_at
                                    )}
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/admin/orders"
                            className="btn btn-light rounded-pill px-4"
                        >
                            <i className="bi bi-arrow-left me-2" />

                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            {!canProcess && (
                <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4">
                    <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-eye-fill fs-4" />

                        <div>
                            <div className="fw-black">
                                Mode hanya lihat
                            </div>

                            <div className="small">
                                Akun dapat melihat detail pengajuan, tetapi tidak memiliki izin untuk menyetujui, menolak, atau menyelesaikannya.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Informasi Kegiatan
                            </h4>

                            <p className="text-muted mb-4">
                                Detail kegiatan dan tamu dari pemohon.
                            </p>

                            <div className="row g-3">
                                <div className="col-md-6 col-xl-3">
                                    <InfoBox
                                        label="Pemohon"
                                        value={
                                            order.user?.name ||
                                            order.applicant_name ||
                                            '-'
                                        }
                                    />
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <InfoBox
                                        label="Instansi"
                                        value={
                                            order.institution_name ||
                                            '-'
                                        }
                                    />
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <InfoBox
                                        label="Nama Tamu"
                                        value={
                                            order.guest_name ||
                                            '-'
                                        }
                                    />
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <InfoBox
                                        label="Jabatan Tamu"
                                        value={
                                            order.guest_position ||
                                            '-'
                                        }
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Kegiatan"
                                        value={formatDate(
                                            order.activity_date
                                        )}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 bg-light h-100">
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
                                                    'Buka file lampiran'}

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
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Item Merchandise
                            </h4>

                            <p className="text-muted mb-4">
                                Daftar merchandise yang diajukan.
                            </p>

                            {orderItems.length === 0 ? (
                                <div className="alert alert-warning border-0 rounded-4 mb-0">
                                    Tidak ada item merchandise pada pengajuan ini.
                                </div>
                            ) : (
                                <div className="table-responsive rounded-4 border">
                                    <table className="table align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>
                                                    Merchandise
                                                </th>

                                                <th>
                                                    Kategori
                                                </th>

                                                <th className="text-end">
                                                    Qty
                                                </th>

                                                <th className="text-end">
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
                                                        <td className="fw-bold">
                                                            {item.product
                                                                ?.name ||
                                                                item.product_name ||
                                                                '-'}
                                                        </td>

                                                        <td>
                                                            {item.product
                                                                ?.category
                                                                ?.name ||
                                                                item.category_name ||
                                                                '-'}
                                                        </td>

                                                        <td className="text-end fw-bold">
                                                            {item.quantity ||
                                                                0}
                                                        </td>

                                                        <td className="text-end">
                                                            {item.product
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
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-3">
                                Catatan
                            </h4>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 border h-100">
                                        <div className="small fw-bold text-muted mb-1">
                                            Catatan Pemohon
                                        </div>

                                        <p
                                            className="mb-0 text-muted"
                                            style={{
                                                lineHeight: 1.7,
                                                whiteSpace:
                                                    'pre-line',
                                            }}
                                        >
                                            {order.user_note ||
                                                '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 border h-100">
                                        <div className="small fw-bold text-muted mb-1">
                                            Catatan Admin Terakhir
                                        </div>

                                        <p
                                            className="mb-0 text-muted"
                                            style={{
                                                lineHeight: 1.7,
                                                whiteSpace:
                                                    'pre-line',
                                            }}
                                        >
                                            {order.admin_note ||
                                                'Belum ada catatan admin.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Aksi Approval
                            </h4>

                            <p className="text-muted mb-4">
                                Proses pengajuan berdasarkan status saat ini.
                            </p>

                            {!canProcess ? (
                                <div className="p-4 rounded-4 bg-light border text-center">
                                    <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                    <h6 className="fw-black mt-3 mb-2">
                                        Tidak memiliki akses proses
                                    </h6>

                                    <p className="small text-muted mb-0">
                                        Hubungi superadmin untuk mendapatkan permission proses approval merchandise.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {order.status ===
                                        'pending' && (
                                        <>
                                            <label className="form-label fw-bold">
                                                Alasan Penolakan
                                            </label>

                                            <textarea
                                                className="form-control rounded-4 mb-3"
                                                rows="5"
                                                placeholder="Isi catatan hanya jika pengajuan akan ditolak..."
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

                                                    Setujui
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger rounded-pill"
                                                    onClick={
                                                        handleReject
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-x-lg me-2" />

                                                    Tolak
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {order.status ===
                                        'approved' && (
                                        <>
                                            <div className="p-3 rounded-4 bg-primary-subtle mb-3">
                                                <div className="fw-black text-primary">
                                                    Pengajuan sudah disetujui
                                                </div>

                                                <div className="small text-muted">
                                                    Tandai selesai ketika merchandise sudah diproses atau diserahkan.
                                                </div>
                                            </div>

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
                                        <div className="p-3 rounded-4 bg-light border">
                                            <div className="fw-black mb-1">
                                                Tidak ada aksi
                                            </div>

                                            <p
                                                className="text-muted mb-0"
                                                style={{
                                                    lineHeight: 1.7,
                                                }}
                                            >
                                                Pengajuan berada pada status{' '}

                                                <strong>
                                                    {statusConfig.label}
                                                </strong>
                                                .
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-3">
                                Timeline Status
                            </h4>

                            <div className="d-flex flex-column gap-3">
                                <InfoBox
                                    label="Dikirim"
                                    value={formatDateTime(
                                        order.submitted_at ||
                                            order.created_at
                                    )}
                                />

                                <InfoBox
                                    label="Disetujui"
                                    value={formatDateTime(
                                        order.approved_at
                                    )}
                                />

                                <InfoBox
                                    label="Ditolak"
                                    value={formatDateTime(
                                        order.rejected_at
                                    )}
                                />

                                <InfoBox
                                    label="Selesai"
                                    value={formatDateTime(
                                        order.completed_at
                                    )}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}