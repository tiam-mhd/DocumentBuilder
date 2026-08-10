import { setRequestLocale } from 'next-intl/server';
import { BrandingPage } from '@/features/branding/branding-page';

type Props = { params: Promise<{ locale: string }> };

export default async function BrandingRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BrandingPage />;
}
