import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function AlertsPage() {
  return (
    <PagePlaceholder
      title="Warranty alerts"
      subtitle="Stay ahead of expiring coverage."
      description="Will show upcoming warranty and return-window expiries — the same events that trigger push notifications at 90, 60, 30, and 7 days out."
      nextSteps={[
        'Load alerts from the alerts collection, grouped by days until expiry.',
        'Expose &ldquo;mark as read&rdquo; for each alert.',
        'Deep-link each alert to the owning purchase.',
      ]}
    />
  );
}
