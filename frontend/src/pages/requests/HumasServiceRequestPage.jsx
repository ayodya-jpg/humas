export default function HumasServiceRequestPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Ajukan Layanan Humas</h2>
                    <p>
                        Form request layanan publikasi, dokumentasi, desain, dan pembuatan web.
                    </p>
                </div>
            </div>

            <div className="empty-state premium-empty">
                <span className="empty-icon">✦</span>
                <h3>Form Layanan Humas segera dibuat</h3>
                <p>
                    Nanti user dapat memilih jenis layanan, mengisi detail kegiatan,
                    deadline, lokasi, referensi, dan lampiran pendukung.
                </p>
            </div>
        </div>
    );
}