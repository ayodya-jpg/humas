export default function BorrowingApprovalPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h2>Approval Peminjaman</h2>
                    <p>Admin dapat approve, revisi, atau tolak pengajuan peminjaman.</p>
                </div>
            </div>

            <div className="empty-state">
                <h3>Approval peminjaman belum dihubungkan</h3>
                <p>
                    Halaman ini nanti akan menampilkan daftar pengajuan peminjaman dari user.
                </p>
            </div>
        </div>
    );
}