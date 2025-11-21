// src/app/[locale]/profile/components/OrdersSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, Loader2, ExternalLink, LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
}

interface OrdersSectionProps {
  userId: string;
}

interface SupabaseOrderItem {
  count: number;
}

interface SupabaseOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items?: SupabaseOrderItem[];
}

const statusConfig: Record<string, {
  label: string;
  icon: LucideIcon;
  className: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Package,
    className: 'bg-red-500 text-white border border-red-500',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-green-500 text-white border border-green-500',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    className: 'bg-yellow-500 text-white border border-yellow-500',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    className: 'bg-blue-500 text-white border border-blue-500',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'bg-green-500 text-white border border-green-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-500 text-white border border-red-500',
  },
  refunded: {
    label: 'Refunded',
    icon: XCircle,
    className: 'bg-green-500 text-white border border-green-500',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500 text-white border border-red-500',
  },
};

export default function OrdersSection({ userId }: OrdersSectionProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Fetch orders with item count
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          order_items (count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (ordersError) throw ordersError;

      // Transform data
      const transformedOrders = ordersData.map((order: SupabaseOrder) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        items_count: order.order_items?.[0]?.count || 0,
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTrackOrder = (orderNumber: string) => {
    router.push(`/track-order?order=${orderNumber}`);
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">
          {t('recentOrders')}
        </h2>
        {orders.length > 0 && (
          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">
            {t('noOrders')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('noOrdersDescription')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={order.id}
                className="bg-muted/50 border border-border rounded-lg p-5 hover:shadow-md transition-all duration-200"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('orderNumber')}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      #{order.order_number}
                    </p>
                  </div>
                  <div className={`${config.className} rounded-md px-2.5 py-1 flex items-center gap-1`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {t(`orderStatus.${order.status}`) || config.label}
                    </span>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('orderDate')}
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('items')}
                    </span>
                    <span className="font-medium text-foreground">
                      {order.items_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('total')}
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Track Button */}
                <button
                  onClick={() => handleTrackOrder(order.order_number)}
                  className="w-full bg-secondary hover:opacity-90 text-white rounded-md py-2 px-4 text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('trackOrder')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
