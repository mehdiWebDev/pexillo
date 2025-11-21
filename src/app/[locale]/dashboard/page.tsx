// src/app/[locale]/dashboard/page.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react';

interface RecentProduct {
  id: string;
  name: string;
  base_price: number;
  created_at: string;
}

// Fetch dashboard stats
async function fetchDashboardStats() {
  const supabase = createClient();
  
  // Get products count
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // Get active products
  const { count: activeProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get featured products
  const { count: featuredProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true);

  // Get categories count
  const { count: totalCategories } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get recent products
  const { data: recentProducts } = await supabase
    .from('products')
    .select('id, name, base_price, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalProducts: totalProducts || 0,
    activeProducts: activeProducts || 0,
    featuredProducts: featuredProducts || 0,
    totalCategories: totalCategories || 0,
    recentProducts: recentProducts || []
  };
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('overview')}</h1>
        <p className="text-muted-foreground">{t('welcomeBack')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeProducts} {t('active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('featured')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.featuredProducts}
            </div>
            <p className="text-xs text-muted-foreground">{t('featuredProducts')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('categories')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.totalCategories}
            </div>
            <p className="text-xs text-muted-foreground">{t('activeCategories')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory')}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('inStock')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
            <CardDescription>{t('commonTasks')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full justify-start" 
              onClick={() => router.push('/dashboard/products/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('addNewProduct')}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/products')}
            >
              <Package className="mr-2 h-4 w-4" />
              {t('manageProducts')}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/categories')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('manageCategories')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('recentProducts')}</CardTitle>
                <CardDescription>{t('latestAdditions')}</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/products')}
              >
                {t('viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : stats?.recentProducts?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('noProductsYet')}
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.recentProducts?.map((product: RecentProduct) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center py-2 hover:bg-muted/50 px-2 rounded cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ${product.base_price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}