# P01-T14 — Document CRUD روی Schema

## هدف
نسخه Document به‌عنوان اتصال Data refs + Template + config صفحه؛ body در Mongo.

## پیش‌نیاز
- `13-template-blocks-basic.md`

## دامنه Full-Stack
- PostgreSQL: documents متادیتا (title، status draft/published، templateId، businessId)
- MongoDB: document body (pages/elements) با schema_version
- Backend: DocumentsModule
- Frontend: لیست/ساخت/باز کردن سند
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] CRUD کامل با Gate
- [ ] اعتبارسنجی body با document-schema
- [ ] بدون قاطی کردن محتوای شرکت داخل template
- [ ] UI fa/en

## پرامپت اجرا

```
طبق architecture: PostgreSQL متادیتا + MongoDB بدنه Document.

تسک: Document CRUD را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل PG documents + collection Mongo با businessId و documentId.
3) API ایجاد از روی template (کپی ساختار اولیه)، خواندن، به‌روزرسانی body، حذف نرم یا سخت طبق سیاست مستند.
4) Validate با packages/document-schema.
5) EntitlementGuard روی mutate.
6) Next features برای لیست و باز کردن سند (ورود به editor در تسک بعد).
7) docs/api به‌روز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
