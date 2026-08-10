import type { CSSProperties } from 'react';
import type { PublicWebDocumentView as PublicView } from '@vdb/shared-types';
import { getApiBaseUrl } from '@/shared/api/client';
import styles from './public-web-document-view.module.css';

type Props = {
  data: PublicView;
  poweredByLabel: string;
};

export function PublicWebDocumentView({ data, poweredByLabel }: Props) {
  const api = getApiBaseUrl();
  const logoSrc = data.branding.logoUrl
    ? data.branding.logoUrl.startsWith('http')
      ? data.branding.logoUrl
      : `${api.replace(/\/api$/, '')}${data.branding.logoUrl}`
    : null;
  const accent = data.branding.primaryColor ?? undefined;
  const pageStyle = accent
    ? ({ ['--brand-accent']: accent } as CSSProperties)
    : undefined;

  return (
    <div
      className={styles.page}
      dir={data.dir}
      lang={typeof data.locale === 'string' ? data.locale : 'fa'}
      style={pageStyle}
    >
      <header className={styles.chrome}>
        <div className={styles.brand}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className={styles.logo} />
          ) : null}
          <div>
            {data.branding.displayName ? (
              <p className={styles.displayName}>{data.branding.displayName}</p>
            ) : null}
            <h1 className={styles.title}>{data.title}</h1>
          </div>
        </div>
      </header>

      <div className={styles.frameWrap}>
        <iframe
          className={styles.frame}
          title={data.title}
          srcDoc={data.html}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>

      {data.branding.showPoweredByEffective ? (
        <footer className={styles.footer}>
          <p>{poweredByLabel}</p>
        </footer>
      ) : null}
    </div>
  );
}
