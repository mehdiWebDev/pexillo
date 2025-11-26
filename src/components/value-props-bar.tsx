// src/components/value-props-bar.tsx
'use client';

import { Truck, ShieldCheck, RotateCcw, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ValuePropsBar = () => {
    const t = useTranslations('valueProps');

    const props = [
        {
            icon: Truck,
            title: t('freeShipping'),
            description: t('freeShippingDesc')
        },
        {
            icon: ShieldCheck,
            title: t('secure'),
            description: t('secureDesc')
        },
        {
            icon: RotateCcw,
            title: t('returns'),
            description: t('returnsDesc')
        },
        {
            icon: Zap,
            title: t('fastDrops'),
            description: t('fastDropsDesc')
        }
    ];

    return (
        <section className="bg-brand-dark text-white py-10 border-b border-gray-800 relative overflow-hidden">
            {/* Subtle Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                }}
            />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    {props.map((prop, index) => {
                        const Icon = prop.icon;
                        return (
                            <div
                                key={index}
                                className="flex flex-col items-center text-center group cursor-default"
                            >
                                <div className="mb-4 p-3 rounded-full border-2 border-gray-700 group-hover:border-brand-red group-hover:bg-brand-red/10 transition-colors duration-300">
                                    <Icon className="w-6 h-6 text-white group-hover:text-brand-red transition-colors" />
                                </div>
                                <h3 className="font-bold text-lg uppercase tracking-wider mb-1">
                                    {prop.title}
                                </h3>
                                <p className="text-sm text-gray-400 font-medium">
                                    {prop.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ValuePropsBar;
