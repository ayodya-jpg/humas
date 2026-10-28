
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showTextareaAlert,
} from '../../utils/sweetAlert';

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
    'REQUEST DESIGN INSTAGRAM': ['Request Design Instagram', 'bi-instagram'],
    'DOKUMENTASI': ['Dokumentasi', 'bi-camera-fill'],
    'PUBLIKASI WEBSITE': ['Publikasi Website', 'bi-globe2'],
    'PUBLIKASI MEDIA MASSA': ['Publikasi Media Massa', 'bi-newspaper'],
    'YOUTUBE': ['YouTube', 'bi-youtube'],
    'VIDEO REELS': ['Video Reels', 'bi-play-btn-fill'],
    'SOCIAL MEDIA': ['Social Media', 'bi-instagram'],
};

const currentUser = () => {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
};

const hasPermission = (user, permission) => {
    if (user?.role === 'superadmin') return true;
    return Array.isArray(user?.permissions)
        ? user.permissions.includes(permission)
        : false;
};

const getError = (error) => {
    const data = error?.response?.data;
    const first = data?.errors
        ? Object.values(data.errors).flat().find(Boolean)
        : null;
    return first || data?.message || 'Terjadi kesalahan pada server.';
};

const formatDate = (value) => {
    if (!value) return '-';
    const text = String(value).slice(0, 10);
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          });
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '-'
        : date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

const normalizeUrl = (value) => {
    if (!value?.trim()) return null;
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
};

const coverageLabel = (value) =>
    String(value || '')
        .split(/[;,]/)
        .map((part) => {
            const upper = part.trim().toUpperCase();
            return COVERAGE_CONFIG[upper]?.[0] || part.trim();
        })
        .filter(Boolean)
        .join(', ') || '-';

const coverageIcon = (value) => {
    const first = String(value || '')
        .split(/[;,]/)[0]
        .trim()
        .toUpperCase();

    return COVERAGE_CONFIG[first]?.[1] || 'bi-camera-reels-fill';
};

const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    return bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
        : `${(bytes / 1024).toFixed(1)} KB`;
};

function InfoBox({ label, value, icon = 'bi-info-circle' }) {
    return (
        <div className="p-3 rounded-4 bg-light h-100">
            <div className="d-flex align-items-start gap-3">
                <div
                    className="rounded-circle bg-white text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 40, height: 40 }}
                >
                    <i className={`bi ${icon}`} />
                </div>
                <div className="min-w-0">
                    <div className="small text-muted mb-1">{label}</div>
                    <div className="fw-bold text-break">{value || '-'}</div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, description, icon, children }) {
    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4 p-lg-5">
                <div className="d-flex justify-content-between gap-3 mb-4">
                    <div>
                        <h4 className="fw-black mb-1">{title}</h4>
                        <p className="text-muted mb-0">{description}</p>
                    </div>
                    <i className={`bi ${icon} fs-3 text-danger`} />
                </div>
                {children}
            </div>
        </section>
    );
}

function DocumentCard({ title, name, url, icon = 'bi-file-earmark' }) {
    if (!url) return null;

    return (
        <div className="border rounded-4 p-3 bg-light">
            <div className="d-flex align-items-center flex-wrap gap-3">
                <div className="rounded-4 bg-white text-danger p-3">
                    <i className={`bi ${icon} fs-4`} />
                </div>
                <div className="flex-grow-1 min-w-0">
                    <div className="small text-muted">{title}</div>
                    <div className="fw-bold text-break">
                        {name || title}
                    </div>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-danger rounded-pill"
                >
                    <i className="bi bi-eye-fill me-2" />
                    Buka File
                </a>
            </div>
        </div>
    );
}

export default function HumasServiceApprovalDetailPage() {
    const { id } = useParams();

    const user = useMemo(() => currentUser(), []);
    const canProcess = hasPermission(user, 'approval.humas.process');

    const [requestData, setRequestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [resultLink, setResultLink] = useState('');
    const [resultNote, setResultNote] = useState('');
    const [resultFile, setResultFile] = useState(null);

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get(
                `/humas-service-requests/${id}`
            );
            const data = response?.data?.data || null;

            setRequestData(data);
            setResultLink(data?.result_link || '');
            setResultNote(data?.result_note || '');
        } catch (err) {
            console.error('Detail HUMAS error:', err);
            setRequestData(null);
            setError(getError(err));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const runAction = async (action, payload, title) => {
        if (!canProcess) {
            await showErrorAlert(
                'Akses Ditolak',
                'Akun tidak memiliki izin memproses layanan HUMAS.'
            );
            return;
        }

        try {
            setProcessing(true);
            showLoadingAlert(
                'Memproses Request HUMAS',
                'Mohon tunggu sebentar.'
            );

            const response = await api.put(
                `/humas-service-requests/${id}/${action}`,
                payload
            );

            closeAlert();
            await showSuccessAlert(
                title,
                response?.data?.message || 'Berhasil diproses.'
            );
            await loadDetail();
        } catch (err) {
            closeAlert();
            await showErrorAlert('Proses Gagal', getError(err));
        } finally {
            setProcessing(false);
        }
    };

    const handleApprove = async () => {
        if (requestData?.status !== 'pending') return;

        const result = await showConfirmAlert({
            title: 'Setujui Request HUMAS?',
            text: 'Pengajuan akan diteruskan untuk dikerjakan tim HUMAS.',
            confirmButtonText: 'Ya, setujui',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (result.isConfirmed) {
            await runAction('approve', {}, 'Request Disetujui');
        }
    };

    const handleReject = async () => {
        if (requestData?.status !== 'pending') return;

        const result = await showTextareaAlert({
            title: 'Tolak Request HUMAS?',
            text: 'Tuliskan alasan penolakan untuk pemohon.',
            inputLabel: 'Alasan Penolakan',
            inputPlaceholder: 'Tuliskan alasan...',
            confirmButtonText: 'Tolak Request',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc2626',
            minimumLength: 5,
            maximumLength: 2000,
        });

        if (result.isConfirmed && result.value?.trim()) {
            await runAction(
                'reject',
                { admin_note: result.value.trim() },
                'Request Ditolak'
            );
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setResultFile(null);
            return;
        }

        const extensions = [
            'pdf', 'doc', 'docx', 'jpg',
            'jpeg', 'png', 'zip',
        ];

        const ext = file.name.split('.').pop()?.toLowerCase();

        if (!extensions.includes(ext)) {
            event.target.value = '';
            setResultFile(null);

            await showErrorAlert(
                'Format Tidak Didukung',
                'File harus PDF, DOC, DOCX, JPG, JPEG, PNG, atau ZIP.'
            );
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            event.target.value = '';
            setResultFile(null);

            await showErrorAlert(
                'File Terlalu Besar',
                'Ukuran file maksimal 20 MB.'
            );
            return;
        }

        setResultFile(file);
    };

    const handleComplete = async () => {
        if (requestData?.status !== 'approved' || !canProcess) return;

        const link = resultLink.trim();

        if (!link && !resultFile) {
            await showErrorAlert(
                'Hasil Belum Lengkap',
                'Isi link hasil atau unggah file hasil pekerjaan.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Selesaikan Request HUMAS?',
            text: 'Hasil pekerjaan akan disimpan dan pengajuan ditandai selesai.',
            confirmButtonText: 'Ya, selesaikan',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#16a34a',
        });

        if (!confirmation.isConfirmed) return;

        const formData = new FormData();
        formData.append('_method', 'PUT');

        if (link) {
            formData.append('result_link', normalizeUrl(link));
        }

        if (resultNote.trim()) {
            formData.append('result_note', resultNote.trim());
        }

        if (resultFile) {
            formData.append('result_file', resultFile);
        }

        try {
            setProcessing(true);
            showLoadingAlert(
                'Menyimpan Hasil',
                'File dan informasi hasil sedang disimpan.'
            );

            const response = await api.post(
                `/humas-service-requests/${id}/complete`,
                formData
            );

            closeAlert();
            await showSuccessAlert(
                'Request Selesai',
                response?.data?.message || 'Hasil berhasil disimpan.'
            );

            setResultFile(null);
            await loadDetail();
        } catch (err) {
            closeAlert();
            console.error('Complete HUMAS:', err);
            await showErrorAlert(
                'Penyelesaian Gagal',
                getError(err)
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />
                    <h5 className="fw-black">Memuat Detail HUMAS</h5>
                </div>
            </div>
        );
    }

    if (error || !requestData) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <i className="bi bi-exclamation-triangle-fill fs-1 text-danger" />
                    <h4 className="fw-black mt-3">Detail Gagal Dimuat</h4>
                    <p className="text-muted">{error || 'Data tidak ditemukan.'}</p>

                    <div className="d-flex justify-content-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill"
                            onClick={loadDetail}
                        >
                            Coba Lagi
                        </button>
                        <Link
                            to="/admin/humas-services"
                            className="btn btn-danger rounded-pill"
                        >
                            Kembali ke Approval HUMAS
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const status = STATUS_CONFIG[requestData.status] || {
        label: requestData.status,
        className: 'bg-secondary-subtle text-secondary',
        icon: 'bi-info-circle',
    };

    const resolvedUnit =
        requestData.resolved_unit_name ||
        (requestData.unit_name === 'Lainnya'
            ? requestData.other_unit_name
            : requestData.unit_name) ||
        requestData.requester_unit ||
        '-';

    const referenceUrl = normalizeUrl(requestData.reference_link);
    const resultUrl = normalizeUrl(requestData.result_link);

    return (
        <div className="container-fluid px-0">
            <header className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                <div>
                    <Link
                        to="/admin/humas-services"
                        className="text-danger fw-bold text-decoration-none d-inline-flex gap-2 mb-3"
                    >
                        <i className="bi bi-arrow-left" />
                        Kembali ke Approval HUMAS
                    </Link>

                    <h2 className="fw-black mb-2">
                        Detail Request Layanan HUMAS
                    </h2>

                    <div className="d-flex flex-wrap gap-2">
                        <span className="fw-bold text-muted">
                            {requestData.service_code || `HMS-${requestData.id}`}
                        </span>

                        <span
                            className={`badge rounded-pill px-3 py-2 ${status.className}`}
                        >
                            <i className={`bi ${status.icon} me-2`} />
                            {status.label}
                        </span>
                    </div>
                </div>

                <div className="text-lg-end">
                    <div className="small text-muted">Dikirim</div>
                    <div className="fw-bold">
                        {formatDateTime(
                            requestData.submitted_at ||
                                requestData.created_at
                        )}
                    </div>
                </div>
            </header>

            {!canProcess && (
                <div className="alert alert-info border-0 rounded-4">
                    <i className="bi bi-eye-fill me-2" />
                    Mode hanya lihat. Kamu tidak memiliki izin
                    memproses approval HUMAS.
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <Section
                        title="Informasi Pemohon"
                        description="Informasi akun, unit dan kontak kegiatan."
                        icon="bi-person-vcard-fill"
                    >
                        <div className="row g-3">
                            <div className="col-md-6">
                                <InfoBox
                                    label="Nama Pemohon"
                                    value={
                                        requestData.applicant_name ||
                                        requestData.user?.name
                                    }
                                    icon="bi-person-fill"
                                />
                            </div>
                            <div className="col-md-6">
                                <InfoBox
                                    label="Unit / Program Studi"
                                    value={resolvedUnit}
                                    icon="bi-building"
                                />
                            </div>
                            <div className="col-md-6">
                                <InfoBox
                                    label="WhatsApp PIC"
                                    value={requestData.pic_whatsapp}
                                    icon="bi-whatsapp"
                                />
                            </div>
                            <div className="col-md-6">
                                <InfoBox
                                    label="Email Pemohon"
                                    value={requestData.user?.email}
                                    icon="bi-envelope-fill"
                                />
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Detail Kegiatan / Liputan"
                        description="Jenis pelayanan, tanggal, lokasi dan brief kegiatan."
                        icon={coverageIcon(requestData.coverage_type)}
                    >
                        <div className="row g-3">
                            <div className="col-md-6">
                                <InfoBox
                                    label="Jenis Layanan HUMAS"
                                    value={coverageLabel(
                                        requestData.coverage_type
                                    )}
                                    icon={coverageIcon(
                                        requestData.coverage_type
                                    )}
                                />
                            </div>
                            <div className="col-md-6">
                                <InfoBox
                                    label="Tanggal Pelaksanaan"
                                    value={formatDate(requestData.event_date)}
                                    icon="bi-calendar-event"
                                />
                            </div>
                            <div className="col-12">
                                <InfoBox
                                    label="Lokasi Kegiatan"
                                    value={requestData.event_location}
                                    icon="bi-geo-alt-fill"
                                />
                            </div>
                            <div className="col-12">
                                <div className="bg-light rounded-4 p-4">
                                    <div className="small fw-bold text-muted mb-2">
                                        Detail / Brief Kegiatan
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>
                                        {requestData.activity_detail || '-'}
                                    </div>
                                </div>
                            </div>
                            {referenceUrl && (
                                <div className="col-12">
                                    <a
                                        href={referenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-danger rounded-pill"
                                    >
                                        <i className="bi bi-link-45deg me-2" />
                                        Buka Link Referensi
                                    </a>
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section
                        title="Lampiran / Brief Kegiatan"
                        description="Dokumen referensi, TOR, rundown, atau draft yang dikirim pemohon."
                        icon="bi-file-earmark-check"
                    >
                        {requestData.article_draft_url ? (
                            <DocumentCard
                                title="Lampiran Pemohon"
                                name={
                                    requestData.article_draft_name ||
                                    'Brief Kegiatan'
                                }
                                url={requestData.article_draft_url}
                            />
                        ) : (
                            <div className="alert alert-warning rounded-4 mb-0">
                                Lampiran belum tersedia.
                            </div>
                        )}
                    </Section>

                    {requestData.status === 'completed' && (
                        <Section
                            title="Hasil Pekerjaan HUMAS"
                            description="Tautan, dokumen dan catatan hasil pelayanan."
                            icon="bi-cloud-check-fill"
                        >
                            <div className="d-flex flex-column gap-3">
                                {resultUrl && (
                                    <div className="border rounded-4 p-3 bg-success-subtle">
                                        <div className="fw-bold mb-2">
                                            Tautan Hasil
                                        </div>
                                        <a
                                            href={resultUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-success rounded-pill"
                                        >
                                            <i className="bi bi-box-arrow-up-right me-2" />
                                            Buka Hasil Pekerjaan
                                        </a>
                                    </div>
                                )}

                                <DocumentCard
                                    title="File Hasil"
                                    name={
                                        requestData.result_file_name ||
                                        'Hasil HUMAS'
                                    }
                                    url={requestData.result_file_url}
                                    icon="bi-file-earmark-check-fill"
                                />

                                {requestData.result_note && (
                                    <div className="p-3 bg-light rounded-4">
                                        <div className="small fw-bold text-muted mb-2">
                                            Catatan Hasil
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {requestData.result_note}
                                        </div>
                                    </div>
                                )}

                                {!resultUrl &&
                                    !requestData.result_file_url && (
                                        <div className="alert alert-warning mb-0">
                                            Data hasil belum tersedia.
                                        </div>
                                    )}
                            </div>
                        </Section>
                    )}
                </div>

                <div className="col-xl-4">
                    <div className="position-sticky" style={{ top: 100 }}>
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-3">
                                    Status Pengajuan
                                </h4>

                                <div className="d-flex flex-column gap-3">
                                    <InfoBox
                                        label="Dikirim"
                                        value={formatDateTime(
                                            requestData.submitted_at ||
                                                requestData.created_at
                                        )}
                                        icon="bi-send-check-fill"
                                    />

                                    {requestData.approved_at && (
                                        <InfoBox
                                            label="Disetujui"
                                            value={formatDateTime(
                                                requestData.approved_at
                                            )}
                                            icon="bi-check-circle-fill"
                                        />
                                    )}

                                    {requestData.rejected_at && (
                                        <InfoBox
                                            label="Ditolak"
                                            value={formatDateTime(
                                                requestData.rejected_at
                                            )}
                                            icon="bi-x-circle-fill"
                                        />
                                    )}

                                    {requestData.completed_at && (
                                        <InfoBox
                                            label="Selesai"
                                            value={formatDateTime(
                                                requestData.completed_at
                                            )}
                                            icon="bi-check2-all"
                                        />
                                    )}

                                    {requestData.admin_note && (
                                        <div className="alert alert-warning rounded-4 mb-0">
                                            <div className="fw-bold mb-2">
                                                Catatan Admin
                                            </div>
                                            {requestData.admin_note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-2">
                                    Tindakan Admin
                                </h4>
                                <p className="small text-muted mb-4">
                                    Proses layanan sesuai status pengajuan.
                                </p>

                                {!canProcess ? (
                                    <div className="alert alert-secondary mb-0">
                                        Akun hanya memiliki izin melihat.
                                    </div>
                                ) : requestData.status === 'pending' ? (
                                    <div className="d-grid gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary rounded-pill"
                                            disabled={processing}
                                            onClick={handleApprove}
                                        >
                                            <i className="bi bi-check-lg me-2" />
                                            Setujui Request
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-danger rounded-pill"
                                            disabled={processing}
                                            onClick={handleReject}
                                        >
                                            <i className="bi bi-x-lg me-2" />
                                            Tolak Request
                                        </button>
                                    </div>
                                ) : requestData.status === 'approved' ? (
                                    <div>
                                        <div className="alert alert-primary rounded-4">
                                            Masukkan link hasil atau unggah
                                            file hasil sebelum menyelesaikan request.
                                        </div>

                                        <label className="form-label fw-bold">
                                            Link Hasil
                                        </label>
                                        <input
                                            type="url"
                                            className="form-control rounded-4 mb-3"
                                            value={resultLink}
                                            placeholder="https://drive.google.com/..."
                                            onChange={(e) =>
                                                setResultLink(e.target.value)
                                            }
                                            disabled={processing}
                                        />

                                        <label className="form-label fw-bold">
                                            File Hasil
                                        </label>
                                        <input
                                            type="file"
                                            className="form-control rounded-4"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                                            onChange={handleFileChange}
                                            disabled={processing}
                                        />

                                        <div className="form-text mb-3">
                                            PDF, DOC, DOCX, JPG, PNG atau ZIP.
                                            Maksimal 20 MB.
                                        </div>

                                        {resultFile && (
                                            <div className="border bg-light rounded-4 p-3 mb-3">
                                                <div className="fw-bold text-break">
                                                    {resultFile.name}
                                                </div>
                                                <div className="small text-muted">
                                                    {formatFileSize(
                                                        resultFile.size
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger mt-2"
                                                    onClick={() =>
                                                        setResultFile(null)
                                                    }
                                                    disabled={processing}
                                                >
                                                    Hapus Pilihan
                                                </button>
                                            </div>
                                        )}

                                        <label className="form-label fw-bold">
                                            Catatan Hasil
                                        </label>
                                        <textarea
                                            className="form-control rounded-4 mb-3"
                                            rows={4}
                                            maxLength={3000}
                                            value={resultNote}
                                            onChange={(e) =>
                                                setResultNote(e.target.value)
                                            }
                                            disabled={processing}
                                            placeholder="Catatan hasil pekerjaan..."
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-success rounded-pill w-100"
                                            disabled={processing}
                                            onClick={handleComplete}
                                        >
                                            <i className="bi bi-check2-all me-2" />
                                            Simpan Hasil & Tandai Selesai
                                        </button>
                                    </div>
                                ) : (
                                    <div className="alert alert-light border rounded-4 mb-0">
                                        Request berstatus{' '}
                                        <strong>{status.label}</strong> dan
                                        tidak memiliki tindakan lanjutan.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <style>{`
                .fw-black { font-weight: 850 !important; }
            `}</style>
        </div>
    );
}
