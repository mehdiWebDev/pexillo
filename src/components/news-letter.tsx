// src/components/newsletter-signup.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Send, CheckCircle } from 'lucide-react';

const NewsletterSignup = () => {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage(t('errorInvalid'));
      return;
    }

    setStatus('loading');

    try {
      // TODO: Replace with your actual newsletter API endpoint
      // const response = await fetch('/api/newsletter', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus('success');
      setMessage(t('success'));
      setEmail('');
      
      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (error) {
      setStatus('error');
      setMessage(t('errorGeneral'));
    }
  };

  return (
    <section className="newsletter-signup">
      <div className="newsletter-signup__container">
        <div className="newsletter-signup__content">
          <div className="newsletter-signup__header">
            <div className="newsletter-signup__icon">
              <Mail size={40} />
            </div>
            <h2 className="newsletter-signup__title">
              {t('title')}
              <span className="newsletter-signup__title-accent">
                {t('titleAccent')}
              </span>
            </h2>
          </div>

          <p className="newsletter-signup__description">
            {t('description')}
          </p>

          <form onSubmit={handleSubmit} className="newsletter-signup__form">
            <div className="newsletter-signup__input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                className="newsletter-signup__input"
                disabled={status === 'loading' || status === 'success'}
                required
              />
              <button
                type="submit"
                className={`newsletter-signup__button newsletter-signup__button--${status}`}
                disabled={status === 'loading' || status === 'success'}
              >
                {status === 'loading' ? (
                  <div className="newsletter-signup__spinner" />
                ) : status === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <Send size={20} />
                )}
                <span className="newsletter-signup__button-text">
                  {status === 'loading' 
                    ? t('subscribing') 
                    : status === 'success'
                    ? t('subscribed')
                    : t('subscribe')}
                </span>
              </button>
            </div>

            {message && (
              <div className={`newsletter-signup__message newsletter-signup__message--${status}`}>
                {message}
              </div>
            )}
          </form>

          <p className="newsletter-signup__disclaimer">
            {t('disclaimer')}
          </p>

          <div className="newsletter-signup__benefits">
            <div className="newsletter-signup__benefit">
              <span className="newsletter-signup__benefit-icon">🎉</span>
              <span>{t('benefit1')}</span>
            </div>
            <div className="newsletter-signup__benefit">
              <span className="newsletter-signup__benefit-icon">💌</span>
              <span>{t('benefit2')}</span>
            </div>
            <div className="newsletter-signup__benefit">
              <span className="newsletter-signup__benefit-icon">✨</span>
              <span>{t('benefit3')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSignup;