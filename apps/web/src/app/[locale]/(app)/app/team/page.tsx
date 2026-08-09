import { setRequestLocale } from 'next-intl/server';
import { TeamPage } from '@/features/content/team-page';

type Props = { params: Promise<{ locale: string }> };

export default async function TeamRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TeamPage />;
}
