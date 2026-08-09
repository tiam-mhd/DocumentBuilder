import { setRequestLocale } from 'next-intl/server';
import { EditorShell } from '@/features/editor/editor-shell';

type Props = {
  params: Promise<{ locale: string; documentId: string }>;
};

export default async function DocumentEditorRoute({ params }: Props) {
  const { locale, documentId } = await params;
  setRequestLocale(locale);
  return <EditorShell documentId={documentId} />;
}
