// src/components/about-section.tsx
'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Heart, Star, Zap } from 'lucide-react';

const AboutSection = () => {
  const t = useTranslations('about');

  return (
    <section className="about-section">
      <div className="about-section__container">
        <div className="about-section__header">
          <h2 className="about-section__title">
            {t('title')}
            <span className="about-section__title-accent">
              {t('titleAccent')}
            </span>
          </h2>
          <div className="about-section__title-underline" />
        </div>

        <div className="about-section__content">
          <div className="about-section__grid">
            {/* Story Card */}
            <div className="about-section__card about-section__card--story">
              <div className="about-section__card-icon">
                <Heart size={24} />
              </div>
              <h3 className="about-section__card-title">
                {t('whyTitle')}
              </h3>
              <p className="about-section__card-text">
                {t('whyText')}
              </p>
            </div>

            {/* Quality Card */}
            <div className="about-section__card about-section__card--quality">
              <div className="about-section__card-icon">
                <Star size={24} />
              </div>
              <h3 className="about-section__card-title">
                {t('qualityTitle')}
              </h3>
              <p className="about-section__card-text">
                {t('qualityText')}
              </p>
            </div>

            {/* Mission Card */}
            <div className="about-section__card about-section__card--mission">
              <div className="about-section__card-icon">
                <Zap size={24} />
              </div>
              <h3 className="about-section__card-title">
                {t('missionTitle')}
              </h3>
              <p className="about-section__card-text">
                {t('missionText')}
              </p>
            </div>
          </div>

          <div className="about-section__cta">
            <p className="about-section__cta-text">
              {t('ctaText')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;