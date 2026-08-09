# P01-T08 — EntitlementGuard سراسری

## هدف
Nest Guard سروری برای mutate/export/modules.

## پیش‌نیاز
- Trial + plans (ترجیحاً payment هم)

## دامنه Full-Stack
- PostgreSQL: خواندن subscription/modules
- Backend: EntitlementsService + Guard
- Frontend: /entitlements + disable UI
- Docs + تست

## معیار تموم شدن (DoD)
- [ ] pending/expired نمی‌توانند mutate/export
- [ ] trial/active مجاز
- [ ] ماژول قفل → 403 + code
- [ ] تست deny/allow

## پرامپت اجرا

```
طبق `.cursor/rules/` EntitlementGuard اجباری است (Nest Guard نه فقط UI).

تسک: EntitlementGuard را Full-Stack مرکز سیستم کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) سرویس assert* + Guard قابل اتصال به کنترلرها.
3) GET /businesses/:businessId/entitlements.
4) Next بر اساس entitlements CTA/disable.
5) تست خودکار.
6) docs/api + i18n برای error codes.
7) نام‌گذاری Laravel Policy نیاور — Nest Guard/Service.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
