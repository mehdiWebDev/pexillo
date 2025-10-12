// src/components/footer.tsx
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ThemeSwitcher } from '@/src/components/theme-switcher';
import {
  Mail,
  Instagram,
  Twitter,
  Github,
  MapPin,
  Clock,
  Shield,
  Package
} from 'lucide-react';

const Footer = () => {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* Main Footer Content */}
        <div className="footer__content">
          {/* Brand Section */}
          <div className="footer__section footer__section--brand">
            <h3 className="footer__brand-name">PEXILLO</h3>
            <p className="footer__brand-tagline">
              {t('tagline')}
            </p>
            <div className="footer__social">
              <a href="https://instagram.com/pexillo" className="footer__social-link" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://twitter.com/pexillo" className="footer__social-link" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="mailto:hello@pexillo.com" className="footer__social-link" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__section">
            <h4 className="footer__title">{t('shop')}</h4>
            <ul className="footer__links">
              <li><Link href="/products">{t('allProducts')}</Link></li>
              <li><Link href="/products?category=new">{t('newArrivals')}</Link></li>
              <li><Link href="/products?sale=true">{t('sale')}</Link></li>
              <li><Link href="/categories">{t('categories')}</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="footer__section">
            <h4 className="footer__title">{t('help')}</h4>
            <ul className="footer__links">
              <li><Link href="/contact">{t('contact')}</Link></li>
              <li><Link href="/size-guide">{t('sizeGuide')}</Link></li>
              <li><Link href="/care">{t('careInstructions')}</Link></li>
              <li><Link href="/faq">{t('faq')}</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div className="footer__section">
            <h4 className="footer__title">{t('info')}</h4>
            <ul className="footer__links">
              <li><Link href="/about">{t('about')}</Link></li>
              <li><Link href="/privacy">{t('privacy')}</Link></li>
              <li><Link href="/terms">{t('terms')}</Link></li>
              <li><ThemeSwitcher /></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer__bottom">
          <div className="footer__bottom-content">
            <div className="footer__badges">
              <div className="footer__badge">
                <Shield size={16} />
                <span>{t('securePayments')}</span>
              </div>
              <div className="footer__badge">
                <Package size={16} />
                <span>{t('fastShipping')}</span>
              </div>
              <div className="footer__badge">
                <Clock size={16} />
                <span>{t('newWeekly')}</span>
              </div>
            </div>

            <div className="footer__copyright">
              <p>© {currentYear} PEXILLO. {t('rights')}</p>
              <p className="footer__powered">
                {t('poweredBy')}
                <a
                  href="https://supabase.com/?utm_source=pexillo"
                  target="_blank"
                  rel="noreferrer"
                  className="footer__powered-link"
                >
                  Supabase
                </a>
                &
                <a
                  href="https://nextjs.org"
                  target="_blank"
                  rel="noreferrer"
                  className="footer__powered-link"
                >
                  Next.js
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
