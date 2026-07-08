import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatDateTime = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function MerchandiseApprovalDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchOrder = async () => {
        try {
            setLoading(true);

            const response = await api.get(`/orders/${id}`);
            setOrder(response.data.data || null);
        } catch (error) {
            console.error('Fetch merchandise detail error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Detail',
                error.response?.data?.message || 'Detail pengajuan merchandise gagal dimuat.'
            );

            navigate('/admin/orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const getBackendErrorMessage = (error, fallbackMessage) => {
        const responseData = error.response?.data;

        if (responseData?.errors) {
            const firstError = Object.values(responseData.errors)?.[0]?.[0];

            if (firstError) {
                return firstError;
            }
        }

        if (responseData?.message) {
            return responseData.message;
        }

        return fallbackMessage;
    };

    const handleApprove = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Approve Pengajuan?',
            text: `Pengajuan ${order.order_code} akan disetujui dan stok merchandise akan dikurangi.`,
            confirmButtonText: 'Ya, approve',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Memproses Approval', 'Mohon tunggu sebentar.');

            await api.put(`/orders/${order.id}/approve`);

            closeAlert();

            await showSuccessAlert(
                'Approval Berhasil',
                'Pengajuan merchandise berhasil di-approve.'
            );

            fetchOrder();
        } catch (error) {
            console.error('Approve merchandise error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Approval Gagal',
                getBackendErrorMessage(error, 'Pengajuan merchandise gagal di-approve.')
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleRevision = async () => {
        if (!adminNote.trim()) {
            showErrorAlert(
                'Catatan Wajib Diisi',
                'Isi catatan revisi terlebih dahulu sebelum mengirim revisi.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Kirim Revisi?',
            text: `Catatan revisi akan dikirim untuk pengajuan ${order.order_code}.`,
            confirmButtonText: 'Ya, kirim revisi',
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Mengirim Revisi', 'Mohon tunggu sebentar.');

            await api.put(`/orders/${order.id}/revision`, {
                admin_note: adminNote,
            });

            closeAlert();

            await showSuccessAlert(
                'Revisi Terkirim',
                'Catatan revisi berhasil dikirim.'
            );

            setAdminNote('');
            fetchOrder();
        } catch (error) {
            console.error('Revision merchandise error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Revisi Gagal',
                getBackendErrorMessage(error, 'Catatan revisi gagal dikirim.')
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!adminNote.trim()) {
            showErrorAlert(
                'Catatan Wajib Diisi',
                'Isi alasan penolakan terlebih dahulu sebelum menolak pengajuan.'
            );
            return;
        }

        const confirmation = await showConfirmAlert({
            title: 'Tolak Pengajuan?',
            text: `Pengajuan ${order.order_code} akan ditolak.`,
            confirmButtonText: 'Ya, tolak',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Menolak Pengajuan', 'Mohon tunggu sebentar.');

            await api.put(`/orders/${order.id}/reject`, {
                admin_note: adminNote,
            });

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Ditolak',
                'Pengajuan merchandise berhasil ditolak.'
            );

            setAdminNote('');
            fetchOrder();
        } catch (error) {
            console.error('Reject merchandise error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Penolakan Gagal',
                getBackendErrorMessage(error, 'Pengajuan merchandise gagal ditolak.')
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleComplete = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Tandai Selesai?',
            text: `Pengajuan ${order.order_code} akan ditandai selesai.`,
            confirmButtonText: 'Ya, selesai',
            icon: 'question',
            confirmButtonColor: '#0f766e',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Memproses Data', 'Mohon tunggu sebentar.');

            await api.put(`/orders/${order.id}/complete`);

            closeAlert();

            await showSuccessAlert(
                'Berhasil',
                'Pengajuan merchandise berhasil ditandai selesai.'
            );

            fetchOrder();
        } catch (error) {
            console.error('Complete merchandise error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Proses Gagal',
                getBackendErrorMessage(error, 'Pengajuan gagal ditandai selesai.')
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
                    <p className="text-muted mb-0">Memuat detail pengajuan...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h5 className="fw-black mb-3">Data tidak ditemukan</h5>
                    <Link to="/admin/orders" className="btn btn-primary rounded-pill">
                        Kembali ke Approval Merchandise
                    </Link>
                </div>
            </div>
        );
    }

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
                                {order.event_name || 'Pengajuan Merchandise'}
                            </h1>

                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="badge rounded-pill text-bg-primary">
                                    {order.order_code}
                                </span>

                                <span className={`status status-${order.status}`}>
                                    {order.status}
                                </span>

                                <span className="badge rounded-pill text-bg-light text-primary">
                                    Submit: {formatDateTime(order.submitted_at || order.created_at)}
                                </span>
                            </div>
                        </div>

                        <Link to="/admin/orders" className="btn btn-light rounded-pill">
                            <i className="bi bi-arrow-left me-2"></i>
                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            <div className="row g-4">
                <div className="col-xl-8">
                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">Informasi Kegiatan</h4>
                            <p className="text-muted mb-4">
                                Detail kegiatan dan tamu dari pemohon.
                            </p>

                            <div className="row g-3">
                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Pemohon</div>
                                        <div className="fw-bold">{order.user?.name || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Instansi</div>
                                        <div className="fw-bold">{order.institution_name || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Nama Tamu</div>
                                        <div className="fw-bold">{order.guest_name || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Jabatan Tamu</div>
                                        <div className="fw-bold">{order.guest_position || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Tanggal Kegiatan</div>
                                        <div className="fw-bold">{formatDate(order.activity_date)}</div>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Lampiran</div>
                                        {order.proof_file_url ? (
                                            <a
                                                href={order.proof_file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="fw-bold"
                                            >
                                                {order.proof_file_name || 'Buka file lampiran'}
                                            </a>
                                        ) : (
                                            <div className="fw-bold">Tidak tersedia</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">Item Merchandise</h4>
                            <p className="text-muted mb-4">
                                Daftar merchandise yang diajukan.
                            </p>

                            <div className="table-responsive rounded-4 border">
                                <table className="table align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Merchandise</th>
                                            <th>Kategori</th>
                                            <th className="text-end">Qty</th>
                                            <th className="text-end">Stok Saat Ini</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {order.items?.map((item) => (
                                            <tr key={item.id}>
                                                <td className="fw-bold">
                                                    {item.product?.name || '-'}
                                                </td>
                                                <td>{item.product?.category?.name || '-'}</td>
                                                <td className="text-end fw-bold">
                                                    {item.quantity}
                                                </td>
                                                <td className="text-end">
                                                    {item.product?.stock ?? '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-3">Catatan</h4>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 border h-100">
                                        <div className="small fw-bold text-muted mb-1">
                                            Catatan Pemohon
                                        </div>
                                        <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                            {order.user_note || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="p-3 rounded-4 border h-100">
                                        <div className="small fw-bold text-muted mb-1">
                                            Catatan Admin Terakhir
                                        </div>
                                        <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                            {order.admin_note || 'Belum ada catatan admin.'}
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
                            <h4 className="fw-black mb-1">Aksi Approval</h4>
                            <p className="text-muted mb-4">
                                Proses pengajuan berdasarkan status saat ini.
                            </p>

                            {order.status === 'pending' && (
                                <>
                                    <label className="form-label fw-bold">
                                        Catatan Admin
                                    </label>

                                    <textarea
                                        className="form-control rounded-4 mb-3"
                                        rows="5"
                                        placeholder="Isi catatan jika ingin revisi atau menolak pengajuan..."
                                        value={adminNote}
                                        onChange={(event) => setAdminNote(event.target.value)}
                                        disabled={processing}
                                    />

                                    <div className="d-grid gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary rounded-pill"
                                            onClick={handleApprove}
                                            disabled={processing}
                                        >
                                            <i className="bi bi-check-lg me-2"></i>
                                            Approve
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-warning rounded-pill text-white"
                                            onClick={handleRevision}
                                            disabled={processing}
                                        >
                                            <i className="bi bi-pencil-square me-2"></i>
                                            Revisi
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-danger rounded-pill"
                                            onClick={handleReject}
                                            disabled={processing}
                                        >
                                            <i className="bi bi-x-lg me-2"></i>
                                            Tolak
                                        </button>
                                    </div>
                                </>
                            )}

                            {order.status === 'approved' && (
                                <>
                                    <div className="p-3 rounded-4 bg-primary-subtle mb-3">
                                        <div className="fw-black text-primary">
                                            Pengajuan sudah disetujui
                                        </div>
                                        <div className="small text-muted">
                                            Tandai selesai jika merchandise sudah diproses atau diserahkan.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-success rounded-pill w-100"
                                        onClick={handleComplete}
                                        disabled={processing}
                                    >
                                        <i className="bi bi-patch-check-fill me-2"></i>
                                        Tandai Selesai
                                    </button>
                                </>
                            )}

                            {['revision', 'rejected', 'completed'].includes(order.status) && (
                                <div className="p-3 rounded-4 bg-light border">
                                    <div className="fw-black mb-1">Tidak ada aksi</div>
                                    <p className="text-muted mb-0" style={{ lineHeight: 1.7 }}>
                                        Pengajuan ini berada pada status{' '}
                                        <strong>{order.status}</strong>. Tidak ada aksi tambahan
                                        yang diperlukan dari halaman approval.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-3">Timeline Status</h4>

                            <div className="d-flex flex-column gap-3">
                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Submitted</div>
                                    <div className="fw-bold">
                                        {formatDateTime(order.submitted_at || order.created_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Approved</div>
                                    <div className="fw-bold">
                                        {formatDateTime(order.approved_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Rejected</div>
                                    <div className="fw-bold">
                                        {formatDateTime(order.rejected_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Completed</div>
                                    <div className="fw-bold">
                                        {formatDateTime(order.completed_at)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}