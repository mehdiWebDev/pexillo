// src/app/[locale]/dashboard/categories/[id]/page.tsx
import CategoryForm from '@/src/components/dashboard/CategoryForm';

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  return <CategoryForm categoryId={id} />;
}