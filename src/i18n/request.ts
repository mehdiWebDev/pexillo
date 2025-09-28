import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Normalize and validate the incoming `locale` parameter
  const finalLocale: Locale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;

  return {
    locale: finalLocale,
    messages: (await import(`@/src/messages/${finalLocale}.json`)).default
  };
});