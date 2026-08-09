# P01-T11 — Font Manager

## هدف
آپلود و ثبت فونت‌های Business برای استفاده در Theme/PDF (آماده‌سازی embed).

## پیش‌نیاز
- `10-media-library.md` (الگوی storage)

## دامنه Full-Stack
- PostgreSQL: font_faces (family، weight، style، file ref، businessId)
- Storage: همان S3/local
- Backend: AssetsModule fonts
- Frontend: مدیریت فونت در settings/design
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] آپلود woff2/ttf/otf با validation
- [ ] تعریف family/weight
- [ ] لیست فونت‌های Business برای Theme picker
- [ ] مسیر فایل برای PDF worker قابل دسترس است (مستند)

## پرامپت اجرا

```
طبق `.cursor/rules/` خصوصاً Font Manager و PDF embed عمل کن (Nest/Next/PG/Storage).

تسک: Font Manager را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل font_faces در PostgreSQL + ذخیره فایل.
3) API CRUD فونت‌ها تحت businessId + EntitlementGuard.
4) Next UI با پیش‌نمایش ساده و i18n/theme.
5) قرارداد مسیر فونت برای Export worker را در docs/deploy یا ADR کوتاه بنویس.
6) docs/api به‌روز.
7) اگر قانون سراسری فرمت فونت دیدی در rules قفل کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
