import { AuditActions } from '@vdb/shared-types';

/** Locked catalog for Owner audit UI (ADR 023 / P03-T09). */
const REQUIRED_AUDIT_ACTIONS = [
  AuditActions.AuthLogin,
  AuditActions.BusinessCreate,
  AuditActions.BusinessDelete,
  AuditActions.BillingPaymentSucceeded,
  AuditActions.BillingLicenseActivated,
  AuditActions.ExportPdfEnqueued,
  AuditActions.DocumentDelete,
  AuditActions.DocumentWorkflowSubmit,
  AuditActions.DocumentWorkflowApprove,
  AuditActions.DocumentWorkflowReject,
  AuditActions.DocumentWorkflowPublish,
  AuditActions.DocumentWorkflowUnpublish,
  AuditActions.DocumentWorkflowReopen,
] as const;

describe('audit event catalog (ADR 023)', () => {
  it('exposes all Owner UI required action codes', () => {
    for (const code of REQUIRED_AUDIT_ACTIONS) {
      expect(Object.values(AuditActions)).toContain(code);
    }
  });

  it('keeps action codes stable dotted strings', () => {
    expect(AuditActions.AuthLogin).toBe('auth.login');
    expect(AuditActions.ExportPdfEnqueued).toBe('export.pdf.enqueued');
    expect(AuditActions.BillingPaymentSucceeded).toBe(
      'billing.payment.succeeded',
    );
  });
});
