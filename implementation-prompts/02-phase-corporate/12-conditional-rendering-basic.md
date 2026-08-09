# P02-T12 — Conditional Rendering پایه

## هدف
نمایش/عدم‌نمایش بلوک بر اساس وجود داده یا فلگ ساده (مثلاً اگر گواهی ندارد مخفی شود).

## پیش‌نیاز
- Repeater؛ Content entities

## پرامپت اجرا

```
طبق Conditional Rendering پایه عمل کن (نه موتور rule کامل سازمانی).

تسک: شرایط نمایش ساده برای blocks را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ اپراتورهای مجاز را محدود و در schema قفل کن (exists، empty، eq).
2) ذخیره condition روی element؛ ارزیابی در preview و PDF.
3) UI سازنده شرط ساده؛ i18n؛ docs/schema.
4) تست: مخفی شدن بخش certificates وقتی خالی است.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
