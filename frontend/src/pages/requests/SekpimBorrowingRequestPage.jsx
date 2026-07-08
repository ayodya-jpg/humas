import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const initialBorrowingForm = {
    borrow_date: '',
    return_date: '',
    purpose: '',
};

export default function SekpimBorrowingRequestPage() {
    const [items, setItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [formData, setFormData] = useState(initialBorrowingForm);

    const [loadingItems, setLoadingItems] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchBorrowItems = async () => {
        try {
            setLoadingItems(true);
            setErrorMessage('');

            const response = await api.get('/products');

            const borrowItems = response.data.data.filter((item) => {
                return item.status === 'active' && (item.type === 'borrow' || item.type === 'both');
            });

            setItems(borrowItems);
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                'Gagal mengambil data barang peminjaman.';

            setErrorMessage(backendMessage);
            showErrorAlert('Gagal Mengambil Barang', backendMessage);
            console.error(error);
        } finally {
            setLoadingItems(false);
        }
    };

    useEffect(() => {
        fetchBorrowItems();
    }, []);

    const filteredItems = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return items.filter((item) => {
            return (
                item.name?.toLowerCase().includes(keyword) ||
                item.description?.toLowerCase().includes(keyword) ||
                item.category?.name?.toLowerCase().includes(keyword)
            );
        });
    }, [items, searchKeyword]);

    const cartTotalQuantity = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    const getCartItem = (itemId) => {
        return cart.find((item) => item.product_id === itemId);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddToCart = (item) => {
        setMessage('');
        setErrorMessage('');

        if (item.stock <= 0) {
            setErrorMessage('Stok barang ini sedang kosong.');
            showWarningAlert('Stok Kosong', 'Barang ini belum tersedia untuk dipinjam.');
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((cartItem) => cartItem.product_id === item.id);

            if (existingItem) {
                if (existingItem.quantity >= item.stock) {
                    setErrorMessage('Jumlah barang sudah mencapai batas stok.');
                    showWarningAlert(
                        'Batas Stok Tercapai',
                        'Jumlah item di keranjang sudah sesuai stok maksimal yang tersedia.'
                    );
                    return prevCart;
                }

                return prevCart.map((cartItem) =>
                    cartItem.product_id === item.id
                        ? {
                            ...cartItem,
                            quantity: cartItem.quantity + 1,
                        }
                        : cartItem
                );
            }

            return [
                ...prevCart,
                {
                    product_id: item.id,
                    name: item.name,
                    description: item.description,
                    stock: item.stock,
                    image: item.image,
                    category: item.category,
                    quantity: 1,
                },
            ];
        });
    };

    const handleDecreaseCart = (itemId) => {
        setCart((prevCart) => {
            return prevCart
                .map((item) =>
                    item.product_id === itemId
                        ? {
                            ...item,
                            quantity: item.quantity - 1,
                        }
                        : item
                )
                .filter((item) => item.quantity > 0);
        });
    };

    const handleIncreaseCart = (itemId) => {
        setMessage('');
        setErrorMessage('');

        setCart((prevCart) => {
            return prevCart.map((item) => {
                if (item.product_id !== itemId) {
                    return item;
                }

                if (item.quantity >= item.stock) {
                    setErrorMessage('Jumlah barang sudah mencapai batas stok.');
                    showWarningAlert(
                        'Batas Stok Tercapai',
                        'Jumlah item di keranjang sudah sesuai stok maksimal yang tersedia.'
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

    const handleRemoveCart = async (itemId) => {
        const selectedItem = cart.find((item) => item.product_id === itemId);

        const result = await showConfirmAlert({
            title: 'Hapus dari Keranjang?',
            text: selectedItem
                ? `${selectedItem.name} akan dihapus dari keranjang.`
                : 'Item ini akan dihapus dari keranjang.',
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!result.isConfirmed) {
            return;
        }

        setCart((prevCart) => prevCart.filter((item) => item.product_id !== itemId));

        showSuccessAlert('Berhasil Dihapus', 'Item telah dihapus dari keranjang.');
    };

    const resetAll = async () => {
        const hasData =
            cart.length > 0 ||
            formData.borrow_date ||
            formData.return_date ||
            formData.purpose;

        if (hasData) {
            const result = await showConfirmAlert({
                title: 'Reset Form?',
                text: 'Semua data peminjaman dan keranjang akan dikosongkan.',
                confirmButtonText: 'Ya, reset',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setCart([]);
        setFormData(initialBorrowingForm);
        setMessage('');
        setErrorMessage('');
    };

    const validateForm = () => {
        if (cart.length === 0) {
            setErrorMessage('Keranjang peminjaman masih kosong.');
            showWarningAlert('Keranjang Kosong', 'Pilih minimal satu barang sebelum mengajukan peminjaman.');
            return false;
        }

        if (!formData.borrow_date || !formData.return_date) {
            setErrorMessage('Tanggal pinjam dan tanggal kembali wajib diisi.');
            showWarningAlert(
                'Tanggal Wajib Diisi',
                'Isi tanggal pinjam dan tanggal kembali terlebih dahulu.'
            );
            return false;
        }

        if (new Date(formData.return_date) < new Date(formData.borrow_date)) {
            setErrorMessage('Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.');
            showWarningAlert(
                'Tanggal Tidak Valid',
                'Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.'
            );
            return false;
        }

        if (!formData.purpose.trim()) {
            setErrorMessage('Keperluan peminjaman wajib diisi.');
            showWarningAlert(
                'Keperluan Wajib Diisi',
                'Jelaskan keperluan peminjaman agar admin dapat menilai pengajuan.'
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        if (!validateForm()) {
            return;
        }

        const result = await showConfirmAlert({
            title: 'Kirim Pengajuan Peminjaman?',
            text: 'Pastikan barang, jumlah, tanggal, dan keperluan sudah benar.',
            confirmButtonText: 'Ya, kirim',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        setSubmitting(true);
        showLoadingAlert('Mengirim Pengajuan', 'Mohon tunggu, data peminjaman sedang dikirim ke admin.');

        try {
            const payload = {
                borrow_date: formData.borrow_date,
                return_date: formData.return_date,
                purpose: formData.purpose,
                items: cart.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            };

            const response = await api.post('/borrow-requests', payload);

            closeAlert();

            setMessage(response.data.message);
            setCart([]);
            setFormData(initialBorrowingForm);

            await fetchBorrowItems();

            await showSuccessAlert(
                'Pengajuan Berhasil Dikirim',
                'Permintaan peminjaman kamu sekarang menunggu approval admin.'
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Pengajuan peminjaman gagal. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Pengajuan Gagal', backendMessage);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #2563eb 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-9">
                            <span className="text-white-50 small fw-bold text-uppercase">
                                SEKPIM Borrowing Request
                            </span>

                            <h2 className="display-5 fw-black mt-2 mb-3">
                                Ajukan Peminjaman Sekpim
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Pilih barang yang dibutuhkan, tentukan tanggal pinjam dan tanggal kembali,
                                lalu jelaskan keperluan peminjaman untuk diproses oleh admin.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <div className="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-5 p-4 text-center">
                                <span className="d-block text-white-50 small fw-bold text-uppercase">
                                    Keranjang
                                </span>

                                <strong className="display-5 fw-black">
                                    {cartTotalQuantity}
                                </strong>

                                <p className="mb-0 text-white-50 small">
                                    Total barang dipilih
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {message && (
                <div className="alert alert-success rounded-4">
                    {message}
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger rounded-4">
                    {errorMessage}
                </div>
            )}

            <div className="row g-4 align-items-start">
                <div className="col-xl-8">
                    <div className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="row align-items-center g-3">
                                <div className="col-lg-7">
                                    <h4 className="fw-black mb-1">
                                        Pilih Barang
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Pilih satu atau beberapa barang Sekpim yang ingin dipinjam.
                                    </p>
                                </div>

                                <div className="col-lg-5">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0 rounded-start-4">
                                            <i className="bi bi-search"></i>
                                        </span>

                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={(event) => setSearchKeyword(event.target.value)}
                                            className="form-control border-start-0 rounded-end-4"
                                            placeholder="Cari barang..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingItems && (
                        <div className="alert alert-primary rounded-4">
                            Sedang mengambil data barang peminjaman...
                        </div>
                    )}

                    {!loadingItems && filteredItems.length === 0 && (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="icon-box bg-success-subtle text-success mx-auto mb-3">
                                    <i className="bi bi-search fs-4"></i>
                                </div>

                                <h4 className="fw-black">
                                    Barang tidak ditemukan
                                </h4>

                                <p className="text-muted mb-0">
                                    Belum ada barang peminjaman aktif atau kata kunci pencarian tidak cocok.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="row g-3">
                        {filteredItems.map((item) => {
                            const cartItem = getCartItem(item.id);

                            return (
                                <div className="col-12 col-md-6 col-xxl-4" key={item.id}>
                                    <div className="card border-0 shadow-sm rounded-5 h-100 overflow-hidden">
                                        <div
                                            className="d-flex align-items-center justify-content-center text-success fw-black"
                                            style={{
                                                height: 160,
                                                background:
                                                    'radial-gradient(circle at top left, rgba(15,118,110,.16), transparent 35%), linear-gradient(135deg, #ccfbf1, #eef2ff)',
                                                letterSpacing: '.12em',
                                            }}
                                        >
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-100 h-100 object-fit-cover"
                                                />
                                            ) : (
                                                <span>SEKPIM</span>
                                            )}
                                        </div>

                                        <div className="card-body p-4">
                                            <span className="badge rounded-pill text-bg-success mb-3">
                                                {item.category?.name || 'Barang Sekpim'}
                                            </span>

                                            <h5 className="fw-black mb-2">
                                                {item.name}
                                            </h5>

                                            <p className="text-muted small mb-3" style={{ minHeight: 66 }}>
                                                {item.description || 'Tidak ada deskripsi barang.'}
                                            </p>

                                            <div className="d-flex justify-content-between align-items-center bg-light border rounded-4 p-3 mb-3">
                                                <span className="text-muted fw-bold small">
                                                    Stok tersedia
                                                </span>

                                                <strong className="fs-4">
                                                    {item.stock}
                                                </strong>
                                            </div>

                                            {cartItem ? (
                                                <div className="d-grid" style={{ gridTemplateColumns: '42px 1fr 42px', gap: 8 }}>
                                                    <button
                                                        className="btn btn-success rounded-4 fw-bold"
                                                        type="button"
                                                        onClick={() => handleDecreaseCart(item.id)}
                                                    >
                                                        −
                                                    </button>

                                                    <div className="bg-light border rounded-4 d-flex align-items-center justify-content-center fw-black">
                                                        {cartItem.quantity}
                                                    </div>

                                                    <button
                                                        className="btn btn-success rounded-4 fw-bold"
                                                        type="button"
                                                        onClick={() => handleIncreaseCart(item.id)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-success w-100 rounded-pill fw-bold"
                                                    type="button"
                                                    onClick={() => handleAddToCart(item)}
                                                    disabled={item.stock <= 0}
                                                >
                                                    <i className="bi bi-cart-plus-fill me-2"></i>
                                                    Tambah ke Keranjang
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="col-xl-4">
                    <div className="position-sticky" style={{ top: 110 }}>
                        <div className="card border-0 shadow-sm rounded-5 mb-3">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h4 className="fw-black mb-1">
                                            Keranjang
                                        </h4>

                                        <p className="text-muted mb-0">
                                            Ringkasan barang yang akan dipinjam.
                                        </p>
                                    </div>

                                    <div className="icon-box bg-success-subtle text-success">
                                        <strong>{cartTotalQuantity}</strong>
                                    </div>
                                </div>

                                {cart.length === 0 && (
                                    <div className="text-center bg-light border rounded-4 p-4 text-muted fw-bold">
                                        Belum ada barang dipilih.
                                    </div>
                                )}

                                {cart.length > 0 && (
                                    <div className="d-grid gap-2">
                                        {cart.map((item) => (
                                            <div
                                                className="d-flex justify-content-between align-items-start gap-3 bg-light border rounded-4 p-3"
                                                key={item.product_id}
                                            >
                                                <div>
                                                    <strong>{item.name}</strong>
                                                    <p className="text-muted small mb-0">
                                                        Qty: {item.quantity}
                                                    </p>
                                                </div>

                                                <button
                                                    className="btn btn-sm btn-outline-danger rounded-pill"
                                                    type="button"
                                                    onClick={() => handleRemoveCart(item.product_id)}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <form className="card border-0 shadow-sm rounded-5" onSubmit={handleSubmit}>
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Detail Peminjaman
                                </h4>

                                <p className="text-muted mb-4">
                                    Tanggal dan keperluan digunakan admin untuk memeriksa ketersediaan barang.
                                </p>

                                <div className="row g-3">
                                    <div className="col-md-6 col-xl-12">
                                        <label className="form-label fw-bold">
                                            Tanggal Pinjam
                                        </label>

                                        <input
                                            type="date"
                                            name="borrow_date"
                                            value={formData.borrow_date}
                                            onChange={handleInputChange}
                                            className="form-control rounded-4"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6 col-xl-12">
                                        <label className="form-label fw-bold">
                                            Tanggal Kembali
                                        </label>

                                        <input
                                            type="date"
                                            name="return_date"
                                            value={formData.return_date}
                                            onChange={handleInputChange}
                                            className="form-control rounded-4"
                                            required
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">
                                            Keperluan Peminjaman
                                        </label>

                                        <textarea
                                            name="purpose"
                                            value={formData.purpose}
                                            onChange={handleInputChange}
                                            className="form-control rounded-4"
                                            placeholder="Contoh: Digunakan untuk kegiatan rapat pimpinan / kunjungan tamu / kegiatan resmi."
                                            rows="5"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="d-grid gap-2 mt-4">
                                    <button
                                        className="btn btn-success rounded-pill fw-bold"
                                        type="submit"
                                        disabled={submitting || cart.length === 0}
                                    >
                                        {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                                    </button>

                                    <button
                                        className="btn btn-outline-dark rounded-pill fw-bold"
                                        type="button"
                                        onClick={resetAll}
                                        disabled={submitting}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}