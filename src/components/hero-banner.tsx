'use client';

import React from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Tshirt from '@/src/img/quebec-city.png';
import QuebecCity from '@/src/img/quebec-2.png';

const HeroBanner = () => {
    const t = useTranslations('hero');

    return (
        <header className="relative overflow-hidden bg-doodle bg-[length:20px_20px] pt-12 pb-24 md:py-20 lg:py-32 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left: Copy */}
                <div className="relative z-10 text-center lg:text-left">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-brand-yellow/30 text-yellow-800 font-bold text-sm mb-6 border border-brand-yellow transform -rotate-2">
                        {t('badge') || 'Fall Collection Live'}
                    </span>

                    <h1 className="text-5xl md:text-7xl font-black leading-[0.95] mb-6 tracking-tight text-brand-dark">
                        {t('title.line1') || 'Wear whatever'} <br />
                        {t('title.line1part2') || 'you '}
                        <span className="text-brand-red font-marker transform rotate-2 inline-block">
                            {t('title.highlight') || 'feel.'}
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-600 font-medium mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                        {t('description') || 'Premium streetwear essentials and accessories for the bold. Designed in Montreal.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link href="/products">
                            <button className="btn-primary text-lg">
                                {t('cta.primary') || 'Shop Collection'}
                            </button>
                        </Link>
                        <Link href="/products">
                            <button className="btn-secondary text-lg">
                                {t('cta.secondary') || 'View Lookbook'}
                            </button>
                        </Link>
                    </div>

                </div>

                {/* Right: Sticker Bomb / Visuals */}
                <div className="relative h-[400px] md:h-[600px] w-full flex items-center justify-center">

                    {/* Centerpiece Product */}
                    <div
                        className="relative z-20 w-64 md:w-80 animate-pop-in opacity-0"
                        style={{ animationDelay: '0.1s', '--tw-rotate': '-2deg' } as React.CSSProperties}
                    >
                        <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 transform transition-transform hover:scale-105 duration-300">
                            <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden">
                                <Image
                                    src={Tshirt}
                                    alt="Hero Product"
                                    fill
                                    sizes="(max-width: 768px) 256px, 320px"
                                    className="object-cover"
                                    priority
                                />
                            </div>
                            <div className="mt-3 flex justify-between items-center px-1">
                                <span className="font-bold text-sm">Vapor Hoodie</span>
                                <span className="bg-brand-dark text-white text-xs px-2 py-1 rounded-lg font-bold">$65</span>
                            </div>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <div
                        className="absolute top-0 right-0 md:right-12 z-10 w-32 md:w-40 animate-pop-in opacity-0 animate-float"
                        style={{ animationDelay: '0.3s', '--tw-rotate': '6deg' } as React.CSSProperties}
                    >
                        <div className="relative w-full aspect-square rounded-full border-4 border-white shadow-lg overflow-hidden">
                            <Image
                                src={QuebecCity}
                                alt="Sticker 1"
                                fill
                                sizes="(max-width: 768px) 128px, 160px"
                                className="object-cover"
                            />
                        </div>
                    </div>



                    <div
                        className="absolute top-10 left-4 md:left-20 z-0 w-28 animate-pop-in opacity-0"
                        style={{ animationDelay: '0.2s', '--tw-rotate': '-10deg' } as React.CSSProperties}
                    >
                        <div className="bg-white p-2 rounded-lg shadow-md border border-gray-100">
                            <div className="relative w-full aspect-square rounded overflow-hidden">
                                <Image
                                    src={Tshirt}
                                    alt="Tote"
                                    fill
                                    sizes="112px"
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default HeroBanner;