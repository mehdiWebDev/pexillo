// src/app/[locale]/dashboard/products/[id]/page.tsx
import ProductForm from '@/src/components/dashboard/ProductForm';

interface EditProductPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  return <ProductForm productId={id} />;
}