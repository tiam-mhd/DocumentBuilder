import { setRequestLocale } from 'next-intl/server';
import { TemplatesPage } from '@/features/templates/templates-page';

type Props = { params: Promise<{ locale: string }> };

export default async function TemplatesRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TemplatesPage />;
}
