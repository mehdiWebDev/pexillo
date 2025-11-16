// src/app/[locale]/track-order/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';

interface TrackingData {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    payment_status: string;
    total_amount: number;
    currency: string;
    shipping_address: any;
    shipping_carrier: string | null;
    tracking_number: string | null;
    estimated_delivery_date: string | null;
  };
  items: Array<{
    product_name: string;
    variant_size: string;
    variant_color: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image_url: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  printing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  payment_failed: 'bg-red-100 text-red-800'
};

const CARRIERS = {
  canada_post: {
    name: 'Postes Canada / Canada Post',
    trackingUrl: (trackingNumber: string) =>
      `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`
  },
  purolator: {
    name: 'Purolator',
    trackingUrl: (trackingNumber: string) =>
      `https://www.purolator.com/en/shipping/tracker?pin=${trackingNumber}`
  },
  ups: {
    name: 'UPS',
    trackingUrl: (trackingNumber: string) =>
      `https://www.ups.com/track?loc=en_CA&tracknum=${trackingNumber}`
  },
  fedex: {
    name: 'FedEx',
    trackingUrl: (trackingNumber: string) =>
      `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  }
};

export default function TrackOrderPage() {
  const t = useTranslations('tracking');
  const tOrders = useTranslations('orders');
  const { toast } = useToast();

  const [orderNumber, setOrderNumber] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState('');

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim()) {
      setError(t('orderNumberRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTrackingData(null);

      const params = new URLSearchParams();
      if (lookupCode.trim()) {
        params.append('code', lookupCode.trim());
      }

      const response = await fetch(`/api/orders/track/${orderNumber.trim()}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(t('invalidCodeMessage'));
        } else if (response.status === 404) {
          setError(t('orderNotFoundMessage'));
        } else {
          setError(data.error || t('errorGeneric'));
        }
        return;
      }

      setTrackingData(data);
    } catch (err) {
      console.error('Error tracking order:', err);
      setError(t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOrderNumber('');
    setLookupCode('');
    setTrackingData(null);
    setError('');
  };

  const getStatusProgress = (status: string): number => {
    const statusOrder = ['pending', 'confirmed', 'processing', 'printing', 'shipped', 'delivered'];
    const index = statusOrder.indexOf(status);
    return index === -1 ? 0 : ((index + 1) / statusOrder.length) * 100;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'delivered') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'cancelled' || status === 'payment_failed') return <XCircle className="h-5 w-5 text-red-600" />;
    if (status === 'shipped') return <Truck className="h-5 w-5 text-green-600" />;
    return <Package className="h-5 w-5 text-blue-600" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Search Form */}
        {!trackingData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search size={20} />
                {t('enterDetails')}
              </CardTitle>
              <CardDescription>
                {t('enterDetailsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrackOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('orderNumber')} *
                  </label>
                  <Input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ORD-XXXXXXXX"
                    className="uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('lookupCode')} ({t('guestOrdersOnly')})
                  </label>
                  <Input
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('lookupCodeHint')}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t('searching') : t('trackButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tracking Results */}
        {trackingData && (
          <div className="space-y-6">
            {/* Back Button */}
            <Button variant="outline" onClick={handleReset}>
              {t('trackAnother')}
            </Button>

            {/* Order Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(trackingData.order.status)}
                      {t('orderStatus')}
                    </CardTitle>
                    <CardDescription>
                      {t('orderNumber')}: {trackingData.order.order_number}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[trackingData.order.status] || ''}>
                    {tOrders(`statuses.${trackingData.order.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                {trackingData.order.status !== 'cancelled' && trackingData.order.status !== 'payment_failed' && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${getStatusProgress(trackingData.order.status)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-600">
                      <span>{tOrders('statuses.pending')}</span>
                      <span>{tOrders('statuses.processing')}</span>
                      <span>{tOrders('statuses.shipped')}</span>
                      <span>{tOrders('statuses.delivered')}</span>
                    </div>
                  </div>
                )}

                {/* Order Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('orderDate')}:</span>
                    <p className="font-medium">{formatDate(trackingData.order.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('paymentStatus')}:</span>
                    <p className="font-medium">
                      <Badge className={statusColors[trackingData.order.payment_status] || ''}>
                        {tOrders(`paymentStatuses.${trackingData.order.payment_status}`)}
                      </Badge>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">{t('totalAmount')}:</span>
                    <p className="text-xl font-bold">{formatCurrency(trackingData.order.total_amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Information Card */}
            {trackingData.order.tracking_number && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck size={20} />
                    {t('trackingInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">{t('carrier')}:</label>
                    <p className="font-medium">
                      {trackingData.order.shipping_carrier
                        ? CARRIERS[trackingData.order.shipping_carrier as keyof typeof CARRIERS]?.name
                        : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">{t('trackingNumber')}:</label>
                    <p className="font-medium font-mono">{trackingData.order.tracking_number}</p>
                  </div>

                  {trackingData.order.estimated_delivery_date && (
                    <div>
                      <label className="text-sm text-gray-600">{t('estimatedDelivery')}:</label>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar size={16} />
                        {formatDate(trackingData.order.estimated_delivery_date)}
                      </p>
                    </div>
                  )}

                  {trackingData.order.shipping_carrier && (
                    <Button
                      onClick={() => {
                        const carrier = CARRIERS[trackingData.order.shipping_carrier as keyof typeof CARRIERS];
                        if (carrier && trackingData.order.tracking_number) {
                          window.open(carrier.trackingUrl(trackingData.order.tracking_number), '_blank');
                        }
                      }}
                      className="w-full"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {t('trackWithCarrier')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package size={20} />
                  {t('orderItems')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trackingData.items.map((item, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                          <Package size={32} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product_name}</h4>
                        {(item.variant_size || item.variant_color) && (
                          <p className="text-sm text-gray-600">
                            {item.variant_size} {item.variant_size && item.variant_color && '-'} {item.variant_color}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {t('quantity')}: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.total_price)}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.unit_price)} {t('each')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address Card */}
            {trackingData.order.shipping_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={20} />
                    {t('shippingAddress')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const address = typeof trackingData.order.shipping_address === 'string'
                      ? JSON.parse(trackingData.order.shipping_address)
                      : trackingData.order.shipping_address;

                    return (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">
                          {address.firstName} {address.lastName}
                        </p>
                        <p>{address.address}</p>
                        {address.apartment && <p>{address.apartment}</p>}
                        <p>
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        <p>{address.country === 'CA' ? 'Canada' : 'United States'}</p>
                        {address.phone && <p className="pt-2">{t('phone')}: {address.phone}</p>}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">{t('needHelp')}</h4>
                    <p className="text-sm text-blue-800">
                      {t('helpText')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
