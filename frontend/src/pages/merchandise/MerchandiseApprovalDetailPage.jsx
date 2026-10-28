
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
        label: 'Menunggu Persetujuan',
        icon: 'bi-hourglass-split',
        className: 'bg-warning-subtle text-warning-emphasis',
    },
    revision: {
        label: 'Perlu Revisi',
        icon: 'bi-pencil-square',
        className: 'bg-info-subtle text-info-emphasis',
    },
    approved: {
        label: 'Disetujui',
        icon: 'bi-check-circle-fill',
        className: 'bg-primary-subtle text-primary',
    },
    rejected: {
        label: 'Ditolak',
        icon: 'bi-x-circle-fill',
        className: 'bg-danger-subtle text-danger',
    },
    completed: {
        label: 'Selesai',
        icon: 'bi-check2-all',
        className: 'bg-success-subtle text-success',
    },
};

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
        return {};
    }
}

function hasPermission(user, permission) {
    if (user?.role === 'superadmin') return true;

    const permissions = Array.isArray(user?.permissions)
        ? user.permissions
        : [];

    return permissions.includes(permission);
}

function formatDate(value) {
    if (!value) return '-';

    const text = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split('-').map(Number);

        return new Date(year, month - 1, day).toLocaleDateString(
            'id-ID',
            { day: '2-digit', month: 'long', year: 'numeric' }
        );
    }

    const date = new Date(text);

    return Number.isNaN(date.getTime())
        ? text
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
        ? String(value)
        : date.toLocaleString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
}

function errorMessage(error) {
    const data = error?.response?.data;

    if (data?.errors) {
        const firstError = Object.values(data.errors)
            .flat()
            .find(Boolean);

        if (firstError) return String(firstError);
    }

    return data?.message || 'Terjadi kesalahan pada server.';
}

function InfoItem({ label, value, icon = 'bi-info-circle' }) {
    return (
        <div className="h-100 p-3 p-lg-4 bg-light rounded-4">
            <div className="d-flex align-items-start gap-3">
                <div
                    className="bg-white text-danger rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 42, height: 42 }}
                >
                    <i className={`bi ${icon}`} />
                </div>

                <div className="min-w-0 flex-grow-1">
                    <div className="small text-muted mb-1">{label}</div>
                    <div className="fw-bold text-break">
                        {value === null ||
                        value === undefined ||
                        value === ''
                            ? '-'
                            : value}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionCard({ title, subtitle, icon, children }) {
    return (
        <section className="card border-0 shadow-sm rounded-5 mb-4">
            <div className="card-body p-4 p-lg-5">
                <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
                    <div>
                        <h4 className="fw-black mb-1">{title}</h4>
                        {subtitle && (
                            <p className="text-muted mb-0">{subtitle}</p>
                        )}
                    </div>

                    <div
                        className="bg-danger-subtle text-danger rounded-4 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 48, height: 48 }}
                    >
                        <i className={`bi ${icon} fs-5`} />
                    </div>
                </div>

                {children}
            </div>
        </section>
    );
}

function StatusTimeline({ order }) {
    const steps = [
        {
            label: 'Pengajuan Dikirim',
            date: order.created_at,
            icon: 'bi-send-check',
        },
    ];

    if (order.revision_requested_at || order.status === 'revision') {
        steps.push({
            label: 'Diminta Revisi',
            date: order.revision_requested_at,
            icon: 'bi-pencil-square',
        });
    }

    if (order.approved_at) {
        steps.push({
            label: 'Disetujui',
            date: order.approved_at,
            icon: 'bi-check-circle',
        });
    }

    if (order.rejected_at) {
        steps.push({
            label: 'Ditolak',
            date: order.rejected_at,
            icon: 'bi-x-circle',
        });
    }

    if (order.completed_at) {
        steps.push({
            label: 'Selesai',
            date: order.completed_at,
            icon: 'bi-check2-all',
        });
    }

    return (
        <div className="d-flex flex-column gap-3">
            {steps.map((step, index) => (
                <div
                    key={`${step.label}-${index}`}
                    className="d-flex align-items-start gap-3"
                >
                    <div
                        className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 38, height: 38 }}
                    >
                        <i className={`bi ${step.icon}`} />
                    </div>

                    <div>
                        <div className="fw-bold">{step.label}</div>
                        <div className="small text-muted">
                            {formatDateTime(step.date)}
                        </div>
                    </div>
                </div>
            ))}

            {order.status === 'pending' && (
                <div className="alert alert-warning rounded-4 mb-0">
                    Pengajuan sedang menunggu keputusan admin.
                </div>
            )}

            {order.status === 'revision' && (
                <div className="alert alert-info rounded-4 mb-0">
                    Pemohon perlu memperbaiki pengajuan sebelum
                    dapat diperiksa kembali.
                </div>
            )}
        </div>
    );
}

export default function MerchandiseApprovalDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const currentUser = useMemo(() => getCurrentUser(), []);

    const canProcess = hasPermission(
        currentUser,
        'approval.merchandise.process'
    );

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const loadDetail = useCallback(async () => {
        if (!id || !/^\d+$/.test(String(id))) {
            setError('ID pengajuan Merchandise tidak valid.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            // ENDPOINT MERCHANDISE, BUKAN HUMAS
            const response = await api.get(`/orders/${id}`);

            const data = response?.data?.data;

            if (!data) {
                setOrder(null);
                setError('Data pengajuan Merchandise tidak ditemukan.');
                return;
            }

            setOrder(data);
        } catch (err) {
            console.error(
                'Merchandise detail error:',
                err?.response?.data || err
            );

            setOrder(null);
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const status = STATUS_CONFIG[order?.status] || {
        label: order?.status || 'Tidak diketahui',
        icon: 'bi-info-circle',
        className: 'bg-secondary-subtle text-secondary',
    };

    const processAction = async (action, payload, successTitle) => {
        if (!canProcess) {
            await showErrorAlert(
                'Akses Ditolak',
                'Akun kamu tidak memiliki izin memproses pengajuan Merchandise.'
            );
            return;
        }

        if (!order) return;

        try {
            setProcessing(true);

            showLoadingAlert(
                'Memproses Pengajuan',
                'Permintaan sedang diproses.'
            );

            const response = await api.put(
                `/orders/${id}/${action}`,
                payload
            );

            closeAlert();

            await showSuccessAlert(
                successTitle,
                response?.data?.message ||
                    'Pengajuan berhasil diproses.'
            );

            await loadDetail();
        } catch (err) {
            closeAlert();

            console.error(
                `Merchandise ${action} error:`,
                err?.response?.data || err
            );

            await showErrorAlert(
                'Proses Gagal',
                errorMessage(err)
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleApprove = async () => {
        if (order?.status !== 'pending') return;

        const confirmation = await showConfirmAlert({
            title: 'Setujui Pengajuan Merchandise?',
            text: 'Pastikan data pemohon, produk, dan stok sudah sesuai.',
            confirmButtonText: 'Ya, Setujui',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!confirmation.isConfirmed) return;

        await processAction(
            'approve',
            {},
            'Pengajuan Disetujui'
        );
    };

    const handleRevision = async () => {
        if (order?.status !== 'pending') return;

        const result = await showTextareaAlert({
            title: 'Minta Revisi Pengajuan?',
            text: 'Tuliskan bagian yang perlu diperbaiki oleh pemohon.',
            inputLabel: 'Catatan Revisi',
            inputPlaceholder: 'Contoh: Mohon perbaiki data tamu...',
            confirmButtonText: 'Kirim Revisi',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#d97706',
            minimumLength: 5,
            maximumLength: 2000,
        });

        if (!result.isConfirmed || !result.value?.trim()) return;

        await processAction(
            'revision',
            { admin_note: result.value.trim() },
            'Permintaan Revisi Terkirim'
        );
    };

    const handleReject = async () => {
        if (order?.status !== 'pending') return;

        const result = await showTextareaAlert({
            title: 'Tolak Pengajuan Merchandise?',
            text: 'Masukkan alasan penolakan yang akan diterima pemohon.',
            inputLabel: 'Alasan Penolakan',
            inputPlaceholder: 'Tuliskan alasan penolakan...',
            confirmButtonText: 'Ya, Tolak',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#dc2626',
            minimumLength: 5,
            maximumLength: 2000,
        });

        if (!result.isConfirmed || !result.value?.trim()) return;

        await processAction(
            'reject',
            { admin_note: result.value.trim() },
            'Pengajuan Ditolak'
        );
    };

    const handleComplete = async () => {
        if (order?.status !== 'approved') return;

        const confirmation = await showConfirmAlert({
            title: 'Selesaikan Pengajuan Merchandise?',
            text: 'Pastikan merchandise sudah diserahkan dan administrasi selesai.',
            confirmButtonText: 'Ya, Selesaikan',
            cancelButtonText: 'Batal',
            icon: 'question',
            confirmButtonColor: '#16a34a',
        });

        if (!confirmation.isConfirmed) return;

        await processAction(
            'complete',
            {},
            'Pengajuan Selesai'
        );
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-danger mb-3" />
                    <h5 className="fw-bold">Memuat Detail Merchandise</h5>
                    <p className="text-muted mb-0">
                        Sedang mengambil data pengajuan.
                    </p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div
                        className="mx-auto mb-3 rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                        style={{ width: 84, height: 84 }}
                    >
                        <i className="bi bi-exclamation-triangle-fill fs-1" />
                    </div>

                    <h4 className="fw-black mb-2">
                        Detail Gagal Dimuat
                    </h4>

                    <p className="text-muted mb-4">
                        {error || 'Data pengajuan tidak ditemukan.'}
                    </p>

                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill"
                            onClick={loadDetail}
                        >
                            <i className="bi bi-arrow-clockwise me-2" />
                            Coba Lagi
                        </button>

                        <button
                            type="button"
                            className="btn btn-danger rounded-pill"
                            onClick={() => navigate('/admin/orders')}
                        >
                            <i className="bi bi-arrow-left me-2" />
                            Kembali ke Approval Merchandise
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const items = Array.isArray(order.items)
        ? order.items
        : [];

    const totalQuantity = items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    const proofUrl =
        order.proof_file_url ||
        order.proof_url ||
        order.attachment_url ||
        null;

    const revisionHistories = Array.isArray(order.revision_histories)
        ? order.revision_histories
        : Array.isArray(order.revisionHistories)
          ? order.revisionHistories
          : [];

    return (
        <div className="container-fluid px-0">
            <header className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                    <Link
                        to="/admin/orders"
                        className="text-danger fw-bold text-decoration-none d-inline-flex align-items-center gap-2 mb-3"
                    >
                        <i className="bi bi-arrow-left" />
                        Kembali ke Approval Merchandise
                    </Link>

                    <h2 className="fw-black mb-2">
                        Detail Pengajuan Merchandise
                    </h2>

                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-bold text-muted">
                            {order.order_code || `#${order.id}`}
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
                    <div className="small text-muted">Tanggal Pengajuan</div>
                    <div className="fw-bold">
                        {formatDateTime(order.created_at)}
                    </div>
                </div>
            </header>

            {!canProcess && (
                <div className="alert alert-info rounded-4 border-0 mb-4">
                    <i className="bi bi-eye-fill me-2" />
                    Kamu dapat melihat detail pengajuan, tetapi tidak
                    memiliki izin memproses approval.
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <SectionCard
                        title="Informasi Pengajuan"
                        subtitle="Detail kegiatan dan kebutuhan merchandise."
                        icon="bi-calendar-event"
                    >
                        <div className="row g-3">
                            <div className="col-md-6">
                                <InfoItem
                                    label="Nama Kegiatan"
                                    value={order.event_name}
                                    icon="bi-calendar-event"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Tanggal Kegiatan"
                                    value={formatDate(order.activity_date)}
                                    icon="bi-calendar3"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Instansi / Perusahaan"
                                    value={order.institution_name}
                                    icon="bi-buildings"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Tanggal Pengambilan"
                                    value={formatDate(
                                        order.pickup_date ||
                                            order.collection_date
                                    )}
                                    icon="bi-calendar-check"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Nama Tamu"
                                    value={order.guest_name}
                                    icon="bi-person-badge"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Jabatan Tamu"
                                    value={order.guest_position}
                                    icon="bi-person-vcard"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Nama PIC"
                                    value={
                                        order.pic_name ||
                                        order.user?.name
                                    }
                                    icon="bi-person"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Kontak PIC"
                                    value={order.pic_phone}
                                    icon="bi-telephone"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Pemohon"
                                    value={order.user?.name}
                                    icon="bi-person-circle"
                                />
                            </div>

                            <div className="col-md-6">
                                <InfoItem
                                    label="Email Pemohon"
                                    value={order.user?.email}
                                    icon="bi-envelope"
                                />
                            </div>
                        </div>

                        {(order.reason ||
                            order.purpose ||
                            order.notes) && (
                            <div className="bg-light p-4 rounded-4 mt-3">
                                <div className="small text-muted fw-bold mb-2">
                                    Alasan / Catatan Pengajuan
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {order.reason ||
                                        order.purpose ||
                                        order.notes}
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Daftar Merchandise"
                        subtitle="Produk dan jumlah barang yang diajukan."
                        icon="bi-gift-fill"
                    >
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="bg-danger-subtle text-danger rounded-4 p-3">
                                <i className="bi bi-box-seam fs-3" />
                            </div>

                            <div>
                                <div className="small text-muted">
                                    Total Merchandise
                                </div>
                                <div className="fs-4 fw-black">
                                    {totalQuantity} item
                                </div>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="alert alert-warning rounded-4 mb-0">
                                Tidak ada detail produk pada respons API.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>Produk</th>
                                            <th>Kategori</th>
                                            <th className="text-center">
                                                Jumlah
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td>
                                                    <div className="fw-bold">
                                                        {item.product?.name ||
                                                            item.product_name ||
                                                            `Produk #${item.product_id}`}
                                                    </div>
                                                    {item.product?.sku && (
                                                        <small className="text-muted">
                                                            {item.product.sku}
                                                        </small>
                                                    )}
                                                </td>

                                                <td>
                                                    {item.product?.category
                                                        ?.name || '-'}
                                                </td>

                                                <td className="text-center">
                                                    <span className="badge bg-light text-dark border rounded-pill px-3 py-2">
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Bukti dan Lampiran"
                        subtitle="Dokumen pendukung pengajuan Merchandise."
                        icon="bi-file-earmark-check"
                    >
                        {proofUrl ? (
                            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap p-3 rounded-4 border bg-light">
                                <div className="d-flex align-items-center gap-3">
                                    <i className="bi bi-file-earmark-pdf text-danger fs-2" />
                                    <div>
                                        <div className="fw-bold">
                                            {order.proof_file_name ||
                                                order.proof_name ||
                                                'Bukti Pengajuan'}
                                        </div>
                                        <div className="small text-muted">
                                            Dokumen Pendukung
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={proofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-danger rounded-pill"
                                >
                                    <i className="bi bi-eye me-2" />
                                    Lihat Bukti
                                </a>
                            </div>
                        ) : (
                            <div className="alert alert-light border rounded-4 mb-0">
                                URL lampiran belum tersedia pada data
                                pengajuan yang diterima.
                            </div>
                        )}
                    </SectionCard>

                    {(order.admin_note || revisionHistories.length > 0) && (
                        <SectionCard
                            title="Catatan dan Riwayat Revisi"
                            subtitle="Catatan admin serta perubahan pengajuan."
                            icon="bi-journal-text"
                        >
                            {order.admin_note && (
                                <div className="alert alert-warning rounded-4">
                                    <div className="fw-bold mb-2">
                                        Catatan Admin
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>
                                        {order.admin_note}
                                    </div>
                                </div>
                            )}

                            {revisionHistories.map((history, index) => (
                                <div
                                    key={history.id || index}
                                    className="border rounded-4 p-3 mb-2"
                                >
                                    <div className="fw-bold">
                                        Revisi #{index + 1}
                                    </div>
                                    <div className="small text-muted mb-2">
                                        {formatDateTime(
                                            history.requested_at ||
                                                history.created_at
                                        )}
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>
                                        {history.revision_note || '-'}
                                    </div>
                                </div>
                            ))}
                        </SectionCard>
                    )}
                </div>

                <div className="col-xl-4">
                    <div
                        className="position-sticky"
                        style={{ top: 100 }}
                    >
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Status Pengajuan
                                </h4>
                                <p className="text-muted mb-4">
                                    Riwayat proses Merchandise.
                                </p>

                                <StatusTimeline order={order} />
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Tindakan Admin
                                </h4>
                                <p className="small text-muted mb-4">
                                    Proses pengajuan sesuai status.
                                </p>

                                {!canProcess ? (
                                    <div className="alert alert-secondary rounded-4 mb-0">
                                        Akun hanya memiliki izin melihat.
                                    </div>
                                ) : (
                                    <>
                                        {order.status === 'pending' && (
                                            <div className="d-grid gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary rounded-pill"
                                                    disabled={processing}
                                                    onClick={handleApprove}
                                                >
                                                    <i className="bi bi-check-lg me-2" />
                                                    Setujui
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-warning rounded-pill"
                                                    disabled={processing}
                                                    onClick={handleRevision}
                                                >
                                                    <i className="bi bi-pencil-square me-2" />
                                                    Minta Revisi
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    disabled={processing}
                                                    onClick={handleReject}
                                                >
                                                    <i className="bi bi-x-lg me-2" />
                                                    Tolak Pengajuan
                                                </button>
                                            </div>
                                        )}

                                        {order.status === 'approved' && (
                                            <div className="d-grid gap-3">
                                                <div className="alert alert-primary rounded-4 mb-0">
                                                    Pengajuan sudah disetujui.
                                                    Pastikan proses penyerahan
                                                    merchandise selesai.
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-success rounded-pill"
                                                    disabled={processing}
                                                    onClick={handleComplete}
                                                >
                                                    <i className="bi bi-check2-all me-2" />
                                                    Tandai Selesai
                                                </button>
                                            </div>
                                        )}

                                        {order.status === 'revision' && (
                                            <div className="alert alert-info rounded-4 mb-0">
                                                Menunggu pengajuan ulang
                                                dari pemohon.
                                            </div>
                                        )}

                                        {['rejected', 'completed'].includes(
                                            order.status
                                        ) && (
                                            <div className="alert alert-light border rounded-4 mb-0">
                                                Tidak ada tindakan lanjutan.
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
