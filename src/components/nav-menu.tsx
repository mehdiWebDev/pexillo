'use client';

import { useState } from 'react';
import { usePathname } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { ThemeSwitcher } from "@/src/components/theme-switcher";
import { User, Settings, LogOut, UserCircle, Heart } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { clearUser } from "@/src/store/slices/authSlice";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from '@/src/i18n/routing';
import { useUserQuery } from "@/src/hooks/useUserQuery";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher, LanguageSwitcherCompact } from '@/src/components/language-switcher';
import MiniCart from '@/src/components/cart/MiniCart';
import { useFavorites } from '@/src/hooks/useFavorites';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContentItem,
  NavigationMenuContentGrid,
  NavigationMenuFeaturedItem,
} from "@/src/components/ui/navigation-menu";


const BrandLogo = () => (
  <div className="relative group">
    <div className="w-10 h-10 bg-acid-lime flex items-center justify-center transition-all duration-300">
      <span className="text-black font-black text-xl">P</span>
    </div>
    <div className="absolute inset-0 bg-acid-lime blur-md opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
  </div>
);

const HamburgerIcon = ({ isOpen }: { isOpen: boolean }) => (
  <div className="mobile-menu__hamburger">
    <span className={`mobile-menu__line ${isOpen ? 'mobile-menu__line--open-1' : ''}`} />
    <span className={`mobile-menu__line ${isOpen ? 'mobile-menu__line--open-2' : ''}`} />
    <span className={`mobile-menu__line ${isOpen ? 'mobile-menu__line--open-3' : ''}`} />
  </div>
);

interface ClientNavigationMenuProps {
  children: React.ReactNode;
}

export function ClientNavigationMenu({
  children,
}: ClientNavigationMenuProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuth } = useSelector((state: RootState) => state.auth);
  const { data: profile } = useUserQuery(user?.id);
  const { favorites } = useFavorites();
  const dispatch = useDispatch();
  const router = useRouter();

  // Add translations
  const t = useTranslations('navigation');
  const tCommon = useTranslations('common');

  // Define menu items with translation keys
  const menuItems = [
    { titleKey: "home", href: "/" },
    { titleKey: "products", href: "/products" },
    { titleKey: "services", href: "/services" },
    { titleKey: "contact", href: "/contact" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Mobile logout function
  const handleMobileLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    dispatch(clearUser());
    closeMobileMenu();
    router.push("/auth/login");
  };

  return (
    <>
      <nav className={"navigation"}>

        <div className="navigation__container container">
          {/* Left: logo + desktop menu */}
          <div className="navigation__left">
            <Link href="/" className="navigation__logo" onClick={closeMobileMenu}>
              <BrandLogo />
              <span className="text-white font-black text-xl tracking-tighter italic hidden sm:block">
                PIXELLO
              </span>
            </Link>

            <div className="navigation__desktop-menu">
              <NavigationMenu>
                <NavigationMenuList>
                  {/* Home Link */}
                  <NavigationMenuItem>
                    <Link href="/" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "group inline-flex h-10 w-max items-center justify-center px-4 py-2",
                        "text-sm font-bold uppercase tracking-wider",
                        "bg-transparent text-zinc-400",
                        "hover:bg-zinc-900 hover:text-white",
                        "transition-all duration-200",
                        "relative",
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-acid-lime",
                        "after:scale-x-0 after:transition-transform after:duration-300",
                        "hover:after:scale-x-100",
                        pathname === "/" && "text-white after:scale-x-100"
                      )}>
                        {t('home')}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  {/* Products Dropdown */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger variant="default">
                      {t('products')}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <NavigationMenuContentGrid>
                        <NavigationMenuFeaturedItem
                          href="/products?featured=true"
                          title={t('featuredProducts') || "FEATURED"}
                          badge="NEW"
                        >
                          {t('featuredProductsDesc') || "Discover our latest collection. Limited edition designs."}
                        </NavigationMenuFeaturedItem>

                        <div className="space-y-2">
                          <NavigationMenuContentItem
                            href="/products"
                            title={t('allProducts') || "ALL PRODUCTS"}
                            description={t('allProductsDesc') || "Browse our complete catalog"}
                          />
                          <NavigationMenuContentItem
                            href="/products?category=clothing"
                            title={t('clothing') || "CLOTHING"}
                            description={t('clothingDesc') || "T-shirts, hoodies, and more"}
                          />
                          <NavigationMenuContentItem
                            href="/products?category=accessories"
                            title={t('accessories') || "ACCESSORIES"}
                            description={t('accessoriesDesc') || "Complete your style"}
                          />
                        </div>
                      </NavigationMenuContentGrid>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Services Link */}
                  <NavigationMenuItem>
                    <Link href="/services" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "group inline-flex h-10 w-max items-center justify-center px-4 py-2",
                        "text-sm font-bold uppercase tracking-wider",
                        "bg-transparent text-zinc-400",
                        "hover:bg-zinc-900 hover:text-white",
                        "transition-all duration-200",
                        "relative",
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-acid-lime",
                        "after:scale-x-0 after:transition-transform after:duration-300",
                        "hover:after:scale-x-100",
                        pathname === "/services" && "text-white after:scale-x-100"
                      )}>
                        {t('services')}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  {/* Contact Link */}
                  <NavigationMenuItem>
                    <Link href="/contact" legacyBehavior passHref>
                      <NavigationMenuLink className={cn(
                        "group inline-flex h-10 w-max items-center justify-center px-4 py-2",
                        "text-sm font-bold uppercase tracking-wider",
                        "bg-transparent text-zinc-400",
                        "hover:bg-zinc-900 hover:text-white",
                        "transition-all duration-200",
                        "relative",
                        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-acid-lime",
                        "after:scale-x-0 after:transition-transform after:duration-300",
                        "hover:after:scale-x-100",
                        pathname === "/contact" && "text-white after:scale-x-100"
                      )}>
                        {t('contact')}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Right: language + theme + auth + mobile hamburger */}
          <div className="navigation__right">
            <div className="navigation__desktop-actions">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <Link href="/wishlist" className="navigation__icon-link" title={t('wishlist')}>
                <Heart size={20} className={favorites.length > 0 ? 'fill-current' : ''} />
                {favorites.length > 0 && (
                  <span className="navigation__icon-badge">{favorites.length}</span>
                )}
              </Link>
              <MiniCart />
              {children}
            </div>

            <button
              className="mobile-menu__trigger"
              onClick={toggleMobileMenu}
              aria-label={t('toggleMenu')}
            >
              <HamburgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={cn("mobile-menu", isMobileMenuOpen && "mobile-menu--open")}>
        <div className="mobile-menu__backdrop" onClick={closeMobileMenu} />

        <div className="mobile-menu__content">
          <div className="mobile-menu__header">
            <div className="mobile-menu__brand">
              <BrandLogo />
              <span className="text-white font-black text-lg tracking-tighter italic">PIXELLO</span>
            </div>
            <button
              className="mobile-menu__close"
              onClick={closeMobileMenu}
              aria-label={t('closeMenu')}
            >
              ✕
            </button>
          </div>

          {/* User Profile Section for Mobile */}
          {isAuth && profile && (
            <div className="mobile-menu__user-section">
              <div className="mobile-menu__user-info">
                {profile?.avatar_url ? (
                  <Image
                    src={profile?.avatar_url}
                    alt={profile?.full_name || t('user')}
                    width={48}
                    height={48}
                    className="mobile-menu__user-avatar"
                  />
                ) : (
                  <div className="mobile-menu__user-avatar mobile-menu__user-avatar--placeholder">
                    <User size={20} />
                  </div>
                )}
                <div className="mobile-menu__user-details">
                  <div className="mobile-menu__user-name">
                    {profile?.full_name || profile?.email || t('user')}
                  </div>
                  {profile?.email && (
                    <div className="mobile-menu__user-email">
                      {profile?.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mobile-menu__links">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("mobile-menu__link", isActive && "mobile-menu__link--active")}
                  onClick={closeMobileMenu}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${index * 100}ms` : '0ms'
                  }}
                >
                  <span className="mobile-menu__link-text">{t(item.titleKey)}</span>
                  {isActive && <div className="mobile-menu__link-indicator" />}
                </Link>
              );
            })}

            {/* Profile Links for Mobile (only show if authenticated) */}
            {isAuth && profile && (
              <>
                <div className="mobile-menu__divider"></div>
                <Link
                  href="/wishlist"
                  className={cn("mobile-menu__link", pathname === "/wishlist" && "mobile-menu__link--active")}
                  onClick={closeMobileMenu}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length) * 100}ms` : '0ms'
                  }}
                >
                  <Heart size={16} className={favorites.length > 0 ? 'fill-current' : ''} />
                  <span className="mobile-menu__link-text">
                    {t('wishlist')}
                    {favorites.length > 0 && ` (${favorites.length})`}
                  </span>
                  {pathname === "/wishlist" && <div className="mobile-menu__link-indicator" />}
                </Link>

                <Link
                  href="/profile"
                  className={cn("mobile-menu__link", pathname === "/profile" && "mobile-menu__link--active")}
                  onClick={closeMobileMenu}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length + 1) * 100}ms` : '0ms'
                  }}
                >
                  <UserCircle size={16} />
                  <span className="mobile-menu__link-text">{t('myProfile')}</span>
                  {pathname === "/profile" && <div className="mobile-menu__link-indicator" />}
                </Link>

                <Link
                  href="/settings"
                  className={cn("mobile-menu__link", pathname === "/settings" && "mobile-menu__link--active")}
                  onClick={closeMobileMenu}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length + 2) * 100}ms` : '0ms'
                  }}
                >
                  <Settings size={16} />
                  <span className="mobile-menu__link-text">{t('accountSettings')}</span>
                  {pathname === "/settings" && <div className="mobile-menu__link-indicator" />}
                </Link>

                <button
                  onClick={handleMobileLogout}
                  className="mobile-menu__link mobile-menu__link--danger"
                  style={{
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length + 3) * 100}ms` : '0ms'
                  }}
                >
                  <LogOut size={16} />
                  <span className="mobile-menu__link-text">{tCommon('logout')}</span>
                </button>
              </>
            )}
          </div>

          <div className="mobile-menu__actions">
            <div className="mobile-menu__language-switcher">
              <LanguageSwitcherCompact />
            </div>
            <div className="mobile-menu__theme-switcher">
              <ThemeSwitcher />
            </div>
            {/* Only show auth buttons if not authenticated */}
            {!isAuth && (
              <div className="mobile-menu__auth" onClick={closeMobileMenu}>
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}