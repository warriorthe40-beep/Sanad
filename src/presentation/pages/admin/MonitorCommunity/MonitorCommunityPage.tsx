import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function MonitorCommunityPage() {
  return (
    <PagePlaceholder
      title="Monitor community data"
      subtitle="Spot and flag incorrect outlier entries."
      description="Will surface aggregated warranty/return suggestions and highlight outliers that might need flagging or correction."
      nextSteps={[
        'Compute modal values per (store, category) and highlight anomalies.',
        'Expose a flag action that adjusts the community suggestion weight.',
      ]}
    />
  );
}
