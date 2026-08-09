# P00-T08 — پکیج‌های shared (document-schema و shared-types)

## هدف
پکیج‌های TypeScript مشترک برای Document JSON و entitlement codes — مصرف در Nest و Next.

## پیش‌نیاز
- `01-monorepo-scaffold.md`
- بهتر است api و web baseline آماده باشند

## دامنه Full-Stack
- Backend + Frontend: import از packages
- Docs: نسخه اسکیما

## معیار تموم شدن (DoD)
- [ ] document-schema با schema_version حداقلی
- [ ] shared-types شامل entitlement codes
- [ ] Nest و Next بتوانند import کنند (workspace)
- [ ] بدون mirror PHP — همه TypeScript

## پرامپت اجرا

```
طبق `.cursor/rules/` خصوصاً document-schema عمل کن.

تسک: packages/document-schema و packages/shared-types را راه‌اندازی کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) JSON Schema/Zod/types برای document حداقلی + schema_version.
3) entitlement codes و subscription statuses در shared-types.
4) tsconfig paths / workspace برای apps/api و apps/web.
5) منبع واحد TypeScript — mirror PHP نساز.
6) Mongo Document body بعداً با همین schema اعتبارسنجی می‌شود؛ الان فقط پکیج.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
