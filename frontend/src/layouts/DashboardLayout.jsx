import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Breadcrumbs from '../components/Breadcrumbs';

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="dashboard-shell">
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                isSidebarOpen={sidebarOpen}
                setIsSidebarOpen={setSidebarOpen}
            />

            <div className="dashboard-main">
                <Topbar
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    isSidebarOpen={sidebarOpen}
                    setIsSidebarOpen={setSidebarOpen}
                />

                <main className="dashboard-content">
                    <Breadcrumbs />
                    <Outlet />
                </main>
            </div>
        </div>
    );
}