
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import {
    getDefaultPath,
    hasPermission,
} from './ProtectedRoute';

const REFRESH_INTERVAL = 30000;
const MAX_VISIBLE_ITEMS = 15;

const readRows = (response) => {
    const data = response?.data?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

const formatDate = (date) => {
    if (!date) return '-';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '-';

    return parsed.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const statusDate = (item) => {
    const field = {
        approved: 'approved_at',
        rejected: 'rejected_at',
        completed: 'completed_at',
        borrowed: 'borrowed_at',
        returned: 'returned_at',
    }[item.status];

    return (
        (field ? item[field] : null) ||
        item.updated_at ||
        item.created_at
    );
};

const getVersion = (date) => {
    const timestamp = new Date(date || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const coverageLabel = (value) => {
    const labels = {
        'SOCIAL MEDIA': 'Social Media',
        'DOKUMENTASI': 'Dokumentasi',
        'PUBLIKASI WEBSITE': 'Publikasi Website',
        'YOUTUBE': 'YouTube',
        'VIDEO REELS': 'Video Reels',
    };

    return labels[value] || value || 'Liputan Humas';
};

const getResultInfo = (kind, item) => {
    const isHumas = kind === 'humas';
    const titlePrefix = isHumas
        ? 'Request Liputan'
        : kind === 'merchandise'
          ? 'Merchandise'
          : item.request_type === 'asset_request'
            ? 'Request Aset'
            : 'Peminjaman';

    const statuses = {
        approved: {
            title: `${titlePrefix} Disetujui`,
            color: 'success',
            icon: 'bi-check-circle-fill',
        },
        rejected: {
            title: `${titlePrefix} Ditolak`,
            color: 'danger',
            icon: 'bi-x-circle-fill',
        },
        completed: {
            title: `${titlePrefix} Selesai`,
            color: 'success',
            icon: 'bi-check2-all',
        },
        borrowed: {
            title: 'Barang Sedang Dipinjam',
            color: 'warning',
            icon: 'bi-box-arrow-up-right',
        },
        returned: {
            title: 'Barang Telah Dikembalikan',
            color: 'info',
            icon: 'bi-box-arrow-in-down-left',
        },
    };

    return statuses[item.status] || null;
};

const buildUserNotifications = (items, kind, basePath) => {
    const allowed = [
        'approved',
        'rejected',
        'completed',
        'borrowed',
        'returned',
    ];

    return items
        .filter((item) => allowed.includes(item.status))
        .map((item) => {
            const info = getResultInfo(kind, item);
            const date = statusDate(item);

            const description = kind === 'humas'
                ? [
                    coverageLabel(item.coverage_type),
                    item.event_location,
                    item.applicant_name,
                ].filter(Boolean).join(' • ') ||
                  item.service_code ||
                  'Request Liputan Humas'
                : item.event_name ||
                  item.title ||
                  item.purpose ||
                  item.order_code ||
                  item.borrow_code ||
                  'Pengajuan';

            let meta = formatDate(date);

            if (item.status === 'rejected' && item.admin_note) {
                meta = item.admin_note;
            }

            if (kind === 'humas' && item.status === 'approved') {
                meta = 'Request sedang diproses oleh tim Humas.';
            }

            if (kind === 'humas' && item.status === 'completed') {
                meta = item.result_link
                    ? 'Klik untuk melihat hasil pekerjaan.'
                    : 'Request telah selesai diproses.';
            }

            return {
                id: `${kind}-${item.id}-${item.status}-${getVersion(date)}`,
                ...info,
                description,
                meta,
                path: `${basePath}/my-requests/${kind}/${item.id}/detail`,
                sortDate: date,
                persistent: false,
            };
        });
};

const buildPendingNotifications = (
    orders,
    humasRequests,
    borrowingRequests
) => {
    const results = [];

    orders
        .filter((item) => item.status === 'pending')
        .forEach((item) => {
            results.push({
                id: `order-pending-${item.id}`,
                title: 'Merchandise Menunggu Approval',
                description:
                    item.event_name ||
                    item.order_code ||
                    'Pengajuan merchandise',
                meta: formatDate(item.submitted_at || item.created_at),
                icon: 'bi-gift-fill',
                color: 'primary',
                path: `/admin/orders/${item.id}`,
                sortDate: item.submitted_at || item.created_at,
                persistent: true,
            });
        });

    humasRequests
        .filter((item) => item.status === 'pending')
        .forEach((item) => {
            results.push({
                id: `humas-pending-${item.id}`,
                title: 'Request Liputan Menunggu Approval',
                description: [
                    coverageLabel(item.coverage_type),
                    item.event_location,
                    item.applicant_name,
                ].filter(Boolean).join(' • ') ||
                    item.service_code ||
                    'Request Liputan Humas',
                meta: formatDate(item.submitted_at || item.created_at),
                icon: 'bi-camera-reels-fill',
                color: 'danger',
                path: `/admin/humas-services/${item.id}`,
                sortDate: item.submitted_at || item.created_at,
                persistent: true,
            });
        });

    borrowingRequests
        .filter((item) => item.status === 'pending')
        .forEach((item) => {
            const isAsset = item.request_type === 'asset_request';

            results.push({
                id: `borrowing-pending-${item.id}`,
                title: isAsset
                    ? 'Request Aset Menunggu Approval'
                    : 'Peminjaman Menunggu Approval',
                description:
                    item.purpose ||
                    item.borrow_code ||
                    'Pengajuan SEKPiM',
                meta: formatDate(item.submitted_at || item.created_at),
                icon: 'bi-box-seam-fill',
                color: 'success',
                path: `/admin/borrow-requests/${item.id}`,
                sortDate: item.submitted_at || item.created_at,
                persistent: true,
            });
        });

    return results;
};

const buildStockNotifications = (products) =>
    products
        .filter((product) =>
            product.status === 'active' &&
            Number(product.stock ?? 0) <= 5
        )
        .map((product) => {
            const stock = Number(product.stock ?? 0);

            return {
                // Jika stok berubah, peringatan dapat muncul lagi.
                id: `stock-${product.id}-${stock}`,
                title: 'Stok Produk Rendah',
                description: product.name || 'Produk',
                meta: `Stok tersisa ${stock}`,
                icon: 'bi-boxes',
                color: 'danger',
                path: '/admin/products',
                sortDate: product.updated_at || product.created_at,
                persistent: false,
            };
        });

export default function NotificationCenter({ currentUser }) {
    const location = useLocation();
    const containerRef = useRef(null);
    const sequenceRef = useRef(0);

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savingRead, setSavingRead] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [readKeys, setReadKeys] = useState([]);
    const [syncError, setSyncError] = useState('');

    const role = currentUser?.role || 'user';
    const basePath = role === 'user' ? '/user' : '/admin';

    const canViewHistory = hasPermission(
        currentUser, 'request.history.view'
    );
    const canViewOrders = hasPermission(
        currentUser, 'approval.merchandise.view'
    );
    const canViewHumas = hasPermission(
        currentUser, 'approval.humas.view'
    );
    const canViewBorrowing = hasPermission(
        currentUser, 'approval.borrowing.view'
    );
    const canViewProducts = hasPermission(
        currentUser, 'products.view'
    );

    const refresh = useCallback(async () => {
        const token = localStorage.getItem('admin_token');

        if (!token) {
            setNotifications([]);
            setReadKeys([]);
            return;
        }

        const sequence = ++sequenceRef.current;
        setLoading(true);

        const calls = [
            { key: 'reads', request: api.get('/notification-reads') },
        ];

        if (canViewHistory) {
            calls.push(
                { key: 'myOrders', request: api.get('/my-orders') },
                { key: 'myHumas', request: api.get('/my-humas-service-requests') },
                { key: 'myBorrowing', request: api.get('/my-borrow-requests') }
            );
        }

        if (canViewOrders) {
            calls.push({ key: 'orders', request: api.get('/orders') });
        }
        if (canViewHumas) {
            calls.push({
                key: 'humas',
                request: api.get('/humas-service-requests'),
            });
        }
        if (canViewBorrowing) {
            calls.push({
                key: 'borrowing',
                request: api.get('/borrow-requests'),
            });
        }
        if (canViewProducts) {
            calls.push({ key: 'products', request: api.get('/products') });
        }

        try {
            const responses = await Promise.allSettled(
                calls.map((call) => call.request)
            );

            if (sequence !== sequenceRef.current) return;

            const data = {};
            const failures = [];

            responses.forEach((result, index) => {
                const key = calls[index].key;

                if (result.status === 'fulfilled') {
                    data[key] = readRows(result.value);
                } else {
                    data[key] = [];
                    failures.push(key);
                    console.error(
                        `Gagal mengambil data notifikasi ${key}:`,
                        result.reason?.response?.data || result.reason
                    );
                }
            });

            // Jangan mengklaim sinkronisasi berhasil jika status
            // sudah dibaca belum dapat diambil dari server.
            if (failures.includes('reads')) {
                setSyncError(
                    'Status notifikasi belum dapat disinkronkan. Periksa API dan migration notification_reads.'
                );
                setNotifications([]);
                return;
            }

            setSyncError(
                failures.length > 0
                    ? 'Sebagian data notifikasi belum berhasil dimuat.'
                    : ''
            );

            const result = [
                ...buildUserNotifications(
                    data.myOrders || [], 'merchandise', basePath
                ),
                ...buildUserNotifications(
                    data.myHumas || [], 'humas', basePath
                ),
                ...buildUserNotifications(
                    data.myBorrowing || [], 'borrowing', basePath
                ),
                ...buildPendingNotifications(
                    data.orders || [],
                    data.humas || [],
                    data.borrowing || []
                ),
                ...buildStockNotifications(data.products || []),
            ];

            const unique = Array.from(
                new Map(result.map((item) => [item.id, item])).values()
            );

            unique.sort(
                (a, b) =>
                    getVersion(b.sortDate) - getVersion(a.sortDate)
            );

            setNotifications(unique);
            setReadKeys(data.reads || []);
        } catch (error) {
            if (sequence !== sequenceRef.current) return;

            console.error('Refresh notifikasi gagal:', error);
            setSyncError('Tidak dapat memperbarui notifikasi.');
        } finally {
            if (sequence === sequenceRef.current) {
                setLoading(false);
            }
        }
    }, [
        basePath,
        canViewHistory,
        canViewOrders,
        canViewHumas,
        canViewBorrowing,
        canViewProducts,
    ]);

    // Refresh ketika halaman berubah, setiap 30 detik,
    // saat tab browser difokuskan, dan setelah approval API.
    useEffect(() => {
        refresh();
        setOpen(false);

        const interval = window.setInterval(
            refresh,
            REFRESH_INTERVAL
        );

        const handleRefresh = () => {
            refresh();
        };

        window.addEventListener(
            'humas:notifications:refresh',
            handleRefresh
        );
        window.addEventListener('focus', handleRefresh);

        return () => {
            sequenceRef.current += 1;
            window.clearInterval(interval);
            window.removeEventListener(
                'humas:notifications:refresh',
                handleRefresh
            );
            window.removeEventListener('focus', handleRefresh);
        };
    }, [refresh, location.pathname]);

    useEffect(() => {
        const handleOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);

        return () =>
            document.removeEventListener('mousedown', handleOutside);
    }, []);

    const readSet = useMemo(
        () => new Set(readKeys),
        [readKeys]
    );

    const unreadNotifications = useMemo(
        () => notifications.filter(
            (item) => item.persistent || !readSet.has(item.id)
        ),
        [notifications, readSet]
    );

    const unreadCount = unreadNotifications.length;
    const visibleNotifications = unreadNotifications.slice(
        0, MAX_VISIBLE_ITEMS
    );

    const readAllAvailable = unreadNotifications.some(
        (item) => !item.persistent
    );

    const markRead = async (keys) => {
        const uniqueKeys = [
            ...new Set(keys),
        ].filter((key) => key && !readSet.has(key));

        if (uniqueKeys.length === 0) return;

        try {
            setSavingRead(true);
            setSyncError('');

            // Endpoint Laravel menerima maksimal 100 key per request.
            for (let i = 0; i < uniqueKeys.length; i += 100) {
                const chunk = uniqueKeys.slice(i, i + 100);

                await api.post('/notification-reads', {
                    keys: chunk,
                });

                setReadKeys((previous) => [
                    ...new Set([...previous, ...chunk]),
                ]);
            }
        } catch (error) {
            console.error('Tandai notifikasi dibaca gagal:', error);
            setSyncError(
                error?.response?.data?.message ||
                'Gagal menyimpan status sudah dibaca.'
            );
        } finally {
            setSavingRead(false);
        }
    };

    const handleNotificationClick = (notification) => {
        setOpen(false);

        // Pending tidak ditandai selesai hanya karena dibuka.
        // Admin harus benar-benar melakukan approval atau reject.
        if (!notification.persistent) {
            void markRead([notification.id]);
        }
    };

    const handleMarkAllRead = async () => {
        const keys = unreadNotifications
            .filter((item) => !item.persistent)
            .map((item) => item.id);

        await markRead(keys);
    };

    const footerPath = () => {
        if (canViewHistory) return `${basePath}/my-requests`;
        if (canViewOrders) return '/admin/orders';
        if (canViewHumas) return '/admin/humas-services';
        if (canViewBorrowing) return '/admin/borrow-requests';
        if (canViewProducts) return '/admin/products';
        return getDefaultPath(currentUser);
    };

    return (
        <div
            className="topbar-notification"
            ref={containerRef}
        >
            <button
                type="button"
                className="topbar-notification-button"
                aria-label={`Notifikasi, ${unreadCount} belum dibaca atau perlu tindakan`}
                aria-expanded={open}
                onClick={() => setOpen((previous) => !previous)}
            >
                <i className="bi bi-bell-fill" />

                {unreadCount > 0 && (
                    <span className="topbar-notification-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="topbar-notification-panel">
                    <div className="topbar-notification-header">
                        <div>
                            <div className="fw-bold">
                                Notifikasi
                            </div>
                            <div className="small text-muted">
                                {unreadCount} perlu diperhatikan
                                {' • '}Diperbarui setiap 30 detik
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-pill"
                            onClick={refresh}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm" />
                            ) : (
                                <>
                                    <i className="bi bi-arrow-clockwise me-1" />
                                    Refresh
                                </>
                            )}
                        </button>
                    </div>

                    {syncError && (
                        <div className="alert alert-warning small rounded-0 mb-0">
                            <i className="bi bi-exclamation-triangle me-2" />
                            {syncError}
                        </div>
                    )}

                    {readAllAvailable && (
                        <div className="px-3 py-2 border-bottom d-flex justify-content-end">
                            <button
                                type="button"
                                className="btn btn-sm btn-link text-success text-decoration-none fw-semibold"
                                onClick={handleMarkAllRead}
                                disabled={savingRead}
                            >
                                {savingRead ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check2-all me-2" />
                                        Tandai Semua Dibaca
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {unreadCount === 0 ? (
                        <div className="topbar-notification-empty">
                            {loading ? (
                                <div className="spinner-border spinner-border-sm text-success mb-2" />
                            ) : (
                                <i className="bi bi-check-circle-fill fs-2 text-success mb-2" />
                            )}

                            <div className="fw-bold">
                                {loading
                                    ? 'Memuat Notifikasi'
                                    : 'Tidak ada notifikasi baru'}
                            </div>

                            <div className="small text-muted">
                                Semua informasi yang tersedia sudah diperiksa.
                            </div>
                        </div>
                    ) : (
                        <div className="topbar-notification-list">
                            {visibleNotifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={notification.path}
                                    className="topbar-notification-item"
                                    onClick={() =>
                                        handleNotificationClick(notification)
                                    }
                                >
                                    <div
                                        className={`icon-box bg-${notification.color}-subtle text-${notification.color}`}
                                    >
                                        <i className={`bi ${notification.icon}`} />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="topbar-notification-title">
                                            {notification.title}
                                        </div>

                                        <div className="topbar-notification-description text-truncate">
                                            {notification.description}
                                        </div>

                                        <div className="topbar-notification-meta text-truncate">
                                            {notification.meta}
                                        </div>

                                        {notification.persistent && (
                                            <div className="small text-danger fw-semibold mt-1">
                                                Perlu tindakan
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {unreadCount > MAX_VISIBLE_ITEMS && (
                        <div className="small text-muted text-center py-2 border-top">
                            Menampilkan {MAX_VISIBLE_ITEMS} dari {unreadCount} notifikasi.
                        </div>
                    )}

                    <div className="topbar-notification-footer">
                        <Link
                            to={footerPath()}
                            onClick={() => setOpen(false)}
                        >
                            Buka halaman terkait
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
