// src/app/[locale]/profile/components/OrdersSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import { Truck, CheckCircle, XCircle, Loader2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface OrderItem {
  product_name: string;
  product_images: { image_url: string }[];
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items_count: number;
  order_items?: OrderItem[];
}

interface OrdersSectionProps {
  userId: string;
}

// Database result types
interface DbOrderItem {
  id: string;
  quantity: number;
  products: {
    name: string;
    product_images?: { image_url: string; is_primary: boolean }[];
  }[];
}

interface DbOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items?: DbOrderItem[];
}

const getStatusConfig = (t: (key: string) => string) => ({
  pending: {
    label: t('orderStatus.pending'),
    icon: Package,
    className: 'bg-yellow-100 text-yellow-700',
  },
  confirmed: {
    label: t('orderStatus.confirmed'),
    icon: CheckCircle,
    className: 'bg-blue-100 text-blue-700',
  },
  processing: {
    label: t('orderStatus.processing'),
    icon: Package,
    className: 'bg-purple-100 text-purple-700',
  },
  shipped: {
    label: t('orderStatus.shipped'),
    icon: Truck,
    className: 'bg-blue-100 text-blue-700',
  },
  delivered: {
    label: t('orderStatus.delivered'),
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: t('orderStatus.cancelled'),
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
  refunded: {
    label: t('orderStatus.refunded'),
    icon: XCircle,
    className: 'bg-gray-100 text-gray-700',
  },
  failed: {
    label: t('orderStatus.failed'),
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
});

export default function OrdersSection({ userId }: OrdersSectionProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Fetch orders with items and images
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            products (
              name,
              product_images (
                image_url,
                is_primary
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('Fetched orders:', ordersData);

      // Transform data
      const transformedOrders = ordersData.map((order: DbOrder) => {
        const items = order.order_items || [];
        const itemsCount = items.length;

        // Get product details for display (first 2 items)
        const orderItems = items
          .filter((item: DbOrderItem) => item.products && item.products.length > 0)
          .slice(0, 2)
          .map((item: DbOrderItem) => {
            const product = item.products[0]; // Get first product (should only be one)
            return {
              product_name: product.name,
              product_images: product.product_images || [],
            };
          });

        return {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at,
          items_count: itemsCount,
          order_items: orderItems,
        };
      });

      console.log('Transformed orders:', transformedOrders);
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
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(t);

  return (
    <div className="space-y-6">
      <h2 className="font-black text-2xl text-brand-dark">{t('recentOrders')}</h2>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-bold text-brand-dark mb-2">
            {t('noOrders')}
          </p>
          <p className="text-sm text-gray-500">
            {t('noOrdersDescription')}
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;

          // Get primary image for first item
          const firstItem = order.order_items?.[0];
          const firstItemImage = firstItem?.product_images?.find((img) => img.image_url)?.image_url;
          const secondItem = order.order_items?.[1];
          const secondItemImage = secondItem?.product_images?.find((img) => img.image_url)?.image_url;

          return (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* Order Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                    {t('orderNumber')} {order.order_number}
                  </p>
                  <p className="font-bold text-brand-dark">
                    {t('placedOn')} {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 ${config.className} rounded-full text-xs font-bold flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </span>
                  <button
                    onClick={() => handleTrackOrder(order.order_number)}
                    className="text-sm font-bold text-brand-dark border-b-2 border-brand-dark hover:text-brand-red hover:border-brand-red transition-colors"
                  >
                    {t('trackOrder')}
                  </button>
                </div>
              </div>

              {/* Order Body */}
              <div className="p-6 flex flex-col sm:flex-row gap-6 items-center">
                {/* Product Images */}
                {(firstItemImage || secondItemImage) && (
                  <div className="flex -space-x-4">
                    {firstItemImage && (
                      <Image
                        src={firstItemImage}
                        alt={firstItem?.product_name || 'Product'}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg border-2 border-white shadow-md object-cover"
                      />
                    )}
                    {secondItemImage && (
                      <Image
                        src={secondItemImage}
                        alt={secondItem?.product_name || 'Product'}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg border-2 border-white shadow-md object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Order Info */}
                <div className="flex-1">
                  <p className="font-bold text-brand-dark text-lg">
                    {firstItem?.product_name || t('order')}
                    {order.items_count > 1 && ` + ${order.items_count - 1} ${t('otherItems', { count: order.items_count - 1 })}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('total')}: <span className="font-black text-brand-dark">${order.total_amount.toFixed(2)}</span>
                  </p>
                </div>

                {/* View Details Button */}
                <button className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-brand-dark hover:border-brand-dark transition-colors">
                  {t('viewDetails')}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
