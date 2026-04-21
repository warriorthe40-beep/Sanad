import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  return (
    <div>
      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.subheading}>Sign in to keep track of your purchases and warranties.</p>
      <div className={styles.placeholder}>
        Login form coming next — this page will collect email &amp; password and call the auth service.
      </div>
      <p className={styles.switchLink}>
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
