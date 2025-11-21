// src/app/[locale]/dashboard/products/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Package, Star } from 'lucide-react';
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
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface ProductVariant {
  id: string;
  size: string;
  color: string;
  inventory_count: number;
  is_active: boolean;
}

// Fetch products for admin with variant details
async function fetchAdminProducts() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      product_variants(
        id,
        size,
        color,
        inventory_count,
        is_active
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Process the data to add stock information
  const processedData = data?.map(product => {
    // Calculate if product is in stock based on variants
    const totalInventory = product.product_variants?.reduce((sum: number, variant: ProductVariant) => {
      if (variant.is_active) {
        return sum + (variant.inventory_count || 0);
      }
      return sum;
    }, 0) || 0;
    
    // Calculate total number of variants
    const variantCount = product.product_variants?.length || 0;
    
    return {
      ...product,
      in_stock: totalInventory > 0,
      total_inventory: totalInventory,
      variant_count: variantCount
    };
  });
  
  return processedData;
}

export default function ProductsPage() {
  const t = useTranslations('dashboard.productsSection');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch products
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: fetchAdminProducts,
  });

  // Filter products based on search
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle delete product
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (!error) {
      refetch();
    }
  };

  // Get badge color
  const getBadgeClass = (badge: string) => {
    switch(badge) {
      case 'NEW': return 'badge-info';
      case 'HOT': return 'badge-error';
      case 'SALE': return 'badge-warning';
      case 'LIMITED': return 'badge-purple';
      default: return 'badge-neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => router.push('/dashboard/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addProduct')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeProducts')}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter(p => p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('featuredProducts')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter(p => p.is_featured).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t('productList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {t('filters')}
            </Button>
          </div>

          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t('image')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>{t('variants')}</TableHead>
                  <TableHead>{t('stock')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('badge')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      {t('loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredProducts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      {t('noProducts')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                          {product.primary_image_url ? (
                            <Image
                              src={product.primary_image_url}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name || '-'}</TableCell>
                      <TableCell>${product.base_price}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {product.variant_count} {product.variant_count === 1 ? 'variant' : 'variants'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.in_stock ? (
                          <div>
                            <span className="text-green-600 font-medium">{t('inStock')}</span>
                            <p className="text-xs text-muted-foreground">
                              {product.total_inventory} units
                            </p>
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">{t('outOfStock')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={product.is_active ? 'badge-success' : 'badge-neutral'}>
                          {product.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.badge && (
                          <Badge className={getBadgeClass(product.badge)}>
                            {product.badge}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/products/${product.id}`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/products/${product.slug}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t('view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}