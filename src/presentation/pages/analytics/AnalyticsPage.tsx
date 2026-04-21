import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function AnalyticsPage() {
  return (
    <PagePlaceholder
      title="Spending analytics"
      subtitle="Understand where your money goes."
      description="Will show total spending, breakdown by category, a monthly trend chart, and the share of purchases that carry warranty coverage."
      nextSteps={[
        'Compute Analytics via the analytics application module from the user&apos;s purchases.',
        'Render totals, a stacked category chart, and a monthly trend line.',
      ]}
    />
  );
}
