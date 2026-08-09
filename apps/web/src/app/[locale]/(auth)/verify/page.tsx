import { setRequestLocale } from 'next-intl/server';
import { VerifyForm } from '@/features/auth/verify-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function VerifyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <VerifyForm locale={locale} />;
}
