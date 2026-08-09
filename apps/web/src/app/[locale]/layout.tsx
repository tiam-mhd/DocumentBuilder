import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, directionForLocale } from '@/shared/i18n/routing';
import { ThemeProvider } from '@/shared/ui/theme/theme-provider';
import type { ThemePreference } from '@/shared/ui/theme/theme-types';
import { THEME_COOKIE } from '@/shared/ui/theme/theme-types';
import { EditionProvider } from '@/shared/lib/edition-context';
import { AuthProvider } from '@/shared/lib/auth-context';
import { BusinessProvider } from '@/shared/lib/business-context';
import { AppShell } from '@/shared/ui/app-shell';
import '@/styles/tokens.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'fa' | 'en')) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const initialPreference: ThemePreference =
    themeCookie === 'light' || themeCookie === 'dark' || themeCookie === 'system'
      ? themeCookie
      : 'system';

  const dir = directionForLocale(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Vazirmatn:wght@400;500;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=document.cookie.match(/(?:^|; )vdb-theme=([^;]*)/);var p=c?decodeURIComponent(c[1]):'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(d?'dark':'light'):p;document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider initialPreference={initialPreference}>
            <AuthProvider>
              <BusinessProvider>
                <EditionProvider>
                  <AppShell>{children}</AppShell>
                </EditionProvider>
              </BusinessProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
