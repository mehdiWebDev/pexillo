// src/components/about.tsx
'use client';

import { useTranslations } from 'next-intl';

const AboutSection = () => {
  const t = useTranslations('about');

  return (
    <section className="py-24 bg-white text-brand-dark relative overflow-hidden">
      {/* Background Texture */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-brand-red font-marker text-xl mb-2 transform -rotate-2">
            {t('badge')}
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-20">
          {/* Column 1 - Why We Started */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <h3 className="text-2xl font-black text-brand-dark mb-4 border-b-4 border-brand-red pb-2 inline-block">
              {t('whyTitle')}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed">
              {t('whyText')}
            </p>
          </div>

          {/* Column 2 - Our Standards */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <h3 className="text-2xl font-black text-brand-dark mb-4 border-b-4 border-brand-red pb-2 inline-block">
              {t('qualityTitle')}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed">
              {t('qualityText')}
            </p>
          </div>

          {/* Column 3 - Our Mission */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <h3 className="text-2xl font-black text-brand-dark mb-4 border-b-4 border-brand-red pb-2 inline-block">
              {t('missionTitle')}
            </h3>
            <p className="text-gray-600 font-medium leading-relaxed">
              {t('missionText')}
            </p>
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto border-t border-gray-200 pt-12">
          <p className="text-2xl md:text-3xl font-black text-brand-dark leading-tight mb-3">
            {t('ctaTitle')}
          </p>
          <p className="text-gray-600 font-medium text-lg">
            {t('ctaText')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
