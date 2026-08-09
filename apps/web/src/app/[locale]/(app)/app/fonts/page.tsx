import { setRequestLocale } from 'next-intl/server';
import { FontManagerPage } from '@/features/settings/font-manager-page';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FontManagerPage />;
}
