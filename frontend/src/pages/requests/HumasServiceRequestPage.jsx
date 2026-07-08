export default function HumasServiceRequestPage() {
    const serviceTypes = [
        {
            icon: 'bi-megaphone-fill',
            title: 'Publikasi',
            description: 'Request publikasi kegiatan melalui kanal resmi HUMAS.',
            color: 'primary',
        },
        {
            icon: 'bi-camera-fill',
            title: 'Dokumentasi',
            description: 'Request foto atau video dokumentasi kegiatan.',
            color: 'success',
        },
        {
            icon: 'bi-palette-fill',
            title: 'Desain',
            description: 'Request desain poster, banner, sertifikat, atau kebutuhan visual lain.',
            color: 'warning',
        },
        {
            icon: 'bi-window-stack',
            title: 'Website',
            description: 'Request bantuan konten atau kebutuhan publikasi pada website.',
            color: 'danger',
        },
    ];

    return (
        <div className="container-fluid px-0">
            <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-4">
                <div
                    className="card-body p-4 p-lg-5 text-white"
                    style={{
                        background:
                            'radial-gradient(circle at top right, rgba(255,255,255,.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #7c3aed 55%, #dc2626 120%)',
                    }}
                >
                    <div className="row align-items-center g-4">
                        <div className="col-lg-9">
                            <span className="text-white-50 small fw-bold text-uppercase">
                                HUMAS Service Request
                            </span>

                            <h2 className="display-5 fw-black mt-2 mb-3">
                                Ajukan Layanan Humas
                            </h2>

                            <p className="mb-0 text-white-50" style={{ maxWidth: 820, lineHeight: 1.8 }}>
                                Halaman ini nantinya digunakan untuk mengajukan layanan publikasi,
                                dokumentasi, desain, dan kebutuhan website kepada unit HUMAS.
                            </p>
                        </div>

                        <div className="col-lg-3">
                            <div className="bg-white bg-opacity-10 border border-white border-opacity-25 rounded-5 p-4 text-center">
                                <i className="bi bi-hourglass-split display-5"></i>

                                <p className="mb-0 mt-3 text-white-50 small fw-bold text-uppercase">
                                    Coming Soon
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="row g-3 mb-4">
                {serviceTypes.map((service) => (
                    <div className="col-12 col-md-6 col-xl-3" key={service.title}>
                        <div className="card border-0 shadow-sm rounded-5 h-100">
                            <div className="card-body p-4">
                                <div className={`icon-box bg-${service.color}-subtle text-${service.color} mb-3`}>
                                    <i className={`bi ${service.icon} fs-4`}></i>
                                </div>

                                <h5 className="fw-black mb-2">
                                    {service.title}
                                </h5>

                                <p className="text-muted mb-0" style={{ lineHeight: 1.7 }}>
                                    {service.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 align-items-start">
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4 p-lg-5">
                            <span className="text-primary small fw-bold text-uppercase">
                                Draft Form
                            </span>

                            <h4 className="fw-black mt-2 mb-3">
                                Form Layanan Humas Segera Dibuat
                            </h4>

                            <p className="text-muted" style={{ lineHeight: 1.8 }}>
                                Nantinya user dapat memilih jenis layanan, mengisi nama kegiatan,
                                tanggal kegiatan, lokasi, deadline, deskripsi kebutuhan, referensi,
                                serta mengunggah lampiran pendukung. Data tersebut kemudian masuk
                                ke halaman approval admin HUMAS.
                            </p>

                            <div className="alert alert-info rounded-4 mb-0">
                                <strong>Rencana field:</strong> jenis layanan, nama kegiatan, tanggal,
                                lokasi, PIC, deadline, deskripsi kebutuhan, dan lampiran.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm rounded-5 h-100">
                        <div className="card-body p-4 p-lg-5">
                            <div className="d-flex align-items-start gap-3 mb-4">
                                <div className="icon-box bg-primary-subtle text-primary">
                                    <i className="bi bi-info-circle-fill fs-4"></i>
                                </div>

                                <div>
                                    <h4 className="fw-black mb-1">
                                        Alur Pengajuan
                                    </h4>

                                    <p className="text-muted mb-0">
                                        Gambaran alur layanan HUMAS.
                                    </p>
                                </div>
                            </div>

                            <div className="d-grid gap-3">
                                <div className="d-flex gap-3 bg-light border rounded-4 p-3">
                                    <span className="badge text-bg-primary rounded-pill align-self-start">
                                        1
                                    </span>
                                    <div>
                                        <strong>User membuat pengajuan</strong>
                                        <p className="text-muted small mb-0">
                                            User mengisi detail kegiatan dan kebutuhan layanan.
                                        </p>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 bg-light border rounded-4 p-3">
                                    <span className="badge text-bg-primary rounded-pill align-self-start">
                                        2
                                    </span>
                                    <div>
                                        <strong>Admin memeriksa request</strong>
                                        <p className="text-muted small mb-0">
                                            Admin dapat approve, meminta revisi, atau menolak.
                                        </p>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 bg-light border rounded-4 p-3">
                                    <span className="badge text-bg-primary rounded-pill align-self-start">
                                        3
                                    </span>
                                    <div>
                                        <strong>Layanan diproses</strong>
                                        <p className="text-muted small mb-0">
                                            Request yang disetujui akan diproses oleh HUMAS.
                                        </p>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 bg-light border rounded-4 p-3">
                                    <span className="badge text-bg-primary rounded-pill align-self-start">
                                        4
                                    </span>
                                    <div>
                                        <strong>Status selesai</strong>
                                        <p className="text-muted small mb-0">
                                            Admin menandai request sebagai selesai.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}