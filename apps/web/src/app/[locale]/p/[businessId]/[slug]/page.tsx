import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PublicWebDocumentView } from '@/features/web-publish/public-web-document-view';
import { getApiBaseUrl } from '@/shared/api/client';
import type { ApiEnvelope, PublicWebDocumentView as PublicView } from '@vdb/shared-types';

type Props = {
  params: Promise<{ locale: string; businessId: string; slug: string }>;
};

async function loadPublic(
  businessId: string,
  slug: string,
): Promise<PublicView | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(
      `${base}/public/documents/${encodeURIComponent(businessId)}/${encodeURIComponent(slug)}`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<PublicView>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, businessId, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'webPublish' });
  const data = await loadPublic(businessId, slug);
  if (!data) {
    return { title: t('notFoundTitle'), robots: { index: false } };
  }
  const brand = data.branding.displayName;
  return {
    title: brand ? `${data.title} · ${brand}` : data.title,
    description: t('metaDescription', { title: data.title }),
    robots: { index: true, follow: true },
    openGraph: {
      title: data.title,
      locale: data.locale === 'fa' ? 'fa_IR' : 'en_US',
      type: 'article',
    },
  };
}

export default async function PublicWebDocumentPage({ params }: Props) {
  const { locale, businessId, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('webPublish');
  const data = await loadPublic(businessId, slug);

  if (!data) {
    return (
      <main style={{ padding: '2rem', maxWidth: '40rem', margin: '0 auto' }}>
        <h1>{t('notFoundTitle')}</h1>
        <p>{t('notFoundBody')}</p>
      </main>
    );
  }

  return <PublicWebDocumentView data={data} poweredByLabel={t('poweredBy')} />;
}
