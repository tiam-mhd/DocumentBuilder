# P01-T13 — Template + Block Registry پایه

## هدف
قالب سند با بلوک‌های پایه (text، image، section، divider، header/footer slot) و registry توسعه‌پذیر.

## پیش‌نیاز
- `12-design-theme-tokens.md`
- `08-shared-packages` (document-schema)

## دامنه Full-Stack
- PostgreSQL: templates متادیتا (name، businessId، themeId)
- MongoDB: ساختار template body (صفحات/بلوک‌ها) یا JSONB در PG — ترجیح طبق architecture: ساختار منعطف در Mongo با businessId
- Backend: DesignModule templates + block registry
- Frontend: انتخاب/ساخت قالب ساده
- Docs: docs/api + schema version

## معیار تموم شدن (DoD)
- [ ] Registry بلوک‌های پایه در کد
- [ ] CRUD قالب scoped به Business
- [ ] Template از Data محتوا جداست
- [ ] document-schema هم‌تراز

## پرامپت اجرا

```
طبق `.cursor/rules/` Data≠Template≠Document و Mongo برای payload منعطف عمل کن.

تسک: Template + Block registry پایه را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ محل ذخیره body قالب را Mongo (ترجیح architecture) با businessId انتخاب کن مگر ADR خلاف بگوید.
2) متادیتا در PostgreSQL؛ body در Mongo هم‌کلید.
3) Block registry سمت Nest و مصرف در Next (فقط بلوک‌های فاز Core).
4) API CRUD templates؛ EntitlementGuard.
5) UI لیست/ساخت قالب مینیمال؛ i18n/theme.
6) packages/document-schema را برای template nodeها به‌روز کن.
7) docs/api به‌روز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
