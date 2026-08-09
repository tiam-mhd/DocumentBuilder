# P01-T04 — مدل Subscription و وضعیت‌ها

## هدف
Subscription per-Business در PostgreSQL با state machine.

## پیش‌نیاز
- `03-business-crud-switcher.md`

## دامنه Full-Stack
- PostgreSQL: subscriptions
- Backend: BillingModule وضعیت
- Frontend: نمایش وضعیت
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] trial|active|grace|expired|pending_payment
- [ ] UI وضعیت
- [ ] helper آماده‌سازی برای EntitlementGuard

## پرامپت اجرا

```
طبق `.cursor/rules/` Subscription عمل کن.

تسک: مدل Subscription را در Nest + PostgreSQL + Next پیاده کن (بدون درگاه کامل).

الزامات:
1) تحلیل + state machine + تسک‌لیست.
2) Prisma model subscriptions با businessId، status، startsAt، endsAt.
3) API خواندن وضعیت Business.
4) Next badge/صفحه وضعیت با i18n.
5) shared-types هم‌تراز.
6) docs/api. Redis/Mongo الزامی نیست مگر cache وضعیت.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
