import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

/**
 * Centered-card layout used by Login and Register. No sidebar/topbar so
 * unauthenticated users aren't exposed to the rest of the navigation.
 */
export default function AuthLayout() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Sanad</span>
          <span className={styles.brandTagline}>Warranty &amp; Receipt Organizer</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
