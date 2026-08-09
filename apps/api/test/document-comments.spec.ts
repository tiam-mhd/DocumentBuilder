import { DocumentErrorCodes } from '@vdb/shared-types';

describe('document comments (ADR 022)', () => {
  it('exposes comment error codes', () => {
    expect(DocumentErrorCodes.CommentNotFound).toBe(
      'DOCUMENT_COMMENT_NOT_FOUND',
    );
    expect(DocumentErrorCodes.CommentInvalidBody).toBe(
      'DOCUMENT_COMMENT_INVALID_BODY',
    );
    expect(DocumentErrorCodes.CommentForbidden).toBe(
      'DOCUMENT_COMMENT_FORBIDDEN',
    );
  });

  it('treats mentions as non-goal (no @ parsing helpers required)', () => {
    const body = 'Please fix @alice the table';
    expect(body.includes('@')).toBe(true);
    // Product law: plain text only — no mention extraction in MVP.
    expect(typeof body).toBe('string');
  });
});
