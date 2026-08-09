import { setRequestLocale } from 'next-intl/server';
import { DesignThemePage } from '@/features/settings/design-theme-page';

type Props = { params: Promise<{ locale: string }> };

export default async function DesignThemeRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DesignThemePage />;
}
