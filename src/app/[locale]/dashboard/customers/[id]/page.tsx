// src/app/[locale]/dashboard/customers/[id]/page.tsx
import CustomerForm from '@/src/components/dashboard/CustomerForm';

interface PageProps {
  params: {
    id: string;
  };
}

export default function CustomerDetailPage({ params }: PageProps) {
  return <CustomerForm customerId={params.id} />;
}
