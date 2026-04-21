import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function PurchaseListPage() {
  return (
    <PagePlaceholder
      title="Your purchases"
      subtitle="Everything you&apos;ve logged, from coffees to laptops."
      description="This is the main dashboard. It will list every purchase with product, store, price, and warranty status, plus search and filter controls."
      nextSteps={[
        'Render a filterable, searchable list backed by PurchaseRepository.getByUserId.',
        'Show warranty countdowns for items that have coverage.',
        'Quick Add and Add Purchase buttons in the header.',
      ]}
    />
  );
}
