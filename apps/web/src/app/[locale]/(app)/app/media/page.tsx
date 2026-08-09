import { setRequestLocale } from 'next-intl/server';
import { MediaLibraryPage } from '@/features/media/media-library-page';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MediaLibraryPage />;
}
