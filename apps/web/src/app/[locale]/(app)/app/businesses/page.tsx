import { setRequestLocale } from 'next-intl/server';
import { BusinessesPage } from '@/features/businesses/businesses-page';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BusinessesPage />;
}
