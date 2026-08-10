# P05-T08-06 — تله‌متری اختیاری ادیتور (بدون PII محتوا)

## هدف
رویدادهای محصولی سبک برای بهبود صفحه‌ساز (باز شدن ادیتور، سوییچ mode، enqueue preview، اتمام تور) — **بدون** متن سند، بدون OTP، بدون payload بلوک؛ سازگار با ADR analytics موجود و edition SAAS.

## پیش‌نیاز
- ADR 028 analytics basic اگر وجود دارد؛ rule 21
- ویژگی analytics در API اگر هست — reuse کن
- SELF_HOSTED: قابل خاموش با env

## دامنه Full-Stack
- Backend: فقط اگر event type جدید لازم است + docs
- Frontend: fire-and-forget از shell
- Env: `EDITOR_TELEMETRY=true|false` یا استفاده از فلگ analytics موجود
- Docs: فهرست event names و خواص مجاز

## معیار تموم شدن (DoD)
- [ ] جدول eventها مستند (نام، خواص: documentId hash یا id، businessId، mode، durationBucket)
- [ ] هیچ content/title کامل در meta اگر حساس است — ترجیح idها و enumها
- [ ] خاموش‌سازی با config
- [ ] شکست telemetry UI را نشکند
- [ ] SAAS-oriented؛ SELF_HOSTED default off یا بی‌ضرر
- [ ] OpenAPI اگر endpoint جدید

## پرامپت اجرا

```
طبق ADR analytics و ممنوعیت لاگ اسرار عمل کن.

تسک: تله‌متری اختیاری ادیتور را بدون PII محتوا اضافه کن.

الزامات:
1) بررسی مسیر analytics موجود؛ reuse قبل از invent.
2) Eventهای حداقل: editor_opened، editor_mode_changed، pdf_preview_enqueued، pdf_preview_completed|failed، tour_completed|skipped، command_palette_used.
3) خواص: businessId، documentId، edition، timestamps، errorCode — نه body JSON.
4) نمونه‌گیری/throttle برای mode_changed اگر شلوغ است.
5) docs/qa یا docs/adr بند کوتاه.
6) اگر endpoint نیست و ساختش بزرگ است: stub client که در dev console debug می‌کند + TODO مستند — ولی ترجیح مسیر واقعی موجود.
7) تست: با فلگ off هیچ شبکهٔ اضافه؛ با on یک event ثبت می‌شود.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
