# P00-T07 — اسکلت مستندات API

## هدف
قرارداد زنده `docs/api/` برای NestJS (OpenAPI).

## پیش‌نیاز
- `02-api-nestjs-baseline.md`

## دامنه Full-Stack
- Docs: هسته تسک؛ هم‌تراز کردن health/edition

## معیار تموم شدن (DoD)
- [ ] docs/api/README.md قرارداد را توضیح دهد
- [ ] openapi.yaml شامل endpointهای فعلی
- [ ] ترجیحاً هم‌ترازی با @nestjs/swagger در صورت استفاده

## پرامپت اجرا

```
طبق `.cursor/rules/` بخش مستندسازی API عمل کن.

تسک: اسکلت docs/api را برای NestJS عملیاتی کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) README قرارداد به‌روزرسانی.
3) openapi.yaml برای health و system/config.
4) الگوی auth JWT، businessId، entitlements، errors.code را در سند قالب بگذار.
5) اگر Swagger در Nest فعال می‌کنی، منبع حقیقت را در rule مشخص کن (codegen vs دستی).
6) استک را Laravel فرض نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
