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

const TYPE_BORROW =
    'borrow';

const TYPE_ASSET_REQUEST =
    'asset_request';

const STATUS_CONFIG = {
    pending: {
        label:
            'Menunggu',
        badgeClass:
            'bg-warning-subtle text-warning-emphasis',
        icon:
            'bi-hourglass-split',
    },

    approved: {
        label:
            'Disetujui',
        badgeClass:
            'bg-primary-subtle text-primary',
        icon:
            'bi-check-circle-fill',
    },

    rejected: {
        label:
            'Ditolak',
        badgeClass:
            'bg-danger-subtle text-danger',
        icon:
            'bi-x-circle-fill',
    },

    borrowed: {
        label:
            'Sedang Dipinjam',
        badgeClass:
            'bg-info-subtle text-info-emphasis',
        icon:
            'bi-box-arrow-up-right',
    },

    returned: {
        label:
            'Dikembalikan',
        badgeClass:
            'bg-success-subtle text-success',
        icon:
            'bi-box-arrow-in-down-left',
    },

    completed: {
        label:
            'Selesai',
        badgeClass:
            'bg-success-subtle text-success',
        icon:
            'bi-check2-all',
    },
};

const getCurrentUser =
    () => {
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

const normalizePermissions =
    (
        permissions
    ) => {
        if (
            !Array.isArray(
                permissions
            )
        ) {
            return [];
        }

        return [
            ...new Set(
                permissions.filter(
                    Boolean
                )
            ),
        ];
    };

const hasPermission =
    (
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
        ).includes(
            permission
        );
    };

const formatDate =
    (
        date
    ) => {
        if (
            !date
        ) {
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
            ] =
                date
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

        const parsedDate =
            new Date(
                date
            );

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
                    day:
                        '2-digit',

                    month:
                        'long',

                    year:
                        'numeric',
                }
            );
    };

const formatDateTime =
    (
        date
    ) => {
        if (
            !date
        ) {
            return '-';
        }

        const parsedDate =
            new Date(
                date
            );

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
                    day:
                        '2-digit',

                    month:
                        'long',

                    year:
                        'numeric',

                    hour:
                        '2-digit',

                    minute:
                        '2-digit',

                    hour12:
                        false,
                }
            );
    };

const formatFileSize =
    (
        bytes
    ) => {
        if (
            !Number.isFinite(
                bytes
            ) ||
            bytes <=
                0
        ) {
            return '-';
        }

        const units = [
            'B',
            'KB',
            'MB',
            'GB',
        ];

        const index =
            Math.min(
                Math.floor(
                    Math.log(
                        bytes
                    ) /
                        Math.log(
                            1024
                        )
                ),

                units.length -
                    1
            );

        const size =
            bytes /
            1024 ** index;

        return `${size.toFixed(
            index ===
            0
                ? 0
                : 2
        )} ${units[index]}`;
    };

const getBackendErrorMessage =
    (
        error,
        fallbackMessage
    ) => {
        const responseData =
            error?.response?.data;

        if (
            responseData?.errors
        ) {
            const firstError =
                Object.values(
                    responseData.errors
                )?.[0]?.[0];

            if (
                firstError
            ) {
                return firstError;
            }
        }

        return (
            responseData?.message ||
            fallbackMessage
        );
    };

const validateEvidenceFile =
    (
        file
    ) => {
        if (
            !file
        ) {
            return {
                valid:
                    false,

                message:
                    'File bukti belum dipilih.',
            };
        }

        const allowedExtensions = [
            'pdf',
            'jpg',
            'jpeg',
            'png',
        ];

        const extension =
            file.name
                .split('.')
                .pop()
                ?.toLowerCase();

        if (
            !extension ||
            !allowedExtensions.includes(
                extension
            )
        ) {
            return {
                valid:
                    false,

                message:
                    'File harus berformat PDF, JPG, JPEG, atau PNG.',
            };
        }

        const maxSize =
            10 *
            1024 *
            1024;

        if (
            file.size >
            maxSize
        ) {
            return {
                valid:
                    false,

                message:
                    'Ukuran file maksimal 10 MB.',
            };
        }

        return {
            valid:
                true,

            message:
                '',
        };
    };

const getRequestType =
    (
        borrowRequest
    ) => {
        /*
         * Data lama yang belum punya request_type
         * dianggap Peminjaman Barang.
         */
        return (
            borrowRequest
                ?.request_type ||
            TYPE_BORROW
        );
    };

const getRequestTypeLabel =
    (
        requestType
    ) => {
        if (
            requestType ===
            TYPE_ASSET_REQUEST
        ) {
            return 'Request Barang';
        }

        return 'Peminjaman Barang';
    };

const getRequestTypeIcon =
    (
        requestType
    ) => {
        if (
            requestType ===
            TYPE_ASSET_REQUEST
        ) {
            return 'bi-box2-heart-fill';
        }

        return 'bi-box-arrow-up-right';
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
                        width:
                            42,

                        height:
                            42,
                    }}
                >
                    <i
                        className={`bi ${icon}`}
                    />
                </div>

                <div className="min-w-0">
                    <div className="small text-muted mb-1">
                        {
                            label
                        }
                    </div>

                    <div className="fw-bold text-break">
                        {value ||
                            '-'}
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
    active =
        false,
    rejected =
        false,
}) => {
    let statusClass =
        'done';

    if (
        active
    ) {
        statusClass =
            'active';
    }

    if (
        rejected
    ) {
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
                    {
                        label
                    }
                </div>

                <div className="small text-muted">
                    {value ||
                        '-'}
                </div>
            </div>
        </div>
    );
};

const SelectedFileCard = ({
    file,
    label,
    onRemove,
    disabled =
        false,
}) => {
    if (
        !file
    ) {
        return null;
    }

    return (
        <div className="mt-3 p-3 rounded-4 border bg-light">
            <div className="d-flex align-items-start gap-3">
                <div
                    className="rounded-circle bg-white text-success d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width:
                            42,

                        height:
                            42,
                    }}
                >
                    <i className="bi bi-paperclip" />
                </div>

                <div className="flex-grow-1 min-w-0">
                    <div className="small text-muted">
                        {
                            label
                        }
                    </div>

                    <div className="fw-black text-break">
                        {
                            file.name
                        }
                    </div>

                    <div className="small text-muted mt-1">
                        {formatFileSize(
                            file.size
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger rounded-circle flex-shrink-0"
                    onClick={
                        onRemove
                    }
                    disabled={
                        disabled
                    }
                    title="Hapus file"
                >
                    <i className="bi bi-x-lg" />
                </button>
            </div>
        </div>
    );
};

const EvidenceCard = ({
    title,
    description,
    fileName,
    mime,
    url,
    icon,
}) => {
    if (
        !url
    ) {
        return null;
    }

    return (
        <div className="border rounded-4 p-4 bg-light">
            <div className="d-flex align-items-center gap-3 flex-wrap">
                <div
                    className="rounded-4 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width:
                            54,

                        height:
                            54,
                    }}
                >
                    <i
                        className={`bi ${icon} fs-4`}
                    />
                </div>

                <div className="flex-grow-1 min-w-0">
                    <div className="small text-muted mb-1">
                        {
                            title
                        }
                    </div>

                    <div className="fw-black text-break">
                        {fileName ||
                            description}
                    </div>

                    {mime && (
                        <div className="small text-muted mt-1">
                            {
                                mime
                            }
                        </div>
                    )}
                </div>

                <a
                    href={
                        url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-success rounded-pill"
                >
                    <i className="bi bi-eye-fill me-2" />

                    Buka Bukti
                </a>
            </div>
        </div>
    );
};

export default function BorrowingApprovalDetailPage() {
    const {
        id,
    } =
        useParams();

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
    ] =
        useState(
            null
        );

    const [
        adminNote,
        setAdminNote,
    ] =
        useState(
            ''
        );

    const [
        handoverEvidence,
        setHandoverEvidence,
    ] =
        useState(
            null
        );

    const [
        returnEvidence,
        setReturnEvidence,
    ] =
        useState(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        processing,
        setProcessing,
    ] =
        useState(
            false
        );

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
                        response
                            ?.data
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
                        'Fetch SEKPiM detail error:',
                        error
                            ?.response
                            ?.data ||
                            error
                    );

                    await showErrorAlert(
                        'Gagal Memuat Detail',
                        getBackendErrorMessage(
                            error,
                            'Detail pengajuan SEKPiM gagal dimuat.'
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

    useEffect(
        () => {
            fetchBorrowRequest();
        },
        [
            fetchBorrowRequest,
        ]
    );

    const requestType =
        getRequestType(
            borrowRequest
        );

    const isBorrow =
        requestType ===
        TYPE_BORROW;

    const isAssetRequest =
        requestType ===
        TYPE_ASSET_REQUEST;

    const requestTypeLabel =
        getRequestTypeLabel(
            requestType
        );

    const ensureProcessAccess =
        async () => {
            if (
                canProcess
            ) {
                return true;
            }

            await showErrorAlert(
                'Akses Ditolak',
                'Akun hanya memiliki izin melihat approval dan tidak dapat memproses pengajuan SEKPiM.'
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

    /*
    |--------------------------------------------------------------------------
    | APPROVE
    |--------------------------------------------------------------------------
    */

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
                        isBorrow
                            ? 'Setujui Peminjaman Barang?'
                            : 'Setujui Request Barang?',

                    text:
                        isBorrow
                            ? `Pengajuan ${borrowRequest.borrow_code} akan disetujui. Stok belum dikurangi sampai barang benar-benar diserahkan kepada pemohon.`
                            : `Request ${borrowRequest.borrow_code} akan disetujui. Stok belum dikurangi sampai barang benar-benar diserahkan kepada pemohon.`,

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
                    response
                        ?.data
                        ?.message ||
                        (
                            isBorrow
                                ? 'Peminjaman Barang berhasil disetujui.'
                                : 'Request Barang berhasil disetujui.'
                        )
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Approve SEKPiM error:',
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
                        'Pengajuan SEKPiM gagal disetujui.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | REJECT
    |--------------------------------------------------------------------------
    */

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
                normalizedNote.length <
                5
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
                        isBorrow
                            ? 'Tolak Peminjaman Barang?'
                            : 'Tolak Request Barang?',

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
                    response
                        ?.data
                        ?.message ||
                        'Pengajuan berhasil ditolak.'
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Reject SEKPiM error:',
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
                        'Pengajuan SEKPiM gagal ditolak.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | EVIDENCE FILE
    |--------------------------------------------------------------------------
    */

    const handleHandoverEvidenceChange =
        async (
            event
        ) => {
            const file =
                event
                    .target
                    .files?.[0] ||
                null;

            if (
                !file
            ) {
                setHandoverEvidence(
                    null
                );

                return;
            }

            const validation =
                validateEvidenceFile(
                    file
                );

            if (
                !validation.valid
            ) {
                event.target.value =
                    '';

                setHandoverEvidence(
                    null
                );

                await showErrorAlert(
                    'File Tidak Valid',
                    validation.message
                );

                return;
            }

            setHandoverEvidence(
                file
            );
        };

    const handleReturnEvidenceChange =
        async (
            event
        ) => {
            const file =
                event
                    .target
                    .files?.[0] ||
                null;

            if (
                !file
            ) {
                setReturnEvidence(
                    null
                );

                return;
            }

            const validation =
                validateEvidenceFile(
                    file
                );

            if (
                !validation.valid
            ) {
                event.target.value =
                    '';

                setReturnEvidence(
                    null
                );

                await showErrorAlert(
                    'File Tidak Valid',
                    validation.message
                );

                return;
            }

            setReturnEvidence(
                file
            );
        };

    /*
    |--------------------------------------------------------------------------
    | BORROWED
    |--------------------------------------------------------------------------
    |
    | Khusus Peminjaman Barang:
    |
    | approved → borrowed
    |
    */

    const handleBorrowed =
        async () => {
            if (
                !isBorrow
            ) {
                await showWarningAlert(
                    'Jenis Pengajuan Tidak Sesuai',
                    'Proses Dipinjam hanya tersedia untuk Peminjaman Barang.'
                );

                return;
            }

            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'approved',
                    'Barang hanya dapat ditandai dipinjam setelah pengajuan disetujui.'
                ))
            ) {
                return;
            }

            if (
                !handoverEvidence
            ) {
                await showWarningAlert(
                    'Bukti Serah Terima Wajib',
                    'Upload bukti serah terima barang terlebih dahulu.'
                );

                return;
            }

            const validation =
                validateEvidenceFile(
                    handoverEvidence
                );

            if (
                !validation.valid
            ) {
                await showErrorAlert(
                    'File Tidak Valid',
                    validation.message
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Serahkan Barang?',

                    text:
                        `Barang pada ${borrowRequest.borrow_code} akan ditandai telah diserahkan dan sedang dipinjam. Stok akan dikurangi sesuai jumlah barang.`,

                    confirmButtonText:
                        'Ya, serahkan barang',

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

            const formData =
                new FormData();

            formData.append(
                '_method',
                'PUT'
            );

            formData.append(
                'handover_evidence',
                handoverEvidence
            );

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Menyimpan Serah Terima',
                    'Bukti sedang diunggah dan stok barang sedang diproses.'
                );

                const response =
                    await api.post(
                        `/borrow-requests/${borrowRequest.id}/borrowed`,
                        formData
                    );

                closeAlert();

                await showSuccessAlert(
                    'Barang Dipinjam',
                    response
                        ?.data
                        ?.message ||
                        'Barang berhasil diserahkan kepada pemohon.'
                );

                setHandoverEvidence(
                    null
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

    /*
    |--------------------------------------------------------------------------
    | RETURNED
    |--------------------------------------------------------------------------
    |
    | Khusus Peminjaman Barang:
    |
    | borrowed → returned
    |
    */

    const handleReturned =
        async () => {
            if (
                !isBorrow
            ) {
                await showWarningAlert(
                    'Jenis Pengajuan Tidak Sesuai',
                    'Request Barang tidak memiliki proses pengembalian.'
                );

                return;
            }

            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'borrowed',
                    'Barang hanya dapat dikembalikan ketika berstatus sedang dipinjam.'
                ))
            ) {
                return;
            }

            if (
                !returnEvidence
            ) {
                await showWarningAlert(
                    'Bukti Pengembalian Wajib',
                    'Upload bukti pengembalian barang terlebih dahulu.'
                );

                return;
            }

            const validation =
                validateEvidenceFile(
                    returnEvidence
                );

            if (
                !validation.valid
            ) {
                await showErrorAlert(
                    'File Tidak Valid',
                    validation.message
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Terima Pengembalian?',

                    text:
                        `Barang pada ${borrowRequest.borrow_code} akan ditandai telah dikembalikan. Stok akan ditambahkan kembali.`,

                    confirmButtonText:
                        'Ya, terima pengembalian',

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

            const formData =
                new FormData();

            formData.append(
                '_method',
                'PUT'
            );

            formData.append(
                'return_evidence',
                returnEvidence
            );

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Memproses Pengembalian',
                    'Bukti sedang diunggah dan stok barang sedang dikembalikan.'
                );

                const response =
                    await api.post(
                        `/borrow-requests/${borrowRequest.id}/returned`,
                        formData
                    );

                closeAlert();

                await showSuccessAlert(
                    'Barang Dikembalikan',
                    response
                        ?.data
                        ?.message ||
                        'Barang berhasil dikembalikan.'
                );

                setReturnEvidence(
                    null
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

    /*
    |--------------------------------------------------------------------------
    | COMPLETE ASSET REQUEST
    |--------------------------------------------------------------------------
    |
    | Khusus Request Barang:
    |
    | approved → completed
    |
    | Stok berkurang permanen.
    |
    */

    const handleCompleteAssetRequest =
        async () => {
            if (
                !isAssetRequest
            ) {
                await showWarningAlert(
                    'Jenis Pengajuan Tidak Sesuai',
                    'Proses ini hanya tersedia untuk Request Barang.'
                );

                return;
            }

            if (
                !(await ensureProcessAccess()) ||
                !(await validateStatus(
                    'approved',
                    'Request Barang hanya dapat diselesaikan setelah disetujui.'
                ))
            ) {
                return;
            }

            if (
                !handoverEvidence
            ) {
                await showWarningAlert(
                    'Bukti Penyerahan Wajib',
                    'Upload bukti penyerahan barang terlebih dahulu.'
                );

                return;
            }

            const validation =
                validateEvidenceFile(
                    handoverEvidence
                );

            if (
                !validation.valid
            ) {
                await showErrorAlert(
                    'File Tidak Valid',
                    validation.message
                );

                return;
            }

            const confirmation =
                await showConfirmAlert({
                    title:
                        'Selesaikan Request Barang?',

                    text:
                        `Barang pada ${borrowRequest.borrow_code} akan ditandai sudah diserahkan kepada pemohon. Stok akan dikurangi permanen dan pengajuan menjadi selesai.`,

                    confirmButtonText:
                        'Ya, serahkan & selesaikan',

                    cancelButtonText:
                        'Batal',

                    icon:
                        'question',

                    confirmButtonColor:
                        '#16a34a',
                });

            if (
                !confirmation
                    .isConfirmed
            ) {
                return;
            }

            const formData =
                new FormData();

            formData.append(
                '_method',
                'PUT'
            );

            formData.append(
                'handover_evidence',
                handoverEvidence
            );

            try {
                setProcessing(
                    true
                );

                showLoadingAlert(
                    'Menyelesaikan Request',
                    'Bukti penyerahan sedang diunggah dan stok sedang diperbarui.'
                );

                const response =
                    await api.post(
                        `/borrow-requests/${borrowRequest.id}/complete`,
                        formData
                    );

                closeAlert();

                await showSuccessAlert(
                    'Request Barang Selesai',
                    response
                        ?.data
                        ?.message ||
                        'Barang berhasil diserahkan dan request telah selesai.'
                );

                setHandoverEvidence(
                    null
                );

                await fetchBorrowRequest();
            } catch (
                error
            ) {
                console.error(
                    'Complete asset request error:',
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
                        'Request Barang gagal diselesaikan.'
                    )
                );
            } finally {
                setProcessing(
                    false
                );
            }
        };

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

    /*
    |--------------------------------------------------------------------------
    | DATA NOT FOUND
    |--------------------------------------------------------------------------
    */

    if (
        !borrowRequest
    ) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                        style={{
                            width:
                                84,

                            height:
                                84,
                        }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h4 className="fw-black mb-2">
                        Data tidak ditemukan
                    </h4>

                    <p className="text-muted mb-4">
                        Detail pengajuan SEKPiM tidak tersedia.
                    </p>

                    <Link
                        to="/admin/borrow-requests"
                        className="btn btn-success rounded-pill px-4"
                    >
                        <i className="bi bi-arrow-left me-2" />

                        Kembali ke Approval SEKPiM
                    </Link>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DERIVED DATA
    |--------------------------------------------------------------------------
    */

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

    const requestItems =
        Array.isArray(
            borrowRequest.items
        )
            ? borrowRequest.items
            : [];

    const requestTitle =
        borrowRequest.purpose ||
        (
            isBorrow
                ? 'Peminjaman Barang'
                : 'Request Barang'
        );

    const handoverEvidenceUrl =
        borrowRequest
            .handover_evidence_url;

    const returnEvidenceUrl =
        borrowRequest
            .return_evidence_url;

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

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
                            Kembali ke Approval SEKPiM
                        </span>
                    </Link>

                    <h2 className="approval-detail-title">
                        Detail {requestTypeLabel}
                    </h2>

                    <div className="approval-detail-meta">
                        <span className="fw-bold text-muted">
                            {borrowRequest
                                .borrow_code ||
                                `REQ-${borrowRequest.id}`}
                        </span>

                        <span
                            className={`badge rounded-pill px-3 py-2 ${
                                isBorrow
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-primary-subtle text-primary'
                            }`}
                        >
                            <i
                                className={`bi ${getRequestTypeIcon(
                                    requestType
                                )} me-2`}
                            />

                            {
                                requestTypeLabel
                            }
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
                                Akun dapat melihat detail pengajuan, tetapi tidak dapat memproses approval atau serah terima barang.
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
                                        Informasi Pengajuan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Informasi pemohon, PIC, jadwal, dan keperluan pengajuan.
                                    </p>
                                </div>

                                <div
                                    className={`icon-box ${
                                        isBorrow
                                            ? 'bg-success-subtle text-success'
                                            : 'bg-primary-subtle text-primary'
                                    }`}
                                >
                                    <i
                                        className={`bi ${getRequestTypeIcon(
                                            requestType
                                        )}`}
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InfoBox
                                        label="Jenis Pengajuan"
                                        value={
                                            requestTypeLabel
                                        }
                                        icon={getRequestTypeIcon(
                                            requestType
                                        )}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Kode Pengajuan"
                                        value={
                                            borrowRequest
                                                .borrow_code ||
                                            `REQ-${borrowRequest.id}`
                                        }
                                        icon="bi-upc-scan"
                                    />
                                </div>

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
                                        label="Email Pemohon"
                                        value={
                                            borrowRequest
                                                .user
                                                ?.email ||
                                            '-'
                                        }
                                        icon="bi-envelope-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nama PIC"
                                        value={
                                            borrowRequest
                                                .pic_name ||
                                            '-'
                                        }
                                        icon="bi-person-badge-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Nomor PIC"
                                        value={
                                            borrowRequest
                                                .pic_phone ||
                                            '-'
                                        }
                                        icon="bi-whatsapp"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Kegiatan"
                                        value={formatDate(
                                            borrowRequest
                                                .activity_date
                                        )}
                                        icon="bi-calendar-event-fill"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoBox
                                        label="Tanggal Pengambilan"
                                        value={formatDate(
                                            borrowRequest
                                                .borrow_date
                                        )}
                                        icon="bi-calendar-check-fill"
                                    />
                                </div>

                                {isBorrow && (
                                    <div className="col-md-6">
                                        <InfoBox
                                            label="Tanggal Pengembalian"
                                            value={formatDate(
                                                borrowRequest
                                                    .return_date
                                            )}
                                            icon="bi-calendar-minus-fill"
                                        />
                                    </div>
                                )}

                                <div
                                    className={
                                        isBorrow
                                            ? 'col-md-6'
                                            : 'col-md-6'
                                    }
                                >
                                    <InfoBox
                                        label="Status"
                                        value={
                                            statusConfig.label
                                        }
                                        icon={
                                            statusConfig.icon
                                        }
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="p-4 rounded-4 border bg-light">
                                        <div className="small fw-bold text-muted mb-2">
                                            <i className="bi bi-card-text me-2" />

                                            Keperluan
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
                                        {isBorrow
                                            ? 'Daftar barang yang diajukan untuk dipinjam.'
                                            : 'Daftar barang yang diminta oleh pemohon.'}
                                    </p>
                                </div>

                                <span
                                    className={`badge rounded-pill px-3 py-2 ${
                                        isBorrow
                                            ? 'text-bg-success'
                                            : 'text-bg-primary'
                                    }`}
                                >
                                    {
                                        requestItems.length
                                    }{' '}
                                    item
                                </span>
                            </div>

                            {requestItems.length ===
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
                                            {requestItems.map(
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

                                                            <div className="small mt-2">
                                                                <span
                                                                    className={`badge rounded-pill ${
                                                                        isBorrow
                                                                            ? 'bg-success-subtle text-success'
                                                                            : 'bg-primary-subtle text-primary'
                                                                    }`}
                                                                >
                                                                    {item
                                                                        .product
                                                                        ?.sekpim_item_type ===
                                                                    'both'
                                                                        ? 'Peminjaman & Request'
                                                                        : isBorrow
                                                                          ? 'Peminjaman'
                                                                          : 'Request Barang'}
                                                                </span>
                                                            </div>
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

                    {(handoverEvidenceUrl ||
                        returnEvidenceUrl) && (
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4 p-lg-5">
                                <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Bukti Proses
                                        </h4>

                                        <p className="text-muted mb-0">
                                            Evidence yang diunggah admin selama proses pengajuan.
                                        </p>
                                    </div>

                                    <div className="icon-box bg-success-subtle text-success">
                                        <i className="bi bi-folder-check" />
                                    </div>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    <EvidenceCard
                                        title={
                                            isBorrow
                                                ? 'Bukti Serah Terima'
                                                : 'Bukti Penyerahan Barang'
                                        }
                                        description={
                                            isBorrow
                                                ? 'Bukti penyerahan barang pinjaman'
                                                : 'Bukti penyerahan Request Barang'
                                        }
                                        fileName={
                                            borrowRequest
                                                .handover_evidence_name
                                        }
                                        mime={
                                            borrowRequest
                                                .handover_evidence_mime
                                        }
                                        url={
                                            handoverEvidenceUrl
                                        }
                                        icon={
                                            isBorrow
                                                ? 'bi-box-arrow-up-right'
                                                : 'bi-box2-heart-fill'
                                        }
                                    />

                                    {isBorrow && (
                                        <EvidenceCard
                                            title="Bukti Pengembalian"
                                            description="Bukti pengembalian barang"
                                            fileName={
                                                borrowRequest
                                                    .return_evidence_name
                                            }
                                            mime={
                                                borrowRequest
                                                    .return_evidence_mime
                                            }
                                            url={
                                                returnEvidenceUrl
                                            }
                                            icon="bi-box-arrow-in-down-left"
                                        />
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

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
                            top:
                                110,
                        }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Status
                                </h4>

                                <p className="text-muted mb-4">
                                    Perkembangan proses {requestTypeLabel.toLowerCase()}.
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

                                    {isBorrow &&
                                        borrowRequest
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

                                    {isBorrow &&
                                        borrowRequest
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

                                    {isAssetRequest &&
                                        borrowRequest
                                            .completed_at && (
                                            <TimelineItem
                                                label="Barang Diserahkan"
                                                value={formatDateTime(
                                                    borrowRequest
                                                        .completed_at
                                                )}
                                                icon="bi-check2-all"
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
                                            value="Admin sedang memeriksa pengajuan."
                                            icon="bi-hourglass-split"
                                            active
                                        />
                                    )}

                                    {borrowRequest
                                        .status ===
                                        'approved' && (
                                        <TimelineItem
                                            label="Menunggu Penyerahan"
                                            value={
                                                isBorrow
                                                    ? 'Pengajuan sudah disetujui dan menunggu barang dipinjamkan kepada pemohon.'
                                                    : 'Request sudah disetujui dan menunggu barang diserahkan kepada pemohon.'
                                            }
                                            icon="bi-box-seam-fill"
                                            active
                                        />
                                    )}

                                    {isBorrow &&
                                        borrowRequest
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
                                    Proses pengajuan berdasarkan status saat ini.
                                </p>

                                {!canProcess ? (
                                    <div className="p-4 rounded-4 bg-light border text-center">
                                        <i className="bi bi-shield-lock-fill fs-2 text-secondary" />

                                        <h6 className="fw-black mt-3 mb-2">
                                            Mode hanya lihat
                                        </h6>

                                        <p className="small text-muted mb-0">
                                            Akun tidak memiliki permission proses approval SEKPiM.
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
                                                    rows={
                                                        5
                                                    }
                                                    maxLength={
                                                        2000
                                                    }
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

                                                        Setujui {requestTypeLabel}
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

                                                        Tolak {requestTypeLabel}
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {borrowRequest
                                            .status ===
                                            'approved' &&
                                            isBorrow && (
                                                <>
                                                    <div className="p-3 rounded-4 bg-success-subtle mb-4">
                                                        <div className="d-flex gap-3">
                                                            <i className="bi bi-check-circle-fill text-success fs-5" />

                                                            <div>
                                                                <div className="fw-black text-success mb-1">
                                                                    Peminjaman Disetujui
                                                                </div>

                                                                <div className="small text-muted">
                                                                    Upload bukti serah terima ketika barang benar-benar diberikan kepada pemohon.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="form-label fw-bold">
                                                            Bukti Serah Terima
                                                        </label>

                                                        <input
                                                            type="file"
                                                            className="form-control rounded-4"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={
                                                                handleHandoverEvidenceChange
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />

                                                        <div className="form-text">
                                                            PDF, JPG, JPEG atau PNG. Maksimal 10 MB.
                                                        </div>

                                                        <SelectedFileCard
                                                            file={
                                                                handoverEvidence
                                                            }
                                                            label="Bukti yang akan diunggah"
                                                            onRemove={() =>
                                                                setHandoverEvidence(
                                                                    null
                                                                )
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />
                                                    </div>

                                                    <div className="alert alert-light border rounded-4 small">
                                                        <i className="bi bi-info-circle me-2 text-primary" />

                                                        Stok barang baru akan dikurangi ketika proses serah terima berhasil.
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
                                                        {processing ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" />

                                                                Menyimpan...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-box-arrow-up-right me-2" />

                                                                Simpan Bukti &amp; Tandai Dipinjam
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                        {borrowRequest
                                            .status ===
                                            'approved' &&
                                            isAssetRequest && (
                                                <>
                                                    <div className="p-3 rounded-4 bg-primary-subtle mb-4">
                                                        <div className="d-flex gap-3">
                                                            <i className="bi bi-box2-heart-fill text-primary fs-5" />

                                                            <div>
                                                                <div className="fw-black text-primary mb-1">
                                                                    Request Barang Disetujui
                                                                </div>

                                                                <div className="small text-muted">
                                                                    Upload bukti penyerahan setelah barang benar-benar diberikan kepada pemohon.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="form-label fw-bold">
                                                            Bukti Penyerahan Barang
                                                        </label>

                                                        <input
                                                            type="file"
                                                            className="form-control rounded-4"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={
                                                                handleHandoverEvidenceChange
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />

                                                        <div className="form-text">
                                                            PDF, JPG, JPEG atau PNG. Maksimal 10 MB.
                                                        </div>

                                                        <SelectedFileCard
                                                            file={
                                                                handoverEvidence
                                                            }
                                                            label="Bukti penyerahan yang akan diunggah"
                                                            onRemove={() =>
                                                                setHandoverEvidence(
                                                                    null
                                                                )
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />
                                                    </div>

                                                    <div className="alert alert-warning border-0 rounded-4 small">
                                                        <i className="bi bi-exclamation-triangle-fill me-2" />

                                                        Setelah diselesaikan, stok akan dikurangi permanen karena Request Barang tidak memiliki proses pengembalian.
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-success rounded-pill w-100"
                                                        onClick={
                                                            handleCompleteAssetRequest
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                    >
                                                        {processing ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" />

                                                                Menyimpan...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-check2-all me-2" />

                                                                Simpan Bukti &amp; Tandai Selesai
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                        {isBorrow &&
                                            borrowRequest
                                                .status ===
                                                'borrowed' && (
                                                <>
                                                    <div className="p-3 rounded-4 bg-warning-subtle mb-4">
                                                        <div className="d-flex gap-3">
                                                            <i className="bi bi-clock-history text-warning-emphasis fs-5" />

                                                            <div>
                                                                <div className="fw-black text-warning-emphasis mb-1">
                                                                    Barang Sedang Dipinjam
                                                                </div>

                                                                <div className="small text-muted">
                                                                    Upload bukti pengembalian setelah seluruh barang diterima kembali.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {handoverEvidenceUrl && (
                                                        <div className="mb-4">
                                                            <div className="small fw-bold text-muted mb-2">
                                                                Bukti Serah Terima
                                                            </div>

                                                            <a
                                                                href={
                                                                    handoverEvidenceUrl
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-outline-success rounded-pill w-100"
                                                            >
                                                                <i className="bi bi-eye-fill me-2" />

                                                                Lihat Bukti Serah Terima
                                                            </a>
                                                        </div>
                                                    )}

                                                    <div className="mb-4">
                                                        <label className="form-label fw-bold">
                                                            Bukti Pengembalian
                                                        </label>

                                                        <input
                                                            type="file"
                                                            className="form-control rounded-4"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={
                                                                handleReturnEvidenceChange
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />

                                                        <div className="form-text">
                                                            PDF, JPG, JPEG atau PNG. Maksimal 10 MB.
                                                        </div>

                                                        <SelectedFileCard
                                                            file={
                                                                returnEvidence
                                                            }
                                                            label="Bukti yang akan diunggah"
                                                            onRemove={() =>
                                                                setReturnEvidence(
                                                                    null
                                                                )
                                                            }
                                                            disabled={
                                                                processing
                                                            }
                                                        />
                                                    </div>

                                                    <div className="alert alert-light border rounded-4 small">
                                                        <i className="bi bi-info-circle me-2 text-success" />

                                                        Stok akan ditambahkan kembali setelah proses pengembalian berhasil.
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
                                                        {processing ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2" />

                                                                Menyimpan...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-box-arrow-in-down-left me-2" />

                                                                Simpan Bukti &amp; Tandai Dikembalikan
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                        {[
                                            'rejected',
                                            'returned',
                                            'completed',
                                        ].includes(
                                            borrowRequest
                                                .status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Pengajuan berstatus{' '}

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