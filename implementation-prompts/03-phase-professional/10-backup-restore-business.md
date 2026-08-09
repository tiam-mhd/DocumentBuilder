# P03-T10 — Backup / Restore Workspace

## هدف
خروجی zip/بسته از داده+اسناد یک Business و بازگردانی کنترل‌شده.

## پرامپت اجرا

```
طبق Backup/Restore عمل کن (PG + Mongo + storage refs).

تسک: Backup و Restore یک Business را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ فرمت بسته را نسخه‌بندی کن.
2) Job Redis برای export بسته؛ شامل متادیتا، mongo documents، فهرست media keys (و/یا خود فایل‌ها).
3) Restore با preview/تأیید؛ جلوگیری از overwrite خاموش.
4) UI؛ Entitlement/Owner only؛ docs/api+deploy.
5) تست دور کامل backup→restore روی Business خالی.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
