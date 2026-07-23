import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../api/axios';

import {
    closeAlert,
    showCompletionAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showTextareaAlert,
} from '../../utils/sweetAlert';

const STATUS_OPTIONS = [
    {
        value: 'all',
        label: 'Semua Status',
    },
    {
        value: 'pending',
        label: 'Menunggu',
    },
    {
        value: 'approved',
        label: 'Disetujui',
    },
    {
        value: 'rejected',
        label: 'Ditolak',
    },
    {
        value: 'completed',
        label: 'Selesai',
    },
];

const COVERAGE_OPTIONS = [
    {
        value: 'all',
        label: 'Semua Jenis Liputan',
    },
    {
        value: 'SOCIAL MEDIA',
        label: 'Social Media',
    },
    {
        value: 'DOKUMENTASI',
        label: 'Dokumentasi',
    },
    {
        value: 'PUBLIKASI WEBSITE',
        label: 'Publikasi Website',
    },
    {
        value: 'YOUTUBE',
        label: 'YouTube',
    },
    {
        value: 'VIDEO REELS',
        label: 'Video Reels',
    },
];

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        className: 'bg-warning-subtle text-warning-emphasis',
        icon: 'bi-hourglass-split',
    },
    approved: {
        label: 'Disetujui',
        className: 'bg-primary-subtle text-primary',
        icon: 'bi-check-circle-fill',
    },
    rejected: {
        label: 'Ditolak',
        className: 'bg-danger-subtle text-danger',
        icon: 'bi-x-circle-fill',
    },
    completed: {
        label: 'Selesai',
        className: 'bg-success-subtle text-success',
        icon: 'bi-check2-all',
    },
};

const COVERAGE_CONFIG = {
    'SOCIAL MEDIA': {
        label: 'Social Media',
        icon: 'bi-instagram',
        className: 'bg-danger-subtle text-danger',
    },
    DOKUMENTASI: {
        label: 'Dokumentasi',
        icon: 'bi-camera-fill',
        className: 'bg-success-subtle text-success',
    },
    'PUBLIKASI WEBSITE': {
        label: 'Publikasi Website',
        icon: 'bi-globe2',
        className: 'bg-primary-subtle text-primary',
    },
    YOUTUBE: {
        label: 'YouTube',
        icon: 'bi-youtube',
        className: 'bg-danger-subtle text-danger',
    },
    'VIDEO REELS': {
        label: 'Video Reels',
        icon: 'bi-play-btn-fill',
        className: 'bg-warning-subtle text-warning-emphasis',
    },
};

const formatDate = (dateValue) => {
    if (!dateValue) {
        return '-';
    }

    const parsedDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
        return dateValue;
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(parsedDate);
};

const getResolvedUnit = (request) => {
    if (request?.resolved_unit_name) {
        return request.resolved_unit_name;
    }

    if (request?.unit_name === 'Lainnya') {
        return request?.other_unit_name || 'Lainnya';
    }

    return request?.unit_name || '-';
};

const extractErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (responseData?.errors) {
        const firstError = Object.values(responseData.errors)
            .flat()
            .find(Boolean);

        if (firstError) {
            return firstError;
        }
    }

    return (
        responseData?.message ||
        'Terjadi kesalahan ketika memproses request liputan.'
    );
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || {
        label: status || '-',
        className: 'bg-secondary-subtle text-secondary',
        icon: 'bi-circle-fill',
    };

    return (
        <span
            className={`badge rounded-pill px-3 py-2 ${config.className}`}
        >
            <i className={`bi ${config.icon} me-2`} />
            {config.label}
        </span>
    );
};

const CoverageBadge = ({ type }) => {
    const config = COVERAGE_CONFIG[type] || {
        label: type || '-',
        icon: 'bi-camera-reels-fill',
        className: 'bg-secondary-subtle text-secondary',
    };

    return (
        <span
            className={`badge rounded-pill px-3 py-2 ${config.className}`}
        >
            <i className={`bi ${config.icon} me-2`} />
            {config.label}
        </span>
    );
};

export default function HumasServiceApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const [searchKeyword, setSearchKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [coverageFilter, setCoverageFilter] = useState('all');

    const loadRequests = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            setErrorMessage('');

            const response = await api.get('/humas-service-requests');

            const responseData = response?.data?.data;

            setRequests(
                Array.isArray(responseData)
                    ? responseData
                    : []
            );
        } catch (error) {
            console.error(
                'Load Humas requests error:',
                error?.response?.data || error
            );

            setErrorMessage(
                extractErrorMessage(error)
            );
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadRequests();

        const intervalId = window.setInterval(() => {
            loadRequests(false);
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const statistics = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(
                (item) => item.status === 'pending'
            ).length,
            approved: requests.filter(
                (item) => item.status === 'approved'
            ).length,
            completed: requests.filter(
                (item) => item.status === 'completed'
            ).length,
            rejected: requests.filter(
                (item) => item.status === 'rejected'
            ).length,
        };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const normalizedKeyword = searchKeyword
            .trim()
            .toLowerCase();

        return requests.filter((item) => {
            const matchesStatus =
                statusFilter === 'all' ||
                item.status === statusFilter;

            const matchesCoverage =
                coverageFilter === 'all' ||
                item.coverage_type === coverageFilter;

            const searchableText = [
                item.service_code,
                item.applicant_name,
                item.unit_name,
                item.other_unit_name,
                item.pic_whatsapp,
                item.activity_detail,
                item.coverage_type,
                item.event_location,
                item.user?.name,
                item.user?.email,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesSearch =
                !normalizedKeyword ||
                searchableText.includes(normalizedKeyword);

            return (
                matchesStatus &&
                matchesCoverage &&
                matchesSearch
            );
        });
    }, [
        requests,
        searchKeyword,
        statusFilter,
        coverageFilter,
    ]);

    const handleApprove = async (item) => {
        const confirmation = await showConfirmAlert({
            title: 'Setujui request liputan?',
            text: `Request ${item.service_code} akan diteruskan untuk diproses oleh Humas.`,
            confirmButtonText: 'Ya, setujui',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        try {
            setProcessingId(item.id);

            showLoadingAlert(
                'Menyetujui Request',
                'Mohon tunggu, status request sedang diperbarui.'
            );

            const response = await api.put(
                `/humas-service-requests/${item.id}/approve`
            );

            closeAlert();

            await showSuccessAlert(
                'Request Disetujui',
                response?.data?.message ||
                'Request liputan berhasil disetujui.'
            );

            await loadRequests(false);
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Approval Gagal',
                extractErrorMessage(error)
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item) => {
        const result = await showTextareaAlert({
            title: 'Tolak request liputan?',
            text:
                'Masukkan alasan penolakan agar pemohon mengetahui penyebab request tidak dapat diproses.',
            inputLabel: 'Alasan penolakan',
            inputPlaceholder: 'Tuliskan alasan penolakan...',
            confirmButtonText: 'Ya, tolak request',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc2626',
            minimumLength: 5,
            maximumLength: 2000,
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            setProcessingId(item.id);

            showLoadingAlert(
                'Menolak Request',
                'Mohon tunggu, alasan penolakan sedang disimpan.'
            );

            const response = await api.put(
                `/humas-service-requests/${item.id}/reject`,
                {
                    admin_note: result.value.trim(),
                }
            );

            closeAlert();

            await showSuccessAlert(
                'Request Ditolak',
                response?.data?.message ||
                'Request liputan berhasil ditolak.'
            );

            await loadRequests(false);
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Penolakan Gagal',
                extractErrorMessage(error)
            );
        } finally {
            setProcessingId(null);
        }
    };

    // const processReject = async (item, adminNote) => {
    //     try {
    //         setProcessingId(item.id);

    //         showLoadingAlert(
    //             'Menolak Request',
    //             'Mohon tunggu, alasan penolakan sedang disimpan.'
    //         );

    //         const response = await api.put(
    //             `/humas-service-requests/${item.id}/reject`,
    //             {
    //                 admin_note: adminNote,
    //             }
    //         );

    //         closeAlert();

    //         await showSuccessAlert(
    //             'Request Ditolak',
    //             response?.data?.message ||
    //             'Request liputan berhasil ditolak.'
    //         );

    //         await loadRequests(false);
    //     } catch (error) {
    //         closeAlert();

    //         await showErrorAlert(
    //             'Penolakan Gagal',
    //             extractErrorMessage(error)
    //         );
    //     } finally {
    //         setProcessingId(null);
    //     }
    // };

    const handleComplete = async (item) => {
        const result = await showCompletionAlert({
            title: 'Selesaikan request liputan?',
            text: `Masukkan link hasil pekerjaan untuk request ${item.service_code}.`,
            confirmButtonText: 'Simpan dan Selesaikan',
            cancelButtonText: 'Batal',
        });

        if (!result.isConfirmed || !result.value) {
            return;
        }

        try {
            setProcessingId(item.id);

            showLoadingAlert(
                'Menyelesaikan Request',
                'Link hasil pekerjaan sedang disimpan.'
            );

            const response = await api.put(
                `/humas-service-requests/${item.id}/complete`,
                {
                    result_link: result.value.result_link,
                    result_note: result.value.result_note,
                }
            );

            closeAlert();

            await showSuccessAlert(
                'Request Berhasil Diselesaikan',
                response?.data?.message ||
                'Link hasil pekerjaan berhasil disimpan dan dapat dilihat oleh pemohon.'
            );

            await loadRequests(false);
        } catch (error) {
            closeAlert();

            await showErrorAlert(
                'Penyelesaian Request Gagal',
                extractErrorMessage(error)
            );
        } finally {
            setProcessingId(null);
        }
    };

    const resetFilters = () => {
        setSearchKeyword('');
        setStatusFilter('all');
        setCoverageFilter('all');
    };

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.20), transparent 30%), linear-gradient(135deg, #111827 0%, #7f1d1d 55%, #dc2626 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-danger rounded-pill px-3 py-2 mb-3">
                                APPROVAL HUMAS
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                Approval Request Liputan
                            </h1>

                            <p
                                className="text-white-50 mb-0"
                                style={{
                                    maxWidth: 820,
                                    lineHeight: 1.8,
                                }}
                            >
                                Periksa request liputan, dokumen pendukung,
                                jadwal kegiatan, serta informasi PIC sebelum
                                menyetujui atau menolak pengajuan.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-5 p-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="text-white-50">
                                        Menunggu Approval
                                    </span>

                                    <i className="bi bi-hourglass-split fs-4" />
                                </div>

                                <div className="display-5 fw-bold">
                                    {statistics.pending}
                                </div>

                                <div className="small text-white-50 mt-2">
                                    Request perlu segera diperiksa.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="row g-3 mb-4">
                <div className="col-6 col-md-4 col-xl">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                            <div className="small text-muted mb-1">
                                Total Request
                            </div>

                            <div className="fs-3 fw-bold">
                                {statistics.total}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                            <div className="small text-muted mb-1">
                                Menunggu
                            </div>

                            <div className="fs-3 fw-bold text-warning">
                                {statistics.pending}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                            <div className="small text-muted mb-1">
                                Disetujui
                            </div>

                            <div className="fs-3 fw-bold text-primary">
                                {statistics.approved}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                            <div className="small text-muted mb-1">
                                Selesai
                            </div>

                            <div className="fs-3 fw-bold text-success">
                                {statistics.completed}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-6 col-md-4 col-xl">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-3">
                            <div className="small text-muted mb-1">
                                Ditolak
                            </div>

                            <div className="fs-3 fw-bold text-danger">
                                {statistics.rejected}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-lg-5">
                            <label className="form-label fw-semibold">
                                Cari Request
                            </label>

                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-search" />
                                </span>

                                <input
                                    type="search"
                                    className="form-control border-start-0"
                                    placeholder="Cari kode, pemohon, unit, lokasi..."
                                    value={searchKeyword}
                                    onChange={(event) =>
                                        setSearchKeyword(event.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="col-md-5 col-lg-3">
                            <label className="form-label fw-semibold">
                                Status
                            </label>

                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                {STATUS_OPTIONS.map((status) => (
                                    <option
                                        value={status.value}
                                        key={status.value}
                                    >
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-5 col-lg-3">
                            <label className="form-label fw-semibold">
                                Jenis Liputan
                            </label>

                            <select
                                className="form-select"
                                value={coverageFilter}
                                onChange={(event) =>
                                    setCoverageFilter(event.target.value)
                                }
                            >
                                {COVERAGE_OPTIONS.map((coverage) => (
                                    <option
                                        value={coverage.value}
                                        key={coverage.value}
                                    >
                                        {coverage.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-2 col-lg-1 d-flex align-items-end">
                            <button
                                type="button"
                                className="btn btn-light border w-100"
                                onClick={resetFilters}
                                title="Reset filter"
                            >
                                <i className="bi bi-arrow-counterclockwise" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <section className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="spinner-border text-danger mb-3"
                            role="status"
                        />

                        <h5 className="fw-bold mb-1">
                            Memuat request liputan
                        </h5>

                        <p className="text-muted mb-0">
                            Mohon tunggu sebentar.
                        </p>
                    </div>
                </section>
            ) : errorMessage ? (
                <section className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                            style={{
                                width: 72,
                                height: 72,
                            }}
                        >
                            <i className="bi bi-exclamation-triangle-fill fs-3" />
                        </div>

                        <h5 className="fw-bold mb-2">
                            Data gagal dimuat
                        </h5>

                        <p className="text-muted mb-4">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            className="btn btn-danger rounded-pill px-4"
                            onClick={() => loadRequests()}
                        >
                            <i className="bi bi-arrow-clockwise me-2" />
                            Coba Lagi
                        </button>
                    </div>
                </section>
            ) : filteredRequests.length === 0 ? (
                <section className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 rounded-circle bg-light text-secondary d-flex align-items-center justify-content-center"
                            style={{
                                width: 76,
                                height: 76,
                            }}
                        >
                            <i className="bi bi-inbox-fill fs-3" />
                        </div>

                        <h5 className="fw-bold mb-2">
                            Request tidak ditemukan
                        </h5>

                        <p className="text-muted mb-3">
                            Belum ada request yang sesuai dengan filter.
                        </p>

                        <button
                            type="button"
                            className="btn btn-outline-secondary rounded-pill"
                            onClick={resetFilters}
                        >
                            Reset Filter
                        </button>
                    </div>
                </section>
            ) : (
                <section className="card border-0 shadow-sm rounded-5 overflow-hidden">
                    <div className="card-header bg-white border-0 p-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    Daftar Request Liputan
                                </h5>

                                <p className="text-muted small mb-0">
                                    Menampilkan {filteredRequests.length} dari{' '}
                                    {requests.length} request.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn btn-light border rounded-pill"
                                onClick={() => loadRequests()}
                            >
                                <i className="bi bi-arrow-clockwise me-2" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4 py-3">
                                        Request
                                    </th>
                                    <th className="py-3">
                                        Pemohon
                                    </th>
                                    <th className="py-3">
                                        Jenis Liputan
                                    </th>
                                    <th className="py-3">
                                        Pelaksanaan
                                    </th>
                                    <th className="py-3">
                                        Status
                                    </th>
                                    <th className="text-end pe-4 py-3">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRequests.map((item) => (
                                    <tr key={item.id}>
                                        <td className="ps-4 py-3">
                                            <div className="fw-bold">
                                                {item.service_code || '-'}
                                            </div>

                                            <div
                                                className="small text-muted text-truncate"
                                                style={{
                                                    maxWidth: 260,
                                                }}
                                            >
                                                {item.activity_detail || '-'}
                                            </div>
                                        </td>

                                        <td className="py-3">
                                            <div className="fw-semibold">
                                                {item.applicant_name || '-'}
                                            </div>

                                            <div className="small text-muted">
                                                {getResolvedUnit(item)}
                                            </div>

                                            <div className="small text-success">
                                                <i className="bi bi-whatsapp me-1" />
                                                {item.pic_whatsapp || '-'}
                                            </div>
                                        </td>

                                        <td className="py-3">
                                            <CoverageBadge
                                                type={item.coverage_type}
                                            />
                                        </td>

                                        <td className="py-3">
                                            <div className="fw-semibold">
                                                {formatDate(item.event_date)}
                                            </div>

                                            <div className="small text-muted">
                                                <i className="bi bi-geo-alt-fill me-1" />
                                                {item.event_location || '-'}
                                            </div>
                                        </td>

                                        <td className="py-3">
                                            <StatusBadge
                                                status={item.status}
                                            />
                                        </td>

                                        <td className="text-end pe-4 py-3">
                                            <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                                                <Link
                                                    to={`/admin/humas-services/${item.id}`}
                                                    className="btn btn-sm btn-light border rounded-pill"
                                                >
                                                    <i className="bi bi-eye-fill me-1" />
                                                    Detail
                                                </Link>

                                                {item.status === 'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary rounded-pill"
                                                            onClick={() =>
                                                                handleApprove(item)
                                                            }
                                                            disabled={
                                                                processingId ===
                                                                item.id
                                                            }
                                                        >
                                                            <i className="bi bi-check-lg me-1" />
                                                            Setujui
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger rounded-pill"
                                                            onClick={() =>
                                                                handleReject(item)
                                                            }
                                                            disabled={
                                                                processingId ===
                                                                item.id
                                                            }
                                                        >
                                                            <i className="bi bi-x-lg me-1" />
                                                            Tolak
                                                        </button>
                                                    </>
                                                )}

                                                {item.status === 'approved' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-success rounded-pill"
                                                        onClick={() =>
                                                            handleComplete(item)
                                                        }
                                                        disabled={
                                                            processingId ===
                                                            item.id
                                                        }
                                                    >
                                                        <i className="bi bi-check2-all me-1" />
                                                        Selesai
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}