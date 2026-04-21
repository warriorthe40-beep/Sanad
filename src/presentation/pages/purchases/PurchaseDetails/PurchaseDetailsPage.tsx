import { useParams } from 'react-router-dom';
import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function PurchaseDetailsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <PagePlaceholder
      title="Purchase details"
      subtitle={id ? `Viewing purchase #${id}` : undefined}
      description="Will show the full purchase: product info, documents with zoom, warranty countdown, store details, and actions to edit, delete, or report an issue."
      nextSteps={[
        'Load the purchase via PurchaseRepository.getById.',
        'Render documents with a zoom overlay.',
        'Expose Edit, Delete, and Report Issue controls.',
      ]}
    />
  );
}
