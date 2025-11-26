'use client';

import { MousePointer2, Printer, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

const HowItWorks = () => {
  const t = useTranslations('hero.process');

  const steps = [
    {
      icon: MousePointer2,
      number: 1,
      title: t('design'),
      description: t('designDesc'),
    },
    {
      icon: Printer,
      number: 2,
      title: t('print'),
      description: t('printDesc'),
    },
    {
      icon: Truck,
      number: 3,
      title: t('deliver'),
      description: t('deliverDesc'),
    },
  ];

  return (
    <section className="py-20 px-4 border-b border-gray-100 bg-white relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-brand-dark mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-500 font-medium text-xl">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-10 border-t-2 border-dashed border-gray-300"></div>

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="flex flex-col items-center text-center group cursor-default"
              >
                <div className="w-24 h-24 bg-white border-2 border-brand-dark rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 relative z-10">
                  <Icon className="w-10 h-10 text-brand-red" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-brand-dark text-white rounded-full flex items-center justify-center font-black border-2 border-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-brand-dark mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-500 font-medium max-w-xs leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
