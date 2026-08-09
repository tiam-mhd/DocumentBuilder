import { DocumentErrorCodes, DocumentStatus } from '@vdb/shared-types';

/** Mirrors DocumentsService published-body lock (ADR 020). */
function allowsBodyPatch(input: {
  currentStatus: string;
  nextStatus: string;
  hasBody: boolean;
}): boolean {
  if (!input.hasBody) return true;
  if (
    input.currentStatus === DocumentStatus.Published &&
    input.nextStatus !== DocumentStatus.Draft
  ) {
    return false;
  }
  return true;
}

describe('document versioning published lock', () => {
  it('blocks body patch while published', () => {
    expect(
      allowsBodyPatch({
        currentStatus: DocumentStatus.Published,
        nextStatus: DocumentStatus.Published,
        hasBody: true,
      }),
    ).toBe(false);
    expect(DocumentErrorCodes.PublishedLocked).toBe(
      'DOCUMENT_PUBLISHED_LOCKED',
    );
  });

  it('allows body patch when unpublishing to draft', () => {
    expect(
      allowsBodyPatch({
        currentStatus: DocumentStatus.Published,
        nextStatus: DocumentStatus.Draft,
        hasBody: true,
      }),
    ).toBe(true);
  });

  it('allows body patch on drafts', () => {
    expect(
      allowsBodyPatch({
        currentStatus: DocumentStatus.Draft,
        nextStatus: DocumentStatus.Draft,
        hasBody: true,
      }),
    ).toBe(true);
  });
});
