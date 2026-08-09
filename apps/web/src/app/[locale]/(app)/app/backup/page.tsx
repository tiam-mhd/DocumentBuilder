import { setRequestLocale } from 'next-intl/server';
import { BackupPage } from '@/features/backup/backup-page';

type Props = { params: Promise<{ locale: string }> };

export default async function BackupRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BackupPage />;
}
