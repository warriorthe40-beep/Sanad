import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function AdminDashboardPage() {
  return (
    <PagePlaceholder
      title="Admin dashboard"
      subtitle="Manage categories, store policies, and community data quality."
      description="Entry point for admin-only tools. Will surface high-level counts and link to the management screens."
      nextSteps={[
        'Show counts of users, purchases, categories, and flagged community entries.',
        'Link out to Manage Categories, Store Policies, and Community Data.',
      ]}
    />
  );
}
