import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'Purchases', icon: '🧾', end: true },
  { to: '/purchases/new', label: 'Add Purchase', icon: '➕' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: '⚙️', end: true },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/policies', label: 'Store Policies', icon: '🏬' },
  { to: '/admin/community', label: 'Community Data', icon: '👥' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
      aria-label="Primary navigation"
    >
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">S</span>
        <span className={styles.brandName}>Sanad</span>
      </div>

      <nav className={styles.group} aria-label="Main">
        <span className={styles.groupLabel}>Main</span>
        {primaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={onClose}
          >
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <nav className={styles.group} aria-label="Admin">
        <span className={styles.groupLabel}>Admin</span>
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
            onClick={onClose}
          >
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <span>Signed in</span>
        <button type="button" className={styles.logout}>Log out</button>
      </div>
    </aside>
  );
}
