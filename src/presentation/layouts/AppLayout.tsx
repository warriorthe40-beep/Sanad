import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/presentation/components/Sidebar';
import TopBar from '@/presentation/components/TopBar';
import styles from './AppLayout.module.css';

/**
 * The authenticated shell used by every user/admin page: persistent sidebar
 * on desktop, off-canvas drawer on mobile, topbar carrying the hamburger.
 * Nested routes render into the <Outlet />.
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropOpen : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div className={styles.main}>
        <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
