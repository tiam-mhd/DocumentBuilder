# P02-T01 — Projects / Portfolio

## هدف
Entity پروژه‌ها/نمونه‌کار با دسته‌بندی و فیلدهای منعطف per-Business.

## پیش‌نیاز
- فاز Core کامل؛ Media Library

## دامنه Full-Stack
- PostgreSQL: projects (+ categories)
- Backend: ContentModule
- Frontend: CRUD پروژه‌ها
- Module code: `module.projects` (اگر جدا فروخته می‌شود)

## پرامپت اجرا

```
طبق `.cursor/rules/` و استک Nest/Next/PG عمل کن. ماژول فروش‌پذیر باید کد entitlement داشته باشد.

تسک: Projects/Portfolio را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل projects با businessId، title، description، category، status، media refs، timestamps.
3) API CRUD + list filter؛ EntitlementGuard (module.projects یا Core اگر در پلن پایه است — تصمیم را در shared-types/rules قفل کن).
4) Next features/content UI با i18n/theme.
5) docs/api به‌روز.
6) هنوز Map location را به Location Entity تسک 05 وصل کن یا FK nullable آماده بگذار.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
