import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { showErrorAlert, showWarningAlert } from '../../utils/sweetAlert';

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

export default function MyRequestDetailPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();

    const isMerchandise = type === 'merchandise';
    const isBorrowing = type === 'borrowing';

    const [requestData, setRequestData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDetail = async () => {
        if (!isMerchandise && !isBorrowing) {
            navigate('/admin/my-requests');
            return;
        }

        try {
            setLoading(true);

            const endpoint = isMerchandise
                ? `/orders/${id}`
                : `/borrow-requests/${id}`;

            const response = await api.get(endpoint);
            setRequestData(response.data.data || null);
        } catch (error) {
            console.error('Fetch my request detail error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Detail',
                error.response?.data?.message || 'Detail pengajuan gagal dimuat.'
            );

            navigate('/admin/my-requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [type, id]);

    const handleCannotResubmit = () => {
        showWarningAlert(
            'Tidak Bisa Diajukan Ulang',
            'Pengajuan hanya bisa diajukan ulang saat status revisi.'
        );
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className={`spinner-border ${isBorrowing ? 'text-success' : 'text-primary'} mb-3`} />
                    <p className="text-muted mb-0">Memuat detail pengajuan...</p>
                </div>
            </div>
        );
    }

    if (!requestData) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h5 className="fw-black mb-3">Data tidak ditemukan</h5>
                    <Link to="/admin/my-requests" className="btn btn-primary rounded-pill">
                        Kembali ke Riwayat
                    </Link>
                </div>
            </div>
        );
    }

    const themeColor = isBorrowing ? 'success' : 'primary';
    const title = isBorrowing
        ? requestData.purpose
        : requestData.event_name;
    const code = isBorrowing
        ? requestData.borrow_code
        : requestData.order_code;

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background: isBorrowing
                        ? 'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))'
                        : 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className={`badge rounded-pill text-bg-light text-${themeColor} px-3 py-2 mb-3`}>
                                Detail {isBorrowing ? 'Peminjaman' : 'Merchandise'}
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                {title || 'Detail Pengajuan'}
                            </h1>

                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <span className={`badge rounded-pill text-bg-${themeColor}`}>
                                    {code || '-'}
                                </span>

                                <span className={`status status-${requestData.status}`}>
                                    {requestData.status}
                                </span>

                                <span className={`badge rounded-pill text-bg-light text-${themeColor}`}>
                                    Submit: {formatDateTime(requestData.submitted_at || requestData.created_at)}
                                </span>
                            </div>
                        </div>

                        <Link to="/admin/my-requests" className="btn btn-light rounded-pill">
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
                            <h4 className="fw-black mb-1">
                                {isBorrowing ? 'Informasi Peminjaman' : 'Informasi Kegiatan'}
                            </h4>

                            <p className="text-muted mb-4">
                                Detail data yang kamu kirimkan pada pengajuan ini.
                            </p>

                            {isMerchandise && (
                                <div className="row g-3">
                                    <div className="col-md-6 col-xl-3">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Nama Kegiatan</div>
                                            <div className="fw-bold">{requestData.event_name || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6 col-xl-3">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Instansi</div>
                                            <div className="fw-bold">{requestData.institution_name || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6 col-xl-3">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Nama Tamu</div>
                                            <div className="fw-bold">{requestData.guest_name || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6 col-xl-3">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Jabatan Tamu</div>
                                            <div className="fw-bold">{requestData.guest_position || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Tanggal Kegiatan</div>
                                            <div className="fw-bold">{formatDate(requestData.activity_date)}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Lampiran</div>
                                            {requestData.proof_file_url ? (
                                                <a
                                                    href={requestData.proof_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="fw-bold"
                                                >
                                                    {requestData.proof_file_name || 'Buka file lampiran'}
                                                </a>
                                            ) : (
                                                <div className="fw-bold">Tidak tersedia</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isBorrowing && (
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Tanggal Pinjam</div>
                                            <div className="fw-bold">{formatDate(requestData.borrow_date)}</div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Tanggal Kembali</div>
                                            <div className="fw-bold">{formatDate(requestData.return_date)}</div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="p-3 rounded-4 bg-light h-100">
                                            <div className="small text-muted">Keperluan</div>
                                            <div className="fw-bold" style={{ lineHeight: 1.7 }}>
                                                {requestData.purpose || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <h4 className="fw-black mb-1">
                                {isBorrowing ? 'Item Barang' : 'Item Merchandise'}
                            </h4>

                            <p className="text-muted mb-4">
                                Daftar item yang termasuk dalam pengajuan ini.
                            </p>

                            <div className="table-responsive rounded-4 border">
                                <table className="table align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Item</th>
                                            <th>Kategori</th>
                                            <th className="text-end">Qty</th>
                                            <th className="text-end">Stok Saat Ini</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {requestData.items?.map((item) => (
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
                                {isMerchandise && (
                                    <div className="col-md-6">
                                        <div className="p-3 rounded-4 border h-100">
                                            <div className="small fw-bold text-muted mb-1">
                                                Catatan Pengajuan
                                            </div>
                                            <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                                {requestData.user_note || '-'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className={isMerchandise ? 'col-md-6' : 'col-12'}>
                                    <div className="p-3 rounded-4 border h-100">
                                        <div className="small fw-bold text-muted mb-1">
                                            Catatan Admin
                                        </div>
                                        <p className="mb-0 text-muted" style={{ lineHeight: 1.7 }}>
                                            {requestData.admin_note || 'Belum ada catatan admin.'}
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
                            <h4 className="fw-black mb-1">Aksi Pengajuan</h4>
                            <p className="text-muted mb-4">
                                Aksi yang tersedia berdasarkan status pengajuan.
                            </p>

                            {requestData.status === 'revision' ? (
                                <Link
                                    to={`/admin/my-requests/${type}/${id}/resubmit`}
                                    className="btn btn-warning rounded-pill text-white w-100"
                                >
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Perbaiki & Ajukan Ulang
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill w-100"
                                    onClick={handleCannotResubmit}
                                >
                                    <i className="bi bi-info-circle me-2"></i>
                                    Ajukan ulang hanya saat revisi
                                </button>
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
                                        {formatDateTime(requestData.submitted_at || requestData.created_at)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Approved</div>
                                    <div className="fw-bold">
                                        {formatDateTime(requestData.approved_at)}
                                    </div>
                                </div>

                                {isBorrowing && (
                                    <>
                                        <div className="p-3 rounded-4 bg-light">
                                            <div className="small text-muted">Borrowed</div>
                                            <div className="fw-bold">
                                                {formatDateTime(requestData.borrowed_at)}
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-4 bg-light">
                                            <div className="small text-muted">Returned</div>
                                            <div className="fw-bold">
                                                {formatDateTime(requestData.returned_at)}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isMerchandise && (
                                    <div className="p-3 rounded-4 bg-light">
                                        <div className="small text-muted">Completed</div>
                                        <div className="fw-bold">
                                            {formatDateTime(requestData.completed_at)}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 rounded-4 bg-light">
                                    <div className="small text-muted">Rejected</div>
                                    <div className="fw-bold">
                                        {formatDateTime(requestData.rejected_at)}
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