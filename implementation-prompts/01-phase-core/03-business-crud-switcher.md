# P01-T03 — Business CRUD + Switcher

## هدف
چند Business per User با ایزوله businessId در PostgreSQL.

## پیش‌نیاز
- `02-auth-session-web.md`

## دامنه Full-Stack
- PostgreSQL: businesses، business_memberships
- Backend: TenancyModule
- Frontend: features/businesses + سوییچر
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] CRUD + Owner membership
- [ ] قرارداد active business قفل‌شده (header یا path)
- [ ] جلوگیری از IDOR
- [ ] UI fa/en + theme

## پرامپت اجرا

```
طبق `.cursor/rules/` Tenant=Business عمل کن (Nest/Next/PG).

تسک: Business CRUD و Switcher را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) جداول PostgreSQL با businessId/memberships.
3) Nest TenancyModule؛ مسیرهای /businesses...
4) قرارداد context را اگر جدید است در rules قفل کن (مثلاً X-Business-Id یا path param).
5) Next سوییچر در shell.
6) Trial را تسک 05 انجام می‌دهد؛ اینجا hook آماده بگذار.
7) docs/api به‌روز. Mongo لازم نیست.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
