'use client';

import Link from 'next/link';
import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Zap, 
  Shield, 
  Package, 
  Clock,
  Terminal,
  Code2,
  Cpu
} from 'lucide-react';

export function CyberFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    links: {
      title: 'LINKS',
      items: [
        { label: 'SHOP COLLECTION', href: '/products' },
        { label: 'DESIGN STUDIO', href: '/design' },
        { label: 'ABOUT US', href: '/about' },
      ]
    },
    support: {
      title: 'SUPPORT',
      items: [
        { label: 'ORDER STATUS', href: '/track-order' },
        { label: 'SIZE GUIDE', href: '/size-guide' },
        { label: 'CONTACT', href: '/contact' },
      ]
    },
    legal: {
      title: 'LEGAL',
      items: [
        { label: 'TERMS', href: '/terms' },
        { label: 'PRIVACY', href: '/privacy' },
        { label: 'COOKIES', href: '/cookies' },
      ]
    },
    social: {
      title: 'CONNECT',
      items: [
        { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
        { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
        { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
      ]
    }
  };

  return (
    <footer className="relative bg-black border-t border-zinc-800 overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 cyber-grid opacity-5"></div>
      
      {/* Scan Line Effect */}
      <div className="absolute inset-0 scan-line"></div>

      {/* Giant Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h1 className="text-[20vw] font-black text-zinc-900 uppercase tracking-tighter select-none">
          PIXELLO
        </h1>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8">
        {/* Top Section */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-acid-lime flex items-center justify-center">
                    <span className="text-black font-black text-xl">P</span>
                  </div>
                  <span className="text-white font-black text-xl tracking-tighter italic">
                    PIXELLO
                  </span>
                </div>
                <p className="text-zinc-400 text-sm font-mono leading-relaxed">
                  REINVENTING THE CUSTOM APPAREL GAME.<br/>
                  BASED IN QUEBEC, SHIPPING WORLDWIDE.
                </p>
              </div>
              
              {/* System Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-acid-lime" />
                  <span className="text-xs font-mono text-zinc-500">SYSTEM: OPERATIONAL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-acid-lime" />
                  <span className="text-xs font-mono text-zinc-500">VERSION: 2.0.1</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-acid-lime" />
                  <span className="text-xs font-mono text-zinc-500">BUILD: STABLE</span>
                </div>
              </div>
            </div>

            {/* Links Column */}
            <div>
              <h3 className="text-white font-bold text-sm tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[2px] bg-acid-lime"></span>
                {footerLinks.links.title}
              </h3>
              <ul className="space-y-2">
                {footerLinks.links.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-zinc-400 hover:text-acid-lime font-mono text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="text-acid-lime opacity-0 group-hover:opacity-100 transition-opacity">
                        {'//'}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h3 className="text-white font-bold text-sm tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[2px] bg-acid-lime"></span>
                {footerLinks.support.title}
              </h3>
              <ul className="space-y-2">
                {footerLinks.support.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-zinc-400 hover:text-acid-lime font-mono text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="text-acid-lime opacity-0 group-hover:opacity-100 transition-opacity">
                        {'//'}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Social Column */}
            <div>
              <h3 className="text-white font-bold text-sm tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[2px] bg-acid-lime"></span>
                {footerLinks.legal.title}
              </h3>
              <ul className="space-y-2 mb-6">
                {footerLinks.legal.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-zinc-400 hover:text-acid-lime font-mono text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="text-acid-lime opacity-0 group-hover:opacity-100 transition-opacity">
                        {'//'}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Social Links */}
              <h3 className="text-white font-bold text-sm tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[2px] bg-acid-lime"></span>
                {footerLinks.social.title}
              </h3>
              <div className="flex gap-3">
                {footerLinks.social.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-acid-lime hover:border-acid-lime transition-all duration-200"
                      aria-label={item.label}
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
                <Shield size={14} className="text-acid-lime" />
                <span className="text-xs font-mono text-zinc-400 uppercase">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
                <Package size={14} className="text-acid-lime" />
                <span className="text-xs font-mono text-zinc-400 uppercase">Fast Shipping</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
                <Clock size={14} className="text-acid-lime" />
                <span className="text-xs font-mono text-zinc-400 uppercase">New Weekly</span>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-center md:text-right">
              <p className="text-zinc-500 text-xs font-mono">
                © {currentYear} PIXELLO INC. ALL RIGHTS RESERVED.
              </p>
              <p className="text-zinc-600 text-xs font-mono mt-1">
                POWERED BY{' '}
                <span className="text-acid-lime">NEXT.JS</span>
                {' + '}
                <span className="text-acid-lime">SUPABASE</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal-style decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-acid-lime to-transparent opacity-50"></div>
    </footer>
  );
}
