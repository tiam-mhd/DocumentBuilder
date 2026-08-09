import { setRequestLocale } from 'next-intl/server';
import { ProjectsPage } from '@/features/content/projects-page';

type Props = { params: Promise<{ locale: string }> };

export default async function ProjectsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectsPage />;
}
