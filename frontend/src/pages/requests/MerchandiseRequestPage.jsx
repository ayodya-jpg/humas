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

const initialCheckoutForm = {
    event_name: '',
    institution_name: '',
    guest_name: '',
    guest_position: '',
    activity_date: '',
    proof_file: null,
    user_note: '',
};

export default function MerchandiseRequestPage() {
    const [packages, setPackages] = useState([]);
    const [cart, setCart] = useState([]);
    const [checkoutForm, setCheckoutForm] = useState(initialCheckoutForm);
    const [proofFileName, setProofFileName] = useState('');

    const [loadingPackages, setLoadingPackages] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchPackages = async () => {
        try {
            setLoadingPackages(true);
            setErrorMessage('');

            const response = await api.get('/products');

            const merchandisePackages = response.data.data.filter((item) => {
                return item.status === 'active' && (item.type === 'checkout' || item.type === 'both');
            });

            setPackages(merchandisePackages);
        } catch (error) {
            setErrorMessage('Gagal mengambil data katalog merchandise.');
            showErrorAlert(
                'Gagal Mengambil Katalog',
                'Data merchandise tidak berhasil dimuat. Periksa koneksi backend.'
            );
            console.error(error);
        } finally {
            setLoadingPackages(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const filteredPackages = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();

        return packages.filter((item) => {
            return (
                item.name?.toLowerCase().includes(keyword) ||
                item.description?.toLowerCase().includes(keyword) ||
                item.category?.name?.toLowerCase().includes(keyword)
            );
        });
    }, [packages, searchKeyword]);

    const cartTotalQuantity = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    const handleCheckoutInputChange = (event) => {
        const { name, value } = event.target;

        setCheckoutForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (!file) {
            setCheckoutForm((prev) => ({
                ...prev,
                proof_file: null,
            }));
            setProofFileName('');
            return;
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            event.target.value = '';
            setCheckoutForm((prev) => ({
                ...prev,
                proof_file: null,
            }));
            setProofFileName('');
            showWarningAlert(
                'Format File Tidak Sesuai',
                'Gunakan file PDF, JPG, JPEG, atau PNG agar bisa dibuka langsung oleh admin.'
            );
            return;
        }

        if (file.size > maxSize) {
            event.target.value = '';
            setCheckoutForm((prev) => ({
                ...prev,
                proof_file: null,
            }));
            setProofFileName('');
            showWarningAlert(
                'Ukuran File Terlalu Besar',
                'Maksimal ukuran file lampiran adalah 5 MB.'
            );
            return;
        }

        setCheckoutForm((prev) => ({
            ...prev,
            proof_file: file,
        }));

        setProofFileName(file.name);
    };

    const getCartItem = (packageId) => {
        return cart.find((item) => item.product_id === packageId);
    };

    const handleAddToCart = (item) => {
        setMessage('');
        setErrorMessage('');

        if (item.stock <= 0) {
            setErrorMessage('Stok merchandise ini sedang kosong.');
            showWarningAlert('Stok Kosong', 'Merchandise ini belum tersedia untuk diajukan.');
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((cartItem) => cartItem.product_id === item.id);

            if (existingItem) {
                if (existingItem.quantity >= item.stock) {
                    setErrorMessage('Jumlah merchandise sudah mencapai batas stok.');
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

    const handleDecreaseCart = (packageId) => {
        setCart((prevCart) => {
            return prevCart
                .map((item) =>
                    item.product_id === packageId
                        ? {
                            ...item,
                            quantity: item.quantity - 1,
                        }
                        : item
                )
                .filter((item) => item.quantity > 0);
        });
    };

    const handleIncreaseCart = (packageId) => {
        setMessage('');
        setErrorMessage('');

        setCart((prevCart) => {
            return prevCart.map((item) => {
                if (item.product_id !== packageId) {
                    return item;
                }

                if (item.quantity >= item.stock) {
                    setErrorMessage('Jumlah merchandise sudah mencapai batas stok.');
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

    const handleRemoveCart = async (packageId) => {
        const selectedItem = cart.find((item) => item.product_id === packageId);

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

        setCart((prevCart) => prevCart.filter((item) => item.product_id !== packageId));
        showSuccessAlert('Berhasil Dihapus', 'Item telah dihapus dari keranjang.');
    };

    const resetAll = async () => {
        if (
            cart.length > 0 ||
            checkoutForm.event_name ||
            checkoutForm.institution_name ||
            checkoutForm.guest_name ||
            checkoutForm.guest_position ||
            checkoutForm.activity_date ||
            checkoutForm.proof_file ||
            checkoutForm.user_note
        ) {
            const result = await showConfirmAlert({
                title: 'Reset Form?',
                text: 'Semua data yang sudah diisi dan keranjang akan dikosongkan.',
                confirmButtonText: 'Ya, reset',
                icon: 'warning',
                confirmButtonColor: '#dc2626',
            });

            if (!result.isConfirmed) {
                return;
            }
        }

        setCart([]);
        setCheckoutForm(initialCheckoutForm);
        setProofFileName('');
        setMessage('');
        setErrorMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setMessage('');
        setErrorMessage('');

        if (cart.length === 0) {
            setErrorMessage('Keranjang merchandise masih kosong.');
            showWarningAlert('Keranjang Kosong', 'Pilih minimal satu merchandise sebelum checkout.');
            return;
        }

        if (!checkoutForm.proof_file) {
            setErrorMessage('File bukti undangan atau lampiran wajib diunggah.');
            showWarningAlert(
                'Lampiran Wajib Diunggah',
                'Upload file bukti undangan atau dokumen pendukung terlebih dahulu.'
            );
            return;
        }

        const result = await showConfirmAlert({
            title: 'Kirim Pengajuan Merchandise?',
            text: 'Pastikan data tamu, jabatan, kegiatan, dan lampiran sudah benar.',
            confirmButtonText: 'Ya, kirim',
            icon: 'question',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            return;
        }

        setSubmitting(true);
        showLoadingAlert('Mengirim Pengajuan', 'Mohon tunggu, data sedang dikirim ke admin.');

        try {
            const formPayload = new FormData();

            formPayload.append('event_name', checkoutForm.event_name);
            formPayload.append('institution_name', checkoutForm.institution_name);
            formPayload.append('guest_name', checkoutForm.guest_name);
            formPayload.append('guest_position', checkoutForm.guest_position);
            formPayload.append('activity_date', checkoutForm.activity_date);
            formPayload.append('user_note', checkoutForm.user_note);
            formPayload.append('proof_file', checkoutForm.proof_file);

            cart.forEach((item, index) => {
                formPayload.append(`items[${index}][product_id]`, item.product_id);
                formPayload.append(`items[${index}][quantity]`, item.quantity);
            });

            const response = await api.post('/orders', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            closeAlert();

            setMessage(response.data.message);
            setCart([]);
            setCheckoutForm(initialCheckoutForm);
            setProofFileName('');
            await fetchPackages();

            await showSuccessAlert(
                'Pengajuan Berhasil Dikirim',
                'Permintaan merchandise kamu sekarang menunggu approval admin.'
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        } catch (error) {
            closeAlert();

            const backendMessage =
                error.response?.data?.message ||
                'Pengajuan merchandise gagal. Periksa kembali data yang diisi.';

            setErrorMessage(backendMessage);
            showErrorAlert('Pengajuan Gagal', backendMessage);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page">
            <div className="merchandise-hero">
                <div>
                    <span className="eyebrow">Merchandise Request</span>
                    <h2>Katalog Merchandise</h2>
                    <p>
                        Pilih paket merchandise seperti belanja di katalog, lalu checkout
                        dengan melampirkan informasi tamu, jabatan, kegiatan, dan bukti undangan.
                    </p>
                </div>

                <div className="cart-pill">
                    <span>Keranjang</span>
                    <strong>{cartTotalQuantity}</strong>
                </div>
            </div>

            {message && <div className="success-box">{message}</div>}
            {errorMessage && <div className="error-box">{errorMessage}</div>}

            <div className="merchandise-layout">
                <section className="catalog-section">
                    <div className="catalog-toolbar">
                        <div>
                            <h3>Pilih Merchandise</h3>
                            <p>Pilih satu atau beberapa paket yang akan diajukan.</p>
                        </div>

                        <div className="catalog-search">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(event) => setSearchKeyword(event.target.value)}
                                placeholder="Cari merchandise..."
                            />
                        </div>
                    </div>

                    {loadingPackages && (
                        <div className="info-box">
                            Sedang mengambil katalog merchandise...
                        </div>
                    )}

                    {!loadingPackages && filteredPackages.length === 0 && (
                        <div className="empty-state premium-empty">
                            <span className="empty-icon">◇</span>
                            <h3>Merchandise tidak ditemukan</h3>
                            <p>
                                Belum ada paket merchandise aktif atau kata kunci pencarian tidak cocok.
                            </p>
                        </div>
                    )}

                    <div className="merchandise-grid">
                        {filteredPackages.map((item) => {
                            const cartItem = getCartItem(item.id);

                            return (
                                <div className="merchandise-card" key={item.id}>
                                    <div className="merchandise-image">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} />
                                        ) : (
                                            <span>HUMAS</span>
                                        )}
                                    </div>

                                    <div className="merchandise-content">
                                        <div className="merchandise-category">
                                            {item.category?.name || 'Merchandise'}
                                        </div>

                                        <h3>{item.name}</h3>

                                        <p>
                                            {item.description || 'Tidak ada deskripsi merchandise.'}
                                        </p>

                                        <div className="merchandise-meta">
                                            <span>Stok tersedia</span>
                                            <strong>{item.stock}</strong>
                                        </div>

                                        {cartItem ? (
                                            <div className="cart-control">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDecreaseCart(item.id)}
                                                >
                                                    −
                                                </button>

                                                <span>{cartItem.quantity}</span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleIncreaseCart(item.id)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-primary"
                                                type="button"
                                                onClick={() => handleAddToCart(item)}
                                                disabled={item.stock <= 0}
                                            >
                                                Tambah ke Keranjang
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <aside className="checkout-panel">
                    <div className="checkout-card">
                        <div className="checkout-header">
                            <div>
                                <h3>Keranjang</h3>
                                <p>Ringkasan merchandise yang dipilih.</p>
                            </div>

                            <strong>{cartTotalQuantity}</strong>
                        </div>

                        {cart.length === 0 && (
                            <div className="cart-empty">
                                <span>◇</span>
                                <p>Belum ada merchandise dipilih.</p>
                            </div>
                        )}

                        {cart.length > 0 && (
                            <div className="cart-list">
                                {cart.map((item) => (
                                    <div className="cart-item" key={item.product_id}>
                                        <div>
                                            <strong>{item.name}</strong>
                                            <p>Qty: {item.quantity}</p>
                                        </div>

                                        <button
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

                    <form className="checkout-card checkout-form" onSubmit={handleSubmit}>
                        <h3>Informasi Tamu & Kegiatan</h3>
                        <p>
                            Data ini digunakan admin untuk menilai kelayakan pemberian merchandise.
                        </p>

                        <div className="form-group">
                            <label>Nama Kegiatan</label>
                            <input
                                type="text"
                                name="event_name"
                                value={checkoutForm.event_name}
                                onChange={handleCheckoutInputChange}
                                placeholder="Contoh: Kunjungan Kerja Sama"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tanggal Kegiatan</label>
                            <input
                                type="date"
                                name="activity_date"
                                value={checkoutForm.activity_date}
                                onChange={handleCheckoutInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Instansi / Pihak Eksternal</label>
                            <input
                                type="text"
                                name="institution_name"
                                value={checkoutForm.institution_name}
                                onChange={handleCheckoutInputChange}
                                placeholder="Contoh: PT Telkom Indonesia"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Nama Tamu</label>
                            <input
                                type="text"
                                name="guest_name"
                                value={checkoutForm.guest_name}
                                onChange={handleCheckoutInputChange}
                                placeholder="Nama tamu / pejabat"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Jabatan Tamu</label>
                            <input
                                type="text"
                                name="guest_position"
                                value={checkoutForm.guest_position}
                                onChange={handleCheckoutInputChange}
                                placeholder="Direktur / Kepala Dinas / Manager"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>File Bukti Undangan / Lampiran</label>

                            <label className="file-upload-box">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    required
                                />

                                <span>Upload File</span>
                                <p>
                                    {proofFileName || 'PDF, JPG, atau PNG. Maksimal 5 MB.'}
                                </p>
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Alasan / Catatan Pengajuan</label>
                            <textarea
                                name="user_note"
                                value={checkoutForm.user_note}
                                onChange={handleCheckoutInputChange}
                                placeholder="Jelaskan tujuan pemberian merchandise."
                                rows="4"
                                required
                            />
                        </div>

                        <div className="checkout-actions">
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={submitting || cart.length === 0}
                            >
                                {submitting ? 'Mengirim...' : 'Checkout Pengajuan'}
                            </button>

                            <button
                                className="btn btn-dark"
                                type="button"
                                onClick={resetAll}
                                disabled={submitting}
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </aside>
            </div>
        </div>
    );
}