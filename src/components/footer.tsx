// src/components/footer.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/routing';
import { Instagram as InstagramIcon, Twitter as TwitterIcon, Youtube as YoutubeIcon } from 'lucide-react';

const Footer = () => {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-dark text-white border-t border-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand Column */}
          <div>
            <Link href="/" className="text-4xl font-black tracking-tighter mb-6 block hover:text-brand-red transition-colors">
              Pexillo.
            </Link>
            <p className="text-gray-400 font-medium mb-8 max-w-xs">
              {t('tagline')}
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/pexillo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-red transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/pexillo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-blue transition-colors"
                aria-label="Twitter"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com/@pexillo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-purple transition-colors"
                aria-label="YouTube"
              >
                <YoutubeIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">{t('shop')}</h4>
            <ul className="space-y-3 text-gray-400 font-medium">
              <li>
                <Link href="/products?new=true" className="hover:text-white transition-colors">
                  {t('newArrivals')}
                </Link>
              </li>
              <li>
                <Link href="/products?featured=true" className="hover:text-white transition-colors">
                  {t('bestSellers')}
                </Link>
              </li>
              <li>
                <Link href="/products/accessories" className="hover:text-white transition-colors">
                  {t('accessories')}
                </Link>
              </li>
              <li>
                <Link href="/products?sale=true" className="hover:text-white transition-colors">
                  {t('sale')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">{t('support')}</h4>
            <ul className="space-y-3 text-gray-400 font-medium">
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  {t('trackOrder')}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors">
                  {t('returns')}
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors">
                  {t('shipping')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-white">{t('legal')}</h4>
            <ul className="space-y-3 text-gray-400 font-medium">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t('terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-500 font-bold">
            © {currentYear} Pexillo Inc.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
