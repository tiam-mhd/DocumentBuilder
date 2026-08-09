# P01-T09 — لایسنس نصب SELF_HOSTED

## هدف
License adapter برای Edition=SELF_HOSTED روی Nest + PostgreSQL.

## پیش‌نیاز
- EntitlementGuard + Edition config

## دامنه Full-Stack
- PostgreSQL: installation_licenses
- Backend: License adapter متصل به Edition
- Frontend: صفحه فعال‌سازی فقط SELF_HOSTED
- Docs: deploy + api

## معیار تموم شدن (DoD)
- [ ] بدون لایسنس معتبر در SELF_HOSTED قفل حساس
- [ ] SAAS این صفحه را لازم ندارد
- [ ] یک کدبیس

## پرامپت اجرا

```
طبق `08-dual-deployment.mdc` و استک Nest/Next/PG عمل کن.

تسک: License adapter برای SELF_HOSTED را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) ذخیره hash کلید لایسنس در PostgreSQL.
3) اتصال به Edition + Gate نصب.
4) API فعال‌سازی؛ UI فقط SELF_HOSTED.
5) docs/api و docs/deploy (Docker/VPS — نه cPanel/PHP).
6) تست: SAAS ignore؛ SELF_HOSTED بدون لایسنس deny.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
