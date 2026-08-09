# DocumentBuilder — Visual Document Builder (VDB)

سازندهٔ سند چندمستأجری برای کسب‌وکارها: **داده کسب‌وکار → قالب → سند → PDF**.

یک **Core** مشترک، دو **Edition** فروش (بدون فورک محصول):

| Edition | `APP_EDITION` | مدل تجاری |
| --- | --- | --- |
| SaaS | `SAAS` | میزبانی شما؛ اشتراک و پرداخت روی پلتفرم |
| Self-hosted / On-prem | `SELF_HOSTED` | نصب روی VPS خریدار + لایسنس نصب |

> ریپوی GitHub: [tiam-mhd/DocumentBuilder](https://github.com/tiam-mhd/DocumentBuilder)

---

## فهرست مطالب

1. [وضعیت فاز](#وضعیت-فاز)
2. [چه چیزی پیاده شده](#چه-چیزی-پیاده-شده)
3. [استک قفل‌شده](#استک-قفل‌شده)
4. [معماری و داده](#معماری-و-داده)
5. [ساختار مونوریپو](#ساختار-مونوریپو)
6. [قوانین دامنه محصول](#قوانین-دامنه-محصول)
7. [دو Edition](#دو-edition)
8. [شروع سریع توسعه](#شروع-سریع-توسعه)
9. [متغیرهای محیطی](#متغیرهای-محیطی)
10. [اسکریپت‌های npm](#اسکریپتهای-npm)
11. [API و مستندات](#api-و-مستندات)
12. [پذیرش و E2E](#پذیرش-و-e2e)
13. [تست](#تست)
14. [قوانین عامل / توسعه](#قوانین-عامل--توسعه)
15. [نقشه راه بعد از Core](#نقشه-راه-بعد-از-core)

---

## وضعیت فاز

**فاز ۰۱ — Core (MVP هسته) تکمیل شده است** (تسک‌های `01` تا `19` در `implementation-prompts/01-phase-core/`).

| معیار خروج | وضعیت |
| --- | --- |
| SAAS: OTP → Business+Trial → سند → پرداخت → PDF | پیاده + اسکریپت E2E |
| SELF_HOSTED: لایسنس → همان هسته سند/PDF | پیاده + اسکریپت E2E |
| `EntitlementGuard` سمت Nest | پیاده |
| بدنه سند در Mongo؛ تراکنش در PG؛ صف در Redis | پیاده |
| `docs/api` به‌روز؛ تم تیره/روشن؛ i18n fa/en | پیاده |

آخرین اجرای محلی واحد: **۱۸ سوئیت / ۷۱ تست پاس** + `typecheck` سبز.

---

## چه چیزی پیاده شده

### هویت و جلسه

- ورود فقط با **موبایل + OTP** (بدون پسورد در MVP)
- OTP در Redis (TTL، cooldown، rate-limit، هش؛ کد خام لاگ نمی‌شود)
- در حالت `SMS_PROVIDER=fake` و `NODE_ENV=development` فیلد `devCode` برای توسعه
- JWT دسترسی؛ logout با blacklist در Redis

### چند Business و اشتراک

- هر کاربر می‌تواند چند Business بسازد؛ همهٔ دادهٔ دامنه با `businessId` ایزوله است
- اشتراک per-Business با وضعیت‌های `trial | active | grace | expired | pending_payment`
- **Trial ۷روزه** فقط برای **اولین** Business کاربر (`trial_consumed`)
- Business دوم+ تا پرداخت: `pending_payment` و mutate/export قفل
- کاتالوگ پلن (`plan.core`) و ماژول‌ها (`module.map` و …) با seed
- SAAS: checkout + درایور `fake` / زرین‌پال؛ وب‌هوک idempotent
- SELF_HOSTED: لایسنس نصب (`installation_licenses`؛ کلید خام ذخیره نمی‌شود)

### گیت قابلیت

- `EntitlementGuard` + `@RequireWritable` / `@RequireEntitlement` / `@RequireModule`
- UI entitlements را می‌خواند و CTA را غیرفعال می‌کند؛ **اعتماد فقط به API نیست**
- کدهای نمونه: `export.pdf`، `module.map`، …

### دارایی‌ها و برند سند

- Media: آپلود JPEG/PNG/WebP/GIF (SVG ممنوع)، مشتقات thumb/web/print
- Font: فقط `woff2` / `ttf` / `otf`؛ کلید ذخیره `{businessId}/fonts/{fontId}/original.{ext}`
- Design themes: توکن رنگ/تایپوگرافی در PostgreSQL JSONB (جدا از تم تیره/روشن اپ)

### قالب، سند، ادیتور، PDF

- قالب: متادیتا در PG + بدنه در Mongo (`template_bodies`)
- سند: متادیتا در PG + بدنه در Mongo (`document_bodies`)؛ ساخت از قالب = snapshot بلوک‌ها
- Schema v3: `masters[]` + `pages[].masterId`؛ بلوک‌های هسته: `text | image | section | divider | headerSlot | footerSlot`
- ادیتور: جریان عمودی + DnD، undo/redo، autosave ~۸۰۰ms، پیش‌نمایش HTML — **بدون PDF روی keystroke**
- Export: جدول `export_jobs` + صف BullMQ `export.pdf` + رندر HTML (RTL + embed فونت) → PDF (`PDF_RENDERER=fake|playwright`)

### وب

- Next.js App Router، locale `fa` (RTL) و `en` (LTR)
- تم chrome: کوکی `vdb-theme` (`light|dark|system`)
- صفحات/فیچرها: ورود، داشبورد، Business، بیلینگ، لایسنس، رسانه، فونت، تم برند، قالب، سند، ادیتور + پنل export

---

## استک قفل‌شده

| لایه | انتخاب |
| --- | --- |
| API | NestJS (Node.js LTS) |
| Web | Next.js (App Router) + TypeScript |
| DB اصلی | PostgreSQL + Prisma |
| کش / صف | Redis + BullMQ |
| بدنه سند | MongoDB (official driver) |
| احراز هویت | Mobile OTP + JWT |
| استوریج فایل | local یا S3-compatible (MinIO) |
| PDF | Playwright Chromium یا `fake` برای CI/dev |
| i18n | next-intl فقط |

هدف استقرار: **Docker / VPS**. هاستینگ اشتراکی PHP/cPanel مسیر اصلی نیست.

---

## معماری و داده

```text
Browser (Next)
    → Nest API (/api)
         → AuthGuard (JWT)
         → Business membership (path :businessId)
         → EntitlementGuard (+ لایسنس در SELF_HOSTED)
         → Domain services
              → PostgreSQL (کاربر، Business، پول، فونت، تم، متادیتا)
              → Redis (OTP، صف PDF، قفل webhook)
              → MongoDB (بدنه قالب/سند)
              → Object Storage (رسانه، فونت، PDF)
```

**جداسازی اجباری:** Data ≠ Template ≠ Document.

---

## ساختار مونوریپو

```text
/
├── apps/
│   ├── api/                 # NestJS
│   └── web/                 # Next.js
├── packages/
│   ├── document-schema/     # JSON سند / قالب / masters / بلوک‌ها
│   └── shared-types/        # entitlement، وضعیت‌ها، DTOهای عمومی
├── docs/
│   ├── api/                 # OpenAPI canonical + README
│   ├── deploy/              # Docker/VPS و Editionها
│   ├── adr/                 # تصمیم‌های معماری
│   └── qa/                  # چک‌لیست پذیرش فاز ۰۱
├── scripts/e2e/             # قیف SAAS و SELF_HOSTED
├── implementation-prompts/  # پرامپت‌های فازبندی‌شده
├── .cursor/rules/           # قوانین دائمی پروژه
├── AGENTS.md
├── docker-compose.yml
└── README.md
```

---

## قوانین دامنه محصول

- مرز مستأجر = **Business** (نه فقط User)
- هر ردیف/داکیومنت متعلق به tenant: `businessId` + ایندکس + فیلتر در کوئری
- Trial فقط یک‌بار روی Business اول
- Expire داده را پاک نمی‌کند؛ فقط قفل کار
- UI ممکن است ماژول را مخفی کند؛ API باید رد کند
- PDF زنده در مسیر ادیتور ممنوع است

جزئیات کامل در `.cursor/rules/` و `AGENTS.md`.

---

## دو Edition

| نگرانی | `SAAS` | `SELF_HOSTED` |
| --- | --- | --- |
| `publicSignup` | true | false |
| Checkout پلتفرم | فعال (`PAYMENT_PROVIDER`) | `BILLING_CHECKOUT_UNAVAILABLE` |
| لایسنس نصب | لازم نیست (`licenseActive` همیشه true) | لازم برای mutate/export |
| برندینگ | پلتفرم / white-label | برند مشتری |
| موتور سند/PDF | یکسان | یکسان |

پیکربندی عمومی بدون راز: `GET /api/system/config`.

---

## شروع سریع توسعه

پیش‌نیاز: Node.js ≥ ۲۰، Docker Desktop برای PG/Redis/Mongo.

```bash
# 1) استورها
npm run docker:up

# 2) وابستگی‌ها (+ build پکیج‌های shared)
npm install

# 3) env
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4) Prisma
npm run prisma:generate
npm run migrate
npm run db:seed

# 5) اجرا
npm run dev
# یا جدا: npm run api:dev  و  npm run web:dev
```

| سرویس | آدرس |
| --- | --- |
| Web (fa) | http://localhost:3000/fa |
| API health | http://localhost:3001/api/health |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MongoDB | `localhost:27017` |

برای SAAS در `apps/api/.env`: `APP_EDITION=SAAS`، `SMS_PROVIDER=fake`، `PAYMENT_PROVIDER=fake`، `PDF_RENDERER=fake`.

برای SELF_HOSTED: `APP_EDITION=SELF_HOSTED`، `LICENSE_ISSUER_SECRET=` خالی (کلیدهای opaque مثل `VDB-DEV-LICENSE-KEY-0001`)، سپس ریستارت API.

راهنمای بیشتر: [docs/deploy/README.md](docs/deploy/README.md).

---

## متغیرهای محیطی

فایل‌های نمونه (بدون راز واقعی در git):

- ریشه: `.env.example`
- API: `apps/api/.env.example`
- Web: `apps/web/.env.example`

کلیدهای مهم API:

| کلید | نقش |
| --- | --- |
| `APP_EDITION` | `SAAS` یا `SELF_HOSTED` |
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis |
| `MONGODB_URI` | MongoDB |
| `OTP_PEPPER` / `SMS_PROVIDER` | OTP |
| `JWT_SECRET` | توکن دسترسی |
| `PAYMENT_PROVIDER` | `fake` یا `zarinpal` (SAAS) |
| `LICENSE_PEPPER` / `LICENSE_ISSUER_SECRET` | لایسنس نصب |
| `STORAGE_DRIVER` | `local` یا `s3` |
| `PDF_RENDERER` | `fake` یا `playwright` |

**هرگز** فایل `.env` واقعی را commit نکنید.

---

## اسکریپت‌های npm

| اسکریپت | کار |
| --- | --- |
| `npm install` | نصب workspaces + build پکیج‌ها |
| `npm run docker:up` / `docker:down` | استورهای محلی |
| `npm run api:dev` | Nest watch |
| `npm run web:dev` | Next dev |
| `npm run dev` | هر دو با هم |
| `npm run build` | build پکیج‌ها + api + web |
| `npm run lint` / `typecheck` | کیفیت TypeScript |
| `npm run test` | تست واحد API |
| `npm run migrate` | Prisma migrate |
| `npm run db:seed` | seed پلن/ماژول (`export.pdf` در base) |
| `npm run test:e2e:saas` | قیف پذیرش SAAS (API زنده) |
| `npm run test:e2e:self-hosted` | قیف پذیرش SELF_HOSTED (API زنده) |

---

## API و مستندات

- **منبع حقیقت OpenAPI:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- خلاصه مسیرها: [`docs/api/README.md`](docs/api/README.md)
- پیشوند: `/api` — منابع Business-scoped معمولاً زیر `/api/businesses/:businessId/...`
- خطاها: `{ errors: [{ code, message }] }`
- ADRها: [`docs/adr/`](docs/adr/)

نمونه مسیرهای مهم:

- `POST /auth/otp/request` · `POST /auth/otp/verify`
- `POST /businesses` · `GET /businesses/:id/subscription` · `GET .../entitlements`
- `POST .../billing/checkout` (فقط SAAS)
- `POST /system/license/activate` (فقط SELF_HOSTED)
- CRUD: media · fonts · themes · templates · documents
- `POST .../documents/:documentId/export/pdf` · `GET .../exports/:jobId/file`

---

## پذیرش و E2E

| Edition | اسکریپت | چک‌لیست |
| --- | --- | --- |
| SAAS | `npm run test:e2e:saas` | [docs/qa/phase-01-saas-acceptance.md](docs/qa/phase-01-saas-acceptance.md) |
| SELF_HOSTED | `npm run test:e2e:self-hosted` | [docs/qa/phase-01-self-hosted-acceptance.md](docs/qa/phase-01-self-hosted-acceptance.md) |

اسکریپت‌ها API-first هستند (OTP با `devCode`، export با `PDF_RENDERER=fake`). برای UI دستی locale `fa` و هر دو تم chrome را در چک‌لیست ببینید.

---

## تست

```bash
npm run test          # Jest در apps/api
npm run typecheck     # api + web + packages
```

پوشش واحد شامل identity، trial، subscription، checkout، license، entitlement، media، font، theme، template، documents، export HTML/PDF جعلی.

---

## قوانین عامل / توسعه

این ریپو برای کار با Cursor Agent قوانین دائمی دارد:

- [`AGENTS.md`](AGENTS.md) — فهرست قوانین
- [`.cursor/rules/`](.cursor/rules/) — دامنه، معماری، امنیت، تم/i18n، فونت، قالب، پروتکل پیاده‌سازی

هر تغییر API باید هم‌زمان `docs/api` را به‌روز کند. فیچرهای کاربرمحور باید برش کامل **DB + Nest + Next** داشته باشند مگر خلافش صریح گفته شود.

---

## نقشه راه بعد از Core

پرامپت‌های فازهای بعدی در `implementation-prompts/` (سازمانی / حرفه‌ای) هستند. هسته فعلی (tenancy، entitlement، document engine، dual edition) نباید شکسته شود.

---

## مجوز و مالکیت

پروژه خصوصی/تجاری متعلق به نگهدارندهٔ ریپو است مگر خلافش اعلام شود. رازها و کلیدهای پرداخت/SMS را فقط در env محلی یا secret manager نگه دارید.

---

## تماس نگهدارنده

- GitHub: [@tiam-mhd](https://github.com/tiam-mhd)
- Email: tiam.mhd76@gmail.com
