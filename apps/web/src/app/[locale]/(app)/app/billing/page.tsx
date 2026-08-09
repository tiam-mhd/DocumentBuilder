import { setRequestLocale } from 'next-intl/server';
import { CatalogPage } from '@/features/billing/catalog-page';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CatalogPage locale={locale} />;
}
