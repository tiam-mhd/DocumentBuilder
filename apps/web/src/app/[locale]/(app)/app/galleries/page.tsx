import { setRequestLocale } from 'next-intl/server';
import { GalleryPage } from '@/features/content/gallery-page';

type Props = { params: Promise<{ locale: string }> };

export default async function GalleryRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GalleryPage />;
}
