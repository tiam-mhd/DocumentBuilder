import { setRequestLocale } from 'next-intl/server';
import { DashboardHome } from '@/features/auth/dashboard-home';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AppHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardHome />;
}
