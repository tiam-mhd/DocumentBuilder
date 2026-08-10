# P05-T04-07 — اعتبارسنجی درون‌پنلی و Hintهای اعتمادساز

## هدف
قبل از autosave/API، کاربر در inspector بفهمد چه چیزی نادرست است: خطاهای میدانی، هشدارهای نرم، و خلاصهٔ بالای پنل — بدون Zod خام و بدون مسدود کردن کل ادیتور بی‌دلیل.

## پیش‌نیاز
- پنل‌های type تسک‌های ۰۲–۰۶
- `parseDocumentBody` / validate سمت سرور؛ کدهای خطای موجود
- autosave debounce

## دامنه Full-Stack
- Frontend: validate سبک آینه‌ای schema (یا استفاده از safeParse روی بلوک)
- Backend: پیام‌های error code محلی‌سازی‌پذیر اگر امروز generic است — در حد نیاز + docs/api
- Shared: اختیاری `validateBlockProps(type, props)` در document-schema برای یک منبع حقیقت

## معیار تموم شدن (DoD)
- [ ] خطای فیلد زیر کنترل مرتبط (قرمز، متن i18n)
- [ ] هشدار نرم (مثلاً QR بدون value) — زرد/muted؛ autosave می‌تواند ادامه دهد اگر schema اجازه می‌دهد
- [ ] اگر body overall invalid از سرور برگشت: بنر inspector/top با code mapped
- [ ] Focus اولین فیلد خطا هنگام تلاش واضح کاربر (اختیاری ولی مطلوب)
- [ ] جدول نگاشت code→i18n برای خطاهای ادیتور رایج
- [ ] performance: validate سنگین در هر keystroke کل document نکن؛ per-block debounce

## پرامپت اجرا

```
طبق coding standards و i18n errors و document-schema عمل کن.

تسک: اعتبارسنجی درون‌پنلی و hintهای اعتمادساز inspector را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ تصمیم: shared safeParse per block vs دست‌نویس — ترجیح schema-driven.
2) InspectorField از تسک 01 را به error/warning وصل کن.
3) موارد اجباری پوشش: QR value خالی وقتی type نیاز دارد؛ image بدون media؛ repeater source نامعتبر؛ map coords نامعتبر اگر هست.
4) Autosave: اگر سرور 400 می‌دهد، saveStatus error + نمایش پیام؛ از حلقهٔ overwrite خاموش جلوگیری کن.
5) fa+en برای همهٔ پیام‌های جدید در errors یا editor.validation.*.
6) تست: ورودی بد → hint؛ اصلاح → پاک شدن خطا؛ سند معتبر → preview OK.
7) قابلیت جدید block type نساز؛ فقط کیفیت پنل‌ها.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
