import { useParams } from 'react-router-dom';
import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <PagePlaceholder
      title="Edit purchase"
      subtitle={id ? `Editing purchase #${id}` : undefined}
      description="Will reuse the Add Purchase form pre-filled with existing values, and let the user add warranty info or documents that weren&apos;t entered originally."
      nextSteps={[
        'Reuse the AddPurchase form in edit mode.',
        'Call PurchaseRepository.update on save.',
      ]}
    />
  );
}
