// src/components/value-props-bar.tsx
'use client';

import { Package, Shield, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ValuePropsBar = () => {
    const t = useTranslations('valueProps');

    const props = [
        {
            icon: Zap,
            title: t('quality'),
            description: t('qualityDesc')
        },
        {
            icon: Sparkles,
            title: t('design'),
            description: t('designDesc')
        },
        {
            icon: Package,
            title: t('shipping'),
            description: t('shippingDesc')
        },
        {
            icon: Shield,
            title: t('secure'),
            description: t('secureDesc')
        }
    ];

    return (
        <section className="relative bg-black py-16">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {props.map((prop, index) => {
                        const Icon = prop.icon;
                        return (
                            <div
                                key={index}
                                className="group relative bg-zinc-900 border border-zinc-800 p-6 hover:border-acid-lime transition-all duration-300"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Icon */}
                                <div className="flex items-center justify-center w-12 h-12 mb-4 bg-black border border-zinc-800 group-hover:border-acid-lime transition-colors">
                                    <Icon size={24} className="text-acid-lime" />
                                </div>

                                {/* Content */}
                                <h3 className="text-white font-bold uppercase text-sm mb-2 group-hover:text-acid-lime transition-colors">
                                    {prop.title}
                                </h3>
                                <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                                    {prop.description}
                                </p>

                                {/* Corner accent */}
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-transparent group-hover:border-acid-lime transition-colors"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-transparent group-hover:border-acid-lime transition-colors"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ValuePropsBar;