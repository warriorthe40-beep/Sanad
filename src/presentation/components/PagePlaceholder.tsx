import type { ReactNode } from 'react';
import styles from './PagePlaceholder.module.css';

interface PagePlaceholderProps {
  title: string;
  subtitle?: string;
  description: string;
  nextSteps?: string[];
  children?: ReactNode;
}

/**
 * Shared page scaffold used by every route until the real implementation
 * lands. Gives the whole presentation layer a consistent look while the
 * individual pages are still placeholders.
 */
export default function PagePlaceholder({
  title,
  subtitle,
  description,
  nextSteps,
  children,
}: PagePlaceholderProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>
      <section className={styles.card}>
        <span className={styles.badge}>Placeholder</span>
        <p className={styles.body}>{description}</p>
        {nextSteps && nextSteps.length > 0 ? (
          <ul className={styles.bulletList}>
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </section>
    </div>
  );
}
