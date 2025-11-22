'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X, Zap, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CyberNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemTime, setSystemTime] = useState('');

  // System time display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'HOME', href: '/' },
    { label: 'SHOP', href: '/products' },
    { label: 'STUDIO', href: '/design' },
    { label: 'ABOUT', href: '/about' },
  ];

  return (
    <>
      {/* Marquee Top Bar */}
      <div className="bg-acid-lime text-black overflow-hidden h-8 flex items-center relative">
        <div className="marquee flex">
          <div className="marquee-content flex items-center gap-8 pr-8">
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              /// V.2.0 SYSTEM ONLINE ★
            </span>
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              WEAR YOUR IMAGINATION • PREMIUM CUSTOM PRINTS
            </span>
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              FREE SHIPPING ON ORDERS OVER $100 ★
            </span>
          </div>
          <div className="marquee-content flex items-center gap-8 pr-8" aria-hidden="true">
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              /// V.2.0 SYSTEM ONLINE ★
            </span>
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              WEAR YOUR IMAGINATION • PREMIUM CUSTOM PRINTS
            </span>
            <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
              FREE SHIPPING ON ORDERS OVER $100 ★
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav 
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          isScrolled 
            ? "bg-black/95 backdrop-blur-xl border-zinc-800" 
            : "bg-black border-zinc-800"
        )}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-10 h-10 bg-acid-lime flex items-center justify-center">
                  <span className="text-black font-black text-xl">P</span>
                </div>
                <div className="absolute inset-0 bg-acid-lime blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              </div>
              <span className="text-white font-black text-xl tracking-tighter italic hidden sm:block">
                PIXELLO
              </span>
            </Link>

            {/* Center: Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-zinc-400 hover:text-white font-bold text-sm tracking-wider uppercase transition-all duration-200 hover:bg-zinc-900 relative group"
                >
                  <span className="relative z-10">{link.label}</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-acid-lime scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </Link>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              {/* System Status */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
                <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-zinc-400">{systemTime}</span>
              </div>

              {/* User Account */}
              <button className="p-2 text-zinc-400 hover:text-white transition-colors relative group">
                <User size={20} />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-acid-lime scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </button>

              {/* Cart */}
              <button className="p-2 text-zinc-400 hover:text-white transition-colors relative group">
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-acid-lime text-black text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-acid-lime scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 z-40 lg:hidden transition-all duration-300",
        isMobileMenuOpen ? "visible" : "invisible"
      )}>
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity",
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div className={cn(
          "absolute right-0 top-0 h-full w-full max-w-sm bg-black border-l border-zinc-800 transition-transform",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-6 space-y-8">
            {/* Close Button */}
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-mono text-xs uppercase">/// Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Links */}
            <nav className="space-y-4">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 text-white font-black text-2xl uppercase tracking-tight hover:text-acid-lime transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Actions */}
            <div className="space-y-4 pt-8 border-t border-zinc-800">
              <Link
                href="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                <User size={20} />
                <span className="font-mono text-sm uppercase">Account</span>
              </Link>
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ShoppingBag size={20} />
                <span className="font-mono text-sm uppercase">System Cart (3)</span>
              </Link>
            </div>

            {/* System Info */}
            <div className="pt-8 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500">
                <Zap size={16} className="text-acid-lime" />
                <span className="font-mono text-xs">SYSTEM: ONLINE</span>
              </div>
              <div className="mt-2 text-zinc-500">
                <span className="font-mono text-xs">{systemTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
