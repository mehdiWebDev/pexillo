// src/components/news-letter.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Loader2 } from 'lucide-react';

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
    } catch {
      setStatus('error');
      setMessage(t('errorGeneral'));
    }
  };

  return (
    <section className="py-20 px-4 bg-brand-dark text-white border-t-4 border-gray-100">
      <div className="max-w-3xl mx-auto text-center">
        <Zap className="w-12 h-12 mx-auto mb-6 text-brand-red fill-current animate-bounce" />

        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
          {t('title')}
        </h2>

        <p className="text-xl md:text-2xl font-medium mb-8 opacity-90">
          {t('description')}
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              className="flex-1 px-6 py-4 rounded-xl text-brand-dark font-bold border-2 border-white focus:outline-none focus:ring-2 focus:ring-brand-red"
              disabled={status === 'loading' || status === 'success'}
              required
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-brand-dark font-black rounded-xl border-2 border-white hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : status === 'success' ? (
                t('subscribed')
              ) : (
                t('subscribe')
              )}
            </button>
          </div>

          {message && (
            <div className={`mt-4 text-sm font-medium ${
              status === 'success' ? 'text-brand-green' : 'text-brand-red'
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default NewsletterSignup;
