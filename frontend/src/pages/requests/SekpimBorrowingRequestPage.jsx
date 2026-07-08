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
    purpose: '',
    borrow_date: '',
    return_date: '',
};

const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export default function SekpimBorrowingRequestPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);

            const response = await api.get('/products');
            const productData = response.data.data || [];

            const borrowProducts = productData.filter((product) => {
                return (
                    product.status === 'active' &&
                    ['borrow', 'both'].includes(product.type)
                );
            });

            setProducts(borrowProducts);
        } catch (error) {
            console.error('Fetch borrowing products error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data barang peminjaman gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        const searchValue = search.toLowerCase();

        return products.filter((product) => {
            return (
                product.name?.toLowerCase().includes(searchValue) ||
                product.description?.toLowerCase().includes(searchValue) ||
                product.category?.name?.toLowerCase().includes(searchValue)
            );
        });
    }, [products, search]);

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

        return 'Pengajuan peminjaman gagal dikirim.';
    };

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            showWarningAlert('Stok Habis', 'Barang ini tidak memiliki stok tersedia.');
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

    const validateForm = () => {
        if (selectedItems.length === 0) {
            showWarningAlert(
                'Keranjang Kosong',
                'Tambahkan minimal satu barang ke keranjang peminjaman.'
            );
            return false;
        }

        if (!form.purpose.trim()) {
            showWarningAlert(
                'Keperluan Wajib Diisi',
                'Isi keperluan peminjaman terlebih dahulu.'
            );
            return false;
        }

        if (!form.borrow_date) {
            showWarningAlert(
                'Tanggal Pinjam Wajib Diisi',
                'Pilih tanggal mulai peminjaman.'
            );
            return false;
        }

        if (!form.return_date) {
            showWarningAlert(
                'Tanggal Kembali Wajib Diisi',
                'Pilih tanggal pengembalian barang.'
            );
            return false;
        }

        if (new Date(form.return_date) < new Date(form.borrow_date)) {
            showWarningAlert(
                'Tanggal Tidak Valid',
                'Tanggal kembali tidak boleh lebih awal dari tanggal pinjam.'
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        try {
            setSubmitting(true);
            showLoadingAlert('Mengirim Pengajuan', 'Mohon tunggu sebentar.');

            const payload = {
                purpose: form.purpose,
                borrow_date: form.borrow_date,
                return_date: form.return_date,
                items: selectedItems.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            };

            await api.post('/borrow-requests', payload);

            closeAlert();

            await showSuccessAlert(
                'Pengajuan Berhasil',
                'Pengajuan peminjaman berhasil dikirim.'
            );

            setForm(initialForm);
            setCart([]);
            fetchProducts();
        } catch (error) {
            console.error('Submit borrowing request error:', error.response?.data || error);

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
        setCart([]);
    };

    return (
        <div className="container-fluid px-0">
            <div className="row g-4">
                <div className="col-xl-8">
                    <section
                        className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(15,118,110,0.96), rgba(15,23,42,0.98))',
                        }}
                    >
                        <div className="card-body p-4 p-lg-5 text-white">
                            <span className="badge rounded-pill text-bg-light text-success px-3 py-2 mb-3">
                                Pengajuan Peminjaman
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Pilih barang Sekpim yang ingin dipinjam.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Pilih barang dari katalog peminjaman, masukkan ke keranjang,
                                lalu isi tanggal pinjam, tanggal kembali, dan keperluan
                                sebelum dikirim untuk approval admin.
                            </p>
                        </div>
                    </section>

                    <section className="card border-0 shadow-sm rounded-5 mb-4">
                        <div className="card-body p-4">
                            <div className="row g-3 align-items-end">
                                <div className="col-lg-7">
                                    <label className="form-label fw-bold">Cari barang</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="bi bi-search"></i>
                                        </span>

                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Nama barang, kategori, deskripsi..."
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="col-lg-5">
                                    <div className="p-3 rounded-4 bg-success-subtle">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="fw-black text-success">
                                                    Barang tersedia
                                                </div>
                                                <div className="small text-muted">
                                                    Katalog peminjaman aktif
                                                </div>
                                            </div>

                                            <div className="fs-3 fw-black text-success">
                                                {products.length}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {loading ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div className="spinner-border text-success mb-3" />
                                <p className="text-muted mb-0">Memuat katalog barang...</p>
                            </div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-5">
                            <div className="card-body p-5 text-center">
                                <div
                                    className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                                    style={{ width: 76, height: 76 }}
                                >
                                    <i className="bi bi-inbox fs-1"></i>
                                </div>

                                <h5 className="fw-black mb-2">Barang tidak ditemukan</h5>

                                <p className="text-muted mb-0">
                                    Tidak ada barang aktif yang sesuai dengan pencarian.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {filteredProducts.map((product) => {
                                const cartItem = cart.find(
                                    (item) => item.product_id === product.id
                                );

                                return (
                                    <div className="col-12 col-md-6 col-xxl-4" key={product.id}>
                                        <div className="card border-0 shadow-sm rounded-5 overflow-hidden h-100">
                                            <div
                                                className="bg-success-subtle d-flex align-items-center justify-content-center"
                                                style={{ height: 150 }}
                                            >
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-100 h-100 object-fit-cover"
                                                    />
                                                ) : (
                                                    <div className="fw-black text-success">
                                                        SEKPIM
                                                    </div>
                                                )}
                                            </div>

                                            <div className="card-body p-4 d-flex flex-column">
                                                <div className="mb-3">
                                                    <span className="badge rounded-pill text-bg-success mb-3">
                                                        {product.category?.name || 'Barang'}
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
                                                                className="btn btn-success rounded-pill"
                                                                onClick={() => handleDecreaseQty(product.id)}
                                                            >
                                                                <i className="bi bi-dash-lg"></i>
                                                            </button>

                                                            <div className="form-control text-center fw-bold rounded-pill">
                                                                {cartItem.quantity}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="btn btn-success rounded-pill"
                                                                onClick={() => handleIncreaseQty(product)}
                                                            >
                                                                <i className="bi bi-plus-lg"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn btn-success rounded-pill w-100"
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
                                            {totalQty} barang dipilih
                                        </p>
                                    </div>

                                    <div className="icon-box bg-success-subtle text-success">
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
                                                            Qty: {item.quantity} • Stok: {item.product.stock}
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
                                    Detail Peminjaman
                                </h4>

                                <p className="text-muted mb-4">
                                    Isi tanggal dan keperluan peminjaman sebelum request
                                    dikirim ke admin.
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6 col-xl-12">
                                            <label className="form-label fw-bold">
                                                Tanggal Pinjam
                                            </label>

                                            <input
                                                type="date"
                                                name="borrow_date"
                                                className="form-control rounded-pill"
                                                value={form.borrow_date}
                                                onChange={handleChange}
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
                                                className="form-control rounded-pill"
                                                value={form.return_date}
                                                onChange={handleChange}
                                                min={form.borrow_date || undefined}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {form.borrow_date && form.return_date && (
                                        <div className="p-3 rounded-4 bg-success-subtle mb-3">
                                            <div className="small text-muted mb-1">
                                                Ringkasan tanggal
                                            </div>

                                            <div className="fw-bold text-success">
                                                {formatDate(form.borrow_date)} - {formatDate(form.return_date)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="form-label fw-bold">
                                            Keperluan Peminjaman
                                        </label>

                                        <textarea
                                            name="purpose"
                                            className="form-control rounded-4"
                                            rows="5"
                                            placeholder="Contoh: Peminjaman taplak meja untuk kegiatan rapat pimpinan..."
                                            value={form.purpose}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="d-grid gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-success rounded-pill"
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
                                                    Kirim Pengajuan
                                                </>
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