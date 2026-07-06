import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardLayout() {
    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="main-wrapper">
                <Topbar />

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}