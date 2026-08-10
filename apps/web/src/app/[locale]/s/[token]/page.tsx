import { setRequestLocale } from 'next-intl/server';
import { ShareAccessPage } from '@/features/share-links/share-access-page';

type Props = { params: Promise<{ locale: string; token: string }> };

export default async function ShareRoute({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <ShareAccessPage token={token} />;
}
