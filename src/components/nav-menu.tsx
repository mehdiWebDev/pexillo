'use client';

import { useState } from 'react';
import { usePathname } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/src/components/theme-switcher";
import { User, Settings, LogOut, UserCircle } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import { clearUser } from "@/src/store/slices/authSlice";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from '@/src/i18n/routing';
import { useUserQuery } from "@/src/hooks/useUserQuery";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher, LanguageSwitcherCompact } from '@/src/components/language-switcher';

const BrandLogo = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-current"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12L11 15L16 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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
      <nav className={cn("navigation")}>
        <div className="navigation__container">
          {/* Left: logo + desktop menu */}
          <div className="navigation__left">
            <Link href="/" className="navigation__logo" onClick={closeMobileMenu}>
              <BrandLogo />
              <span className="navigation__brand">{t('brand')}</span>
            </Link>

            <div className="navigation__desktop-menu">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("navigation__link", isActive && "navigation__link--active")}
                  >
                    {t(item.titleKey)}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: language + theme + auth + mobile hamburger */}
          <div className="navigation__right">
            <div className="navigation__desktop-actions">
              <LanguageSwitcher />
              <ThemeSwitcher />
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
              <span>{t('brand')}</span>
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
                  <img
                    src={profile?.avatar_url}
                    alt={profile?.full_name || t('user')}
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
                  href="/profile"
                  className={cn("mobile-menu__link", pathname === "/profile" && "mobile-menu__link--active")}
                  onClick={closeMobileMenu}
                  style={{
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length) * 100}ms` : '0ms'
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
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length + 1) * 100}ms` : '0ms'
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
                    animationDelay: isMobileMenuOpen ? `${(menuItems.length + 2) * 100}ms` : '0ms'
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