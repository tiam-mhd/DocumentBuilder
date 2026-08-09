# فاز 00 — Foundation (زیرساخت)

## هدف فاز
راه‌اندازی Monorepo قفل‌شده با استک **NestJS + Next.js + PostgreSQL + Redis + MongoDB** طبق `.cursor/rules/`.

## خروجی قابل قبول فاز
- `apps/api` (NestJS) و `apps/web` (Next.js) بالا می‌آیند
- اتصال/کانفیگ PostgreSQL، Redis، MongoDB در `.env.example` مستند است
- تم دارک/لایت و i18n fa/en (next-intl) کار می‌کند
- `APP_EDITION` خوانده می‌شود
- اسکلت `docs/api/` موجود است
- هنوز لاجیک کامل OTP/Business در این فاز الزامی نیست (فاز 01)

## فهرست تسک‌ها

| فایل | عنوان |
| --- | --- |
| `01-monorepo-scaffold.md` | اسکلت Monorepo و ابزارها |
| `02-api-nestjs-baseline.md` | Baseline NestJS + ماژول‌های Domain |
| `03-web-nextjs-baseline.md` | Baseline Next.js App Router |
| `04-theme-dark-light.md` | سیستم تم دارک/لایت |
| `05-i18n-fa-en.md` | چندزبانه fa/en + RTL/LTR |
| `06-app-edition-config.md` | APP_EDITION SELF_HOSTED \| SAAS |
| `07-docs-api-skeleton.md` | اسکلت مستندات API |
| `08-shared-packages.md` | packages/document-schema و shared-types |
| `09-dev-scripts-quality.md` | اسکریپت‌ها، lint، تست، docker-compose دیتااستورها |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09`

## استک قفل‌شده این فاز
Backend NestJS · Frontend Next.js · PostgreSQL · Redis · MongoDB
