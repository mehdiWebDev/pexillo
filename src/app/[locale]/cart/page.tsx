// app/[locale]/cart/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CartPageClient from './CartPageClient';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params; // AWAIT params first
  const t = await getTranslations({ locale, namespace: 'cart' });
  
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function CartPage() {
  return <CartPageClient />;
}