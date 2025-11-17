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
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Package,
    bgColor: 'bg-yellow-400',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-600',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    bgColor: 'bg-blue-400',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-600',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    bgColor: 'bg-purple-400',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-600',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    bgColor: 'bg-green-400',
    textColor: 'text-green-900',
    borderColor: 'border-green-600',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bgColor: 'bg-red-400',
    textColor: 'text-red-900',
    borderColor: 'border-red-600',
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
      <div className="bg-white dark:bg-gray-900 border-6 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-6 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase">
          {t('recentOrders')}
        </h2>
        {orders.length > 0 && (
          <ShoppingBag className="h-8 w-8 text-gray-900 dark:text-white" />
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-600 dark:text-gray-400 uppercase">
            {t('noOrders')}
          </p>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-500 mt-2">
            {t('noOrdersDescription')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={order.id}
                className="bg-gray-50 dark:bg-gray-800 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                      {t('orderNumber')}
                    </p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">
                      #{order.order_number}
                    </p>
                  </div>
                  <div className={`${config.bgColor} border-2 ${config.borderColor} px-3 py-1 flex items-center gap-1`}>
                    <StatusIcon className={`h-4 w-4 ${config.textColor}`} />
                    <span className={`text-xs font-black ${config.textColor} uppercase`}>
                      {t(`orderStatus.${order.status}`) || config.label}
                    </span>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {t('orderDate')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {t('items')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {order.items_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {t('total')}
                    </span>
                    <span className="text-lg font-black text-gray-900 dark:text-white">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Track Button */}
                <button
                  onClick={() => handleTrackOrder(order.order_number)}
                  className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] px-4 py-2 text-white dark:text-black font-black text-sm uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] dark:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
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
