export default function MyRequestsPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Riwayat Pengajuan Saya</h2>
                    <p>
                        Pantau semua pengajuan merchandise, layanan humas, dan peminjaman
                        Sekpim yang pernah kamu buat.
                    </p>
                </div>
            </div>

            <div className="empty-state premium-empty">
                <span className="empty-icon">⌂</span>
                <h3>Riwayat pengajuan segera dibuat</h3>
                <p>
                    Nanti halaman ini menampilkan status pending, approved, revision,
                    rejected, completed, borrowed, dan returned sesuai jenis pengajuan.
                </p>
            </div>
        </div>
    );
}