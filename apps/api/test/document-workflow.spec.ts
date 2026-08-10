import {
  DOCUMENT_BODY_LOCKED_STATUSES,
  DOCUMENT_EXPORT_ALLOWED_STATUSES,
  DocumentErrorCodes,
  DocumentStatus,
} from '@vdb/shared-types';
import { isApproverRole } from '../src/modules/documents/document-workflow.service';
import { MembershipRole } from '@prisma/client';

const TRANSITIONS: Record<
  string,
  { from: string; to: string; approver: boolean }
> = {
  submit: { from: DocumentStatus.Draft, to: DocumentStatus.Review, approver: false },
  approve: {
    from: DocumentStatus.Review,
    to: DocumentStatus.Approved,
    approver: true,
  },
  reject: { from: DocumentStatus.Review, to: DocumentStatus.Draft, approver: true },
  publish: {
    from: DocumentStatus.Approved,
    to: DocumentStatus.Published,
    approver: true,
  },
  unpublish: {
    from: DocumentStatus.Published,
    to: DocumentStatus.Draft,
    approver: true,
  },
  reopen: {
    from: DocumentStatus.Approved,
    to: DocumentStatus.Draft,
    approver: true,
  },
};

describe('document approval workflow (ADR 021)', () => {
  it('locks body outside draft', () => {
    expect(DOCUMENT_BODY_LOCKED_STATUSES).toEqual([
      DocumentStatus.Review,
      DocumentStatus.Approved,
      DocumentStatus.Published,
    ]);
  });

  it('allows PDF only for approved/published', () => {
    expect(DOCUMENT_EXPORT_ALLOWED_STATUSES).toEqual([
      DocumentStatus.Approved,
      DocumentStatus.Published,
    ]);
    expect(DocumentErrorCodes.NotApprovedForExport).toBe(
      'DOCUMENT_NOT_APPROVED_FOR_EXPORT',
    );
  });

  it('defines state machine edges', () => {
    expect(TRANSITIONS.submit).toMatchObject({
      from: 'draft',
      to: 'review',
      approver: false,
    });
    expect(TRANSITIONS.publish).toMatchObject({
      from: 'approved',
      to: 'published',
      approver: true,
    });
  });

  it('treats OWNER and ADMIN as approvers', () => {
    expect(isApproverRole(MembershipRole.OWNER)).toBe(true);
    expect(isApproverRole(MembershipRole.ADMIN)).toBe(true);
    expect(isApproverRole(MembershipRole.EDITOR)).toBe(false);
    expect(isApproverRole(MembershipRole.VIEWER)).toBe(false);
  });
});
