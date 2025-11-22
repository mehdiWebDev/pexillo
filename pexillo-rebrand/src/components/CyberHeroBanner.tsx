'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, ChevronRight } from 'lucide-react';

export function CyberHeroBanner() {
  const [glitchText, setGlitchText] = useState('GLITCH');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Glitch text animation
  useEffect(() => {
    const words = ['GLITCH', 'FUTURE', 'SYSTEM', 'DIGITAL', 'CYBER'];
    let index = 0;
    
    const interval = setInterval(() => {
      index = (index + 1) % words.length;
      setGlitchText(words[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Product showcase images
  const productImages = [
    '/images/hero-product-1.jpg',
    '/images/hero-product-2.jpg',
    '/images/hero-product-3.jpg',
  ];

  return (
    <section className="relative min-h-screen bg-black overflow-hidden flex items-center">
      {/* Background Grid */}
      <div className="absolute inset-0 cyber-grid opacity-10"></div>
      
      {/* Animated Lines */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime to-transparent animate-pulse"></div>
        <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* System Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
              <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-zinc-400 uppercase">V.2.0 System Online</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase leading-none">
                <span className="text-white">WEAR THE</span>
                <br />
                <span 
                  className="text-acid-lime glitch relative inline-block"
                  data-text={glitchText}
                >
                  {glitchText}.
                </span>
              </h1>
              
              <div className="h-px bg-zinc-800 w-full"></div>
              
              <p className="text-zinc-400 text-lg md:text-xl max-w-md">
                Premium custom apparel for the digital generation.
                Design your own reality or shop exclusive drops.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/design"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-acid-lime text-black font-bold uppercase tracking-wider overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(163,230,53,0.5)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  START CREATING
                  <Zap size={18} />
                </span>
                <div className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </Link>

              <Link
                href="/products"
                className="group inline-flex items-center justify-center px-8 py-4 bg-transparent border border-zinc-800 text-white font-bold uppercase tracking-wider transition-all duration-300 hover:border-acid-lime hover:text-acid-lime"
              >
                <span className="flex items-center gap-2">
                  VIEW COLLECTIONS
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-zinc-800">
              <div>
                <div className="text-2xl font-black text-acid-lime font-mono">10K+</div>
                <div className="text-xs text-zinc-500 font-mono uppercase">Designs</div>
              </div>
              <div>
                <div className="text-2xl font-black text-acid-lime font-mono">24H</div>
                <div className="text-xs text-zinc-500 font-mono uppercase">Production</div>
              </div>
              <div>
                <div className="text-2xl font-black text-acid-lime font-mono">100%</div>
                <div className="text-xs text-zinc-500 font-mono uppercase">Quality</div>
              </div>
            </div>
          </div>

          {/* Right Content - Product Showcase */}
          <div className="relative lg:h-[700px] h-[500px]">
            {/* Main Product Image */}
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/20 to-transparent"></div>
              
              {/* Product Container */}
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  {/* Decorative Frame */}
                  <div className="absolute -inset-4 border border-zinc-800"></div>
                  <div className="absolute -inset-8 border border-zinc-900"></div>
                  
                  {/* Corner Marks */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-acid-lime"></div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-acid-lime"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-acid-lime"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-acid-lime"></div>
                  
                  {/* Product Image */}
                  <div className="relative bg-zinc-900 aspect-square overflow-hidden">
                    <Image
                      src="/images/hero-tshirt.jpg"
                      alt="Cyber Collection T-Shirt"
                      fill
                      className="object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                      priority
                    />
                  </div>
                  
                  {/* Product Tag */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/90 backdrop-blur border border-zinc-800 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-zinc-500 uppercase">Collection:</span>
                        <span className="text-xs font-mono text-acid-lime uppercase">CYBER_01</span>
                      </div>
                      <div className="text-white font-bold uppercase">Glitch Reality Tee</div>
                      <div className="text-acid-lime font-mono text-lg mt-1">$42.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating UI Elements */}
              <div className="absolute top-4 right-4 space-y-2">
                <div className="px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase">
                  LIMITED
                </div>
                <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
                  STOCK: 127
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-px bg-gradient-to-r from-transparent via-acid-lime to-transparent"></div>
        <div className="h-px bg-gradient-to-r from-transparent via-acid-lime to-transparent opacity-50 mt-1"></div>
      </div>
    </section>
  );
}
