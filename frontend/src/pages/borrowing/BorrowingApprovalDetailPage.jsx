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

export default function BorrowingApprovalDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [borrowRequest, setBorrowRequest] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchBorrowRequest = async () => {
        try {
            setLoading(true);

            const response = await api.get(`/borrow-requests/${id}`);
            setBorrowRequest(response.data.data || null);
        } catch (error) {
            console.error('Fetch borrowing detail error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Detail',
                error.response?.data?.message || 'Detail pengajuan peminjaman gagal dimuat.'
            );

            navigate('/admin/borrow-requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBorrowRequest();
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
            title: 'Approve Peminjaman?',
            text: `Pengajuan ${borrowRequest.borrow_code} akan disetujui dan stok barang akan dikurangi.`,
            confirmButtonText: 'Ya, approve',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Memproses Approval', 'Mohon tunggu sebentar.');

            await api.put(`/borrow-requests/${borrowRequest.id}/approve`);

            closeAlert();

            await showSuccessAlert(
                'Approval Berhasil',
                'Pengajuan peminjaman berhasil di-approve.'
            );

            fetchBorrowRequest();
        } catch (error) {
            console.error('Approve borrowing error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Approval Gagal',
                getBackendErrorMessage(error, 'Pengajuan peminjaman gagal di-approve.')
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
            text: `Catatan revisi akan dikirim untuk pengajuan ${borrowRequest.borrow_code}.`,
            confirmButtonText: 'Ya, kirim revisi',
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Mengirim Revisi', 'Mohon tunggu sebentar.');

            await api.put(`/borrow-requests/${borrowRequest.id}/revision`, {
                admin_note: adminNote,
            });

            closeAlert();

            await showSuccessAlert(
                'Revisi Terkirim',
                'Catatan revisi berhasil dikirim.'
            );

            setAdminNote('');
            fetchBorrowRequest();
        } catch (error) {
            console.error('Revision borrowing error:', error.response?.data || error);

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
            title: 'Tolak Peminjaman?',
            text: `Pengajuan ${borrowRequest.borrow_code} akan ditolak.`,
            confirmButtonText: 'Ya, tolak',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Menolak Pengajuan', 'Mohon tunggu sebentar.');

            await api.put(`/borrow-requests/${borrowRequest.id}/reject`, {
                admin_note: adminNote,
            });

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Ditolak',
                'Pengajuan peminjaman berhasil ditolak.'
            );

            setAdminNote('');
            fetchBorrowRequest();
        } catch (error) {
            console.error('Reject borrowing error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Penolakan Gagal',
                getBackendErrorMessage(error, 'Pengajuan peminjaman gagal ditolak.')
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleBorrowed = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Tandai Dipinjam?',
            text: `Barang pada pengajuan ${borrowRequest.borrow_code} akan ditandai sudah diambil/dipinjam.`,
            confirmButtonText: 'Ya, tandai dipinjam',
            icon: 'question',
            confirmButtonColor: '#0f766e',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Memproses Data', 'Mohon tunggu sebentar.');

            await api.put(`/borrow-requests/${borrowRequest.id}/borrowed`);

            closeAlert();

            await showSuccessAlert(
                'Berhasil',
                'Barang berhasil ditandai sudah dipinjam.'
            );

            fetchBorrowRequest();
        } catch (error) {
            console.error('Borrowed action error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Proses Gagal',
                getBackendErrorMessage(error, 'Barang gagal ditandai dipinjam.')
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleReturned = async () => {
        const confirmation = await showConfirmAlert({
            title: 'Tandai Dikembalikan?',
            text: `Barang pada pengajuan ${borrowRequest.borrow_code} akan ditandai sudah dikembalikan dan stok akan bertambah kembali.`,
            confirmButtonText: 'Ya, tandai kembali',
            icon: 'question',
            confirmButtonColor: '#0f766e',
        });

        if (!confirmation.isConfirmed) return;

        try {
            setProcessing(true);
            showLoadingAlert('Memproses Pengembalian', 'Mohon tunggu sebentar.');

            await api.put(`/borrow-requests/${borrowRequest.id}/returned`);

            closeAlert();

            await showSuccessAlert(
                'Berhasil',
                'Barang berhasil ditandai sudah dikembalikan.'
            );

            fetchBorrowRequest();
        } catch (error) {
            console.error('Returned action error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Proses Gagal',
                getBackendErrorMessage(error, 'Barang gagal ditandai dikembalikan.')
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-success mb-3" />
                    <p className="text-muted mb-0">Memuat detail pengajuan...</p>
                </div>
            </div>
        );
    }

    if (!borrowRequest) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h5 className="fw-black mb-3">Data tidak ditemukan</h5>
                    <Link to="/admin/borrow-requests" className="btn btn-success rounded-pill">
                        Kembali ke Approval Peminjaman
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
                        'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-success px-3 py-2 mb-3">
                                Detail Approval Peminjaman
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {borrowRequest.purpose || 'Pengajuan Peminjaman'}
                            </h1>

                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className="badge rounded-pill text-bg-success">
                                    {borrowRequest.borrow_code}
                                </span>

                                <span className={`status status-${borrowRequest.status}`}>
                                    {borrowRequest.status}
                                </span>

                                <span className="badge rounded-pill text-bg-light text-success">
                                    Submit: {formatDateTime(borrowRequest.submitted_at || borrowRequest.created_at)}
                                </span>
                            </div>
                        </div>

                        <Link to="/admin/borrow-requests" className="btn btn-light rounded-pill">
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
                            <h4 className="fw-black mb-1">Informasi Peminjaman</h4>
                            <p className="text-muted mb-4">
                                Detail pemohon, tanggal, dan keperluan peminjaman.
                            </p>

                            <div className="row g-3">
                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Pemohon</div>
                                        <div className="fw-bold">{borrowRequest.user?.name || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Tanggal Pinjam</div>
                                        <div className="fw-bold">{formatDate(borrowRequest.borrow_date)}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Tanggal Kembali</div>
                                        <div className="fw-bold">{formatDate(borrowRequest.return_date)}</div>
                                    </div>
                                </div>

                                <div className="col-md-6 col-xl-3">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Kode</div>
                                        <div className="fw-bold">{borrowRequest.borrow_code || '-'}</div>
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="p-3 rounded-4 bg-light h-100">
                                        <div className="small text-muted">Keperluan</div>
                                        <div className="fw-bold" style={{ lineHeight: 1.7 }}>
                                            {borrowRequest.purpose || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">Item Barang</h4>
                            <p className="text-muted mb-4">
                                Daftar barang yang diajukan untuk dipinjam.
                            </p>

                            <div className="table-responsive rounded-4 border">
                                <table className="table align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Barang</th>
                                            <th>Kategori</th>
                                            <th className="text-end">Qty</th>
                                            <th className="text-end">Stok Saat Ini</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {borrowRequest.items?.map((item) => (
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

                            <div className="p-3 rounded-4 border h-100">
                                <div className="small fw-bold text-muted mb-1">
                                    Catatan Admin Terakhir
                                </div>
                                <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                    {borrowRequest.admin_note || 'Belum ada catatan admin.'}
                                </p>
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

                            {borrowRequest.status === 'pending' && (
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

                            {borrowRequest.status === 'approved' && (
                                <>
                                    <div className="p-3 rounded-4 bg-success-subtle mb-3">
                                        <div className="fw-black text-success">
                                            Peminjaman sudah disetujui
                                        </div>
                                        <div className="small text-muted">
                                            Tandai dipinjam jika barang sudah diambil pemohon.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-success rounded-pill w-100"
                                        onClick={handleBorrowed}
                                        disabled={processing}
                                    >
                                        <i className="bi bi-box-arrow-up me-2"></i>
                                        Tandai Dipinjam
                                    </button>
                                </>
                            )}

                            {borrowRequest.status === 'borrowed' && (
                                <>
                                    <div className="p-3 rounded-4 bg-warning-subtle mb-3">
                                        <div className="fw-black text-warning-emphasis">
                                            Barang sedang dipinjam
                                        </div>
                                        <div className="small text-muted">
                                            Tandai dikembalikan jika barang sudah kembali. Stok akan bertambah otomatis.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-success rounded-pill w-100"
                                        onClick={handleReturned}
                                        disabled={processing}
                                    >
                                        <i className="bi bi-box-arrow-in-down me-2"></i>
                                        Tandai Dikembalikan
                                    </button>
                                </>
                            )}

                            {['revision', 'rejected', 'returned'].includes(borrowRequest.status) && (
                                <div className="p-3 rounded-4 bg-light border">
                                    <div className="fw-black mb-1">Tidak ada aksi</div>
                                    <p className="text-muted mb-0" style={{ lineHeight: 1.7 }}>
                                        Pengajuan ini berada pada status{' '}
                                        <strong>{borrowRequest.status}</strong>. Tidak ada aksi tambahan
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
                                        {formatDateTime(borrowRequest.submitted_at || borrowRequest.created_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Approved</div>
                                    <div className="fw-bold">
                                        {formatDateTime(borrowRequest.approved_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Borrowed</div>
                                    <div className="fw-bold">
                                        {formatDateTime(borrowRequest.borrowed_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Returned</div>
                                    <div className="fw-bold">
                                        {formatDateTime(borrowRequest.returned_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Rejected</div>
                                    <div className="fw-bold">
                                        {formatDateTime(borrowRequest.rejected_at)}
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