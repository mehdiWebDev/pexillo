// src/app/[locale]/dashboard/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from '@/src/hooks/use-toast';
import {
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  RotateCcw,
  XCircle,
  Search,
  Loader2,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

interface InventoryTransaction {
  id: string;
  variant_id: string;
  order_id: string | null;
  transaction_type: 'sale' | 'restock' | 'adjustment' | 'return' | 'cancellation';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  // Joined data
  product_name: string;
  variant_size: string;
  variant_color: string;
  order_number: string | null;
  admin_name: string | null;
}

export default function InventoryPage() {
  const t = useTranslations('dashboard.inventoryPage');

  const TRANSACTION_TYPES = [
    { value: 'all', label: t('allTypes') },
    { value: 'sale', label: t('sale'), icon: TrendingDown, color: 'text-red-600' },
    { value: 'restock', label: t('restock'), icon: TrendingUp, color: 'text-green-600' },
    { value: 'adjustment', label: t('adjustment'), icon: RefreshCw, color: 'text-blue-600' },
    { value: 'return', label: t('return'), icon: RotateCcw, color: 'text-yellow-600' },
    { value: 'cancellation', label: t('cancellation'), icon: XCircle, color: 'text-gray-600' },
  ];
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterType]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filterType !== 'all' && { type: filterType }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/inventory?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: 'Error',
        description: 'Error loading transactions',
        variant: 'destructive',
      });
    } finally{
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTransactions();
  };

  const getTransactionTypeInfo = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('description')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>{t('searchProduct')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>{t('transactionType')}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setCurrentPage(1);
                  fetchTransactions();
                }}
              >
                {t('resetFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionHistory')}</CardTitle>
          <CardDescription>
            {t('showingTransactions', { count: transactions.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('noTransactionsFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">{t('date')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('product')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('variant')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('type')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('change')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('before')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('after')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('order')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                    const Icon = typeInfo.icon || Package;

                    return (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {transaction.product_name}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {transaction.variant_size} - {transaction.variant_color}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`gap-1 ${typeInfo.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {transaction.quantity_before}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {transaction.quantity_after}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {transaction.order_number ? (
                            <a
                              href={`/dashboard/orders/${transaction.order_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              #{transaction.order_number}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {transaction.reason || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {t('page', { current: currentPage, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
