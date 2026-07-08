import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
    closeAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
    showWarningAlert,
} from '../../utils/sweetAlert';

const initialForm = {
    event_name: '',
    activity_date: '',
    institution_name: '',
    guest_name: '',
    guest_position: '',
    user_note: '',
};

export default function MerchandiseRequestPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [proofFile, setProofFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);

            const response = await api.get('/products');
            const productData = response.data.data || [];

            const merchandiseProducts = productData.filter((product) => {
                return (
                    product.status === 'active' &&
                    ['checkout', 'both'].includes(product.type)
                );
            });

            setProducts(merchandiseProducts);
        } catch (error) {
            console.error(error);
            showErrorAlert(
                'Gagal Memuat Data',
                'Data merchandise gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const selectedItems = useMemo(() => {
        return cart
            .map((cartItem) => {
                const product = products.find((item) => item.id === cartItem.product_id);

                return {
                    ...cartItem,
                    product,
                };
            })
            .filter((item) => item.product);
    }, [cart, products]);

    const totalQty = useMemo(() => {
        return selectedItems.reduce((total, item) => total + item.quantity, 0);
    }, [selectedItems]);

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            showWarningAlert('Stok Habis', 'Produk ini tidak memiliki stok tersedia.');
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.product_id === product.id);

            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    showWarningAlert(
                        'Stok Tidak Cukup',
                        `Stok ${product.name} hanya tersedia ${product.stock}.`
                    );

                    return prevCart;
                }

                return prevCart.map((item) =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...prevCart,
                {
                    product_id: product.id,
                    quantity: 1,
                },
            ];
        });
    };

    const handleDecreaseQty = (productId) => {
        setCart((prevCart) => {
            return prevCart
                .map((item) =>
                    item.product_id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0);
        });
    };

    const handleIncreaseQty = (product) => {
        setCart((prevCart) => {
            return prevCart.map((item) => {
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

    const handleRemoveItem = (productId) => {
        setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((prevForm) => ({
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

        if (responseData?.data && typeof responseData.data === 'string') {
            return responseData.data;
        }

        return 'Pengajuan merchandise gagal dikirim.';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (selectedItems.length === 0) {
            showWarningAlert(
                'Keranjang Kosong',
                'Tambahkan minimal satu merchandise ke keranjang.'
            );
            return;
        }

        if (!proofFile) {
            showWarningAlert(
                'Lampiran Belum Diunggah',
                'Upload file bukti undangan atau lampiran terlebih dahulu.'
            );
            return;
        }

        try {
            setSubmitting(true);
            showLoadingAlert('Mengirim Pengajuan', 'Mohon tunggu sebentar.');

            const payload = new FormData();

            payload.append('event_name', form.event_name);
            payload.append('activity_date', form.activity_date);
            payload.append('institution_name', form.institution_name);
            payload.append('guest_name', form.guest_name);
            payload.append('guest_position', form.guest_position);
            payload.append('user_note', form.user_note);
            payload.append('proof_file', proofFile);

            selectedItems.forEach((item, index) => {
                payload.append(`items[${index}][product_id]`, item.product_id);
                payload.append(`items[${index}][quantity]`, item.quantity);
            });

            await api.post('/orders', payload);

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Berhasil',
                'Pengajuan merchandise berhasil dikirim.'
            );

            setForm(initialForm);
            setProofFile(null);
            setCart([]);

            const fileInput = document.getElementById('proof_file');

            if (fileInput) {
                fileInput.value = '';
            }

            fetchProducts();
        } catch (error) {
            console.error('Checkout merchandise error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Pengajuan Gagal',
                getBackendErrorMessage(error)
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setForm(initialForm);
        setProofFile(null);
        setCart([]);

        const fileInput = document.getElementById('proof_file');

        if (fileInput) {
            fileInput.value = '';
        }
    };

    return (
        <div className="container-fluid px-0">
            <div className="row g-4">
                <div className="col-xl-8">
                    <section
                        className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(15,23,42,0.98))',
                        }}
                    >
                        <div className="card-body p-4 p-lg-5 text-white">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Pengajuan Merchandise
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Pilih paket merchandise untuk kebutuhan tamu dan kegiatan.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Pilih item seperti katalog, masukkan ke keranjang, lalu isi
                                informasi tamu dan kegiatan sebelum dikirim ke admin untuk
                                proses approval.
                            </p>
                        </div>
                    </section>

                    {loading ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="spinner-border text-primary mb-3" />
                                <p className="text-muted mb-0">Memuat katalog merchandise...</p>
                            </div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div
                                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                                    style={{ width: 76, height: 76 }}
                                >
                                    <i className="bi bi-inbox fs-1"></i>
                                </div>

                                <h5 className="fw-black mb-2">
                                    Belum ada merchandise tersedia
                                </h5>

                                <p className="text-muted mb-0">
                                    Data produk merchandise aktif belum tersedia.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {products.map((product) => {
                                const cartItem = cart.find(
                                    (item) => item.product_id === product.id
                                );

                                return (
                                    <div className="col-12 col-md-6 col-xxl-4" key={product.id}>
                                        <div className="card border-0 shadow-sm rounded-5 overflow-hidden h-100">
                                            <div
                                                className="bg-primary-subtle d-flex align-items-center justify-content-center"
                                                style={{ height: 150 }}
                                            >
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-100 h-100 object-fit-cover"
                                                    />
                                                ) : (
                                                    <div className="fw-black text-primary">
                                                        HUMAS
                                                    </div>
                                                )}
                                            </div>

                                            <div className="card-body p-4 d-flex flex-column">
                                                <div className="mb-3">
                                                    <span className="badge rounded-pill text-bg-primary mb-3">
                                                        {product.category?.name || 'Merchandise'}
                                                    </span>

                                                    <h5 className="fw-black mb-2">
                                                        {product.name}
                                                    </h5>

                                                    <p
                                                        className="text-muted small mb-0"
                                                        style={{ lineHeight: 1.7 }}
                                                    >
                                                        {product.description || 'Tidak ada deskripsi.'}
                                                    </p>
                                                </div>

                                                <div className="mt-auto">
                                                    <div className="p-3 rounded-4 border bg-light d-flex align-items-center justify-content-between mb-3">
                                                        <span className="small text-muted fw-bold">
                                                            Stok tersedia
                                                        </span>
                                                        <strong className="fs-4">
                                                            {product.stock}
                                                        </strong>
                                                    </div>

                                                    {cartItem ? (
                                                        <div className="d-flex align-items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary rounded-pill"
                                                                onClick={() => handleDecreaseQty(product.id)}
                                                            >
                                                                <i className="bi bi-dash-lg"></i>
                                                            </button>

                                                            <div className="form-control text-center fw-bold rounded-pill">
                                                                {cartItem.quantity}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="btn btn-primary rounded-pill"
                                                                onClick={() => handleIncreaseQty(product)}
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary rounded-pill w-100"
                                                            onClick={() => handleAddToCart(product)}
                                                            disabled={product.stock <= 0}
                                                        >
                                                            <i className="bi bi-cart-plus-fill me-2"></i>
                                                            Tambah ke Keranjang
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="col-xl-4">
                    <div className="position-sticky" style={{ top: 105 }}>
                        <section className="card border-0 shadow-sm rounded-5 mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        <h4 className="fw-black mb-1">Keranjang</h4>
                                        <p className="text-muted mb-0">
                                            {totalQty} item dipilih
                                        </p>
                                    </div>

                                    <div className="icon-box bg-primary-subtle text-primary">
                                        <i className="bi bi-cart-fill fs-4"></i>
                                    </div>
                                </div>

                                {selectedItems.length === 0 ? (
                                    <div className="p-4 rounded-4 bg-light text-center">
                                        <i className="bi bi-cart-x fs-1 text-muted"></i>
                                        <p className="text-muted mb-0 mt-2">
                                            Keranjang masih kosong.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {selectedItems.map((item) => (
                                            <div
                                                key={item.product_id}
                                                className="p-3 rounded-4 border"
                                            >
                                                <div className="d-flex align-items-start justify-content-between gap-2">
                                                    <div>
                                                        <h6 className="fw-black mb-1">
                                                            {item.product.name}
                                                        </h6>
                                                        <p className="text-muted small mb-0">
                                                            Qty: {item.quantity}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm rounded-pill"
                                                        onClick={() => handleRemoveItem(item.product_id)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-4">
                                <h4 className="fw-black mb-1">
                                    Informasi Tamu & Kegiatan
                                </h4>

                                <p className="text-muted mb-4">
                                    Data ini digunakan admin untuk menilai kelayakan
                                    pemberian merchandise.
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama Kegiatan
                                        </label>
                                        <input
                                            type="text"
                                            name="event_name"
                                            className="form-control rounded-pill"
                                            value={form.event_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Tanggal Kegiatan
                                        </label>
                                        <input
                                            type="date"
                                            name="activity_date"
                                            className="form-control rounded-pill"
                                            value={form.activity_date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Instansi / Pihak Eksternal
                                        </label>
                                        <input
                                            type="text"
                                            name="institution_name"
                                            className="form-control rounded-pill"
                                            value={form.institution_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Nama Tamu
                                        </label>
                                        <input
                                            type="text"
                                            name="guest_name"
                                            className="form-control rounded-pill"
                                            value={form.guest_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Jabatan Tamu
                                        </label>
                                        <input
                                            type="text"
                                            name="guest_position"
                                            className="form-control rounded-pill"
                                            value={form.guest_position}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            File Bukti Undangan / Lampiran
                                        </label>
                                        <label
                                            htmlFor="proof_file"
                                            className="d-block p-3 rounded-4 border border-dashed bg-light"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="fw-bold text-primary">
                                                <i className="bi bi-cloud-arrow-up-fill me-2"></i>
                                                Upload File
                                            </div>
                                            <div className="small text-muted mt-1">
                                                {proofFile
                                                    ? proofFile.name
                                                    : 'PDF, JPG, JPEG, PNG. Maksimal 5 MB.'}
                                            </div>
                                        </label>

                                        <input
                                            type="file"
                                            id="proof_file"
                                            className="d-none"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-bold">
                                            Alasan / Catatan Pengajuan
                                        </label>
                                        <textarea
                                            name="user_note"
                                            className="form-control rounded-4"
                                            rows="4"
                                            value={form.user_note}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary rounded-pill"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Mengirim...
                                                </>
                                            ) : (
                                                'Checkout Pengajuan'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-dark rounded-pill"
                                            onClick={handleReset}
                                            disabled={submitting}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}