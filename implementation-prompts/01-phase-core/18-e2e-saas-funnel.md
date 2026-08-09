# P01-T18 — E2E قیف SAAS (Trial → Paid → Export)

## هدف
مسیر انتها‌به‌انتها روی Edition=SAAS برای اثبات معیار خروج فاز Core.

## پیش‌نیاز
- تمام تسک‌های Core تا `17-pdf-export-pipeline.md`
- پرداخت SAAS و Trial

## دامنه Full-Stack
- تست E2E (Playwright برای وب + API) یا سناریوی مستند دستی + اسکریپت
- Docs: چک‌لیست پذیرش فاز 01

## معیار تموم شدن (DoD)
- [ ] OTP → ساخت Business → Trial → ساخت سند → Export در Trial موفق
- [ ] خرید پلن (fake driver) → active → Export
- [ ] Business دوم بدون پرداخت قفل است
- [ ] گزارش/اسکریپت در repo قابل اجرا

## پرامپت اجرا

```
طبق معیار خروج فاز Core و APP_EDITION=SAAS عمل کن.

تسک: E2E قیف SAAS را پیاده/اتومات کن و چک‌لیست پذیرش بنویس.

الزامات:
1) تحلیل سناریوها + تسک‌لیست.
2) حداقل پوشش: signup OTP (fake SMS)، trial document+pdf، payment fake→active، business#2 pending_payment deny mutate/export.
3) ترجیح: e2e با Playwright روی Next + Nest تستی؛ در غیر این صورت script API + دستورالعمل UI.
4) docs/adr یا docs/qa/phase-01-saas-acceptance.md.
5) تم و locale fa را در مسیر UI پوشش بده.
6) اگر حفره محصولی دیدی قبل از هک، rules را آپدیت کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
