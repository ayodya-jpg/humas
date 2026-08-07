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
    showWarningAlert,
} from '../../utils/sweetAlert';

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        badgeClass:
            'bg-warning-subtle text-warning-emphasis',
        icon:
            'bi-hourglass-split',
    },

    approved: {
        label: 'Disetujui',
        badgeClass:
            'bg-primary-subtle text-primary',
        icon:
            'bi-check-circle-fill',
    },

    rejected: {
        label: 'Ditolak',
        badgeClass:
            'bg-danger-subtle text-danger',
        icon:
            'bi-x-circle-fill',
    },

    borrowed: {
        label: 'Sedang Dipinjam',
        badgeClass:
            'bg-info-subtle text-info-emphasis',
        icon:
            'bi-box-arrow-up-right',
    },

    returned: {
        label: 'Dikembalikan',
        badgeClass:
            'bg-success-subtle text-success',
        icon:
            'bi-box-arrow-in-down-left',
    },
};

const getCurrentUser = () => {
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

const normalizePermissions = (
    permissions
) => {
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
        currentUser?.role ===
        'superadmin'
    ) {
        return true;
    }

    return normalizePermissions(
        currentUser?.permissions
    ).includes(permission);
};

const formatDate = (
    date
) => {
    if (!date) {
        return '-';
    }

    if (
        typeof date ===
            'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            date
        )
    ) {
        const [
            year,
            month,
            day,
        ] = date
            .split('-')
            .map(Number);

        return new Date(
            year,
            month - 1,
            day
        ).toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }
        );
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate
        .toLocaleDateString(
            'id-ID',
            {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }
        );
};

const formatDateTime = (
    date
) => {
    if (!date) {
        return '-';
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return '-';
    }

    return parsedDate
        .toLocaleString(
            'id-ID',
            {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
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

    return (
        responseData?.message ||
        fallbackMessage
    );
};

const InfoBox = ({
    label,
    value,
    icon =
        'bi-info-circle',
}) => {
    return (
        <div className="p-3 rounded-4 bg-light h-100">
            <div className="d-flex align-items-start gap-3">
                <div
                    className="rounded-circle bg-white text-success d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width: 42,
                        height: 42,
                    }}
                >
                    <i
                        className={`bi ${icon}`}
                    />
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
    rejected = false,
}) => {
    let statusClass =
        'done';

    if (active) {
        statusClass =
            'active';
    }

    if (rejected) {
        statusClass =
            'rejected';
    }

    return (
        <div
            className={`request-timeline-item ${statusClass}`}
        >
            <div className="request-timeline-marker">
                <i
                    className={`bi ${icon}`}
                />
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

export default function BorrowingApprovalDetailPage() {
    const {
        id,
    } = useParams();

    const navigate =
        useNavigate();

    const currentUser =
        useMemo(
            () =>
                getCurrentUser(),
            []
        );

    const canProcess =
        hasPermission(
            currentUser,
            'approval.borrowing.process'
        );

    const [
        borrowRequest,
        setBorrowRequest,
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

    const fetchBorrowRequest =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await api.get(
                            `/borrow-requests/${id}`
                        );

                    const responseData =
                        response?.data
                            ?.data ||
                        null;

                    setBorrowRequest(
                        responseData
                    );

                    setAdminNote(
                        responseData
                            ?.admin_note ||
                        ''
                    );
                } catch (
                    error
                ) {
                    console.error(
                        'Fetch borrowing detail error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Detail',
                        getBackendErrorMessage(
                            error,
                            'Detail pengajuan peminjaman gagal dimuat.'
                        )
                    );

                    navigate(
                        '/admin/borrow-requests',
                        {
                            replace:
                                true,
                        }
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                id,
                navigate,
            ]
        );

    useEffect(() => {
        fetchBorrowRequest();
    }, [
        fetchBorrowRequest,
    ]);

    const ensureProcessAccess =
        async () => {
            if (canProcess) {
                return true;
            }

            await showErrorAlert(
                'Akses Ditolak',
                'Akun hanya memiliki izin melihat approval dan tidak dapat memproses peminjaman.'
            );

            return false;
        };

    const validateStatus =
        async (
            expectedStatus,
            message
        ) => {
            if (
                borrowRequest
                    ?.status ===
                expectedStatus
            ) {
                return true;
            }

            await showWarningAlert(
                'Status Tidak Sesuai',
                message
            );

            return false;
        };

    const handleApprove =
        async () => {
            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'pending',
                    'Hanya pengajuan berstatus menunggu yang dapat disetujui.'
                ))
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Setujui Peminjaman?',

                    text:
                        `Pengajuan ${borrowRequest.borrow_code} akan disetujui dan stok barang akan dikurangi.`,

                    confirmButtonText:
                        'Ya, setujui',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#2563eb',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Memproses Approval',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.put(
                        `/borrow-requests/${borrowRequest.id}/approve`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Approval Berhasil',
                    response?.data
                        ?.message ||
                        'Pengajuan peminjaman berhasil disetujui.'
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Approve borrowing error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Approval Gagal',
                    getBackendErrorMessage(
                        error,
                        'Pengajuan peminjaman gagal disetujui.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    const handleReject =
        async () => {
            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'pending',
                    'Hanya pengajuan berstatus menunggu yang dapat ditolak.'
                ))
            ) {
                return;
            }

            const normalizedNote =
                adminNote.trim();

            if (
                normalizedNote
                    .length < 5
            ) {
                await showWarningAlert(
                    'Alasan Belum Lengkap',
                    'Alasan penolakan minimal lima karakter.'
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Tolak Peminjaman?',

                    text:
                        `Pengajuan ${borrowRequest.borrow_code} akan ditolak.`,

                    confirmButtonText:
                        'Ya, tolak',

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
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Menolak Pengajuan',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.put(
                        `/borrow-requests/${borrowRequest.id}/reject`,
                        {
                            admin_note:
                                normalizedNote,
                        }
                    );

                closeAlert();

                await showSuccessAlert(
                    'Pengajuan Ditolak',
                    response?.data
                        ?.message ||
                        'Pengajuan peminjaman berhasil ditolak.'
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Reject borrowing error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Penolakan Gagal',
                    getBackendErrorMessage(
                        error,
                        'Pengajuan peminjaman gagal ditolak.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    const handleBorrowed =
        async () => {
            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'approved',
                    'Barang hanya dapat ditandai dipinjam setelah pengajuan disetujui.'
                ))
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Tandai Dipinjam?',

                    text:
                        `Barang pada pengajuan ${borrowRequest.borrow_code} akan ditandai sudah diambil oleh pemohon.`,

                    confirmButtonText:
                        'Ya, tandai dipinjam',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#0f766e',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Memproses Data',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.put(
                        `/borrow-requests/${borrowRequest.id}/borrowed`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Barang Dipinjam',
                    response?.data
                        ?.message ||
                        'Barang berhasil ditandai sedang dipinjam.'
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Borrowed action error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Proses Gagal',
                    getBackendErrorMessage(
                        error,
                        'Barang gagal ditandai sedang dipinjam.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    const handleReturned =
        async () => {
            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'borrowed',
                    'Barang hanya dapat dikembalikan ketika berstatus sedang dipinjam.'
                ))
            ) {
                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Tandai Dikembalikan?',

                    text:
                        `Barang pada pengajuan ${borrowRequest.borrow_code} akan ditandai sudah dikembalikan dan stok akan bertambah kembali.`,

                    confirmButtonText:
                        'Ya, tandai kembali',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#0f766e',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Memproses Pengembalian',
                    'Mohon tunggu sebentar.'
                );

                const response =
                    await api.put(
                        `/borrow-requests/${borrowRequest.id}/returned`
                    );

                closeAlert();

                await showSuccessAlert(
                    'Barang Dikembalikan',
                    response?.data
                        ?.message ||
                        'Barang berhasil ditandai sudah dikembalikan.'
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Returned action error:',
                    error
                        ?.response
                        ?.data ||
                        error
                );

                closeAlert();

                await showErrorAlert(
                    'Proses Gagal',
                    getBackendErrorMessage(
                        error,
                        'Barang gagal ditandai sudah dikembalikan.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-success mb-3" />

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

    if (!borrowRequest) {
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
                        Detail pengajuan peminjaman tidak tersedia.
                    </p>

                    <Link
                        to="/admin/borrow-requests"
                        className="btn btn-success rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Approval Peminjaman
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig =
        STATUS_CONFIG[
            borrowRequest.status
        ] || {
            label:
                borrowRequest
                    .status ||
                'Tidak diketahui',

            badgeClass:
                'bg-secondary-subtle text-secondary',

            icon:
                'bi-info-circle-fill',
        };

    const borrowItems =
        Array.isArray(
            borrowRequest.items
        )
            ? borrowRequest.items
            : [];

    const requestTitle =
        borrowRequest.purpose ||
        borrowRequest.event_name ||
        'Pengajuan Peminjaman';

    return (
        <div className="container-fluid px-0">
            <header className="approval-detail-header mb-4">
                <div className="approval-detail-heading">
                    <Link
                        to="/admin/borrow-requests"
                        className="approval-detail-back-link"
                    >
                        <i className="bi bi-arrow-left" />

                        <span>
                            Kembali ke Approval Peminjaman
                        </span>
                    </Link>

                    <h2 className="approval-detail-title">
                        Detail Peminjaman
                    </h2>

                    <div className="approval-detail-meta">
                        <span className="fw-bold text-muted">
                            {borrowRequest
                                .borrow_code ||
                                `BRW-${borrowRequest.id}`}
                        </span>

                        <span
                            className={`badge rounded-pill px-3 py-2 ${statusConfig.badgeClass}`}
                        >
                            <i
                                className={`bi ${statusConfig.icon} me-2`}
                            />

                            {
                                statusConfig.label
                            }
                        </span>
                    </div>
                </div>

                <div className="approval-detail-date">
                    <span className="small text-muted">
                        Dikirim
                    </span>

                    <strong>
                        {formatDateTime(
                            borrowRequest
                                .submitted_at ||
                                borrowRequest
                                    .created_at
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
                                Akun dapat melihat detail peminjaman, tetapi tidak dapat menyetujui, menolak, menyerahkan, atau menerima pengembalian barang.
                            </div>
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
                                        Informasi Peminjaman
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Informasi pemohon, jadwal, lokasi, dan keperluan peminjaman.
                                    </p>
                                </div>

                                <div className="icon-box bg-success-subtle text-success">
                                    <i className="bi bi-box-seam-fill" />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama Pemohon"
                                        value={
                                            borrowRequest
                                                .user
                                                ?.name ||
                                            borrowRequest
                                                .applicant_name ||
                                            '-'
                                        }
                                        icon="bi-person-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Kode Peminjaman"
                                        value={
                                            borrowRequest
                                                .borrow_code ||
                                            `BRW-${borrowRequest.id}`
                                        }
                                        icon="bi-upc-scan"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama Kegiatan"
                                        value={
                                            borrowRequest
                                                .event_name ||
                                            borrowRequest
                                                .activity_name ||
                                            '-'
                                        }
                                        icon="bi-calendar-event-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Penanggung Jawab"
                                        value={
                                            borrowRequest
                                                .person_in_charge ||
                                            borrowRequest
                                                .pic_name ||
                                            '-'
                                        }
                                        icon="bi-person-check-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Pengambilan"
                                        value={formatDateTime(
                                            borrowRequest
                                                .borrow_at ||
                                            borrowRequest
                                                .borrow_date
                                        )}
                                        icon="bi-calendar-plus-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Pengembalian"
                                        value={formatDateTime(
                                            borrowRequest
                                                .return_at ||
                                            borrowRequest
                                                .return_date
                                        )}
                                        icon="bi-calendar-minus-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Lokasi Kegiatan"
                                        value={
                                            borrowRequest
                                                .location ||
                                            '-'
                                        }
                                        icon="bi-geo-alt-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nomor WhatsApp"
                                        value={
                                            borrowRequest
                                                .phone_number ||
                                            borrowRequest
                                                .whatsapp_number ||
                                            '-'
                                        }
                                        icon="bi-whatsapp"
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="p-4 rounded-4 border bg-light">
                                        <div className="small fw-bold text-muted mb-2">
                                            Keperluan Peminjaman
                                        </div>

                                        <div
                                            style={{
                                                whiteSpace:
                                                    'pre-line',

                                                lineHeight:
                                                    1.8,
                                            }}
                                        >
                                            {borrowRequest
                                                .purpose ||
                                                requestTitle ||
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
                                        Item Barang
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Daftar barang yang diajukan untuk dipinjam.
                                    </p>
                                </div>

                                <span className="badge rounded-pill text-bg-success px-3 py-2">
                                    {
                                        borrowItems.length
                                    }{' '}
                                    item
                                </span>
                            </div>

                            {borrowItems.length ===
                            0 ? (
                                <div className="alert alert-warning rounded-4 mb-0">
                                    Tidak ada item barang pada pengajuan ini.
                                </div>
                            ) : (
                                <div className="table-responsive rounded-4 border">
                                    <table className="table align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4 py-3">
                                                    Barang
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
                                            {borrowItems.map(
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
                                                                    item
                                                                        .product_name ||
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
                                                                item
                                                                    .category_name ||
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
                                    borrowRequest
                                        .status ===
                                    'rejected'
                                        ? 'bg-danger-subtle'
                                        : 'bg-light'
                                }`}
                            >
                                <div
                                    style={{
                                        whiteSpace:
                                            'pre-line',

                                        lineHeight:
                                            1.8,
                                    }}
                                >
                                    {borrowRequest
                                        .admin_note ||
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
                                    Perkembangan proses peminjaman.
                                </p>

                                <div className="request-timeline">
                                    <TimelineItem
                                        label="Dikirim"
                                        value={formatDateTime(
                                            borrowRequest
                                                .submitted_at ||
                                            borrowRequest
                                                .created_at
                                        )}
                                        icon="bi-send-check-fill"
                                    />

                                    {borrowRequest
                                        .approved_at && (
                                        <TimelineItem
                                            label="Disetujui"
                                            value={formatDateTime(
                                                borrowRequest
                                                    .approved_at
                                            )}
                                            icon="bi-check-circle-fill"
                                        />
                                    )}

                                    {borrowRequest
                                        .borrowed_at && (
                                        <TimelineItem
                                            label="Barang Dipinjam"
                                            value={formatDateTime(
                                                borrowRequest
                                                    .borrowed_at
                                            )}
                                            icon="bi-box-arrow-up-right"
                                        />
                                    )}

                                    {borrowRequest
                                        .returned_at && (
                                        <TimelineItem
                                            label="Barang Dikembalikan"
                                            value={formatDateTime(
                                                borrowRequest
                                                    .returned_at
                                            )}
                                            icon="bi-box-arrow-in-down-left"
                                        />
                                    )}

                                    {borrowRequest
                                        .rejected_at && (
                                        <TimelineItem
                                            label="Ditolak"
                                            value={formatDateTime(
                                                borrowRequest
                                                    .rejected_at
                                            )}
                                            icon="bi-x-circle-fill"
                                            rejected
                                        />
                                    )}

                                    {borrowRequest
                                        .status ===
                                        'pending' && (
                                        <TimelineItem
                                            label="Menunggu Pemeriksaan"
                                            value="Admin sedang memeriksa pengajuan peminjaman."
                                            icon="bi-hourglass-split"
                                            active
                                        />
                                    )}

                                    {borrowRequest
                                        .status ===
                                        'approved' && (
                                        <TimelineItem
                                            label="Menunggu Pengambilan"
                                            value="Barang siap diproses dan menunggu diambil oleh pemohon."
                                            icon="bi-box-seam-fill"
                                            active
                                        />
                                    )}

                                    {borrowRequest
                                        .status ===
                                        'borrowed' && (
                                        <TimelineItem
                                            label="Sedang Digunakan"
                                            value="Barang sedang dipinjam dan belum dikembalikan."
                                            icon="bi-clock-history"
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
                                    Proses peminjaman berdasarkan status saat ini.
                                </p>

                                {!canProcess ? (
                                    <div className="p-4 rounded-4 bg-light border text-center">
                                        <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                        <h6 className="fw-black mt-3 mb-2">
                                            Mode hanya lihat
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Akun tidak memiliki permission proses approval peminjaman.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {borrowRequest
                                            .status ===
                                            'pending' && (
                                            <>
                                                <label className="form-label fw-bold">
                                                    Alasan Penolakan
                                                </label>

                                                <textarea
                                                    className="form-control rounded-4 mb-2"
                                                    rows="5"
                                                    maxLength="2000"
                                                    placeholder="Diisi apabila pengajuan akan ditolak."
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

                                                        Setujui Peminjaman
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

                                                        Tolak Peminjaman
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {borrowRequest
                                            .status ===
                                            'approved' && (
                                            <>
                                                <div className="p-3 rounded-4 bg-success-subtle mb-3">
                                                    <div className="fw-black text-success mb-1">
                                                        Peminjaman Disetujui
                                                    </div>

                                                    <div className="small text-muted">
                                                        Tandai dipinjam setelah barang diserahkan kepada pemohon.
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill w-100"
                                                    onClick={
                                                        handleBorrowed
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-box-arrow-up-right me-2" />

                                                    Tandai Dipinjam
                                                </button>
                                            </>
                                        )}

                                        {borrowRequest
                                            .status ===
                                            'borrowed' && (
                                            <>
                                                <div className="p-3 rounded-4 bg-warning-subtle mb-3">
                                                    <div className="fw-black text-warning-emphasis mb-1">
                                                        Barang Sedang Dipinjam
                                                    </div>

                                                    <div className="small text-muted">
                                                        Tandai dikembalikan setelah seluruh barang diterima kembali.
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill w-100"
                                                    onClick={
                                                        handleReturned
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                >
                                                    <i className="bi bi-box-arrow-in-down-left me-2" />

                                                    Tandai Dikembalikan
                                                </button>
                                            </>
                                        )}

                                        {[
                                            'rejected',
                                            'returned',
                                        ].includes(
                                            borrowRequest
                                                .status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Peminjaman berstatus{' '}

                                                <strong>
                                                    {
                                                        statusConfig.label
                                                    }
                                                </strong>{' '}

                                                dan tidak memiliki tindakan lanjutan.
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