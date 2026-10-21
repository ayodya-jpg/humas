import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import MerchandiseRevisionForm from '../../components/MerchandiseRevisionForm';

const TYPES = {
    merchandise: {
        label: 'Merchandise',
        icon: 'bi-gift-fill',
        color: 'primary',
        endpoint: (id) => `/orders/${id}`,
    },
    humas: {
        label: 'Layanan Humas',
        icon: 'bi-camera-reels-fill',
        color: 'danger',
        endpoint: (id) => `/humas-service-requests/${id}`,
    },
    borrowing: {
        label: 'Layanan SEKPiM',
        icon: 'bi-box-seam-fill',
        color: 'success',
        endpoint: (id) => `/borrow-requests/${id}`,
    },
    directorate_schedule: {
        label: 'Jadwal Direktorat',
        icon: 'bi-calendar2-check-fill',
        color: 'danger',
        endpoint: (id) => `/event-schedule-requests/${id}`,
    },
};

const STATUSES = {
    pending: ['Menunggu Persetujuan', 'warning', 'bi-hourglass-split'],
    revision: ['Perlu Revisi', 'info', 'bi-pencil-square'],
    approved: ['Disetujui', 'success', 'bi-check-circle-fill'],
    rejected: ['Ditolak', 'danger', 'bi-x-circle-fill'],
    completed: ['Selesai', 'primary', 'bi-check2-all'],
    borrowed: ['Sedang Dipinjam', 'info', 'bi-box-arrow-up-right'],
    returned: ['Dikembalikan', 'secondary', 'bi-box-arrow-in-down-left'],
};

const DIRECTORATES = {
    direktorat: 'Direktorat',
    direktur: 'Direktur',
    wakil_direktur_1: 'Wakil Direktur I',
    wakil_direktur_2: 'Wakil Direktur II',
};

const COVERAGE_TYPES = {
    'REQUEST DESIGN INSTAGRAM': 'Request Design Instagram',
    DOKUMENTASI: 'Dokumentasi',
    'PUBLIKASI WEBSITE': 'Publikasi Website',
    'PUBLIKASI MEDIA MASSA': 'Publikasi Media Massa',
    YOUTUBE: 'YouTube',
    'VIDEO REELS': 'Video Reels',
    'SOCIAL MEDIA': 'Social Media (Data Lama)',
};

function currentUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
}

function formatDate(value) {
    if (!value) return '-';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(...((parts) => [parts[0], parts[1] - 1, parts[2]])(
              raw.split('-').map(Number)
          ))
        : new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          });
}

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          });
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : '-';
}

function getCoverage(value) {
    if (!value) return 'Layanan Humas';
    return String(value)
        .split(/[;,]/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean)
        .map((x) => COVERAGE_TYPES[x] || x)
        .join('; ');
}

function resolveUnit(data) {
    if (data?.resolved_unit_name) return data.resolved_unit_name;
    if (data?.unit_name === 'Lainnya')
        return data.other_unit_name || 'Lainnya';

    return data?.unit_name || data?.requester_unit ||
        data?.user?.unit_name || '-';
}

function externalUrl(value) {
    if (!value) return null;
    const url = String(value).trim();
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function fileUrl(value) {
    if (!value) return null;
    const path = String(value);
    if (/^https?:\/\//i.test(path)) return path;

    const base = (
        import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
    ).replace(/\/api\/?$/, '');

    if (path.startsWith('/storage/')) return base + path;
    if (path.startsWith('storage/')) return `${base}/${path}`;
    return `${base}/storage/${path}`;
}

function requestCode(type, data) {
    const id = String(data?.id || 0).padStart(4, '0');
    if (type === 'merchandise')
        return data.order_code || data.code || `MER-${id}`;
    if (type === 'humas')
        return data.service_code || data.code || `HMS-${id}`;
    if (type === 'directorate_schedule') return `JAD-${id}`;

    return data.borrow_code || data.code ||
        `${data.request_type === 'asset_request' ? 'REQ' : 'BRW'}-${id}`;
}

function InfoItem({
    label,
    value,
    icon = 'bi-info-circle',
    fullWidth = false,
    isLink = false,
}) {
    const url = isLink ? externalUrl(value) : null;

    return (
        <div className={fullWidth ? 'col-12' : 'col-md-6'}>
            <div className="p-3 rounded-4 bg-light h-100">
                <div className="d-flex align-items-start gap-3">
                    <div className="detail-info-icon">
                        <i className={`bi ${icon}`} />
                    </div>
                    <div className="min-w-0 flex-grow-1">
                        <div className="small text-muted fw-bold mb-1">
                            {label}
                        </div>
                        {url ? (
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="fw-bold text-danger text-break text-decoration-none"
                            >
                                {value}
                                <i className="bi bi-box-arrow-up-right ms-2" />
                            </a>
                        ) : (
                            <div
                                className="fw-bold text-dark text-break"
                                style={{
                                    whiteSpace: fullWidth ? 'pre-line' : 'normal',
                                }}
                            >
                                {value === null ||
                                value === undefined ||
                                value === ''
                                    ? '-'
                                    : value}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FileCard({ label, name, path, color = 'danger' }) {
    const url = fileUrl(path);
    return (
        <div className="col-md-6">
            <div className="border rounded-4 p-3 h-100 d-flex align-items-center gap-3">
                <i className={`bi bi-file-earmark-text-fill fs-4 text-${color}`} />
                <div className="flex-grow-1 min-w-0">
                    <small className="text-muted fw-bold d-block">{label}</small>
                    <div className="text-truncate fw-bold">
                        {name || 'Dokumen lampiran'}
                    </div>
                </div>
                {url ? (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className={`btn btn-sm btn-outline-${color} rounded-pill`}
                    >
                        Buka
                    </a>
                ) : (
                    <span className="small text-muted">Tidak ada</span>
                )}
            </div>
        </div>
    );
}

function ItemTable({ title, items, label = 'Barang' }) {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4">
                <h4 className="fw-black mb-4">{title}</h4>
                <div className="table-responsive">
                    <table className="table align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>{label}</th>
                                <th className="text-center">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id || index}>
                                    <td className="fw-bold">
                                        {item.product?.name ||
                                            item.product_name ||
                                            item.name ||
                                            label}
                                    </td>
                                    <td className="text-center fw-bold">
                                        {new Intl.NumberFormat('id-ID').format(
                                            Number(item.quantity || 0)
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function RevisionHistory({ histories }) {
    if (!Array.isArray(histories) || histories.length === 0) return null;

    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4">
                <h4 className="fw-black mb-1">Riwayat Revisi</h4>
                <p className="text-muted mb-4">
                    Permintaan revisi dari admin.
                </p>
                <div className="d-flex flex-column gap-3">
                    {histories.map((history, index) => (
                        <div
                            key={history.id || index}
                            className="p-3 border bg-light rounded-4"
                        >
                            <div className="d-flex justify-content-between gap-2 mb-2">
                                <strong className="text-info">
                                    Revisi #{histories.length - index}
                                </strong>
                                <small className="text-muted">
                                    {formatDateTime(history.requested_at)}
                                </small>
                            </div>
                            <p style={{ whiteSpace: 'pre-line' }}>
                                {history.revision_note || '-'}
                            </p>
                            <small className="d-block">
                                Diminta oleh:{' '}
                                <strong>
                                    {history.requested_by?.name ||
                                        history.requestedBy?.name ||
                                        'Admin'}
                                </strong>
                            </small>
                            <small className="d-block mt-1">
                                Dikirim ulang:{' '}
                                <strong>
                                    {history.resubmitted_at
                                        ? formatDateTime(history.resubmitted_at)
                                        : 'Belum dikirim ulang'}
                                </strong>
                            </small>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Timeline({ items }) {
    return (
        <div className="request-timeline">
            {items.map((item, index) => (
                <div
                    key={`${item.label}-${index}`}
                    className={`request-timeline-item ${item.status}`}
                >
                    <div className="request-timeline-marker">
                        <i className={`bi ${item.icon}`} />
                    </div>
                    <div className="request-timeline-content">
                        <strong className="d-block">{item.label}</strong>
                        <div className="small text-muted mt-1">
                            {item.description}
                        </div>
                        {item.date && (
                            <small className="text-danger fw-bold d-block mt-1">
                                {formatDateTime(item.date)}
                            </small>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function MyRequestDetailPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();

    const user = useMemo(() => currentUser(), []);
    const basePath = user.role === 'user' ? '/user' : '/admin';
    const historyPath = `${basePath}/my-requests`;
    const dashboardPath = `${basePath}/dashboard`;
    const config = TYPES[type];

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDetail = useCallback(async () => {
        if (!config || !id) {
            setError('Jenis pengajuan tidak dikenali.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await api.get(config.endpoint(id));
            setData(response?.data?.data || response?.data || null);
        } catch (err) {
            console.error('Fetch request detail:', err?.response?.data || err);
            setError(
                err?.response?.data?.message ||
                    'Detail pengajuan tidak dapat dimuat.'
            );
        } finally {
            setLoading(false);
        }
    }, [config, id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const isSchedule = type === 'directorate_schedule';
    const isBorrowing = type === 'borrowing';
    const isAsset = isBorrowing && data?.request_type === 'asset_request';
    const isBorrow = isBorrowing && !isAsset;

    const displayConfig = isBorrowing
        ? {
              ...config,
              label: isAsset ? 'Request Barang' : 'Peminjaman Barang',
              icon: isAsset
                  ? 'bi-box2-heart-fill'
                  : 'bi-box-arrow-up-right',
              color: isAsset ? 'info' : 'success',
          }
        : config;

    const status = STATUSES[data?.status] || [
        data?.status || 'Tidak diketahui',
        'secondary',
        'bi-info-circle-fill',
    ];

    const title = !data
        ? '-'
        : type === 'humas'
          ? getCoverage(data.coverage_type)
          : isBorrowing
            ? data.purpose || displayConfig?.label
            : data.title ||
              data.event_name ||
              data.activity_name ||
              displayConfig?.label;

    const timeline = useMemo(() => {
        if (!data) return [];

        const steps = [
            {
                label: 'Pengajuan Dikirim',
                description: 'Pengajuan telah dikirim ke sistem.',
                date: data.submitted_at || data.created_at,
                icon: 'bi-send-check-fill',
                status: 'done',
            },
        ];

        if (isSchedule) {
            if (data.edited_at) {
                steps.push({
                    label: 'Pengajuan Disesuaikan',
                    description: `Data diperbarui oleh ${data.editor_name || 'admin'}.`,
                    date: data.edited_at,
                    icon: 'bi-pencil-square',
                    status: 'done',
                });
            }
            if (data.status === 'pending') {
                steps.push({
                    label: 'Menunggu Approval',
                    description: 'Menunggu pemeriksaan admin.',
                    icon: 'bi-hourglass-split',
                    status: 'active',
                });
            }
            if (data.status === 'approved') {
                steps.push({
                    label: 'Jadwal Disetujui',
                    description: `Disetujui oleh ${data.reviewer_name || 'admin'} dan dimasukkan ke kalender.`,
                    date: data.reviewed_at,
                    icon: 'bi-calendar2-check-fill',
                    status: 'done',
                });
            }
            if (data.status === 'rejected') {
                steps.push({
                    label: 'Pengajuan Ditolak',
                    description: data.rejection_reason || 'Pengajuan ditolak.',
                    date: data.reviewed_at,
                    icon: 'bi-x-circle-fill',
                    status: 'rejected',
                });
            }
            return steps;
        }

        if (data.resubmitted_at) {
            steps.push({
                label: 'Perbaikan Dikirim Ulang',
                description: 'Pemohon telah mengirim ulang data.',
                date: data.resubmitted_at,
                icon: 'bi-arrow-repeat',
                status: 'done',
            });
        }

        if (data.status === 'pending') {
            steps.push({
                label: 'Menunggu Pemeriksaan',
                description: 'Admin sedang memeriksa data.',
                icon: 'bi-hourglass-split',
                status: 'active',
            });
        } else if (data.status === 'revision') {
            steps.push({
                label: 'Revisi Diminta',
                description: data.admin_note || 'Data perlu diperbaiki.',
                date: data.revision_requested_at || data.updated_at,
                icon: 'bi-pencil-square',
                status: 'active',
            });
        } else if (data.status === 'rejected') {
            steps.push({
                label: 'Pengajuan Ditolak',
                description: data.admin_note || 'Pengajuan ditolak.',
                date: data.rejected_at || data.updated_at,
                icon: 'bi-x-circle-fill',
                status: 'rejected',
            });
        } else if (
            ['approved', 'completed', 'borrowed', 'returned'].includes(data.status)
        ) {
            steps.push({
                label: 'Pengajuan Disetujui',
                description: 'Admin telah menyetujui pengajuan.',
                date: data.approved_at || data.updated_at,
                icon: 'bi-check-circle-fill',
                status: 'done',
            });
        }

        if (isBorrow && ['borrowed', 'returned'].includes(data.status)) {
            steps.push({
                label: 'Barang Dipinjam',
                description: 'Barang telah diserahkan kepada pemohon.',
                date: data.borrowed_at || data.updated_at,
                icon: 'bi-box-arrow-up-right',
                status: 'done',
            });
        }

        if (data.status === 'completed') {
            steps.push({
                label: isAsset ? 'Barang Diserahkan' : 'Layanan Selesai',
                description: isAsset
                    ? 'Barang telah diserahkan kepada pemohon.'
                    : type === 'humas'
                      ? 'Hasil pekerjaan Humas telah tersedia.'
                      : 'Proses pelayanan telah selesai.',
                date: data.completed_at || data.updated_at,
                icon: 'bi-check2-all',
                status: 'done',
            });
        }

        if (isBorrow && data.status === 'returned') {
            steps.push({
                label: 'Barang Dikembalikan',
                description: 'Peminjaman selesai.',
                date: data.returned_at || data.updated_at,
                icon: 'bi-box-arrow-in-down-left',
                status: 'done',
            });
        }

        return steps;
    }, [data, isSchedule, isBorrow, isAsset, type]);

    if (!config) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h4>Jenis pengajuan tidak dikenali</h4>
                    <Link className="btn btn-danger rounded-pill" to={historyPath}>
                        Kembali ke Riwayat
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />
                    <h5>Memuat detail pengajuan...</h5>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h4 className="fw-bold">Detail tidak dapat dimuat</h4>
                    <p className="text-muted">{error}</p>
                    <button
                        className="btn btn-outline-danger me-2"
                        type="button"
                        onClick={fetchDetail}
                    >
                        Coba Lagi
                    </button>
                    <Link to={historyPath} className="btn btn-danger">
                        Kembali ke Riwayat
                    </Link>
                </div>
            </div>
        );
    }

    const rejectionReason = isSchedule
        ? data.rejection_reason
        : data.admin_note;

    const handover = data.handover_evidence_url ||
        data.handover_evidence_path;
    const returnEvidence = data.return_evidence_url ||
        data.return_evidence_path;
    const resultsLink = externalUrl(data.result_link);

    const orderItems = data.items || data.order_items || [];
    const borrowItems = data.items ||
        data.borrow_items || data.borrow_request_items || [];
    const revisions = data.revision_histories ||
        data.revisionHistories || [];

    return (
        <div className="container-fluid px-0 my-detail-page">
            {/* HERO */}
            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4 p-lg-5">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-4">
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className={`detail-hero-icon bg-${displayConfig.color}-subtle text-${displayConfig.color}`}
                            >
                                <i className={`bi ${displayConfig.icon} fs-2`} />
                            </div>
                            <div>
                                <span
                                    className={`badge rounded-pill bg-${displayConfig.color}-subtle text-${displayConfig.color} px-3 py-2 mb-2`}
                                >
                                    {displayConfig.label}
                                </span>
                                <h2 className="fw-black mb-1">{title}</h2>
                                <strong className="text-danger">
                                    {requestCode(type, data)}
                                </strong>
                            </div>
                        </div>

                        <div className="text-lg-end">
                            <span
                                className={`badge rounded-pill text-bg-${status[1]} px-3 py-2`}
                            >
                                <i className={`bi ${status[2]} me-2`} />
                                {status[0]}
                            </span>
                            <div className="small text-muted mt-3">
                                Diperbarui
                            </div>
                            <strong>{formatDateTime(data.updated_at)}</strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* PENOLAKAN */}
            {data.status === 'rejected' && (
                <div className="alert alert-danger border-0 shadow-sm rounded-4 p-4 mb-4">
                    <h5 className="fw-black">
                        <i className="bi bi-x-circle-fill me-2" />
                        Pengajuan Ditolak
                    </h5>
                    <div style={{ whiteSpace: 'pre-line' }}>
                        {rejectionReason || 'Tidak ada alasan tambahan.'}
                    </div>
                    {isSchedule && data.reviewer_name && (
                        <small className="d-block mt-2">
                            Diproses oleh {data.reviewer_name} pada{' '}
                            {formatDateTime(data.reviewed_at)}
                        </small>
                    )}
                </div>
            )}

            {/* APPROVAL JADWAL */}
            {isSchedule && data.status === 'approved' && (
                <div className="alert alert-success border-0 shadow-sm rounded-4 p-4 mb-4">
                    <h5 className="fw-black">
                        <i className="bi bi-calendar2-check-fill me-2" />
                        Jadwal Direktorat Disetujui
                    </h5>
                    <p>
                        Agenda telah disetujui dan dimasukkan ke kalender.
                    </p>
                    {data.reviewer_name && (
                        <div className="small mb-3">
                            Disetujui oleh {data.reviewer_name} •{' '}
                            {formatDateTime(data.reviewed_at)}
                        </div>
                    )}
                    <Link
                        to={`${basePath}/director-schedule`}
                        className="btn btn-sm btn-success rounded-pill px-3"
                    >
                        Lihat Kalender
                    </Link>
                </div>
            )}

            {/* REVISI MERCHANDISE */}
            {type === 'merchandise' && data.status === 'revision' && (
                <>
                    <div className="alert alert-info rounded-4 border-0 p-4 mb-4">
                        <h5 className="fw-black">Pengajuan Perlu Direvisi</h5>
                        <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                            {data.admin_note || 'Silakan perbaiki data pengajuan.'}
                        </p>
                    </div>
                    <MerchandiseRevisionForm
                        order={data}
                        onSuccess={fetchDetail}
                    />
                </>
            )}

            {/* HASIL HUMAS */}
            {type === 'humas' && data.status === 'completed' && (
                <section className="card border-0 shadow-sm rounded-5 mb-4">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                            <div>
                                <h4 className="fw-black mb-1">
                                    Hasil Pekerjaan Humas
                                </h4>
                                <p className="text-muted mb-0">
                                    Hasil layanan yang telah diselesaikan.
                                </p>
                            </div>
                            {resultsLink && (
                                <a
                                    href={resultsLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-success rounded-pill"
                                >
                                    Buka Link Hasil
                                </a>
                            )}
                        </div>
                        <div className="row g-3">
                            <FileCard
                                label="File Hasil Admin"
                                name={data.result_file_name}
                                path={data.result_file_url || data.result_file_path}
                                color="success"
                            />
                            <InfoItem
                                label="Link Hasil"
                                value={resultsLink}
                                icon="bi-link-45deg"
                                isLink
                            />
                            {data.result_note && (
                                <InfoItem
                                    label="Catatan Hasil"
                                    value={data.result_note}
                                    icon="bi-chat-left-text-fill"
                                    fullWidth
                                />
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* BUKTI SEKPiM */}
            {isBorrowing && (handover || (isBorrow && returnEvidence)) && (
                <section className="card border-0 shadow-sm rounded-5 mb-4">
                    <div className="card-body p-4">
                        <h4 className="fw-black mb-3">
                            {isBorrow
                                ? 'Bukti Proses Peminjaman'
                                : 'Bukti Penyerahan Barang'}
                        </h4>
                        <div className="row g-3">
                            <FileCard
                                label={isBorrow
                                    ? 'Bukti Serah Terima'
                                    : 'Bukti Penyerahan Barang'}
                                name={data.handover_evidence_name}
                                path={handover}
                                color={isBorrow ? 'success' : 'info'}
                            />
                            {isBorrow && (
                                <FileCard
                                    label="Bukti Pengembalian"
                                    name={data.return_evidence_name}
                                    path={returnEvidence}
                                    color="success"
                                />
                            )}
                        </div>
                    </div>
                </section>
            )}

            <div className="row g-4">
                <div className="col-xl-8">
                    {/* INFORMASI */}
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                Informasi Pengajuan
                            </h4>
                            <p className="text-muted mb-4">
                                Data lengkap pengajuan yang dikirim.
                            </p>
                            <div className="row g-3">
                                <InfoItem
                                    label="Nama Pemohon"
                                    value={
                                        data.applicant_name ||
                                        data.user?.name ||
                                        data.requester_name ||
                                        (Number(data.requested_by) === Number(user.id)
                                            ? user.name
                                            : null)
                                    }
                                    icon="bi-person-fill"
                                />

                                {/* DETAIL JADWAL DIREKTORAT */}
                                {isSchedule && (
                                    <>
                                        <InfoItem
                                            label="Unit Pengaju"
                                            value={data.requester_unit}
                                            icon="bi-building-fill"
                                        />
                                        <InfoItem
                                            label="Nama PIC"
                                            value={data.pic_name}
                                            icon="bi-person-check-fill"
                                        />
                                        <InfoItem
                                            label="Agenda Untuk"
                                            value={
                                                DIRECTORATES[data.directorate] ||
                                                data.directorate
                                            }
                                            icon="bi-person-vcard-fill"
                                        />
                                        <InfoItem
                                            label="Judul Agenda"
                                            value={data.title}
                                            icon="bi-calendar2-event-fill"
                                            fullWidth
                                        />
                                        <InfoItem
                                            label="Tanggal Agenda"
                                            value={formatDate(data.event_date)}
                                            icon="bi-calendar-date-fill"
                                        />
                                        <InfoItem
                                            label="Waktu Agenda"
                                            value={
                                                data.all_day
                                                    ? 'Sepanjang Hari'
                                                    : `${formatTime(data.start_time)} - ${formatTime(data.end_time)} WIB`
                                            }
                                            icon="bi-clock-fill"
                                        />
                                        <InfoItem
                                            label="Kategori Agenda"
                                            value={data.agenda_type}
                                            icon="bi-tag-fill"
                                        />
                                        <InfoItem
                                            label="Lokasi Agenda"
                                            value={data.location}
                                            icon="bi-geo-alt-fill"
                                        />
                                        <InfoItem
                                            label="Visibilitas"
                                            value={
                                                data.is_public
                                                    ? 'Publik'
                                                    : 'Internal'
                                            }
                                            icon="bi-globe2"
                                        />
                                        <InfoItem
                                            label="Tanggal Pengajuan"
                                            value={formatDateTime(data.created_at)}
                                            icon="bi-send-check-fill"
                                        />
                                        <InfoItem
                                            label="Deskripsi / Keperluan"
                                            value={data.description}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                        {data.edited_by && (
                                            <InfoItem
                                                label="Disesuaikan Admin"
                                                value={`${data.editor_name || 'Admin'} • ${formatDateTime(data.edited_at)}`}
                                                icon="bi-pencil-square"
                                                fullWidth
                                            />
                                        )}
                                        {data.reviewed_by && (
                                            <InfoItem
                                                label="Keputusan Admin"
                                                value={`${data.reviewer_name || 'Admin'} • ${formatDateTime(data.reviewed_at)}`}
                                                icon="bi-person-check-fill"
                                                fullWidth
                                            />
                                        )}
                                    </>
                                )}

                                {/* MERCHANDISE */}
                                {type === 'merchandise' && (
                                    <>
                                        <InfoItem
                                            label="Nama Kegiatan"
                                            value={data.event_name || data.activity_name}
                                            icon="bi-calendar-event-fill"
                                        />
                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(data.activity_date)}
                                            icon="bi-calendar-date-fill"
                                        />
                                        <InfoItem
                                            label="Tanggal Pengambilan Merchandise"
                                            value={formatDate(data.pickup_date)}
                                            icon="bi-calendar-check-fill"
                                        />
                                        <InfoItem
                                            label="Nama PIC"
                                            value={data.pic_name}
                                            icon="bi-person-check-fill"
                                        />
                                        <InfoItem
                                            label="Nomor PIC"
                                            value={data.pic_phone}
                                            icon="bi-whatsapp"
                                        />
                                        <InfoItem
                                            label="Instansi Tamu"
                                            value={data.institution_name}
                                            icon="bi-buildings-fill"
                                        />
                                        <InfoItem
                                            label="Nama Tamu"
                                            value={data.guest_name}
                                            icon="bi-person-badge-fill"
                                        />
                                        <InfoItem
                                            label="Jabatan Tamu"
                                            value={data.guest_position}
                                            icon="bi-briefcase-fill"
                                        />
                                        <InfoItem
                                            label="Alasan / Catatan Pengajuan"
                                            value={data.user_note}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {/* HUMAS */}
                                {type === 'humas' && (
                                    <>
                                        <InfoItem
                                            label="Unit / Bagian"
                                            value={resolveUnit(data)}
                                            icon="bi-building-fill"
                                        />
                                        <InfoItem
                                            label="Nomor WhatsApp PIC"
                                            value={data.pic_whatsapp}
                                            icon="bi-whatsapp"
                                        />
                                        <InfoItem
                                            label="Jenis Layanan Humas"
                                            value={getCoverage(data.coverage_type)}
                                            icon="bi-camera-reels-fill"
                                        />
                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(data.event_date)}
                                            icon="bi-calendar-date-fill"
                                        />
                                        <InfoItem
                                            label="Lokasi Kegiatan"
                                            value={data.event_location}
                                            icon="bi-geo-alt-fill"
                                        />
                                        <InfoItem
                                            label="Link Referensi"
                                            value={data.reference_link}
                                            icon="bi-link-45deg"
                                            fullWidth
                                            isLink
                                        />
                                        <InfoItem
                                            label="Detail Kegiatan"
                                            value={data.activity_detail}
                                            icon="bi-file-earmark-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}

                                {/* SEKPiM */}
                                {isBorrowing && (
                                    <>
                                        <InfoItem
                                            label="Jenis Pengajuan"
                                            value={isAsset
                                                ? 'Request Barang'
                                                : 'Peminjaman Barang'}
                                            icon={isAsset
                                                ? 'bi-box2-heart-fill'
                                                : 'bi-box-arrow-up-right'}
                                        />
                                        <InfoItem
                                            label="Nama PIC"
                                            value={data.pic_name}
                                            icon="bi-person-badge-fill"
                                        />
                                        <InfoItem
                                            label="Nomor PIC"
                                            value={data.pic_phone}
                                            icon="bi-whatsapp"
                                        />
                                        <InfoItem
                                            label="Tanggal Kegiatan"
                                            value={formatDate(data.activity_date)}
                                            icon="bi-calendar-event-fill"
                                        />
                                        <InfoItem
                                            label="Tanggal Pengambilan"
                                            value={formatDate(data.borrow_date)}
                                            icon="bi-calendar-check-fill"
                                        />
                                        {isBorrow && (
                                            <InfoItem
                                                label="Tanggal Pengembalian"
                                                value={formatDate(data.return_date)}
                                                icon="bi-calendar-minus-fill"
                                            />
                                        )}
                                        <InfoItem
                                            label={isAsset
                                                ? 'Keperluan Request Barang'
                                                : 'Keperluan Peminjaman'}
                                            value={data.purpose}
                                            icon="bi-chat-left-text-fill"
                                            fullWidth
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* RIWAYAT REVISI */}
                    {type === 'merchandise' && (
                        <RevisionHistory histories={revisions} />
                    )}

                    {/* ITEMS */}
                    {type === 'merchandise' && (
                        <ItemTable
                            title="Paket Merchandise"
                            label="Produk"
                            items={orderItems}
                        />
                    )}

                    {isBorrowing && (
                        <ItemTable
                            title={isAsset
                                ? 'Barang yang Diminta'
                                : 'Barang Dipinjam'}
                            items={borrowItems}
                        />
                    )}

                    {/* DOKUMEN PENDUKUNG */}
                    {!isSchedule && (
                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Dokumen Pendukung
                                </h4>
                                <p className="text-muted mb-4">
                                    Lampiran yang tersedia pada pengajuan.
                                </p>
                                <div className="row g-3">
                                    {type === 'merchandise' && (
                                        <FileCard
                                            label="Bukti Undangan / Dokumen"
                                            name={data.proof_file_name}
                                            path={
                                                data.proof_file_url ||
                                                data.proof_file_path
                                            }
                                            color="primary"
                                        />
                                    )}
                                    {type === 'humas' && (
                                        <FileCard
                                            label="Lampiran / Brief Kegiatan"
                                            name={data.article_draft_name}
                                            path={
                                                data.article_draft_url ||
                                                data.article_draft_path
                                            }
                                        />
                                    )}
                                    {isBorrowing && (
                                        <>
                                            <FileCard
                                                label={isAsset
                                                    ? 'Bukti Penyerahan Barang'
                                                    : 'Bukti Serah Terima'}
                                                name={data.handover_evidence_name}
                                                path={handover}
                                                color={isAsset ? 'info' : 'success'}
                                            />
                                            {isBorrow && (
                                                <FileCard
                                                    label="Bukti Pengembalian"
                                                    name={data.return_evidence_name}
                                                    path={returnEvidence}
                                                    color="success"
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* KOLOM STATUS */}
                <div className="col-xl-4">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">Status Pengajuan</h4>
                            <p className="text-muted mb-4">
                                Perkembangan proses pelayanan.
                            </p>

                            <div className="rounded-4 bg-light p-4 text-center mb-4">
                                <div
                                    className={`status-circle text-bg-${status[1]}`}
                                >
                                    <i className={`bi ${status[2]} fs-3`} />
                                </div>
                                <h5 className="fw-black">{status[0]}</h5>
                                <p className="small text-muted mb-0">
                                    {isSchedule
                                        ? data.status === 'approved'
                                            ? 'Agenda sudah masuk kalender Direktorat.'
                                            : data.status === 'pending'
                                              ? 'Menunggu keputusan admin.'
                                              : 'Pengajuan telah diproses.'
                                        : isAsset && data.status === 'completed'
                                          ? 'Barang telah diserahkan.'
                                          : data.status === 'returned'
                                            ? 'Peminjaman selesai.'
                                            : 'Pantau perkembangan pengajuan.'}
                                </p>
                            </div>

                            {isSchedule && (
                                <div className="p-3 bg-danger-subtle rounded-4 mb-4">
                                    <small className="text-muted d-block">
                                        Jadwal yang Diajukan
                                    </small>
                                    <strong className="text-danger">
                                        {formatDate(data.event_date)}
                                    </strong>
                                    <div className="small mt-2">
                                        {data.all_day
                                            ? 'Sepanjang hari'
                                            : `${formatTime(data.start_time)} - ${formatTime(data.end_time)} WIB`}
                                    </div>
                                    <div className="small mt-2">
                                        <strong>Unit:</strong>{' '}
                                        {data.requester_unit || '-'}
                                    </div>
                                    <div className="small">
                                        <strong>PIC:</strong>{' '}
                                        {data.pic_name || '-'}
                                    </div>
                                </div>
                            )}

                            {type === 'merchandise' && data.pickup_date && (
                                <div className="p-3 bg-primary-subtle rounded-4 mb-4">
                                    <small className="d-block text-muted">
                                        Pengambilan Merchandise
                                    </small>
                                    <strong>
                                        {formatDate(data.pickup_date)}
                                    </strong>
                                </div>
                            )}

                            {isBorrowing && data.borrow_date && (
                                <div className="p-3 bg-success-subtle rounded-4 mb-4">
                                    <small className="d-block text-muted">
                                        Pengambilan Barang
                                    </small>
                                    <strong>
                                        {formatDate(data.borrow_date)}
                                    </strong>
                                    {isBorrow && data.return_date && (
                                        <>
                                            <hr />
                                            <small className="d-block text-muted">
                                                Pengembalian
                                            </small>
                                            <strong>
                                                {formatDate(data.return_date)}
                                            </strong>
                                        </>
                                    )}
                                </div>
                            )}

                            <Timeline items={timeline} />
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4 d-grid gap-2">
                            <Link
                                to={historyPath}
                                className="btn btn-danger rounded-pill"
                            >
                                <i className="bi bi-arrow-left me-2" />
                                Kembali ke Riwayat
                            </Link>
                            <button
                                type="button"
                                className="btn btn-outline-secondary rounded-pill"
                                onClick={() => navigate(dashboardPath)}
                            >
                                <i className="bi bi-house-door-fill me-2" />
                                Dashboard
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .my-detail-page .fw-black {
                    font-weight: 900 !important;
                }

                .my-detail-page .detail-hero-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 72px;
                    width: 72px;
                    height: 72px;
                    border-radius: 18px;
                }

                .my-detail-page .detail-info-icon {
                    display: grid;
                    place-items: center;
                    flex: 0 0 42px;
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: white;
                    color: #9f1239;
                }

                .my-detail-page .status-circle {
                    display: grid;
                    place-items: center;
                    width: 70px;
                    height: 70px;
                    margin: 0 auto 15px;
                    border-radius: 50%;
                }

                .my-detail-page .request-timeline-item {
                    position: relative;
                    display: grid;
                    grid-template-columns: 40px minmax(0, 1fr);
                    gap: 12px;
                    padding-bottom: 24px;
                }

                .my-detail-page .request-timeline-item:before {
                    content: '';
                    position: absolute;
                    left: 19px;
                    top: 40px;
                    bottom: 0;
                    width: 2px;
                    background: #e2e8f0;
                }

                .my-detail-page .request-timeline-item:last-child:before {
                    display: none;
                }

                .my-detail-page .request-timeline-marker {
                    display: grid;
                    place-items: center;
                    width: 40px;
                    height: 40px;
                    background: #dcfce7;
                    color: #15803d;
                    border-radius: 13px;
                    z-index: 1;
                }

                .my-detail-page .request-timeline-item.active
                .request-timeline-marker {
                    background: #fef3c7;
                    color: #b45309;
                }

                .my-detail-page .request-timeline-item.rejected
                .request-timeline-marker {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                @media (max-width: 767px) {
                    .my-detail-page h2 {
                        font-size: 1.45rem;
                    }
                    .my-detail-page .card-body {
                        padding: 18px !important;
                    }
                }
            `}</style>
        </div>
    );
}