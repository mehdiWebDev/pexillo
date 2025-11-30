'use client';

import { useState, useEffect } from 'react';
// import { useTranslations } from 'next-intl';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Switch } from '@/src/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Filter,
  Tag,
  Percent,
  DollarSign,
  Truck,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import DiscountForm from '@/src/components/dashboard/discounts/DiscountForm';
import { useToast } from '@/src/hooks/use-toast';
import { DiscountCode, DiscountStatistics } from '@/src/services/discountService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface DashboardStats {
  total: number;
  active: number;
  expired: number;
  totalUsage: number;
}

export default function DiscountsPage() {
  // const t = useTranslations('dashboard'); // Uncomment when translations are added
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    expired: 0,
    totalUsage: 0,
  });
  const [discountStats, setDiscountStats] = useState<Record<string, DiscountStatistics>>({});

  useEffect(() => {
    fetchDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterCategory, filterStatus]);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterStatus !== 'all') params.set('active', filterStatus === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/admin/discounts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch discounts');

      const data = await response.json();
      setDiscounts(data.discounts || []);

      // Calculate stats
      const now = new Date();
      const active = data.discounts.filter((d: DiscountCode) =>
        d.is_active &&
        new Date(d.valid_from || 0) <= now &&
        (!d.valid_until || new Date(d.valid_until) > now)
      );
      const expired = data.discounts.filter((d: DiscountCode) =>
        d.valid_until && new Date(d.valid_until) < now
      );
      const totalUsage = data.discounts.reduce((sum: number, d: DiscountCode) =>
        sum + (d.usage_count || 0), 0
      );

      setStats({
        total: data.discounts.length,
        active: active.length,
        expired: expired.length,
        totalUsage,
      });

      // Fetch statistics for each discount
      const statsPromises = data.discounts.map(async (discount: DiscountCode) => {
        try {
          const statsResponse = await fetch(`/api/admin/discounts/${discount.id}`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            return { id: discount.id, stats: statsData.statistics };
          }
        } catch {
          // Ignore individual stat fetch errors
        }
        return null;
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, DiscountStatistics> = {};
      statsResults.forEach((result) => {
        if (result) {
          statsMap[result.id] = result.stats;
        }
      });
      setDiscountStats(statsMap);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load discounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (discount: DiscountCode) => {
    try {
      const response = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to toggle status');

      toast({
        title: 'Success',
        description: `Discount ${discount.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      fetchDiscounts();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle discount status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (discount: DiscountCode) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const response = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete discount');

      toast({
        title: 'Success',
        description: 'Discount deleted successfully',
      });

      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete discount',
        variant: 'destructive',
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied',
      description: 'Discount code copied to clipboard',
    });
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed_amount':
        return <DollarSign className="h-4 w-4" />;
      case 'free_shipping':
        return <Truck className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getDiscountStatus = (discount: DiscountCode) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from || 0);
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

    if (!discount.is_active) return 'inactive';
    if (validFrom > now) return 'scheduled';
    if (validUntil && validUntil < now) return 'expired';
    if (discount.usage_limit && discount.usage_count && discount.usage_count >= discount.usage_limit) return 'exhausted';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'exhausted':
        return <Badge className="bg-orange-500">Exhausted</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount Codes</h1>
          <p className="text-muted-foreground">
            Manage promotional discounts and coupon codes
          </p>
        </div>
        <Button onClick={() => { setSelectedDiscount(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Discount
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="seasonal">Seasonal</SelectItem>
            <SelectItem value="clearance">Clearance</SelectItem>
            <SelectItem value="new_customer">New Customer</SelectItem>
            <SelectItem value="loyalty">Loyalty</SelectItem>
            <SelectItem value="flash_sale">Flash Sale</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Discounts Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => {
                const status = getDiscountStatus(discount);
                const stats = discountStats[discount.id];
                return (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium">{discount.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(discount.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {discount.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {discount.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getDiscountTypeIcon(discount.discount_type)}
                        <span className="text-sm capitalize">
                          {discount.discount_type.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {discount.discount_type === 'percentage'
                        ? `${discount.discount_value}%`
                        : discount.discount_type === 'fixed_amount'
                        ? `$${discount.discount_value}`
                        : 'Free'}
                      {discount.minimum_purchase ? (
                        <p className="text-xs text-muted-foreground">
                          Min: ${discount.minimum_purchase}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {discount.usage_count || 0}
                        {discount.usage_limit ? ` / ${discount.usage_limit}` : ''}
                      </div>
                      {stats && stats.totalSaved > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Saved: ${stats.totalSaved.toFixed(2)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(discount.valid_from || 0), 'MMM d, yyyy')}
                        </div>
                        {discount.valid_until && (
                          <div className="text-xs text-muted-foreground">
                            to {format(new Date(discount.valid_until), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(status)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={() => handleToggleStatus(discount)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDiscount(discount);
                              setIsFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copyCode(discount.code)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(discount)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDiscount ? 'Edit Discount' : 'Create New Discount'}
            </DialogTitle>
          </DialogHeader>
          <DiscountForm
            discount={selectedDiscount}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchDiscounts();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}