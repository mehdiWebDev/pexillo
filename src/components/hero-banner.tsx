'use client';

import { useState } from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ArrowRight, Palette, Truck, Shield, Star, Zap } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Tshirt from '@/src/img/quebec-city.png';
import QuebecCity from '@/src/img/quebec-2.png';

const HeroBanner = () => {
    const t = useTranslations('hero');
    const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

    // Process steps for new business
    const processSteps = [
        {
            icon: Palette,
            title: t('process.design'),
            description: t('process.designDesc')
        },
        {
            icon: Zap,
            title: t('process.print'),
            description: t('process.printDesc')
        },
        {
            icon: Truck,
            title: t('process.deliver'),
            description: t('process.deliverDesc')
        }
    ];

    return (
        <section className="hero-banner">
            {/* Animated Background */}
            <div className="hero-banner__background">
                <div className="hero-banner__gradient-orb hero-banner__gradient-orb--1" />
                <div className="hero-banner__gradient-orb hero-banner__gradient-orb--2" />
                <div className="hero-banner__pattern" />
            </div>

            <div className="container mx-auto relative !py-20">
                <div className="hero-banner__content">
                    {/* Main Hero Content */}
                    <div className="hero-banner__main">
                        {/* Badge */}
                        {/* <div className="hero-banner__badge">
                        <Sparkles className="w-4 h-4" />
                        <span>{t('badge')}</span>
                        </div> */}

                        {/* Main Heading */}
                        <h1 className="hero-banner__title">
                            {t('title.line1')}
                            <span className="hero-banner__title-highlight">
                                {t('title.highlight')}
                            </span>
                            {t('title.line2')}
                        </h1>

                        {/* Description */}
                        <p className="hero-banner__description">
                            {t('description')}
                        </p>

                        {/* CTA Buttons */}
                        <div className="hero-banner__cta-group">
                            <Link href="/products">
                                <Button size="lg" className="hero-banner__cta-primary">
                                    {t('cta.primary')}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/design-studio">
                                <Button size="lg" variant="outline" className="hero-banner__cta-secondary">
                                    <Palette className="mr-2 h-5 w-5" />
                                    {t('cta.secondary')}
                                </Button>
                            </Link>
                        </div>

                        {/* Trust Features */}
                        <div className="hero-banner__trust-features">
                            <div className="hero-banner__trust-item">
                                <Shield className="w-5 h-5" />
                                <span>{t('features.quality')}</span>
                            </div>
                            <div className="hero-banner__trust-item">
                                <Truck className="w-5 h-5" />
                                <span>{t('features.shipping')}</span>
                            </div>
                            <div className="hero-banner__trust-item">
                                <Star className="w-5 h-5" />
                                <span>{t('features.satisfaction')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Showcase */}
                    <div className="hero-banner__visual">
                        <div className="hero-banner__showcase-grid">
                            <div className="hero-banner__showcase-item hero-banner__showcase-item--main">
                                <Image
                                    src={Tshirt}
                                    alt="Featured Design"
                                    width={600}
                                    height={600}
                                    className="hero-banner__showcase-image"
                                    priority
                                />
                                <div className="hero-banner__showcase-tag">
                                    {t('showcase.featured')}
                                </div>
                            </div>
                            <div className="hero-banner__showcase-item hero-banner__showcase-item--secondary">
                                <Image
                                    src={QuebecCity}
                                    alt="T-Shirt Design"
                                    width={400}
                                    height={400}
                                    className="hero-banner__showcase-image"
                                />
                                <div className="hero-banner__showcase-label">T-Shirts</div>
                            </div>
                            <div className="hero-banner__showcase-item hero-banner__showcase-item--tertiary">
                                <Image
                                    src={Tshirt}
                                    alt="Hoodie Design"
                                    width={400}
                                    height={400}
                                    className="hero-banner__showcase-image"
                                />
                                <div className="hero-banner__showcase-label">Hoodies</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Process Section - Instead of Stats */}
                <div className="hero-banner__process">
                    <h3 className="hero-banner__process-title">{t('process.title')}</h3>
                    <div className="hero-banner__process-steps">
                        {processSteps.map((step, index) => (
                            <div
                                key={index}
                                className="hero-banner__process-step"
                                onMouseEnter={() => setHoveredFeature(index)}
                                onMouseLeave={() => setHoveredFeature(null)}
                            >

                                <div className="hero-banner__process-icon">
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <h4 className="hero-banner__process-step-title">{step.title}</h4>
                                <p className="hero-banner__process-step-desc">{step.description}</p>
                                <div
                                    className="hero-banner__process-connector"
                                    style={{
                                        opacity: hoveredFeature === index ? 1 : 0.3
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroBanner;