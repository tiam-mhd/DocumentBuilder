# DocumentBuilder — Visual Document Builder (VDB)

سازندهٔ **سند بصری چندمستأجری** برای کسب‌وکارها:

**داده کسب‌وکار → قالب (Template) → سند (Document) → خروجی PDF**

یک **Core** مشترک، دو **Edition** فروش — بدون فورک محصول:

| Edition | `APP_EDITION` | مدل تجاری |
| --- | --- | --- |
| SaaS | `SAAS` | میزبانی شما؛ اشتراک و ماژول روی پلتفرم |
| Self-hosted / On-prem | `SELF_HOSTED` | نصب روی VPS خریدار + لایسنس نصب |

> مخزن: [tiam-mhd/DocumentBuilder](https://github.com/tiam-mhd/DocumentBuilder)

---

## فهرست مطالب

1. [وضعیت فاز](#وضعیت-فاز)
2. [خلاصه محصول](#خلاصه-محصول)
3. [چه چیزی پیاده شده — فاز ۰۱ Core](#چه-چیزی-پیاده-شده--فاز-۰۱-core)
4. [چه چیزی پیاده شده — فاز ۰۲ Corporate](#چه-چیزی-پیاده-شده--فاز-۰۲-corporate)
5. [استک قفل‌شده](#استک-قفل‌شده)
6. [معماری و داده](#معماری-و-داده)
7. [ساختار مونوریپو](#ساختار-مونوریپو)
8. [قوانین دامنه](#قوانین-دامنه)
9. [دو Edition](#دو-edition)
10. [شروع سریع توسعه](#شروع-سریع-توسعه)
11. [متغیرهای محیطی](#متغیرهای-محیطی)
12. [اسکریپت‌های npm](#اسکریپتهای-npm)
13. [API و مستندات](#api-و-مستندات)
14. [پذیرش و E2E](#پذیرش-و-e2e)
15. [تست](#تست)
16. [قوانین عامل / توسعه](#قوانین-عامل--توسعه)
17. [نقشه راه](#نقشه-راه)

---

## وضعیت فاز

| فاز | هدف | وضعیت |
| --- | --- | --- |
| **۰۱ — Core** | OTP، tenancy، بیلینگ/لایسنس، ادیتور، PDF، تم/i18n | **تکمیل** (`01`–`19`) |
| **۰۲ — Corporate** | داده شرکتی، ماژول‌ها، بلوک‌های map/org/timeline/…، E2E نمونه | **تکمیل** (`01`–`14`) |
| ۰۳+ | Import، فرمول پیشرفته، … | خارج از scope فعلی |

### معیار خروج (خلاصه)

| معیار | وضعیت |
| --- | --- |
| SAAS: OTP → Business+Trial → سند → پرداخت → PDF | پیاده + `test:e2e:saas` |
| SELF_HOSTED: لایسنس → همان هسته سند/PDF | پیاده + `test:e2e:self-hosted` |
| Corporate: داده + ماژول‌ها → سند نمونه → PDF؛ deny بدون `module.map` | پیاده + `test:e2e:corporate` |
| `EntitlementGuard` سمت Nest؛ UI فقط آینه | پیاده |
| PG + Redis + Mongo + Object storage | پیاده |
| `docs/api` · تم تیره/روشن · i18n fa/en | پیاده |

**آخرین اجرای محلی واحد:** ۳۲ سوئیت / ۱۱۴ تست پاس + `typecheck` سبز.

---

## خلاصه محصول

- ورود فقط با **موبایل + OTP**
- هر کاربر چند **Business**؛ مرز داده = `businessId`
- اشتراک per-Business (Trial ۷روزه فقط روی Business اول) یا لایسنس نصب در SELF_HOSTED
- قابلیت‌های فروش‌پذیر با کدهای پایدار `module.*` و `export.pdf`
- موتور سند: جریان عمودی بلوک‌ها + Master header/footer + Export صف‌محور
- وب: Next.js، locale پیش‌فرض **fa (RTL)** و **en (LTR)**، تم chrome تاریک/روشن

---

## چه چیزی پیاده شده — فاز ۰۱ Core

### هویت و جلسه

- OTP در Redis (TTL، cooldown، rate-limit، هش؛ کد خام لاگ نمی‌شود)
- در `SMS_PROVIDER=fake` + `NODE_ENV=development` فیلد `devCode`
- JWT دسترسی؛ logout با blacklist در Redis

### چند Business و اشتراک

- وضعیت‌ها: `trial | active | grace | expired | pending_payment`
- Business دوم+ تا پرداخت: `pending_payment` و mutate/export قفل
- کاتالوگ: `plan.core` (+ ماژول‌ها در seed)
- SAAS: checkout + `fake` / زرین‌پال؛ وب‌هوک idempotent
- SELF_HOSTED: `installation_licenses` (کلید خام ذخیره نمی‌شود)

### گیت قابلیت

- `EntitlementGuard` + `@RequireWritable` / `@RequireEntitlement` / `@RequireModule`
- UI از `/entitlements` می‌خواند؛ **اجرا فقط روی API معتبر است**

### دارایی و برند سند

- Media: JPEG/PNG/WebP/GIF (SVG ممنوع) + مشتقات
- Font: `woff2` / `ttf` / `otf` — کلید `{businessId}/fonts/{fontId}/original.{ext}`
- Design themes: توکن رنگ/تایپوگرافی در PostgreSQL JSONB (جدا از تم chrome اپ)

### قالب، سند، ادیتور، PDF

- قالب/سند: متادیتا PG + بدنه Mongo
- ساخت سند از قالب = **snapshot** بلوک‌ها
- Schema v3: `masters[]` + `pages[].masterId`
- ادیتور: DnD عمودی، undo/redo، autosave ~۸۰۰ms، پیش‌نمایش HTML — **بدون PDF روی keystroke**
- Export: `export_jobs` + BullMQ + HTML (RTL + embed فونت) → `PDF_RENDERER=fake|playwright`

### وب Core

ورود، داشبورد، Business، بیلینگ، لایسنس، رسانه، فونت، تم برند، قالب، سند، ادیتور + پنل export.

---

## چه چیزی پیاده شده — فاز ۰۲ Corporate

### داده کسب‌وکار (Content)

| موجودیت | گیت | مسیر UI تقریبی |
| --- | --- | --- |
| Projects / categories | `module.projects` | `/app/projects` |
| Team + Branches (+ `parentMemberId` برای درخت) | عضویت / writable | `/app/team` |
| Services · Clients · Certificates | foundational | `/app/profile-content` |
| Galleries + items | `module.gallery` | `/app/galleries` |
| Locations (lat/lng) | foundational | `/app/locations` |
| Timeline events | `module.timeline` | `/app/timeline` |
| Map markers (از Locations و …) | `module.map` | `/app/map` |
| Org chart tree | `module.org_chart` | `/app/org-chart` |

### بلوک‌های سند

**Core (بدون ماژول فروش):**  
`text` · `image` · `section` · `divider` · `headerSlot` · `footerSlot` · **`qr`** · **`toc`** · **`repeater`**

**Module-gated:**  
`gallery` · `map` · `orgChart` · `timeline`

| قابلیت | قرارداد |
| --- | --- |
| QR | encode سرور → PNG data URL؛ بدون short-link پویا (ADR 011) |
| TOC | سرفصل‌های section/text؛ شماره صفحه = ایندکس منطقی `pages[]` (ADR 012) |
| Repeater | `source` + کارت `children`؛ binding فقط `{{item.*}}` (ADR 013) |
| Conditional `when` | `exists` \| `empty` \| `eq` روی `collection.<source>` (ADR 014) |
| Map PDF | تصویر استاتیک از `MAP_STATIC_URL_TEMPLATE` یا placeholder (ADR 008) |
| Org / Timeline PDF | همان HTML/CSS پیش‌نمایش (ADR 009 / 010) |

### Collections API

`GET /api/businesses/:businessId/collections/:source` — آیتم‌های تخت برای binding + فیلد `total`.

منابع: `projects` · `teamMembers` · `branches` · `services` · `clients` · `certificates` · `timelineEvents`.

### Wire-up entitlement ↔ ادیتور

- پالت فقط بلوک‌های مجاز؛ لیست قفل + CTA ارتقا به `/app/billing`
- ذخیره سند/قالب و enqueue PDF با `documentCollectRequiredModuleCodes` → **۴۰۳** `ENTITLEMENT_MODULE_REQUIRED`
- صفحات ماژول قفل‌شده + پنل entitlements با CTA یکسان

### E2E Corporate

اسکریپت `scripts/e2e/corporate-sample.mjs`: checkout ماژول‌ها → seed داده → سند نمونه → PDF موفق → deny بدون `module.map`.

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
| استوریج | local یا S3-compatible (MinIO) |
| PDF | Playwright Chromium یا `fake` |
| نقشه UI | Leaflet + OSM |
| i18n | **next-intl فقط** |

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
              → PostgreSQL (کاربر، Business، پول، محتوا، فونت، تم، متادیتا)
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
│   ├── document-schema/     # JSON سند/قالب، بلوک‌ها، when، repeater
│   └── shared-types/        # entitlement، DTOهای عمومی
├── docs/
│   ├── api/                 # OpenAPI canonical + README
│   ├── deploy/              # Docker/VPS و Editionها
│   ├── adr/                 # تصمیم‌های معماری (۰۰۱–۰۱۴)
│   └── qa/                  # پذیرش فاز ۰۱ و ۰۲
├── scripts/e2e/             # SAAS · SELF_HOSTED · corporate
├── implementation-prompts/  # پرامپت‌های فازبندی‌شده
├── .cursor/rules/           # قوانین دائمی پروژه
├── AGENTS.md
├── docker-compose.yml
└── README.md
```

---

## قوانین دامنه

- مرز مستأجر = **Business**
- هر ردیف/داکیومنت tenant: `businessId` + ایندکس + فیلتر کوئری
- Trial فقط یک‌بار روی Business اول
- Expire داده را پاک نمی‌کند؛ فقط قفل کار
- UI ممکن است ماژول را مخفی کند؛ API باید رد کند
- PDF زنده در مسیر ادیتور ممنوع است
- یک Core / دو Edition — بدون فورک ریپو

جزئیات: [`.cursor/rules/`](.cursor/rules/) و [`AGENTS.md`](AGENTS.md).

---

## دو Edition

| نگرانی | `SAAS` | `SELF_HOSTED` |
| --- | --- | --- |
| `publicSignup` | true | false |
| Checkout پلتفرم | فعال (`PAYMENT_PROVIDER`) | `BILLING_CHECKOUT_UNAVAILABLE` |
| لایسنس نصب | لازم نیست | لازم برای mutate/export |
| موتور سند/PDF / ماژول‌ها | یکسان | یکسان (اتصال ماژول در دموی SAAS با checkout) |

پیکربندی عمومی: `GET /api/system/config`.

---

## شروع سریع توسعه

پیش‌نیاز: Node.js ≥ ۲۰، Docker Desktop.

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
# یا: npm run api:dev  و  npm run web:dev
```

| سرویس | آدرس |
| --- | --- |
| Web (fa) | http://localhost:3000/fa |
| API health | http://localhost:3001/api/health |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MongoDB | `localhost:27017` |

- **SAAS:** `APP_EDITION=SAAS`، `SMS_PROVIDER=fake`، `PAYMENT_PROVIDER=fake`، `PDF_RENDERER=fake`
- **SELF_HOSTED:** `APP_EDITION=SELF_HOSTED`، لایسنس opaque مثل `VDB-DEV-LICENSE-KEY-0001`، سپس ریستارت API

راهنما: [docs/deploy/README.md](docs/deploy/README.md).

---

## متغیرهای محیطی

| فایل نمونه | نقش |
| --- | --- |
| `.env.example` | ریشه |
| `apps/api/.env.example` | Nest |
| `apps/web/.env.example` | Next |

کلیدهای مهم API: `APP_EDITION` · `DATABASE_URL` · `REDIS_URL` · `MONGODB_URI` · `OTP_PEPPER` · `JWT_SECRET` · `PAYMENT_PROVIDER` · `LICENSE_*` · `STORAGE_DRIVER` · `PDF_RENDERER` · `MAP_STATIC_URL_TEMPLATE`

**هرگز** فایل `.env` واقعی را commit نکنید.

---

## اسکریپت‌های npm

| اسکریپت | کار |
| --- | --- |
| `npm install` | workspaces + build پکیج‌ها |
| `npm run docker:up` / `docker:down` | استورهای محلی |
| `npm run api:dev` / `web:dev` / `dev` | توسعه |
| `npm run build` | پکیج‌ها + api + web |
| `npm run lint` / `typecheck` | TypeScript |
| `npm run test` | Jest API |
| `npm run migrate` / `db:seed` | Prisma |
| `npm run test:e2e:saas` | پذیرش Core SAAS |
| `npm run test:e2e:self-hosted` | پذیرش SELF_HOSTED |
| `npm run test:e2e:corporate` | پذیرش فاز ۰۲ Corporate |

---

## API و مستندات

- **OpenAPI canonical:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- خلاصه مسیرها: [`docs/api/README.md`](docs/api/README.md)
- پیشوند: `/api` — منابع Business معمولاً زیر `/api/businesses/:businessId/...`
- خطاها: `{ errors: [{ code, message }] }`
- ADRها: [`docs/adr/`](docs/adr/) (فونت، تم، قالب، PDF، map، org، timeline، QR، TOC، repeater، visibility)

### نمونه‌های مهم

**Core:** OTP · businesses · subscription · entitlements · checkout/license · media · fonts · themes · templates · documents · export/pdf  

**Corporate:** projects · team-members · branches · services/clients/certificates · galleries · locations · map/markers · org-chart/tree · timeline-events · qr/encode · collections/:source · gates/module-*

---

## پذیرش و E2E

| مسیر | اسکریپت | چک‌لیست |
| --- | --- | --- |
| SAAS Core | `npm run test:e2e:saas` | [phase-01-saas-acceptance.md](docs/qa/phase-01-saas-acceptance.md) |
| SELF_HOSTED | `npm run test:e2e:self-hosted` | [phase-01-self-hosted-acceptance.md](docs/qa/phase-01-self-hosted-acceptance.md) |
| Corporate | `npm run test:e2e:corporate` | [phase-02-corporate-acceptance.md](docs/qa/phase-02-corporate-acceptance.md) |

اسکریپت‌ها API-first هستند (`devCode`، `PDF_RENDERER=fake`). UI دستی: locale `fa` + هر دو تم chrome.

---

## تست

```bash
npm run test          # Jest در apps/api
npm run typecheck     # api + web + packages
```

پوشش واحد شامل identity، trial، subscription، checkout، license، entitlement، media، font، theme، template، documents، export، projects، team، gallery، location، map، org-chart، timeline، QR، collections، repeater binding، visibility، module-code collect.

---

## قوانین عامل / توسعه

- [`AGENTS.md`](AGENTS.md)
- [`.cursor/rules/`](.cursor/rules/) — دامنه، معماری، امنیت، تم/i18n، فونت، قالب، محتوا، پروتکل پیاده‌سازی

هر تغییر API → هم‌زمان `docs/api`. فیچر کاربرمحور → برش **DB + Nest + Next** مگر خلافش صریح گفته شود.

---

## نقشه راه

- فاز ۰۱ و ۰۲ در `implementation-prompts/` تکمیل شده‌اند.
- فازهای بعدی (Import، فرمول، …) نباید tenancy، entitlement، یا دو Edition را بشکنند.

---

## مجوز

Proprietary / All rights reserved مگر خلافش در ریپو اعلام شود.
