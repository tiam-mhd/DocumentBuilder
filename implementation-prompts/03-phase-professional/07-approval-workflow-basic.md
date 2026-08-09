# P03-T07 — Approval Workflow پایه

## هدف
وضعیت‌های Draft → Review → Approved → Published با نقش‌های ساده.

## پرامپت اجرا

```
طبق Approval Workflow عمل کن. Invite کامل فاز 04 است؛ اینجا حداقل Owner/آپروف‌کننده ساده.

تسک: جریان تأیید سند را Full-Stack حداقلی پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ state machine را در rules/ADR قفل کن اگر جدید است.
2) انتقال وضعیت با permission؛ Audit event.
3) UI دکمه‌های انتقال؛ i18n؛ docs/api.
4) Export نهایی می‌تواند فقط Approved/Published باشد — سیاست را مستند کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
