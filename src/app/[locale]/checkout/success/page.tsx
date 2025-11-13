// app/[locale]/checkout/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  CheckCircle, 
  Mail, 
  Package, 
  ArrowRight,
  Copy,
  Printer
} from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import Loader from '@/src/components/ui/Loader';

interface OrderDetails {
  order_number: string;
  guest_lookup_code?: string;
  email: string;
  total: number;
  items: any[];
  estimated_delivery: string;
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('checkoutSuccess');
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const orderNumber = searchParams.get('order');
  
  useEffect(() => {
    if (!orderNumber) {
      router.push('/');
      return;
    }
    
    // Fetch order details
    fetchOrderDetails(orderNumber);
  }, [orderNumber, router]);
  
  const fetchOrderDetails = async (orderNum: string) => {
    try {
      const response = await fetch(`/api/orders/${orderNum}`);
      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: t('copied'),
      description: t('orderNumberCopied'),
    });
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  if (isLoading) {
    return <Loader type="default" text={t('loadingOrder')} fullScreen />;
  }
  
  if (!orderDetails) {
    return null;
  }
  
  // Calculate delivery date (7-10 business days)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 10);
  
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">
            {t('thankYou')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('orderConfirmed')}
          </p>
        </div>
        
        {/* Order Information */}
        <div className="bg-card border rounded-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {t('orderNumber')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold">
                  {orderDetails.order_number}
                </span>
                <button
                  onClick={() => copyToClipboard(orderDetails.order_number)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={t('copyOrderNumber')}
                >
                  <Copy size={16} />
                </button>
              </div>
              
              {orderDetails.guest_lookup_code && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>{t('guestLookupCode')}:</strong> {orderDetails.guest_lookup_code}
                  </p>
                  <p className="text-xs mt-1">
                    {t('saveThisCode')}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title={t('printReceipt')}
            >
              <Printer size={20} />
            </button>
          </div>
          
          {/* Email Confirmation */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg mb-6">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{t('confirmationEmailSent')}</p>
              <p className="text-sm text-muted-foreground">
                {t('emailSentTo', { email: orderDetails.email })}
              </p>
            </div>
          </div>
          
          {/* Estimated Delivery */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{t('estimatedDelivery')}</p>
              <p className="text-sm text-muted-foreground">
                {deliveryDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
        
        {/* What's Next */}
        <div className="bg-card border rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('whatsNext')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">{t('step1Title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('step1Description')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">{t('step2Title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('step2Description')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">{t('step3Title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('step3Description')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderDetails.guest_lookup_code ? (
            <Link
              href={`/track-order?order=${orderDetails.order_number}&code=${orderDetails.guest_lookup_code}`}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              {t('trackOrder')}
              <ArrowRight size={20} />
            </Link>
          ) : (
            <Link
              href="/account/orders"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              {t('viewOrders')}
              <ArrowRight size={20} />
            </Link>
          )}
          
          <Link
            href="/products"
            className="px-6 py-3 border rounded-lg hover:bg-muted flex items-center justify-center gap-2"
          >
            {t('continueShopping')}
          </Link>
        </div>
      </div>
    </div>
  );
}