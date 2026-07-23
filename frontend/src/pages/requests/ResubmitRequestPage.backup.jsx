import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const toInputDate = (date) => {
    if (!date) return '';
    return String(date).slice(0, 10);
};

const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export default function ResubmitRequestPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();

    const isMerchandise = type === 'merchandise';
    const isBorrowing = type === 'borrowing';

    const [requestData, setRequestData] = useState(null);
    const [products, setProducts] = useState([]);
    const [items, setItems] = useState([]);
    const [proofFile, setProofFile] = useState(null);

    const [merchandiseForm, setMerchandiseForm] = useState({
        event_name: '',
        activity_date: '',
        institution_name: '',
        guest_name: '',
        guest_position: '',
        user_note: '',
    });

    const [borrowingForm, setBorrowingForm] = useState({
        purpose: '',
        borrow_date: '',
        return_date: '',
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const availableProducts = useMemo(() => {
        return products.filter((product) => {
            if (product.status !== 'active') return false;

            if (isBorrowing) {
                return ['borrow', 'both'].includes(product.type);
            }

            return ['checkout', 'both'].includes(product.type);
        });
    }, [products, isBorrowing]);

    const selectedItems = useMemo(() => {
        return items
            .map((item) => {
                const product = availableProducts.find((productItem) => productItem.id === item.product_id);

                return {
                    ...item,
                    product,
                };
            })
            .filter((item) => item.product);
    }, [items, availableProducts]);

    const getBackendErrorMessage = (error) => {
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

        return 'Pengajuan gagal diproses.';
    };

    const fetchData = async () => {
        if (!isMerchandise && !isBorrowing) {
            navigate('/admin/my-requests');
            return;
        }

        try {
            setLoading(true);

            const detailEndpoint = isMerchandise
                ? `/orders/${id}`
                : `/borrow-requests/${id}`;

            const [detailResponse, productsResponse] = await Promise.all([
                api.get(detailEndpoint),
                api.get('/products'),
            ]);

            const detail = detailResponse.data.data;

            if (!detail) {
                navigate('/admin/my-requests');
                return;
            }

            if (detail.status !== 'revision') {
                showWarningAlert(
                    'Tidak Bisa Diajukan Ulang',
                    'Pengajuan hanya bisa diajukan ulang saat status revisi.'
                );
                navigate('/admin/my-requests');
                return;
            }

            setRequestData(detail);
            setProducts(productsResponse.data.data || []);
            setItems(
                (detail.items || []).map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                }))
            );

            if (isMerchandise) {
                setMerchandiseForm({
                    event_name: detail.event_name || '',
                    activity_date: toInputDate(detail.activity_date),
                    institution_name: detail.institution_name || '',
                    guest_name: detail.guest_name || '',
                    guest_position: detail.guest_position || '',
                    user_note: detail.user_note || '',
                });
            }

            if (isBorrowing) {
                setBorrowingForm({
                    purpose: detail.purpose || '',
                    borrow_date: toInputDate(detail.borrow_date),
                    return_date: toInputDate(detail.return_date),
                });
            }
        } catch (error) {
            console.error('Fetch resubmit detail error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                getBackendErrorMessage(error)
            );

            navigate('/admin/my-requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [type, id]);

    const handleMerchandiseChange = (event) => {
        const { name, value } = event.target;

        setMerchandiseForm((prevForm) => ({
            ...prevForm,
            [name]: value,
        }));
    };

    const handleBorrowingChange = (event) => {
        const { name, value } = event.target;

        setBorrowingForm((prevForm) => ({
            ...prevForm,
            [name]: value,
        }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setProofFile(null);
            return;
        }

        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
        ];

        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            showWarningAlert(
                'Format File Tidak Sesuai',
                'File lampiran hanya boleh PDF, JPG, JPEG, atau PNG.'
            );

            event.target.value = '';
            setProofFile(null);
            return;
        }

        if (file.size > maxSize) {
            showWarningAlert(
                'Ukuran File Terlalu Besar',
                'Ukuran file maksimal 5 MB.'
            );

            event.target.value = '';
            setProofFile(null);
            return;
        }

        setProofFile(file);
    };

    const addItem = (product) => {
        setItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.product_id === product.id);

            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    showWarningAlert(
                        'Stok Tidak Cukup',
                        `Stok ${product.name} hanya tersedia ${product.stock}.`
                    );

                    return prevItems;
                }

                return prevItems.map((item) =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...prevItems,
                {
                    product_id: product.id,
                    quantity: 1,
                },
            ];
        });
    };

    const increaseItem = (product) => {
        setItems((prevItems) => {
            return prevItems.map((item) => {
                if (item.product_id !== product.id) {
                    return item;
                }

                if (item.quantity >= product.stock) {
                    showWarningAlert(
                        'Stok Tidak Cukup',
                        `Stok ${product.name} hanya tersedia ${product.stock}.`
                    );

                    return item;
                }

                return {
                    ...item,
                    quantity: item.quantity + 1,
                };
            });
        });
    };

    const decreaseItem = (productId) => {
        setItems((prevItems) => {
            return prevItems
                .map((item) =>
                    item.product_id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0);
        });
    };

    const removeItem = (productId) => {
        setItems((prevItems) => prevItems.filter((item) => item.product_id !== productId));
    };

    const validateSubmit = () => {
        if (items.length === 0) {
            showWarningAlert(
                'Item Kosong',
                'Pilih minimal satu item untuk diajukan ulang.'
            );
            return false;
        }

        if (isMerchandise) {
            if (!merchandiseForm.event_name.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Nama kegiatan wajib diisi.');
                return false;
            }

            if (!merchandiseForm.activity_date) {
                showWarningAlert('Data Belum Lengkap', 'Tanggal kegiatan wajib diisi.');
                return false;
            }

            if (!merchandiseForm.institution_name.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Instansi wajib diisi.');
                return false;
            }

            if (!merchandiseForm.guest_name.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Nama tamu wajib diisi.');
                return false;
            }

            if (!merchandiseForm.guest_position.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Jabatan tamu wajib diisi.');
                return false;
            }

            if (!merchandiseForm.user_note.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Catatan pengajuan wajib diisi.');
                return false;
            }
        }

        if (isBorrowing) {
            if (!borrowingForm.purpose.trim()) {
                showWarningAlert('Data Belum Lengkap', 'Keperluan peminjaman wajib diisi.');
                return false;
            }

            if (!borrowingForm.borrow_date) {
                showWarningAlert('Data Belum Lengkap', 'Tanggal pinjam wajib diisi.');
                return false;
            }

            if (!borrowingForm.return_date) {
                showWarningAlert('Data Belum Lengkap', 'Tanggal kembali wajib diisi.');
                return false;
            }

            if (new Date(borrowingForm.return_date) < new Date(borrowingForm.borrow_date)) {
                showWarningAlert(
                    'Tanggal Tidak Valid',
                    'Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.'
                );
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateSubmit()) return;

        try {
            setSubmitting(true);
            showLoadingAlert('Mengajukan Ulang', 'Mohon tunggu sebentar.');

            if (isMerchandise) {
                const payload = new FormData();

                payload.append('event_name', merchandiseForm.event_name);
                payload.append('activity_date', merchandiseForm.activity_date);
                payload.append('institution_name', merchandiseForm.institution_name);
                payload.append('guest_name', merchandiseForm.guest_name);
                payload.append('guest_position', merchandiseForm.guest_position);
                payload.append('user_note', merchandiseForm.user_note);

                if (proofFile) {
                    payload.append('proof_file', proofFile);
                }

                items.forEach((item, index) => {
                    payload.append(`items[${index}][product_id]`, item.product_id);
                    payload.append(`items[${index}][quantity]`, item.quantity);
                });

                await api.post(`/orders/${id}/resubmit`, payload);
            }

            if (isBorrowing) {
                const payload = {
                    purpose: borrowingForm.purpose,
                    borrow_date: borrowingForm.borrow_date,
                    return_date: borrowingForm.return_date,
                    items: items.map((item) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                    })),
                };

                await api.post(`/borrow-requests/${id}/resubmit`, payload);
            }

            closeAlert();

            await showSuccessAlert(
                'Berhasil Diajukan Ulang',
                'Pengajuan berhasil kembali masuk ke status pending.'
            );

            navigate('/admin/my-requests');
        } catch (error) {
            console.error('Resubmit request error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Gagal Mengajukan Ulang',
                getBackendErrorMessage(error)
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <div className="spinner-border text-primary mb-3" />
                    <p className="text-muted mb-0">Memuat data revisi...</p>
                </div>
            </div>
        );
    }

    if (!requestData) {
        return (
            <div className="card border-0 shadow-sm rounded-5">
                <div className="card-body p-5 text-center">
                    <h5 className="fw-black mb-2">Data tidak ditemukan</h5>
                    <Link to="/admin/my-requests" className="btn btn-primary rounded-pill">
                        Kembali ke Riwayat
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
                    background: isBorrowing
                        ? 'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))'
                        : 'linear-gradient(135deg, rgba(245,158,11,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                        <div>
                            <span className="badge rounded-pill text-bg-light text-warning px-3 py-2 mb-3">
                                Perbaiki Revisi
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Ajukan ulang {isBorrowing ? 'peminjaman' : 'merchandise'}.
                            </h1>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 760, lineHeight: 1.8 }}>
                                Catatan admin: {requestData.admin_note || '-'}
                            </p>
                        </div>

                        <Link to="/admin/my-requests" className="btn btn-light rounded-pill">
                            <i className="bi bi-arrow-left me-2"></i>
                            Kembali
                        </Link>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-xl-7">
                        <section className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Data Pengajuan
                                </h4>

                                <p className="text-muted mb-4">
                                    Perbaiki data sesuai catatan admin, lalu ajukan ulang.
                                </p>

                                {isMerchandise && (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Nama Kegiatan</label>
                                            <input
                                                type="text"
                                                name="event_name"
                                                className="form-control rounded-pill"
                                                value={merchandiseForm.event_name}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Tanggal Kegiatan</label>
                                            <input
                                                type="date"
                                                name="activity_date"
                                                className="form-control rounded-pill"
                                                value={merchandiseForm.activity_date}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Instansi</label>
                                            <input
                                                type="text"
                                                name="institution_name"
                                                className="form-control rounded-pill"
                                                value={merchandiseForm.institution_name}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Nama Tamu</label>
                                            <input
                                                type="text"
                                                name="guest_name"
                                                className="form-control rounded-pill"
                                                value={merchandiseForm.guest_name}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Jabatan Tamu</label>
                                            <input
                                                type="text"
                                                name="guest_position"
                                                className="form-control rounded-pill"
                                                value={merchandiseForm.guest_position}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">
                                                Lampiran Baru
                                            </label>
                                            <input
                                                type="file"
                                                className="form-control rounded-pill"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                            />
                                            <div className="form-text">
                                                Kosongkan jika tetap memakai lampiran lama.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Catatan Pengajuan
                                            </label>
                                            <textarea
                                                name="user_note"
                                                className="form-control rounded-4"
                                                rows="5"
                                                value={merchandiseForm.user_note}
                                                onChange={handleMerchandiseChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {isBorrowing && (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Tanggal Pinjam</label>
                                            <input
                                                type="date"
                                                name="borrow_date"
                                                className="form-control rounded-pill"
                                                value={borrowingForm.borrow_date}
                                                onChange={handleBorrowingChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Tanggal Kembali</label>
                                            <input
                                                type="date"
                                                name="return_date"
                                                className="form-control rounded-pill"
                                                value={borrowingForm.return_date}
                                                onChange={handleBorrowingChange}
                                                min={borrowingForm.borrow_date || undefined}
                                                required
                                            />
                                        </div>

                                        {borrowingForm.borrow_date && borrowingForm.return_date && (
                                            <div className="col-12">
                                                <div className="p-3 rounded-4 bg-success-subtle">
                                                    <div className="small text-muted mb-1">
                                                        Ringkasan tanggal
                                                    </div>
                                                    <div className="fw-bold text-success">
                                                        {formatDate(borrowingForm.borrow_date)} - {formatDate(borrowingForm.return_date)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Keperluan Peminjaman
                                            </label>
                                            <textarea
                                                name="purpose"
                                                className="form-control rounded-4"
                                                rows="6"
                                                value={borrowingForm.purpose}
                                                onChange={handleBorrowingChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="col-xl-5">
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    {isBorrowing ? 'Item Barang' : 'Item Merchandise'}
                                </h4>

                                <p className="text-muted mb-4">
                                    Atur ulang item yang ingin diajukan.
                                </p>

                                {selectedItems.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-inbox fs-1 text-muted"></i>
                                        <p className="text-muted mb-0 mt-2">
                                            Belum ada item dipilih.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {selectedItems.map((item) => (
                                            <div
                                                key={item.product_id}
                                                className="p-3 rounded-4 border"
                                            >
                                                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                                                    <div>
                                                        <h6 className="fw-black mb-1">
                                                            {item.product.name}
                                                        </h6>
                                                        <p className="text-muted small mb-0">
                                                            Stok: {item.product.stock} • {item.product.category?.name || '-'}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm rounded-pill"
                                                        onClick={() => removeItem(item.product_id)}
                                                        disabled={submitting}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>

                                                <div className="d-flex align-items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm rounded-pill ${
                                                            isBorrowing ? 'btn-success' : 'btn-primary'
                                                        }`}
                                                        onClick={() => decreaseItem(item.product_id)}
                                                        disabled={submitting}
                                                    >
                                                        <i className="bi bi-dash-lg"></i>
                                                    </button>

                                                    <div className="form-control rounded-pill text-center fw-bold py-1">
                                                        {item.quantity}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm rounded-pill ${
                                                            isBorrowing ? 'btn-success' : 'btn-primary'
                                                        }`}
                                                        onClick={() => increaseItem(item.product)}
                                                        disabled={submitting}
                                                    >
                                                        <i className="bi bi-plus-lg"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Tambah Item
                                </h4>

                                <p className="text-muted mb-4">
                                    Pilih item tambahan dari katalog aktif.
                                </p>

                                {availableProducts.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center text-muted">
                                        Tidak ada item tersedia.
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2" style={{ maxHeight: 310, overflowY: 'auto' }}>
                                        {availableProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                className={`btn rounded-4 text-start ${
                                                    isBorrowing
                                                        ? 'btn-outline-success'
                                                        : 'btn-outline-primary'
                                                }`}
                                                onClick={() => addItem(product)}
                                                disabled={submitting || product.stock <= 0}
                                            >
                                                <div className="fw-bold">{product.name}</div>
                                                <div className="small">
                                                    Stok {product.stock} • {product.category?.name || '-'}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <div className="d-grid gap-2">
                                    <button
                                        type="submit"
                                        className={`btn rounded-pill text-white ${
                                            isBorrowing ? 'btn-success' : 'btn-warning'
                                        }`}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-send-check-fill me-2"></i>
                                                Ajukan Ulang
                                            </>
                                        )}
                                    </button>

                                    <Link
                                        to="/admin/my-requests"
                                        className="btn btn-outline-dark rounded-pill"
                                    >
                                        Batal
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
}