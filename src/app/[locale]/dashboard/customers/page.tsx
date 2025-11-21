// src/app/[locale]/dashboard/customers/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  ShoppingBag,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';
import { Profile } from '@/src/services/userService';

interface CustomersData {
  customers: Profile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeCustomers: number;
    totalRevenue: number;
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const t = useTranslations('customers');
  const { toast } = useToast();

  const [customersData, setCustomersData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    date_from: '',
    date_to: ''
  });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // Build params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      // Only add non-empty filters
      if (filters.search) params.append('search', filters.search);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await fetch(`/api/admin/customers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');

      const data = await response.json();
      setCustomersData(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [page, filters, fetchCustomers]);

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
      date_from: '',
      date_to: ''
    });
    setPage(1);
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete ${customerName || 'this customer'}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete customer');

      toast({
        title: 'Success',
        description: 'Customer deleted successfully'
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive'
      });
    }
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
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Stats Grid */}
      {customersData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCustomers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersData.stats.totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('newThisMonth')}</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersData.stats.newCustomersThisMonth}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('activeCustomers')}</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersData.stats.activeCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(customersData.stats.totalRevenue)}</div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : !customersData || customersData.customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noCustomers')}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('joinedDate')}</TableHead>
                    <TableHead>{t('totalOrders')}</TableHead>
                    <TableHead>{t('totalSpent')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersData.customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          {customer.full_name || 'N/A'}
                        </button>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || 'N/A'}</TableCell>
                      <TableCell>{formatDate(customer.created_at)}</TableCell>
                      <TableCell>{customer.total_orders}</TableCell>
                      <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/customers/${customer.id}`)}>
                              <Eye size={16} className="mr-2" />
                              {t('view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/customers/${customer.id}`)}>
                              <Edit size={16} className="mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCustomer(customer.id, customer.full_name || customer.email)}
                              className="text-red-600"
                            >
                              <Trash2 size={16} className="mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {customersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('showing')
                      .replace('{from}', ((page - 1) * 20 + 1).toString())
                      .replace('{to}', Math.min(page * 20, customersData.pagination.total).toString())
                      .replace('{total}', customersData.pagination.total.toString())}
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
                        {t('page')} {page} {t('of')} {customersData.pagination.totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(customersData.pagination.totalPages, p + 1))}
                      disabled={page === customersData.pagination.totalPages}
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
