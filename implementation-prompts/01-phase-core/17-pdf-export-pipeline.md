# P01-T17 — PDF Export Pipeline

## هدف
صف Export روی Redis/BullMQ + worker Chromium برای PDF نهایی با فونت embed و RTL.

## پیش‌نیاز
- `16-master-header-footer.md`
- `11-font-manager.md`
- Entitlement `export.pdf`

## دامنه Full-Stack
- PostgreSQL: export_jobs متادیتا
- Redis: صف BullMQ
- Mongo: خواندن document body
- Backend: ExportModule + worker
- Frontend: دکمه Export + وضعیت job + دانلود
- Docs: docs/api + deploy worker

## معیار تموم شدن (DoD)
- [ ] درخواست Export → job → PDF ذخیره‌شده
- [ ] بدون entitlement رد می‌شود
- [ ] RTL و فونت فارسی در نمونه تستی قابل قبول
- [ ] Editor همچنان PDF زنده تولید نمی‌کند

## پرامپت اجرا

```
طبق `.cursor/rules/` Rendering جدا از Editor و صف Redis عمل کن.

تسک: PDF Export Pipeline را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) POST export → ایجاد job در PG + enqueue Redis؛ worker با Playwright/Puppeteer/Gotenberg HTML→PDF.
3) HTML canonical از document+theme+fonts؛ embed فونت؛ RTL.
4) EntitlementGuard assertCan('export.pdf').
5) Next: شروع export، polling/status، لینک دانلود؛ i18n/theme.
6) docs/api و docs/deploy برای worker.
7) تست حداقل یک سند نمونه فارسی.
8) mPDF/Laravel استفاده نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
