import PagePlaceholder from '@/presentation/components/PagePlaceholder';

export default function ManageCategoriesPage() {
  return (
    <PagePlaceholder
      title="Manage categories"
      subtitle="Add, edit, and retire product categories."
      description="Will list existing categories and let admins create, rename, or remove them. Backed by CategoryRepository."
      nextSteps={[
        'Render a table of categories with inline edit.',
        'Wire create/update/delete to CategoryRepository.',
      ]}
    />
  );
}
