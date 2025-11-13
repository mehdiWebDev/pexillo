// app/[locale]/checkout/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CheckoutClient from './CheckoutClient';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}