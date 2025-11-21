// src/app/[locale]/dashboard/customers/[id]/page.tsx
import CustomerForm from '@/src/components/dashboard/CustomerForm';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerForm customerId={id} />;
}
