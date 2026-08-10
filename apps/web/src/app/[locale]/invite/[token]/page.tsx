import { setRequestLocale } from 'next-intl/server';
import { InviteAcceptPage } from '@/features/members/invite-accept-page';

type Props = { params: Promise<{ locale: string; token: string }> };

export default async function InviteRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InviteAcceptPage />;
}
