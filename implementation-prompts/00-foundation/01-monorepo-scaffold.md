# P00-T01 — اسکلت Monorepo و ابزارها

## هدف
ایجاد ساختار ریشه Monorepo طبق قوانین پروژه بدون لاجیک دامنه.

## پیش‌نیاز
- هیچ (اولین تسک)

## دامنه Full-Stack
- Database: فقط آماده‌سازی مسیرها و اشاره به سرویس‌های PG/Redis/Mongo در README
- Backend/Frontend: اسکلت پوشه‌ها و workspace
- Docs: README ریشه

## معیار تموم شدن (DoD)
- [ ] پوشه‌های `apps/api`, `apps/web`, `packages/document-schema`, `packages/shared-types`, `docs/api`, `docs/deploy`, `docs/adr` وجود دارند
- [ ] README ریشه استک قفل‌شده NestJS/Next.js/PostgreSQL/Redis/MongoDB را ذکر می‌کند
- [ ] با قوانین `02-architecture` و `03-folder-structure` هم‌خوان است

## پرامپت اجرا

```
طبق تمام فایل‌های `.cursor/rules/` و `AGENTS.md` به‌عنوان برنامه‌نویس ارشد عمل کن.

تسک: اسکلت Monorepo پروژه Visual Document Builder را بساز.

الزامات:
1) قبل از کد: تحلیل کوتاه + لیست تسک‌های ریز همین کار.
2) ساختار:
   - apps/api/          (NestJS — بعداً scaffold)
   - apps/web/          (Next.js — بعداً scaffold)
   - packages/document-schema/
   - packages/shared-types/
   - docs/api/
   - docs/deploy/
   - docs/adr/
3) README.md ریشه: هدف محصول، Dual Deployment، و استک قفل:
   NestJS + Next.js + PostgreSQL + Redis + MongoDB.
4) هیچ استک موازی (Laravel/PHP/MySQL/Vite-SPA به‌عنوان اصلی) نساز و پیشنهاد نده.
5) اگر قانون سراسری جدیدی کشف کردی، اول `.cursor/rules/` را آپدیت کن.
6) scaffold کامل Nest/Next را به تسک‌های 02 و 03 موکول کن مگر برای .gitkeep.

پایان پیام: تموم شد یا تموم نشد + مرحله بعدی.
```
