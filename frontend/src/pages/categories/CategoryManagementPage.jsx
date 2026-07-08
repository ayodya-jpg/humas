import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
    closeAlert,
    showConfirmAlert,
    showErrorAlert,
    showLoadingAlert,
    showSuccessAlert,
} from '../../utils/sweetAlert';

export default function CategoryManagementPage() {
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        try {
            setLoading(true);

            const response = await api.get('/categories');
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Fetch categories error:', error.response?.data || error);

            showErrorAlert(
                'Gagal Memuat Data',
                error.response?.data?.message || 'Data kategori gagal dimuat dari server.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = useMemo(() => {
        return categories.filter((category) => {
            const searchValue = search.toLowerCase();

            const matchSearch =
                category.name?.toLowerCase().includes(searchValue) ||
                category.slug?.toLowerCase().includes(searchValue) ||
                category.description?.toLowerCase().includes(searchValue);

            const matchStatus =
                selectedStatus === 'all' || category.status === selectedStatus;

            return matchSearch && matchStatus;
        });
    }, [categories, search, selectedStatus]);

    const summary = useMemo(() => {
        return {
            total: categories.length,
            active: categories.filter((category) => category.status === 'active').length,
            inactive: categories.filter((category) => category.status === 'inactive').length,
        };
    }, [categories]);

    const getBackendErrorMessage = (error, fallbackMessage = 'Proses gagal dilakukan.') => {
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

    const handleDelete = async (category) => {
        const confirmation = await showConfirmAlert({
            title: 'Hapus Kategori?',
            text: `Kategori "${category.name}" akan dihapus dari sistem.`,
            confirmButtonText: 'Ya, hapus',
            icon: 'warning',
            confirmButtonColor: '#dc2626',
        });

        if (!confirmation.isConfirmed) return;

        try {
            showLoadingAlert('Menghapus Kategori', 'Mohon tunggu sebentar.');

            await api.delete(`/categories/${category.id}`);

            closeAlert();

            await showSuccessAlert(
                'Kategori Dihapus',
                'Data kategori berhasil dihapus.'
            );

            fetchCategories();
        } catch (error) {
            console.error('Delete category error:', error.response?.data || error);

            closeAlert();

            showErrorAlert(
                'Hapus Gagal',
                getBackendErrorMessage(error, 'Kategori gagal dihapus.')
            );
        }
    };

    return (
        <div className="container-fluid px-0">
            <section
                className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(15,23,42,0.98))',
                }}
            >
                <div className="card-body p-4 p-lg-5 text-white">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge rounded-pill text-bg-light text-primary px-3 py-2 mb-3">
                                Master Data Kategori
                            </span>

                            <h1 className="display-6 fw-black mb-3">
                                Kelola kategori produk.
                            </h1>

                            <p
                                className="mb-0 text-white-50"
                                style={{ maxWidth: 760, lineHeight: 1.8 }}
                            >
                                Kategori digunakan untuk mengelompokkan paket merchandise,
                                barang peminjaman, dan item lain yang muncul di katalog
                                pengajuan.
                            </p>
                        </div>

                        <div className="col-lg-4">
                            <div className="row g-3">
                                <div className="col-4">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.total}</div>
                                        <div className="small text-white-50">Total</div>
                                    </div>
                                </div>

                                <div className="col-4">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.active}</div>
                                        <div className="small text-white-50">Aktif</div>
                                    </div>
                                </div>

                                <div className="col-4">
                                    <div className="bg-white bg-opacity-10 rounded-5 p-3 h-100">
                                        <div className="fs-3 fw-black">{summary.inactive}</div>
                                        <div className="small text-white-50">Nonaktif</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm rounded-5 mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-5">
                            <label className="form-label fw-bold">Cari kategori</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nama, slug, deskripsi..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <label className="form-label fw-bold">Filter status</label>
                            <select
                                className="form-select"
                                value={selectedStatus}
                                onChange={(event) => setSelectedStatus(event.target.value)}
                            >
                                <option value="all">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </div>

                        <div className="col-lg-3">
                            <Link
                                to="/admin/categories/create"
                                className="btn btn-primary rounded-pill w-100"
                            >
                                <i className="bi bi-plus-lg me-2"></i>
                                Tambah Kategori
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div className="spinner-border text-primary mb-3" />
                        <p className="text-muted mb-0">Memuat data kategori...</p>
                    </div>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-5">
                    <div className="card-body p-5 text-center">
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-5 bg-light text-secondary"
                            style={{ width: 76, height: 76 }}
                        >
                            <i className="bi bi-inbox fs-1"></i>
                        </div>

                        <h5 className="fw-black mb-2">Kategori tidak ditemukan</h5>

                        <p className="text-muted mb-0">
                            Tidak ada kategori berdasarkan filter yang dipilih.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {filteredCategories.map((category) => (
                        <div className="col-12" key={category.id}>
                            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                                <div className="card-body p-4">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-lg-7">
                                            <div className="d-flex gap-3">
                                                <div className="icon-box bg-primary-subtle text-primary">
                                                    <i className="bi bi-tags-fill fs-4"></i>
                                                </div>

                                                <div>
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        <span className="badge rounded-pill text-bg-primary">
                                                            Kategori
                                                        </span>

                                                        <span className={`status status-${category.status}`}>
                                                            {category.status}
                                                        </span>
                                                    </div>

                                                    <h5 className="fw-black mb-1">
                                                        {category.name}
                                                    </h5>

                                                    <p className="text-muted mb-0">
                                                        {category.description || 'Tidak ada deskripsi.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 col-lg-3">
                                            <div className="small text-muted">Slug</div>
                                            <div className="fw-bold text-break">{category.slug}</div>
                                        </div>

                                        <div className="col-md-6 col-lg-2 text-lg-end">
                                            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                                                <Link
                                                    to={`/admin/categories/${category.id}/edit`}
                                                    className="btn btn-outline-primary rounded-pill"
                                                >
                                                    <i className="bi bi-pencil-square me-2"></i>
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger rounded-pill"
                                                    onClick={() => handleDelete(category)}
                                                >
                                                    <i className="bi bi-trash me-2"></i>
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {category.products_count !== undefined && (
                                        <div className="mt-3 p-3 rounded-4 bg-light border">
                                            <div className="small text-muted">
                                                Jumlah produk dalam kategori ini
                                            </div>
                                            <div className="fw-black">
                                                {category.products_count} produk
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}