import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function ClaimsPage() {
  return (
    <PagePlaceholder
      title="Report an issue"
      subtitle="File a claim against an active warranty."
      description="Will let the user describe what&apos;s wrong, attach a damage photo, and see the linked receipt and warranty info alongside."
      nextSteps={[
        'Pick the purchase whose warranty is still active.',
        'Collect description and optional damage photo, then call the claims service.',
      ]}
    />
  );
}
