// src/app/[locale]/dashboard/orders/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Send,
  X
} from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  items_count: number;
  tracking_number: string | null;
}

interface OrdersData {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    totalRevenue: number;
  };
}

const statusColors: Record<string, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  processing: 'badge-purple',
  printing: 'badge-purple',
  shipped: 'badge-success',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  payment_failed: 'badge-error'
};

const paymentStatusColors: Record<string, string> = {
  pending: 'badge-warning',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-error',
  refunded: 'badge-neutral'
};

export default function OrdersPage() {
  const router = useRouter();
  const t = useTranslations('orders');
  const tAdmin = useTranslations('admin');
  const { toast } = useToast();

  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    payment_status: 'all',
    date_from: '',
    date_to: ''
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      // Build params, filtering out 'all' values
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      // Only add non-empty and non-'all' filters
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.payment_status && filters.payment_status !== 'all') params.append('payment_status', filters.payment_status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrdersData(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      payment_status: 'all',
      date_from: '',
      date_to: ''
    });
    setPage(1);
  };

  const handleExportCSV = () => {
    // Build export params, filtering out 'all' values
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.payment_status && filters.payment_status !== 'all') params.append('payment_status', filters.payment_status);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    window.open(`/api/admin/orders/export?${params}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      </div>

      {/* Stats Grid */}
      {ordersData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersData.stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingOrders')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersData.stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('processingOrders')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersData.stats.processingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('shippedOrders')}</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersData.stats.shippedOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(ordersData.stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search')}
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin('statuses.all')}</SelectItem>
                <SelectItem value="pending">{tAdmin('statuses.pending')}</SelectItem>
                <SelectItem value="confirmed">{tAdmin('statuses.confirmed')}</SelectItem>
                <SelectItem value="processing">{tAdmin('statuses.processing')}</SelectItem>
                <SelectItem value="printing">{tAdmin('statuses.printing')}</SelectItem>
                <SelectItem value="shipped">{tAdmin('statuses.shipped')}</SelectItem>
                <SelectItem value="delivered">{tAdmin('statuses.delivered')}</SelectItem>
                <SelectItem value="cancelled">{tAdmin('statuses.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select value={filters.payment_status} onValueChange={(value) => handleFilterChange('payment_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByPayment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin('paymentStatuses.all')}</SelectItem>
                <SelectItem value="pending">{tAdmin('paymentStatuses.pending')}</SelectItem>
                <SelectItem value="processing">{tAdmin('paymentStatuses.processing')}</SelectItem>
                <SelectItem value="completed">{tAdmin('paymentStatuses.completed')}</SelectItem>
                <SelectItem value="failed">{tAdmin('paymentStatuses.failed')}</SelectItem>
                <SelectItem value="refunded">{tAdmin('paymentStatuses.refunded')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="outline" onClick={handleClearFilters}>
              <X size={16} className="mr-2" />
              {t('clearFilters')}
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('dateFrom')}</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('dateTo')}</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders</CardTitle>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              {t('exportCSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : !ordersData || ordersData.orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noOrders')}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('orderNumber')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('items')}</TableHead>
                    <TableHead>{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('payment')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersData.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          {order.order_number}
                        </button>
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {order.customer_name || order.customer_email}
                        </div>
                      </TableCell>
                      <TableCell>{order.items_count} items</TableCell>
                      <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ''}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[order.payment_status] || ''}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                              <Eye size={16} className="mr-2" />
                              {t('view')}
                            </DropdownMenuItem>
                            {order.tracking_number && (
                              <DropdownMenuItem>
                                <Send size={16} className="mr-2" />
                                {t('sendTracking')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {ordersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('showing', {
                      from: (page - 1) * 20 + 1,
                      to: Math.min(page * 20, ordersData.pagination.total),
                      total: ordersData.pagination.total
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('previous')}
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {t('page')} {page} {t('of')} {ordersData.pagination.totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(ordersData.pagination.totalPages, p + 1))}
                      disabled={page === ordersData.pagination.totalPages}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
