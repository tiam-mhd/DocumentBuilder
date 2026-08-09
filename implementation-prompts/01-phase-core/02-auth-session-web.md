# P01-T02 — JWT و UI احراز هویت (Next.js)

## هدف
پس از OTP، صدور JWT و حفظ نشست در Next.js.

## پیش‌نیاز
- `01-identity-user-otp.md`

## دامنه Full-Stack
- PostgreSQL: در صورت نیاز refresh token table
- Redis: اختیاری blacklist/jti
- Backend: JwtModule، AuthGuard، /me، logout
- Frontend: ذخیره توکن امن، guardهای مسیر App Router
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] بعد از verify، access token صادر می‌شود
- [ ] روت‌های محافظت‌شده Nest بدون JWT → 401
- [ ] Logout/invalidate طبق طراحی
- [ ] UI کامل

## پرامپت اجرا

```
طبق `.cursor/rules/` استک Nest/Next عمل کن.

تسک: JWT بعد از OTP و یکپارچگی Next را Full-Stack تمام کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) @nestjs/jwt + Passport JWT (یا معادل قفل‌شده).
3) GET /api/me ، logout؛ refresh اگر پیاده می‌کنی مستند کن.
4) Next: auth state، Protected layouts تحت [locale]/(app)، اتصال shared/api با Bearer.
5) Sanctum/Laravel نساز.
6) docs/api به‌روز؛ تم و i18n رعایت شود.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
