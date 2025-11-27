'use client';

import { useState } from 'react';
import { usePathname } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Heart, Menu } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useUserQuery } from "@/src/hooks/useUserQuery";
import { useTranslations, useLocale } from 'next-intl';
import MiniCart from '@/src/components/cart/MiniCart';
import { useFavorites } from '@/src/hooks/useFavorites';
import { locales, type Locale } from '@/src/i18n/config';
import { useRouter } from '@/src/i18n/routing';
import SearchBar from '@/src/components/search/SearchBar';

const BrandLogo = () => (
  <div className="flex items-center gap-1 group">
    <span className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900">Pexillo</span>
    <span className="text-2xl md:text-3xl font-black text-brand-red group-hover:rotate-12 transition-transform inline-block">.</span>
  </div>
);

interface ClientNavigationMenuProps {
  children: React.ReactNode;
}

export function ClientNavigationMenu({
  children,
}: ClientNavigationMenuProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuth } = useSelector((state: RootState) => state.auth);
  const { data: profile } = useUserQuery(user?.id);
  const { favorites } = useFavorites();

  const t = useTranslations('navigation');

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLanguageChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 px-4 md:px-6 lg:px-8">
        <div className="w-full justify-between max-w-[1400px] mx-auto flex items-center gap-3 md:gap-4 lg:gap-6">

          {/* Logo */}
          <Link href="/" onClick={closeMobileMenu} className="shrink-0">
            <BrandLogo />
          </Link>

          {/* Primary Navigation (Desktop Only) */}
          <div className="hidden xl:flex items-center gap-6 font-bold text-sm shrink-0">
            <Link href="/products" className="hover:text-brand-red transition-colors">
              {t('shopAll')}
            </Link>
            <Link href="/products/t-shirts" className="hover:text-brand-red transition-colors">
              {t('tees')}
            </Link>
            <Link href="/products/hoodies" className="hover:text-brand-red transition-colors">
              {t('hoodies')}
            </Link>
            <Link href="/products/caps" className="hover:text-brand-red transition-colors">
              {t('caps') || 'Caps'}
            </Link>
            <Link href="/products?onSale=true" className="text-brand-red hover:text-brand-dark transition-colors">
              {t('sale')}
            </Link>
          </div>

          {/* Search Bar (Desktop & Tablet) - Takes full available width */}
          <div className="hidden sm:flex flex-1 max-w-3xl mx-2 md:mx-4">
            <SearchBar
              className="w-full"
              placeholder={t('searchProducts')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {/* Language Switcher (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-1 font-bold text-sm">
              {locales.map((loc, idx) => (
                <span key={loc}>
                  <button
                    onClick={() => handleLanguageChange(loc)}
                    className={cn(
                      "transition-colors",
                      locale === loc
                        ? "text-brand-dark cursor-default"
                        : "text-gray-400 hover:text-brand-red"
                    )}
                  >
                    {loc.toUpperCase()}
                  </button>
                  {idx < locales.length - 1 && <span className="text-gray-300 mx-1">/</span>}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              {isAuth && profile ? (
                <Link
                  href="/profile"
                  className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border border-gray-200 hover:border-brand-red transition-all group"
                  aria-label="Profile"
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Profile'}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-gray-600 font-bold text-sm">
                        {profile?.full_name?.[0] || profile?.email?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                </Link>
              ) : (
                <div className="hidden xl:flex items-center gap-2">
                  {children}
                </div>
              )}

              {/* Heart/Wishlist */}
              <Link
                href="/wishlist"
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title={t('wishlist')}
              >
                <Heart
                  className={cn(
                    "w-6 h-6 transition-colors",
                    favorites.length > 0
                      ? "fill-brand-red text-brand-red"
                      : "group-hover:fill-brand-red group-hover:text-brand-red"
                  )}
                />
                {favorites.length > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                    {favorites.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <MiniCart />

              {/* Mobile Menu Trigger */}
              <button
                className="xl:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={toggleMobileMenu}
                aria-label={t('toggleMenu')}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-white border-b border-gray-100 p-4 absolute top-full left-0 w-full z-40 shadow-xl">
            {/* Mobile Search - Only show on very small screens where main search is hidden */}
            <div className="sm:hidden">
              <SearchBar
                className="mb-6"
                placeholder={t('search')}
                onSearchComplete={closeMobileMenu}
                inputClassName="rounded-xl"
              />
            </div>

            {/* Mobile Links */}
            <div className="flex flex-col gap-4 font-bold text-lg">
              <Link href="/products" className="hover:text-brand-red" onClick={closeMobileMenu}>
                {t('shopAll')}
              </Link>
              <Link href="/products/t-shirts" className="hover:text-brand-red" onClick={closeMobileMenu}>
                {t('tees')}
              </Link>
              <Link href="/products/hoodies" className="hover:text-brand-red" onClick={closeMobileMenu}>
                {t('hoodies')}
              </Link>
              <Link href="/products/caps" className="hover:text-brand-red" onClick={closeMobileMenu}>
                {t('caps')}
              </Link>
              <Link href="/products?onSale=true" className="text-brand-red" onClick={closeMobileMenu}>
                {t('sale')}
              </Link>
              {isAuth && (
                <>
                  <div className="h-px bg-gray-200 my-2"></div>
                  <Link href="/wishlist" className="hover:text-brand-red flex items-center gap-2" onClick={closeMobileMenu}>
                    {t('wishlist')}
                    {favorites.length > 0 && (
                      <span className="text-sm text-gray-500">({favorites.length})</span>
                    )}
                  </Link>
                  <Link href="/profile" className="hover:text-brand-red" onClick={closeMobileMenu}>
                    {t('myProfile')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Footer - Language Switcher */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center items-center">
              <div className="flex gap-2 items-center text-sm font-bold">
                {locales.map((loc, idx) => (
                  <span key={loc}>
                    <button
                      onClick={() => handleLanguageChange(loc)}
                      className={cn(
                        locale === loc ? "text-brand-dark" : "text-gray-400"
                      )}
                    >
                      {loc.toUpperCase()}
                    </button>
                    {idx < locales.length - 1 && <span className="mx-1 text-gray-300">/</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Auth Buttons (Mobile - only if not authenticated) */}
            {!isAuth && (
              <div className="mt-4 pt-4 border-t border-gray-100" onClick={closeMobileMenu}>
                {children}
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
