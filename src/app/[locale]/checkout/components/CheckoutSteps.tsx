// app/[locale]/checkout/components/CheckoutSteps.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Check, CreditCard, MapPin } from 'lucide-react';

interface CheckoutStepsProps {
  currentStep: number;
}

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const t = useTranslations('checkout');
  
  const steps = [
    { number: 1, label: t('shipping'), icon: MapPin },
    { number: 2, label: t('payment'), icon: CreditCard },
  ];
  
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div 
                className={`
                  flex items-center justify-center w-12 h-12 rounded-full
                  ${currentStep > step.number 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step.number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                  }
                  transition-colors duration-200
                `}
              >
                {currentStep > step.number ? (
                  <Check size={20} />
                ) : (
                  <step.icon size={20} />
                )}
              </div>
              <span 
                className={`
                  mt-2 text-sm font-medium
                  ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}
                `}
              >
                {step.label}
              </span>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div 
                className={`
                  w-24 h-0.5 mx-4 mb-6
                  ${currentStep > step.number ? 'bg-green-500' : 'bg-muted'}
                  transition-colors duration-200
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}