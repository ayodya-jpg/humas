import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const openSidebar = () => {
        setSidebarOpen(true);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="app-shell">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            {sidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop d-lg-none"
                    onClick={closeSidebar}
                    aria-label="Close sidebar"
                />
            )}

            <div className="app-main">
                <Topbar onOpenSidebar={openSidebar} />

                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}