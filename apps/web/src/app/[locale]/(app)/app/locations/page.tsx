import { setRequestLocale } from 'next-intl/server';
import { LocationsPage } from '@/features/content/locations-page';

type Props = { params: Promise<{ locale: string }> };

export default async function LocationsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LocationsPage />;
}
