'use client';

import {
  blockAnchorId,
  buildTableOfContents,
  parseTocBlockProps,
  type BlockNode,
  type DocumentBody,
  type VisibilityContext,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import styles from './toc-block-preview.module.css';

type Props = {
  block: BlockNode;
  body: DocumentBody;
  visibility?: VisibilityContext;
};

export function TocBlockPreview({ block, body, visibility }: Props) {
  const t = useTranslations('editor');
  const props = parseTocBlockProps(block.props);
  const entries = buildTableOfContents(body, props, visibility);

  return (
    <nav className={styles.wrap}>
      {props.title ? <h2 className={styles.title}>{props.title}</h2> : null}
      {entries.length === 0 ? (
        <p className={styles.empty}>{t('tocEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((e) => (
            <li
              key={e.id}
              className={`${styles.item} ${styles[`l${e.level}`]}`}
            >
              <a className={styles.label} href={`#${blockAnchorId(e.id)}`}>
                {e.title}
              </a>
              {props.showPageNumbers ? (
                <>
                  <span className={styles.dots} aria-hidden />
                  <span className={styles.page}>{e.pageNumber}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
