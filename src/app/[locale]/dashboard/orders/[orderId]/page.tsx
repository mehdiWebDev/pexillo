// src/app/[locale]/dashboard/orders/[orderId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Badge } from '@/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  ArrowLeft,
  Printer,
  User,
  Package,
  DollarSign,
  Truck,
  MapPin,
  CreditCard,
  Clock,
  FileText,
  Send,
  Mail,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';
import { use } from 'react';

interface OrderDetail {
  order: any;
  customer: any;
  items: any[];
  notes: any[];
  timeline: any[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  printing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const CARRIERS = {
  canada_post: 'Canada Post',
  purolator: 'Purolator',
  ups: 'UPS',
  fedex: 'FedEx'
};

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const t = useTranslations('orderDetail');
  const tAdmin = useTranslations('admin');
  const { toast } = useToast();

  const [orderData, setOrderData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    status: '',
    shipping_carrier: '',
    tracking_number: '',
    estimated_delivery_date: ''
  });
  const [newNote, setNewNote] = useState('');
  const [copiedLookupCode, setCopiedLookupCode] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [resolvedParams.orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${resolvedParams.orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');

      const data = await response.json();
      setOrderData(data);

      // Initialize tracking form
      // Convert estimated_delivery_date to YYYY-MM-DD format for date input
      let formattedDate = '';
      if (data.order.estimated_delivery_date) {
        // Parse date string directly to avoid timezone conversion
        const dateStr = data.order.estimated_delivery_date;
        // Extract date part (handles both "2025-11-18" and "2025-11-18T00:00:00Z" formats)
        formattedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      }

      setTrackingForm({
        status: data.order.status || '',
        shipping_carrier: data.order.shipping_carrier || '',
        tracking_number: data.order.tracking_number || '',
        estimated_delivery_date: formattedDate
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTracking = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${resolvedParams.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingForm)
      });

      if (!response.ok) throw new Error('Failed to update order');

      toast({
        title: 'Success',
        description: t('orderUpdated')
      });

      setEditingTracking(false);
      fetchOrderDetail();
    } catch (error) {
      toast({
        title: 'Error',
        description: t('errorUpdating'),
        variant: 'destructive'
      });
    }
  };

  const handleSendTrackingEmail = async () => {
    try {
      const response = await fetch('/api/orders/send-tracking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: resolvedParams.orderId })
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast({
        title: 'Success',
        description: t('trackingEmailSent')
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('errorSendingEmail'),
        variant: 'destructive'
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`/api/admin/orders/${resolvedParams.orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote })
      });

      if (!response.ok) throw new Error('Failed to add note');

      toast({
        title: 'Success',
        description: t('noteSaved')
      });

      setNewNote('');
      fetchOrderDetail();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive'
      });
    }
  };

  const copyLookupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedLookupCode(true);
    setTimeout(() => setCopiedLookupCode(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading order details...</div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Order not found</div>
      </div>
    );
  }

  const { order, customer, items, notes, timeline } = orderData;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/orders')}
          >
            <ArrowLeft size={16} className="mr-2" />
            {t('backToOrders')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={trackingForm.status}
            onValueChange={(value) => {
              setTrackingForm(prev => ({ ...prev, status: value }));
              // Auto-save status changes
              fetch(`/api/admin/orders/${resolvedParams.orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: value })
              }).then(() => fetchOrderDetail());
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{tAdmin('statuses.pending')}</SelectItem>
              <SelectItem value="confirmed">{tAdmin('statuses.confirmed')}</SelectItem>
              <SelectItem value="processing">{tAdmin('statuses.processing')}</SelectItem>
              <SelectItem value="printing">{tAdmin('statuses.printing')}</SelectItem>
              <SelectItem value="shipped">{tAdmin('statuses.shipped')}</SelectItem>
              <SelectItem value="delivered">{tAdmin('statuses.delivered')}</SelectItem>
              <SelectItem value="cancelled">{tAdmin('statuses.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          <Badge className={paymentStatusColors[order.payment_status]}>
            {order.payment_status}
          </Badge>
          <Button variant="outline" size="sm">
            <Printer size={16} className="mr-2" />
            {t('printReceipt')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              {t('customerInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">{t('name')}</div>
              <div className="font-medium">{customer.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('email')}</div>
              <a href={`mailto:${customer.email}`} className="font-medium text-blue-600 hover:underline">
                {customer.email}
              </a>
            </div>
            {customer.phone && (
              <div>
                <div className="text-sm text-muted-foreground">{t('phone')}</div>
                <a href={`tel:${customer.phone}`} className="font-medium text-blue-600 hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">{t('accountType')}</div>
              <Badge variant={customer.accountType === 'guest' ? 'secondary' : 'default'}>
                {customer.accountType === 'guest' ? t('guestOrder') : t('registeredUser')}
              </Badge>
            </div>
            {customer.lookupCode && (
              <div>
                <div className="text-sm text-muted-foreground">{t('lookupCode')}</div>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-lg">{customer.lookupCode}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLookupCode(customer.lookupCode)}
                  >
                    {copiedLookupCode ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              {t('orderSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('shipping')}</span>
              <span className="font-medium">
                {order.shipping_amount === 0 ? t('freeShipping') : formatCurrency(order.shipping_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('tax')}</span>
              <span className="font-medium">{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-bold">{t('total')}</span>
              <span className="text-lg font-bold">{formatCurrency(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.variant_size} - {item.variant_color}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {t('quantity')}: {item.quantity} × {formatCurrency(item.unit_price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(item.total_price)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shipping & Tracking Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck size={20} />
              {t('shippingTracking')}
            </CardTitle>
            {!editingTracking && (
              <Button size="sm" variant="outline" onClick={() => setEditingTracking(true)}>
                {t('edit')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingTracking ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('shippingCarrier')}</label>
                <Select
                  value={trackingForm.shipping_carrier}
                  onValueChange={(value) => setTrackingForm(prev => ({ ...prev, shipping_carrier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tAdmin('selectCarrier')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="canada_post">{tAdmin('carriers.canada_post')}</SelectItem>
                    <SelectItem value="purolator">{tAdmin('carriers.purolator')}</SelectItem>
                    <SelectItem value="ups">{tAdmin('carriers.ups')}</SelectItem>
                    <SelectItem value="fedex">{tAdmin('carriers.fedex')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t('trackingNumber')}</label>
                <Input
                  value={trackingForm.tracking_number}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                  placeholder={tAdmin('enterTrackingNumber')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('estimatedDelivery')}</label>
                <Input
                  type="date"
                  value={trackingForm.estimated_delivery_date}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateTracking}>{t('save')}</Button>
                <Button variant="outline" onClick={() => setEditingTracking(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {order.shipping_carrier && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('shippingCarrier')}</div>
                  <div className="font-medium">{CARRIERS[order.shipping_carrier as keyof typeof CARRIERS]}</div>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('trackingNumber')}</div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{order.tracking_number}</code>
                    {order.shipping_carrier && (
                      <a
                        href={getTrackingUrl(order.shipping_carrier, order.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        View on {CARRIERS[order.shipping_carrier as keyof typeof CARRIERS]}
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {order.estimated_delivery_date && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('estimatedDelivery')}</div>
                  <div className="font-medium">
                    {(() => {
                      // Parse date as local date to avoid timezone shift
                      const dateStr = order.estimated_delivery_date;
                      const [year, month, day] = dateStr.includes('T')
                        ? dateStr.split('T')[0].split('-')
                        : dateStr.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping and Billing Addresses */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipping Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              {t('shippingAddress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping_address && (
              <div className="space-y-4">
                {/* Contact Information Section */}
                {(order.shipping_address.email || order.shipping_address.phone) && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail size={14} />
                      {t('contactInformation')}
                    </div>
                    {order.shipping_address.email && (
                      <div>
                        <div className="text-xs text-muted-foreground">{t('email')}</div>
                        <a href={`mailto:${order.shipping_address.email}`} className="text-blue-600 hover:underline font-medium">
                          {order.shipping_address.email}
                        </a>
                      </div>
                    )}
                    {order.shipping_address.phone && (
                      <div>
                        <div className="text-xs text-muted-foreground">{t('phone')}</div>
                        <a href={`tel:${order.shipping_address.phone}`} className="text-blue-600 hover:underline font-medium">
                          {order.shipping_address.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Address Section */}
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t('deliveryAddress')}</div>
                  <div className="font-medium">
                    {order.shipping_address.firstName} {order.shipping_address.lastName}
                  </div>
                  <div>{order.shipping_address.address}</div>
                  {order.shipping_address.apartment && <div>{order.shipping_address.apartment}</div>}
                  <div>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}
                  </div>
                  <div>{order.shipping_address.country}</div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${order.shipping_address.address}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postalCode}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-2"
                  >
                    {t('viewOnMaps')}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={20} />
              {t('billingAddress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.billing_address ? (
              <div className="space-y-1">
                <div className="font-medium">
                  {order.billing_address.firstName} {order.billing_address.lastName}
                </div>
                <div>{order.billing_address.address}</div>
                {order.billing_address.apartment && <div>{order.billing_address.apartment}</div>}
                <div>
                  {order.billing_address.city}, {order.billing_address.state} {order.billing_address.postalCode}
                </div>
                <div>{order.billing_address.country}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${order.billing_address.address}, ${order.billing_address.city}, ${order.billing_address.state} ${order.billing_address.postalCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-2"
                >
                  {t('viewOnMaps')}
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('sameAsShipping')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            {t('paymentInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">{t('paymentMethod')}</div>
            <div className="font-medium capitalize">{order.payment_method || 'Stripe (Card)'}</div>
          </div>
          {order.stripe_payment_intent_id && (
            <div>
              <div className="text-sm text-muted-foreground">{t('paymentIntentId')}</div>
              <code className="text-xs">{order.stripe_payment_intent_id}</code>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">{t('amountCharged')}</div>
            <div className="font-medium">{formatCurrency(order.total_amount)} {order.currency || 'CAD'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('paymentStatus')}</div>
            <Badge className={paymentStatusColors[order.payment_status]}>
              {order.payment_status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Order Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            {t('orderTimeline')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((event, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  {index < timeline.length - 1 && <div className="w-0.5 h-full bg-gray-300 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-medium">{event.event}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(event.timestamp)} • {event.by}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            {t('adminNotes')}
          </CardTitle>
          <CardDescription>{t('privateNote')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border-l-2 border-blue-500 pl-4 py-2">
              <div className="text-sm text-muted-foreground">
                {formatDate(note.created_at)} • {note.created_by}
              </div>
              <div className="mt-1">{note.note}</div>
            </div>
          ))}
          <div className="space-y-2 pt-4 border-t">
            <Textarea
              placeholder={t('addNote')}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              {t('saveNote')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleSendTrackingEmail}
          disabled={!order.tracking_number}
        >
          <Send size={16} className="mr-2" />
          {t('sendTrackingEmail')}
        </Button>
        <Button variant="outline">
          <Mail size={16} className="mr-2" />
          {t('resendConfirmation')}
        </Button>
      </div>
    </div>
  );
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const urls: Record<string, string> = {
    canada_post: `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`,
    purolator: `https://www.purolator.com/en/shipping/tracker?pin=${trackingNumber}`,
    ups: `https://www.ups.com/track?loc=en_CA&tracknum=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  };
  return urls[carrier] || '#';
}
