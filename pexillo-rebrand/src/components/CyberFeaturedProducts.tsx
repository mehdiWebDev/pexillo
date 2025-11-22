'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Eye, Heart, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED';
  stock?: number;
}

export function CyberFeaturedProducts() {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const products: Product[] = [
    {
      id: '1',
      name: 'ACID WASH OVERSIZE',
      price: 45.00,
      image: '/images/product-1.jpg',
      badge: 'NEW',
      stock: 89
    },
    {
      id: '2',
      name: 'CYBER HOODIE 2025',
      price: 85.00,
      image: '/images/product-2.jpg',
      badge: 'HOT',
      stock: 34
    },
    {
      id: '3',
      name: 'MINIMALIST SWEAT',
      price: 65.00,
      image: '/images/product-3.jpg',
      stock: 156
    },
    {
      id: '4',
      name: 'GLITCH GRAPHIC TEE',
      price: 42.00,
      image: '/images/product-4.jpg',
      badge: 'LIMITED',
      stock: 12
    }
  ];

  return (
    <section className="relative py-24 bg-black overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-overlay opacity-5"></div>
      
      {/* Section Header */}
      <div className="container mx-auto px-4 lg:px-8 mb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
              <div className="w-12 h-px bg-acid-lime"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
              LATEST DROPS
            </h2>
          </div>
          
          <Link
            href="/products"
            className="group hidden md:flex items-center gap-2 text-zinc-400 hover:text-acid-lime font-mono text-sm uppercase transition-colors"
          >
            VIEW ALL
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="group relative"
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Product Card */}
              <div className="relative bg-zinc-900 border border-zinc-800 overflow-hidden transition-all duration-300 hover:border-acid-lime">
                {/* Badge */}
                {product.badge && (
                  <div className="absolute top-4 left-4 z-20">
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold uppercase",
                      product.badge === 'NEW' && "bg-acid-lime text-black",
                      product.badge === 'HOT' && "bg-red-500 text-white",
                      product.badge === 'SALE' && "bg-blue-500 text-white",
                      product.badge === 'LIMITED' && "bg-purple-500 text-white"
                    )}>
                      {product.badge}
                    </span>
                  </div>
                )}

                {/* Stock Indicator */}
                {product.stock && product.stock < 20 && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="px-2 py-1 bg-black/80 border border-red-500 text-red-500 text-xs font-mono uppercase">
                      {product.stock} LEFT
                    </span>
                  </div>
                )}

                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-zinc-950">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  />
                  
                  {/* Overlay on Hover */}
                  <div className={cn(
                    "absolute inset-0 bg-black/80 flex items-center justify-center transition-opacity duration-300",
                    hoveredProduct === product.id ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}>
                    <div className="flex gap-2">
                      <button className="p-3 bg-zinc-800 hover:bg-acid-lime hover:text-black text-white transition-colors">
                        <Eye size={20} />
                      </button>
                      <button className="p-3 bg-zinc-800 hover:bg-acid-lime hover:text-black text-white transition-colors">
                        <ShoppingBag size={20} />
                      </button>
                      <button className="p-3 bg-zinc-800 hover:bg-acid-lime hover:text-black text-white transition-colors">
                        <Heart size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-bold uppercase tracking-wide text-sm">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-acid-lime font-mono text-xl font-bold">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.stock && (
                        <span className="text-zinc-500 font-mono text-xs">
                          STOCK: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Add Button */}
                  <button className="w-full py-2 bg-transparent border border-zinc-800 text-zinc-400 font-mono text-xs uppercase tracking-wider transition-all duration-300 hover:bg-acid-lime hover:text-black hover:border-acid-lime group-hover:border-acid-lime">
                    ADD TO SYSTEM
                  </button>
                </div>

                {/* Corner Decorations */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-zinc-700 group-hover:border-acid-lime transition-colors"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 group-hover:border-acid-lime transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-zinc-700 group-hover:border-acid-lime transition-colors"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-zinc-700 group-hover:border-acid-lime transition-colors"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-12 text-center md:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-acid-lime text-black font-bold uppercase tracking-wider hover:bg-white transition-colors"
          >
            VIEW ALL PRODUCTS
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="container mx-auto px-4 lg:px-8 mt-16">
        <div className="border-t border-zinc-800 pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-acid-lime font-mono">247</div>
              <div className="text-xs text-zinc-500 font-mono uppercase mt-1">Products Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-acid-lime font-mono">48H</div>
              <div className="text-xs text-zinc-500 font-mono uppercase mt-1">Shipping Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-acid-lime font-mono">10K+</div>
              <div className="text-xs text-zinc-500 font-mono uppercase mt-1">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-acid-lime font-mono">∞</div>
              <div className="text-xs text-zinc-500 font-mono uppercase mt-1">Possibilities</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
