# P00-T03 — Baseline Next.js App Router

## هدف
راه‌اندازی `apps/web` با Next.js (App Router) + TypeScript و پوشه‌بندی features/shared.

## پیش‌نیاز
- `00-foundation/01-monorepo-scaffold.md`
- بهتر است `02-api-nestjs-baseline.md` انجام شده باشد

## دامنه Full-Stack
- Database: ندارد
- Backend: فقط آدرس Nest API در env وب
- Frontend: اسکلت App Router + صفحه Home
- Docs: ذکر env در README

## معیار تموم شدن (DoD)
- [ ] `apps/web` با Next.js+TS اجرا می‌شود
- [ ] ساختار `src/app`, `src/features`, `src/shared` طبق قوانین
- [ ] client پایه برای Nest API
- [ ] اسکریپت‌های dev/build

## پرامپت اجرا

```
طبق `.cursor/rules/` و `AGENTS.md` عمل کن.

تسک: Baseline فرانت‌اند Next.js (App Router) را در apps/web بساز.

الزامات:
1) تحلیل + تسک‌لیست.
2) Next.js + TypeScript؛ ساختار:
   apps/web/src/app/
   apps/web/src/features/{auth,businesses,billing,content,editor,media,settings}/
   apps/web/src/shared/{api,ui,i18n,lib,types}/
   apps/web/src/styles/
3) صفحه Home مینیمال؛ آماده برای [locale] در تسک i18n.
4) shared/api برای فراخوانی Nest (NEXT_PUBLIC_API_URL).
5) تم و i18n عمیق را به تسک‌های 04/05 موکول کن یا جایشان را آماده بگذار.
6) Vite-SPA یا Laravel/Blade نساز. استک وب فقط Next.js است.
7) منطق دامنه را در Route Handlers کپی نکن — پیش‌فرض: فراخوانی Nest.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
