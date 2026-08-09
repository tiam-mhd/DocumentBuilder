# P00-T02 — Baseline NestJS + ماژول‌های Domain

## هدف
راه‌اندازی `apps/api` با NestJS و ماژول‌بندی Domain طبق قوانین.

## پیش‌نیاز
- `00-foundation/01-monorepo-scaffold.md`

## دامنه Full-Stack
- Database: کانفیگ PostgreSQL + Redis + MongoDB در `.env.example`؛ اتصال health
- Backend: NestJS کامل + ماژول‌های خالی/اسکلت
- Frontend: ندارد
- Docs: health در `docs/api/`

## معیار تموم شدن (DoD)
- [ ] `apps/api` با NestJS قابل `npm/pnpm install` و بالا آمدن است
- [ ] ماژول‌ها: identity, tenancy, billing, content, assets, design, documents, export, audit, system
- [ ] `.env.example` شامل DATABASE_URL (Postgres)، REDIS_URL، MONGODB_URI
- [ ] `GET /api/health` (یا معادل) وضعیت وابستگی‌ها را گزارش می‌کند و مستند است

## پرامپت اجرا

```
طبق `.cursor/rules/` و `AGENTS.md` به‌عنوان برنامه‌نویس ارشد عمل کن.

تسک: Baseline بک‌اند NestJS را در apps/api پیاده‌سازی کن.

الزامات:
1) تحلیل + تسک‌لیست قبل از کد.
2) NestJS (Node LTS) داخل apps/api با ساختار modules/* طبق 03-folder-structure.
3) Prisma (ترجیحی) یا TypeORM برای PostgreSQL — یکی را انتخاب و در rules قفل کن اگر تازه است.
4) اتصال Redis و MongoDB را در config آماده کن (حتی اگر هنوز مدل دامنه خالی است).
5) SystemModule: GET health شامل چک اختیاری/نرم PG/Redis/Mongo.
6) .env.example بدون secret واقعی.
7) docs/api را برای health به‌روز کن.
8) Frontend را تغییر نده.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
