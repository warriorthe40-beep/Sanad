import { Link } from 'react-router-dom';
import styles from '../Login/LoginPage.module.css';

export default function RegisterPage() {
  return (
    <div>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.subheading}>Start organising your receipts and warranties in one place.</p>
      <div className={styles.placeholder}>
        Registration form coming next — name, email, and password (min 8 characters).
      </div>
      <p className={styles.switchLink}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
