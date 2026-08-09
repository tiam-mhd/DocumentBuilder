# P01-T01 — User + درخواست و تأیید OTP

## هدف
هویت فقط با موبایل؛ OTP امن با NestJS.

## پیش‌نیاز
- فاز `00-foundation` کامل

## دامنه Full-Stack
- PostgreSQL: users، (اختیاری) otp audit
- Redis: OTP hash/TTL/rate-limit
- Backend: IdentityModule
- Frontend: Next features/auth
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] موبایل یکتا در PostgreSQL
- [ ] OTP در Redis با TTL؛ هش‌شده؛ rate limit
- [ ] UI fa/en + dark/light
- [ ] OpenAPI به‌روز

## پرامپت اجرا

```
طبق `.cursor/rules/` (استک NestJS/Next.js/PostgreSQL/Redis/MongoDB) عمل کن.

تسک: User + جریان OTP را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) Prisma/PG: users (mobile unique، trialConsumed).
3) Redis: ذخیره challenge OTP (hash، attempts، cooldown) — OTP خام در response/log نماند.
4) Nest IdentityModule: request-otp، verify-otp؛ SMS adapter (fake در dev).
5) Next: صفحات موبایل/کد با next-intl و theme.
6) docs/api هم‌زمان.
7) Mongo در این تسک لازم نیست.
8) Laravel/Sanctum استفاده نکن — JWT در تسک بعد.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
