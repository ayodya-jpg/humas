export default function BorrowingPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Pengajuan Peminjaman</h2>
                    <p>Halaman ini nanti digunakan user untuk mengajukan peminjaman barang atau aset.</p>
                </div>
            </div>

            <div className="empty-state">
                <h3>Fitur peminjaman belum dihubungkan</h3>
                <p>
                    Setelah fitur checkout selesai, bagian ini akan memakai API khusus peminjaman seperti
                    borrow requests dan borrow request items.
                </p>
            </div>
        </div>
    );
}