// src/app/[locale]/profile/components/OrdersSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import { ShoppingBag, Package, Truck, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
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

const statusConfig: Record<string, {
  label: string;
  icon: any;
  className: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Package,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
  refunded: {
    label: 'Refunded',
    icon: XCircle,
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
  },
};

export default function OrdersSection({ userId }: OrdersSectionProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
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
      const transformedOrders = ordersData.map((order: any) => ({
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
  };

  const handleTrackOrder = (orderNumber: string) => {
    router.push(`/track-order?order=${orderNumber}`);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {t('recentOrders')}
        </h2>
        {orders.length > 0 && (
          <ShoppingBag className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 dark:bg-slate-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('noOrders')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-5 hover:shadow-md transition-all duration-200"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t('orderNumber')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('orderDate')}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('items')}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {order.items_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('total')}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Track Button */}
                <button
                  onClick={() => handleTrackOrder(order.order_number)}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md py-2 px-4 text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
