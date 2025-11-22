'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/src/i18n/routing';
import Image from 'next/image';
import { ArrowRight, Zap } from 'lucide-react';
import Tshirt from '@/src/img/quebec-city.png';

const HeroBanner = () => {
    const [systemTime, setSystemTime] = useState('');

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

    return (
        <>
            {/* Marquee Banner */}
            <div className="bg-acid-lime text-black overflow-hidden h-8 flex items-center relative">
                <div className="marquee flex">
                    <div className="marquee-content flex items-center gap-8 pr-8">
                        <span className="font-mono text-xs uppercase font-bold whitespace-nowrap">
                            {'//'}{'/'}  V.2.0 SYSTEM ONLINE ★
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
                            {'//'}{'/'}  V.2.0 SYSTEM ONLINE ★
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

            {/* Main Hero Section */}
            <section className="relative bg-black overflow-hidden min-h-[calc(100vh-4rem-2rem)]">
                {/* Grid Background */}
                <div className="absolute inset-0 cyber-grid opacity-20"></div>

                {/* Content */}
                <div className="container mx-auto px-4 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
                        {/* Left: Typography */}
                        <div className="space-y-8 py-16">
                            {/* System Status */}
                            <div className="flex items-center gap-4 text-zinc-500">
                                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800">
                                    <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
                                    <span className="font-mono text-xs uppercase">SYSTEM ACTIVE</span>
                                </div>
                                <span className="font-mono text-xs">{systemTime}</span>
                            </div>

                            {/* Main Title */}
                            <div className="space-y-4">
                                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
                                    <span className="text-white block">WEAR</span>
                                    <span className="text-white block">THE</span>
                                    <span className="text-acid-lime block glitch" data-text="GLITCH">
                                        GLITCH
                                    </span>
                                </h1>

                                {/* Subtitle */}
                                <p className="text-zinc-400 font-mono text-sm max-w-md border-l-2 border-acid-lime pl-4">
                                    {'//'}{'/'}  DIGITAL STREETWEAR STUDIO
                                    <br />
                                    Transform your vision into wearable reality. Premium custom prints. Limited drops.
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap gap-4">
                                <Link href="/products">
                                    <button className="px-8 py-4 bg-acid-lime text-black font-bold uppercase text-sm tracking-wider hover:bg-white transition-colors relative group overflow-hidden">
                                        <span className="relative z-10 flex items-center gap-2">
                                            EXPLORE CATALOG
                                            <ArrowRight size={16} />
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                                    </button>
                                </Link>
                                <Link href="/design-studio">
                                    <button className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase text-sm tracking-wider hover:border-acid-lime hover:bg-zinc-800 transition-all">
                                        <span className="flex items-center gap-2">
                                            <Zap size={16} className="text-acid-lime" />
                                            DESIGN STUDIO
                                        </span>
                                    </button>
                                </Link>
                            </div>

                            {/* Technical Specs */}
                            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-zinc-800">
                                <div>
                                    <div className="text-acid-lime font-mono text-xs uppercase mb-1">
                                        Quality
                                    </div>
                                    <div className="text-white font-bold">Premium DTF</div>
                                </div>
                                <div>
                                    <div className="text-acid-lime font-mono text-xs uppercase mb-1">
                                        Shipping
                                    </div>
                                    <div className="text-white font-bold">3-5 Days</div>
                                </div>
                                <div>
                                    <div className="text-acid-lime font-mono text-xs uppercase mb-1">
                                        Support
                                    </div>
                                    <div className="text-white font-bold">24/7</div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Visual */}
                        <div className="relative lg:py-16">
                            {/* Main Product Image */}
                            <div className="relative group">
                                {/* Decorative Corners */}
                                <div className="absolute -top-4 -left-4 w-12 h-12 border-l-2 border-t-2 border-acid-lime z-10"></div>
                                <div className="absolute -top-4 -right-4 w-12 h-12 border-r-2 border-t-2 border-acid-lime z-10"></div>
                                <div className="absolute -bottom-4 -left-4 w-12 h-12 border-l-2 border-b-2 border-acid-lime z-10"></div>
                                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-r-2 border-b-2 border-acid-lime z-10"></div>

                                {/* Image Container */}
                                <div className="relative aspect-square bg-zinc-900 border border-zinc-800 overflow-hidden">
                                    <Image
                                        src={Tshirt}
                                        alt="Featured Design"
                                        fill
                                        className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                                        priority
                                    />

                                    {/* Scan Line Effect */}
                                    <div className="absolute inset-0 scan-line opacity-0 group-hover:opacity-100"></div>

                                    {/* Product Tag */}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-acid-lime text-black text-xs font-bold uppercase">
                                        NEW DROP
                                    </div>
                                </div>

                                {/* Product Info Overlay */}
                                <div className="mt-4 bg-zinc-900 border border-zinc-800 p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-bold uppercase">FEATURED DESIGN</div>
                                            <div className="text-zinc-500 font-mono text-xs">ITEM_001</div>
                                        </div>
                                        <div className="text-acid-lime font-bold text-xl">$49.99</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Stats */}
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden xl:block">
                                <div className="bg-black border border-zinc-800 p-4 space-y-2">
                                    <div className="text-zinc-500 font-mono text-xs uppercase">Active Users</div>
                                    <div className="text-acid-lime font-bold text-2xl">24.7K</div>
                                </div>
                            </div>

                            <div className="absolute -right-4 bottom-32 hidden xl:block">
                                <div className="bg-black border border-zinc-800 p-4 space-y-2">
                                    <div className="text-zinc-500 font-mono text-xs uppercase">Products</div>
                                    <div className="text-acid-lime font-bold text-2xl">500+</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HeroBanner;