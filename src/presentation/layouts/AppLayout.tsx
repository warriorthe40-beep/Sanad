import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
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

  const isOnQuickAdd = location.pathname === '/purchases/new/quick';

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
      {!isOnQuickAdd ? <QuickAddFab /> : null}
    </div>
  );
}

function QuickAddFab() {
  return (
    <Link
      to="/purchases/new/quick"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-hover hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand/50"
    >
      Quick Add
    </Link>
  );
}
