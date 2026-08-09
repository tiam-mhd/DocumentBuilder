import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { BillingReturnPage } from '@/features/billing/billing-return';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <BillingReturnPage />
    </Suspense>
  );
}
