# P01-T10 — Media Library

## هدف
کتابخانه رسانه per-Business با آپلود، مشتقات تصویر، و استفاده مجدد از asset.

## پیش‌نیاز
- `08-entitlement-gate.md` (نوشتن پشت اشتراک معتبر)

## دامنه Full-Stack
- PostgreSQL: media_assets متادیتا + businessId
- Object storage: S3/MinIO یا دیسک محلی dev
- Redis: صف پردازش تصویر (Sharp) اختیاری
- Backend: AssetsModule
- Frontend: features/media
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] آپلود با MIME/size validation؛ SVG خطرناک کنترل‌شده
- [ ] مشتقات thumb/web/print
- [ ] لیست/حذف/جستجوی ساده scoped به Business
- [ ] UI fa/en + dark/light؛ Gate روی mutate

## پرامپت اجرا

```
طبق `.cursor/rules/` استک NestJS + Next.js + PostgreSQL + Redis + S3-compatible عمل کن.

تسک: Media Library را Full-Stack برای هر Business پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) جدول media_assets در PostgreSQL (businessId، key، mime، sizes، meta).
3) آپلود از طریق Nest؛ ذخیره فایل در MinIO/local؛ پردازش Sharp برای derivatives (صف Redis اگر سنگین است).
4) EntitlementGuard برای نوشتن؛ IDOR ممنوع.
5) Next: UI آپلود/گالری/حذف با i18n و theme.
6) docs/api به‌روز؛ .env.example برای storage.
7) Mongo لازم نیست مگر ذخیره meta اضافه — پیش‌فرض PG + object storage.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
