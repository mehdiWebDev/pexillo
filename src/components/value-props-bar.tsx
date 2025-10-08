// src/components/value-props-bar.tsx
'use client';

import { Package, Shield, Palette, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ValuePropsBar = () => {
    const t = useTranslations('valueProps');

    const props = [
        {
            icon: Palette,
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
        <section className="value-props-bar">
            <div className="value-props-bar__container">
                <div className="value-props-bar__grid">
                    {props.map((prop, index) => {
                        const Icon = prop.icon;
                        return (
                            <div
                                key={index}
                                className="value-props-bar__item"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="value-props-bar__icon">
                                    <Icon size={28} />
                                </div>
                                <div className="value-props-bar__content">
                                    <h3 className="value-props-bar__title">{prop.title}</h3>
                                    <p className="value-props-bar__description">{prop.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ValuePropsBar;