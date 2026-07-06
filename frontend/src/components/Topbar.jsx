export default function Topbar() {
    return (
        <header className="topbar">
            <div>
                <h1>HUMAS</h1>
                <p>Sistem Katalog, Checkout, Approval, dan Peminjaman</p>
            </div>

            <div className="topbar-user">
                <span>Admin</span>
                <div className="avatar">A</div>
            </div>
        </header>
    );
}