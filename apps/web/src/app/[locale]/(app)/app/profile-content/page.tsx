import { setRequestLocale } from 'next-intl/server';
import { ProfileContentPage } from '@/features/content/profile-content-page';

type Props = { params: Promise<{ locale: string }> };

export default async function ProfileContentRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileContentPage />;
}
