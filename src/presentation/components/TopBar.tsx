import styles from './TopBar.module.css';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        ☰
      </button>
      <span className={styles.title}>Sanad</span>
      <div className={styles.spacer} />
    </header>
  );
}
