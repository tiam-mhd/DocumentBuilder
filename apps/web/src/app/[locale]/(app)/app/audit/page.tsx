import { setRequestLocale } from 'next-intl/server';
import { AuditPage } from '@/features/audit/audit-page';

type Props = { params: Promise<{ locale: string }> };

export default async function AuditRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuditPage />;
}
