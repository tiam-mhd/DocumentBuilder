# P00-T06 — APP_EDITION (SELF_HOSTED | SAAS)

## هدف
پیاده‌سازی لایه Edition Config در NestJS طبق `08-dual-deployment.mdc`.

## پیش‌نیاز
- `02-api-nestjs-baseline.md`
- `03-web-nextjs-baseline.md`

## دامنه Full-Stack
- Database: اختیاری؛ حداقل env
- Backend: SystemModule Edition service + endpoint عمومی
- Frontend: خواندن edition در app context
- Docs: docs/api + docs/deploy

## معیار تموم شدن (DoD)
- [ ] APP_EDITION در `.env.example`
- [ ] سرویس مرکزی بدون if پراکنده
- [ ] Next از API، edition را می‌گیرد
- [ ] docs/deploy دو حالت را توضیح می‌دهد (Docker/VPS)

## پرامپت اجرا

```
طبق `.cursor/rules/` خصوصاً `08-dual-deployment.mdc` عمل کن.

تسک: لایه APP_EDITION را در NestJS + Next.js پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) اعتبارسنجی فقط SELF_HOSTED|SAAS.
3) EditionService در SystemModule؛ GET /api/system/config بدون secret.
4) Next: context از این endpoint؛ UI بر اساس flags (مثلاً publicSignup).
5) stub interface برای Billing/License adapters.
6) docs/api و docs/deploy؛ تأکید استک Nest/Next/PG/Redis/Mongo و نه cPanel/PHP.
7) Full-stack هماهنگ.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
