import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function ManageStorePoliciesPage() {
  return (
    <PagePlaceholder
      title="Manage store policies"
      subtitle="Baseline warranty and return windows per (store, category)."
      description="Will let admins set the starting values users see as community suggestions when adding purchases. Backed by StorePolicyRepository."
      nextSteps={[
        'Render a filterable table grouped by store.',
        'Wire create/update/delete to StorePolicyRepository.',
      ]}
    />
  );
}
