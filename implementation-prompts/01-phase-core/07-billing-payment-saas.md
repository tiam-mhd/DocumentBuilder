# P01-T07 — پرداخت و فعال‌سازی اشتراک (SAAS)

## هدف
پرداخت SAAS با adapter؛ ایدمپوتنسی؛ صف/قفل Redis در صورت نیاز.

## پیش‌نیاز
- `06-plans-modules-catalog.md`
- Edition config

## دامنه Full-Stack
- PostgreSQL: payments، invoices
- Redis: idempotency lock اختیاری
- Backend: Billing adapters + webhook
- Frontend: checkout
- Docs: docs/api + deploy

## معیار تموم شدن (DoD)
- [ ] پرداخت موفق → active
- [ ] webhook ایدمپوتنت
- [ ] غیر SAAS مسیر درست
- [ ] UI کامل

## پرامپت اجرا

```
طبق `.cursor/rules/` Billing و Dual Deployment عمل کن (Nest/Next/PG/Redis).

تسک: پرداخت SAAS و فعال‌سازی Subscription را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) PaymentPort + driver زرین‌پال/مشابه + fake driver.
3) جداول payments/invoices؛ یکتایی gatewayRef.
4) webhook ایدمپوتنت؛ در صورت نیاز Redis lock.
5) فقط APP_EDITION=SAAS.
6) Next checkout.
7) docs/api و .env.example.
8) Laravel/Cashier نساز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
