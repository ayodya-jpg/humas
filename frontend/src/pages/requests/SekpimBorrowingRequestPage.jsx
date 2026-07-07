export default function SekpimBorrowingRequestPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Ajukan Peminjaman Sekpim</h2>
                    <p>
                        Form peminjaman alat Sekpim seperti taplak meja, almamater,
                        dan perlengkapan kegiatan.
                    </p>
                </div>
            </div>

            <div className="empty-state premium-empty">
                <span className="empty-icon">□</span>
                <h3>Form Peminjaman Sekpim segera dibuat</h3>
                <p>
                    Nanti form ini dibuat sederhana dengan dropdown barang, jumlah,
                    tanggal pinjam, tanggal kembali, lokasi, dan keperluan.
                </p>
            </div>
        </div>
    );
}