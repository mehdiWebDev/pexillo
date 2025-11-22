// src/components/footer.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/routing';
import {
  Mail,
  Zap
} from 'lucide-react';

const Footer = () => {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-black border-t border-zinc-800 overflow-hidden">
      {/* Massive PIXELLO Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] select-none pointer-events-none overflow-hidden">
        <h2 className="text-[20vw] font-black tracking-tighter text-zinc-400">
          PIXELLO
        </h2>
      </div>

      {/* Main Content */}
      <div className="relative container mx-auto px-4 lg:px-8 !py-12">
        {/* 4 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-acid-lime flex items-center justify-center">
                <span className="text-black font-black text-lg">P</span>
              </div>
              <h3 className="text-white font-black text-xl tracking-tighter italic">
                PIXELLO
              </h3>
            </div>
            <p className="text-zinc-500 font-mono text-sm">
              {'//'}{'/'}  Digital Streetwear Studio
            </p>
            <p className="text-zinc-300 text-sm">
              {t('tagline') || 'High-end custom prints. Wear your imagination.'}
            </p>

            {/* Social Links */}
            <div className="flex gap-2 pt-2">
              <a
                href="https://instagram.com/pixello"
                className="w-10 h-10 bg-zinc-900 border border-zinc-800 hover:border-acid-lime flex items-center justify-center text-zinc-400 hover:text-acid-lime transition-all"
                aria-label="Instagram"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com/pixello"
                className="w-10 h-10 bg-zinc-900 border border-zinc-800 hover:border-acid-lime flex items-center justify-center text-zinc-400 hover:text-acid-lime transition-all"
                aria-label="Twitter"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="mailto:hello@pixello.com"
                className="w-10 h-10 bg-zinc-900 border border-zinc-800 hover:border-acid-lime flex items-center justify-center text-zinc-400 hover:text-acid-lime transition-all"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
              <a
                href="https://github.com/pixello"
                className="w-10 h-10 bg-zinc-900 border border-zinc-800 hover:border-acid-lime flex items-center justify-center text-zinc-400 hover:text-acid-lime transition-all"
                aria-label="GitHub"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Shop */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 font-mono">
              {'//'}{'/'}  {t('shop') || 'SHOP'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/products" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('allProducts') || 'All Products'}
                </Link>
              </li>
              <li>
                <Link href="/products?category=new" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('newArrivals') || 'New Arrivals'}
                </Link>
              </li>
              <li>
                <Link href="/products?sale=true" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('sale') || 'Sale'}
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('categories') || 'Categories'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 font-mono">
              {'//'}{'/'}  {t('help') || 'SUPPORT'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('contact') || 'Contact'}
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('sizeGuide') || 'Size Guide'}
                </Link>
              </li>
              <li>
                <Link href="/care" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('careInstructions') || 'Care Instructions'}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('faq') || 'FAQ'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 font-mono">
              {'//'}{'/'}  {t('info') || 'LEGAL'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('about') || 'About'}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('privacy') || 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('terms') || 'Terms of Service'}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-zinc-300 hover:text-acid-lime transition-colors text-sm">
                  {t('returns') || 'Returns'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* System Status Bar */}
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left: Copyright */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-zinc-500 uppercase">
                  SYSTEM ONLINE
                </span>
              </div>
              <span className="text-zinc-600 text-sm">
                © {currentYear} PIXELLO. {t('rights') || 'All rights reserved.'}
              </span>
            </div>

            {/* Right: Powered By */}
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
              <Zap size={12} className="text-acid-lime" />
              <span>POWERED BY</span>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-acid-lime transition-colors"
              >
                SUPABASE
              </a>
              <span>×</span>
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-acid-lime transition-colors"
              >
                NEXT.JS
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
