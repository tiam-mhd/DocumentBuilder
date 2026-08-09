import { setRequestLocale } from 'next-intl/server';
import { MapPage } from '@/features/content/map-page';

type Props = { params: Promise<{ locale: string }> };

export default async function MapRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MapPage />;
}
