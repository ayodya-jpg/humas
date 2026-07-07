export default function HumasServiceApprovalPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Layanan Humas</h2>
                    <p>
                        Halaman ini akan digunakan untuk mengelola request publikasi,
                        dokumentasi, desain, dan pembuatan web.
                    </p>
                </div>
            </div>

            <div className="empty-state premium-empty">
                <span className="empty-icon">✦</span>
                <h3>Module Layanan Humas sedang disiapkan</h3>
                <p>
                    Selanjutnya kita akan membuat form request layanan Humas dengan pilihan
                    Publikasi, Dokumentasi, Design, dan Web. Admin dapat approve, revisi,
                    atau menolak request dari halaman ini.
                </p>
            </div>
        </div>
    );
}