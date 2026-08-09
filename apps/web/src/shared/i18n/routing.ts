import { defineRouting } from 'next-intl/routing';

export const locales = ['fa', 'en'] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'fa',
  localePrefix: 'always',
});

export function directionForLocale(locale: string): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}
