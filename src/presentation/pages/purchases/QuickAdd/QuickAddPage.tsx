import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function QuickAddPage() {
  return (
    <PagePlaceholder
      title="Quick add"
      subtitle="Three fields. Under ten seconds."
      description="For everyday purchases like coffee or groceries. Just store, category (auto-suggested), and price. Date defaults to today."
      nextSteps={[
        'Render the compact three-field form.',
        'Auto-suggest category from the store name.',
        'On save, call PurchaseRepository.create with minimal fields.',
      ]}
    />
  );
}
