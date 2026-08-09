import { setRequestLocale } from 'next-intl/server';
import { OrgChartPage } from '@/features/content/org-chart-page';

type Props = { params: Promise<{ locale: string }> };

export default async function OrgChartRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrgChartPage />;
}
