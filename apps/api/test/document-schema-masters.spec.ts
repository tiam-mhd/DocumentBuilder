import {
  DOCUMENT_SCHEMA_VERSION,
  createDefaultMasterPage,
  formatPageNumberLabel,
  parseDocumentBody,
  upgradeDocumentLikeInput,
} from '@vdb/document-schema';

describe('document-schema masters (v3)', () => {
  it('formats page numbers', () => {
    const master = createDefaultMasterPage();
    expect(
      formatPageNumberLabel(master.pageNumber, 2, 5),
    ).toBe('2 / 5');
    expect(
      formatPageNumberLabel(
        { ...master.pageNumber, format: 'number', prefix: 'p.' },
        3,
        9,
      ),
    ).toBe('p.3');
  });

  it('upgrades v2 blocks body to masters + pages', () => {
    const upgraded = upgradeDocumentLikeInput({
      schemaVersion: 2,
      businessId: 'biz_1',
      documentId: 'doc_1',
      title: 'T',
      blocks: [{ id: 'a', type: 'text', props: { content: 'hi' } }],
    });
    const body = parseDocumentBody(upgraded);
    expect(body.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
    expect(body.masters).toHaveLength(1);
    expect(body.pages).toHaveLength(1);
    expect(body.pages[0]?.masterId).toBe(body.masters[0]?.id);
    expect(body.pages[0]?.blocks[0]).toMatchObject({
      type: 'text',
      props: { content: 'hi' },
    });
  });
});
