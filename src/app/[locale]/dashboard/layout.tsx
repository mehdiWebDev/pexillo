// src/app/[locale]/dashboard/layout.tsx
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Package,
  Image,
  Tags,
  Users,
  Settings,
  ChevronRight,
  Menu,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Sheet, SheetContent } from '@/src/components/ui/sheet';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      label: t('overview'),
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      label: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingBag
    },
    {
      label: t('products'),
      href: '/dashboard/products',
      icon: Package
    },
    {
      label: t('media'),
      href: '/dashboard/media',
      icon: Image
    },
    {
      label: t('categories'),
      href: '/dashboard/categories',
      icon: Tags
    },
    {
      label: t('customers'),
      href: '/dashboard/customers',
      icon: Users
    },
    {
      label: t('settings'),
      href: '/dashboard/settings',
      icon: Settings
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href || pathname === '/en/dashboard' || pathname === '/fr/dashboard';
    }
    return pathname.includes(href);
  };

  const Sidebar = () => (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors hover:bg-accent hover:text-accent-foreground
                ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
              `}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {active && <ChevronRight size={16} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b px-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <div className="flex-1">
            {/* Breadcrumbs or page title can go here */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}