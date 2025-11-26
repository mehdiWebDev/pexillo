'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/routing';
import { locales, localeNames, type Locale } from '@/src/i18n/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <Select defaultValue={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[140px]">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Compact version for navigation
export function LanguageSwitcherCompact() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <Select defaultValue={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[80px] h-[40px] rounded-xl border-gray-200 focus:ring-brand-dark">
        <SelectValue placeholder="Lang" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="rounded-lg">
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}