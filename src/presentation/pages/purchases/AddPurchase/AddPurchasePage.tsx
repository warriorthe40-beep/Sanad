import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function AddPurchasePage() {
  return (
    <PagePlaceholder
      title="Add purchase"
      subtitle="Full form — great for expensive or warranted items."
      description="Will collect product name, store, category, price, purchase date, optional warranty duration, optional return window, documents, and notes. AI receipt scanning will pre-fill fields from a photo."
      nextSteps={[
        'Implement the full form with validation and community warranty suggestions.',
        'Hook up AI receipt scanning via src/services/anthropic.',
        'On save, call PurchaseRepository.create and schedule alerts.',
      ]}
    />
  );
}
