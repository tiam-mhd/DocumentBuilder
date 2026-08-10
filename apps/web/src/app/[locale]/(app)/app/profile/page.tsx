import { setRequestLocale } from 'next-intl/server';
import { ProfilePage } from '@/features/auth/profile-page';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfilePage />;
}
