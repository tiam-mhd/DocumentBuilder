# P05-T09-02 — E2E مسیر طلایی صفحه‌ساز

## هدف
اسکریپت E2E (ترجیح API-first مثل `scripts/e2e/*.mjs` موجود؛ Playwright UI اختیاری) که مسیر را سبز کند: ساخت/باز کردن سند → PATCH body (سایز صفحه + بلوک) → HTML معنادار از renderer یا GET document → enqueue PDF preview → (اختیاری) export نهایی با gate درست.

## پیش‌نیاز
- الگوی `scripts/e2e/professional-funnel.mjs` / `saas-funnel.mjs`
- APIهای preview از فاز 07 و documents موجود
- npm script جدید مثلاً `test:e2e:pagebuilder`

## دامنه Full-Stack
- Scripts: `scripts/e2e/pagebuilder-funnel.mjs` (نام نهایی آزاد اما مستند)
- package.json script
- Docs: نحوهٔ اجرا در چک‌لیست QA و README پک
- Env تست از `.env` موجود؛ بدون commit سرّ

## معیار تموم شدن (DoD)
- [ ] اسکریپت روی محیط dev/CI قابل اجرا با پیش‌فرض‌های مستند
- [ ] Assertهای صریح روی status codes و shape پاسخ
- [ ] Preview enqueue ≠ final export در asserts
- [ ] پاکسازی یا idempotent data (business/document تست)
- [ ] شکست پیام واضح می‌دهد
- [ ] در docs/qa لینک اجرا

## پرامپت اجرا

```
طبق scripts/e2e موجود و قوانین tenancy/auth عمل کن. UI Playwright فقط اگر ارزشش را دارد؛ پیش‌فرض API-first.

تسک: E2E funnel صفحه‌ساز را اضافه کن.

الزامات:
1) تحلیل یک funnel موجود + تسک‌لیست.
2) فلو حداقل:
   - auth (OTP fake یا الگوی موجود)
   - business + document create یا استفاده از fixture
   - PATCH body با page.size و چند بلوک معتبر (در صورت schema columns اگر هست یک row)
   - GET document parse موفق
   - POST pdf preview → poll completed (fake renderer OK)
   - اطمینان که keystroke path وجود ندارد (فقط assert API)
   - اختیاری: final export اگر entitlement در seed هست
3) npm script `test:e2e:pagebuilder` در root package.json.
4) README کوتاه در سر اسکریپت (env لازم).
5) لینک از `docs/qa/editor-pagebuilder-acceptance.md`.
6) فلکی/شکننده به Chromium واقعی وابسته نکن مگر PDF_RENDERER=fake پیش‌فرض تست.
7) secrets را لاگ نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
