# Visual Document Builder (VDB)

پلتفرم ساخت **بروشور و سند بصری سازمانی** با موتور Document مبتنی بر JSON، ادیتور جریان‌محور، تم برند، و خروجی **PDF سروری**.

| | |
| --- | --- |
| محصول | یک **Core** · دو Edition: `SAAS` و `SELF_HOSTED` |
| استک | NestJS · Next.js · PostgreSQL · Redis · MongoDB |
| وضعیت | فازهای **۰۱–۰۴ تا GA** پیاده‌سازی و در [`docs/qa/GA-checklist.md`](docs/qa/GA-checklist.md) بسته شده‌اند |
| UI | فارسی (`fa`، پیش‌فرض، RTL) و انگلیسی (`en`، LTR) |
| تم اپ | تیره / روشن (`vdb-theme`) — **جدا** از تم برند سند |
| خروجی Office | DOCX/PPTX عمداً خارج از scope (ADR 025) |

```text
User (OTP) → Business(es) → Subscription / License
  → Corporate data → Template → Document → Preview (HTML)
  → Approval workflow → PDF (BullMQ worker)
```

جداسازی دامنهٔ قفل‌شده: **Data ≠ Template ≠ Document**. مرز مستأجر همیشه **Business** است.

---

## فهرست

1. [چیست و برای چه کسی؟](#چیست-و-برای-چه-کسی)
2. [وضعیت پیاده‌سازی](#وضعیت-پیاده‌سازی)
3. [فاز ۰۱ — Core Platform](#فاز-۰۱--core-platform)
4. [فاز ۰۲ — Corporate Brochure Engine](#فاز-۰۲--corporate-brochure-engine)
5. [فاز ۰۳ — Professional Features](#فاز-۰۳--professional-features)
6. [فاز ۰۴ — Product تا GA](#فاز-۰۴--product-تا-ga)
7. [استک و معماری](#استک-و-معماری)
8. [ساختار مونوریپو](#ساختار-مونوریپو)
9. [دو Edition](#دو-edition)
10. [مدل دامنه و امنیت](#مدل-دامنه-و-امنیت)
11. [شروع سریع (لوکال)](#شروع-سریع-لوکال)
12. [متغیرهای محیطی مهم](#متغیرهای-محیطی-مهم)
13. [اسکریپت‌ها، تست و پذیرش](#اسکریپتها-تست-و-پذیرش)
14. [API و مستندات](#api-و-مستندات)
15. [قوانین توسعه و عامل‌ها](#قوانین-توسعه-و-عاملها)
16. [نقشه راه پس از GA](#نقشه-راه-پس-از-ga)

---

## چیست و برای چه کسی؟

VDB به سازمان‌ها (و اپراتور SAAS شما) امکان می‌دهد:

1. با **موبایل + OTP** وارد شوند و چندین **Business** بسازند  
2. داده سازمانی (پروژه، تیم، گالری، نقشه، …) را با **گیت entitlement** مدیریت کنند  
3. **قالب** و **سند** را با بلوک‌های جریان‌محور طراحی کنند  
4. با **تم برند** و **فونت** اختصاصی پیش‌نمایش HTML بگیرند  
5. **PDF نهایی** را از صف سرور بگیرند (نه روی هر keystroke در ادیتور)  
6. گردش **تأیید / انتشار**، نسخه، کامنت، پشتیبان، publish وب، لینک اشتراک، و پنل ادمین پلتفرم داشته باشند  

مخاطب: تیم‌های محصول/مهندسی که می‌خواهند یک codebase برای فروش **اشتراک ابری** و **نصب on-prem** نگه دارند.

---

## وضعیت پیاده‌سازی

| فاز | نام | وضعیت | پذیرش |
| --- | --- | --- | --- |
| ۰۱ | Core Platform | کامل | [`phase-01-saas`](docs/qa/phase-01-saas-acceptance.md) · [`phase-01-self-hosted`](docs/qa/phase-01-self-hosted-acceptance.md) |
| ۰۲ | Corporate Brochure Engine | کامل | [`phase-02-corporate`](docs/qa/phase-02-corporate-acceptance.md) |
| ۰۳ | Professional Features | کامل (DOCX = Won't) | [`phase-03-professional`](docs/qa/phase-03-professional-acceptance.md) |
| ۰۴ | Product → GA | کامل | [`pre-ga-hardening`](docs/qa/pre-ga-hardening.md) · [`GA-checklist`](docs/qa/GA-checklist.md) |

اسکریپت‌های API-first: [`scripts/e2e/`](scripts/e2e/) · سخت‌سازی صف: [`scripts/load/`](scripts/load/)

---

## فاز ۰۱ — Core Platform

### هویت و چند Business

- ورود فقط **موبایل + OTP** (بدون رمز در MVP)
- OTP: TTL کوتاه، تک‌مصرف، هش‌شده، rate-limit روی Redis؛ با `SMS_PROVIDER=fake` فیلد `devCode` برای توسعه
- کاربر می‌تواند **نامحدود** Business بسازد؛ همهٔ داده با `businessId` ایزوله است
- سوئیچ زمینه = سوئیچ Business فعال

### اشتراک و Trial

| وضعیت | قابل نوشتن؟ | معنا |
| --- | --- | --- |
| `trial` | بله | ۷ روز فقط برای **اولین** Business کاربر |
| `active` | بله | پرداخت‌شده / فعال |
| `grace` | بله | بعد از `endsAt` تا `BILLING_GRACE_DAYS` (پیش‌فرض ۳) |
| `expired` | خیر (فقط خواندن) | داده حفظ می‌شود |
| `pending_payment` | خیر | Business دوم+ تا پرداخت |

- ساخت Business رایگان است؛ **باز شدن ارزش = اشتراک / لایسنس**
- Expire هرگز داده را پاک نمی‌کند

### دارایی، تم برند، قالب، سند، PDF

- رسانه + مشتقات؛ فونت فقط `.woff2` / `.ttf` / `.otf`
- `design_themes` در PostgreSQL (جدا از تم chrome اپ)
- قالب/سند: متادیتا PG + بدنه Mongo؛ ساخت از قالب = **snapshot**
- Schema جریان: `masters[]` + `pages[].masterId` + بلوک‌های هسته
- ادیتور: DnD عمودی، undo/redo، autosave ~۸۰۰ms؛ **بدون PDF روی keystroke**
- Export: BullMQ `export.pdf` + HTML (RTL + embed فونت) → `PDF_RENDERER=fake|playwright`

### وب Core

ورود، داشبورد، Business، بیلینگ/لایسنس، رسانه، فونت، تم برند، قالب، سند، ادیتور + پنل export.

---

## فاز ۰۲ — Corporate Brochure Engine

### موجودیت‌های محتوا (با گیت)

| موجودیت | entitlement | UI تقریبی |
| --- | --- | --- |
| Projects / categories | `module.projects` | `/app/projects` |
| Team + Branches | عضویت / writable | `/app/team` |
| Services · Clients · Certificates | foundational | `/app/profile-content` |
| Locations | foundational / map | `/app/map` |
| Map engine | `module.map` | `/app/map` + بلوک `map` |
| Org chart | `module.org_chart` | `/app/org-chart` + بلوک `orgChart` |
| Timeline | `module.timeline` | `/app/timeline` + بلوک `timeline` |
| Gallery | `module.gallery` | `/app/gallery` + بلوک `gallery` |

### بلوک‌های هسته و ماژول

هسته (بدون ماژول پولی): `text` · `image` · `section` · `divider` · `headerSlot` · `footerSlot` · `qr` · `toc` · `repeater`

ماژول‌دار: `map` · `orgChart` · `timeline` · `gallery` (+ visibility `when` روی بلوک‌ها)

API collection برای preview/PDF:

`GET /api/businesses/:businessId/collections/:source`  
منابع: `projects` · `teamMembers` · `branches` · `services` · `clients` · `certificates` · `timelineEvents`

ذخیره سند/قالب و PDF با `documentCollectRequiredModuleCodes` → **۴۰۳** در صورت کمبود ماژول.

---

## فاز ۰۳ — Professional Features

| تسک | قابلیت | قرارداد |
| --- | --- | --- |
| locale سند | FA/EN روی محتوا و export `dir`/`lang` | ADR 015 |
| Import | Excel/CSV پروژه‌ها · صف `import.content` | ADR 019 |
| نسخه‌گذاری | PG meta + Mongo snapshot · restore/clone · قفل بدنه | ADR 020 |
| گردش تأیید | draft → review → approved → published | ADR 021 |
| کامنت | anchor اختیاری page/block · resolve | ADR 022 |
| Audit UI | OWNER/ADMIN · `/app/audit` | ADR 023 |
| Backup/Restore | ZIP `vdb.business-backup` · OWNER | ADR 024 |
| DOCX/PPTX | **Won't** | ADR 025 |

### گردش سند

```text
draft ──submit──▶ review ──approve──▶ approved ──publish──▶ published
  ▲                 │ reject              │ unpublish
  └─────────────────┴─────────────────────┘
```

- در `review` / `approved` / `published` بدنه با autosave عوض نمی‌شود
- نسخه روی **publish** خودکار ساخته می‌شود
- PDF نهایی فقط برای `approved` یا `published`

---

## فاز ۰۴ — Product تا GA

| تسک | قابلیت | قانون / ADR |
| --- | --- | --- |
| T01–T02 | اعضا + نقش + RBAC ریز | `17-membership-roles` |
| T03 | White-label (لوگو / دامنه) | `18` |
| T04 | Web Publish (HTML عمومی) | `19` · ADR 026 |
| T05 | Share links (token / رمز / انقضا) | `20` · ADR 027 |
| T06 | Analytics (بازدید / دانلود) | `21` · ADR 028 |
| T07 | Template marketplace (SAAS) | `22` · ADR 029 |
| T08 | Plugin skeleton (طرف اول) | `23` · ADR 030 |
| T09 | Platform admin (SAAS) | `24` · ADR 031 |
| T10 | Dunning / grace / SMS | `25` · ADR 032 |
| T11 | Hardening (Helmet، CORS، سقف export) | `26` · ADR 033 |
| T12 | چک‌لیست GA | [`docs/qa/GA-checklist.md`](docs/qa/GA-checklist.md) |

### مسیرهای وب Product (نمونه)

| مسیر | کاربرد |
| --- | --- |
| `/app/members` | دعوت و نقش‌ها |
| `/app/branding` | برندینگ white-label |
| `/app/marketplace` | کاتالوگ قالب (SAAS) |
| `/app/plugins` | لیست plugin طرف اول |
| `/app/analytics` | خلاصه رویدادها |
| `/app/platform-admin` | کنسول اپراتور SAAS |
| `/p/...` · `/s/...` | پروفایل عمومی / اشتراک |
| `/invite/...` | پذیرش دعوت |

---

## استک و معماری

| لایه | انتخاب |
| --- | --- |
| API | NestJS (Node.js LTS)، modular monolith |
| Web | Next.js App Router + TypeScript |
| DB تراکنشی | PostgreSQL + **Prisma** |
| صف / کش | Redis + BullMQ |
| بدنه سند | MongoDB (**official driver**، نه Mongoose) |
| Auth | Mobile OTP + JWT |
| Storage | local یا S3-compatible (MinIO) |
| PDF | Playwright Chromium یا `fake` برای CI |
| Map UI | Leaflet + OSM |
| i18n | **next-intl فقط** |

```text
Browser (Next)
  → Nest /api
       → JWT → membership (:businessId) → EntitlementGuard (+ RBAC)
       → PostgreSQL | Redis | MongoDB | Object Storage
       → BullMQ workers (export / import / dunning)
```

هدف استقرار: **Docker / VPS** — [`docs/deploy/`](docs/deploy/).

---

## ساختار مونوریپو

```text
/
├── apps/
│   ├── api/                 # NestJS · Prisma · workers داخل پروسس API
│   └── web/                 # Next.js · features/* · shared/i18n · shared/api
├── packages/
│   ├── document-schema/     # JSON سند/قالب، بلوک‌ها، when، count، TOC، …
│   ├── shared-types/        # entitlement، error codes، DTOs عمومی
│   └── plugins/             # manifest طرف اول (@vdb/plugins)
├── docs/
│   ├── api/                 # openapi.yaml (منبع حقیقت) + README
│   ├── deploy/              # نصب و عملیات
│   ├── adr/                 # ۰۰۱–۰۳۳
│   ├── qa/                  # پذیرش + pre-GA + GA-checklist
│   └── spikes/
├── scripts/
│   ├── e2e/                 # saas · self-hosted · corporate · professional
│   └── load/                # smoke سقف صف export
├── implementation-prompts/  # کاتالوگ تسک‌های فاز ۰۱–۰۴
├── .cursor/rules/           # قوانین دائمی ۰۰–۲۶
├── AGENTS.md
├── docker-compose.yml
└── README.md
```

---

## دو Edition

| موضوع | `SAAS` | `SELF_HOSTED` |
| --- | --- | --- |
| میزبان | شما (پلتفرم اشتراکی) | سرور خریدار |
| ثبت‌نام | معمولاً عمومی (OTP) | اغلب دعوت / ادمین |
| پول نرم‌افزار | اشتراک Business | لایسنس نصب |
| Checkout | `PAYMENT_PROVIDER` | `BILLING_CHECKOUT_UNAVAILABLE` |
| Platform admin | فعال | مسیرها 403 / UI مخفی |
| Marketplace قالب | فعال | معمولاً غیرفعال |
| Dunning SMS | job روزانه | skip |
| Tenancy | همچنان `businessId` | همچنان `businessId` |

قانون: **هرگز دو ریپوی واگرا** نسازید — فقط `APP_EDITION` + آداپترها.

---

## مدل دامنه و امنیت

### Entitlement و نقش

- entitlement اشتراک: مثلاً `export.pdf`، `module.map`، …
- نقش عضویت: `OWNER` | `ADMIN` | `EDITOR` | `VIEWER` + کدهای RBAC مثل `manage.data`، `documents.publish`
- UI ممکن است قفل کند؛ **API همیشه رد می‌کند** اگر entitlement/RBAC کم باشد

### چک‌لیست امنیتی (خلاصه)

- OTP rate-limit · MIME allowlist آپلود · IDOR با path `:businessId` + فیلتر Mongo
- CORS فقط `CORS_ORIGINS` · Helmet · اختیاری `TRUST_PROXY`
- سقف همزمانی PDF و rate-limit enqueue (`EXPORT_*`)
- جزئیات: [`docs/qa/pre-ga-hardening.md`](docs/qa/pre-ga-hardening.md)

---

## شروع سریع (لوکال)

### پیش‌نیاز

- Node.js LTS · npm · Docker (برای PG/Redis/Mongo)

### ۱) کلون و وابستگی

```bash
git clone https://github.com/tiam-mhd/DocumentBuilder.git
cd DocumentBuilder
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm install
```

### ۲) استورها و مایگریشن

```bash
npm run docker:up
npm run prisma:generate
npm run migrate
npm run db:seed
```

### ۳) اجرا

```bash
# ترمینال ۱ — API (پیش‌فرض :3001)
npm run api:dev

# ترمینال ۲ — Web (پیش‌فرض :3000)
npm run web:dev

# یا هر دو:
npm run dev
```

باز کردن: `http://localhost:3000/fa`  
OTP با `SMS_PROVIDER=fake`: کد از پاسخ API (`devCode`) در محیط development.

برای **SELF_HOSTED** در `apps/api/.env`: `APP_EDITION=SELF_HOSTED` و مسیر لایسنس طبق [`docs/deploy/`](docs/deploy/).

---

## متغیرهای محیطی مهم

| کلید | نقش |
| --- | --- |
| `APP_EDITION` | `SAAS` \| `SELF_HOSTED` |
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis / BullMQ |
| `MONGODB_URI` | MongoDB |
| `CORS_ORIGINS` | لیست originهای مجاز (بدون `*`) |
| `TRUST_PROXY` | پشت nginx / LB |
| `SMS_PROVIDER` | `fake` \| provider واقعی |
| `PAYMENT_PROVIDER` | `fake` \| `zarinpal` (SAAS) |
| `PDF_RENDERER` | `fake` \| `playwright` |
| `STORAGE_DRIVER` | `local` \| `s3` |
| `EXPORT_MAX_CONCURRENT_PER_BUSINESS` | سقف job همزمان |
| `EXPORT_RATE_MAX` / `EXPORT_RATE_WINDOW_SECONDS` | rate-limit enqueue |
| `BILLING_GRACE_DAYS` | پنجره grace |
| `PLATFORM_ADMIN_MOBILES` | بوت‌استرپ ادمین پلتفرم (SAAS) |

کلیدها را فقط در `.env.example` مستند کنید — **هرگز** `.env` واقعی را commit نکنید.

---

## اسکریپت‌ها، تست و پذیرش

| اسکریپت | کار |
| --- | --- |
| `npm run docker:up` / `docker:down` | استورهای محلی |
| `npm run api:dev` / `web:dev` / `dev` | توسعه |
| `npm run build` | پکیج‌ها + api + web |
| `npm run lint` / `typecheck` | TypeScript |
| `npm run test` | Jest (`apps/api`) |
| `npm run migrate` / `db:seed` | Prisma |
| `npm run test:e2e:saas` | پذیرش Core SAAS |
| `npm run test:e2e:self-hosted` | پذیرش SELF_HOSTED |
| `npm run test:e2e:corporate` | پذیرش فاز ۰۲ |
| `npm run test:e2e:professional` | پذیرش فاز ۰۳ |
| `node scripts/load/export-queue-smoke.mjs` | دود سقف صف export |

### پذیرش

| مسیر | فایل |
| --- | --- |
| SAAS | [phase-01-saas-acceptance.md](docs/qa/phase-01-saas-acceptance.md) |
| SELF_HOSTED | [phase-01-self-hosted-acceptance.md](docs/qa/phase-01-self-hosted-acceptance.md) |
| Corporate | [phase-02-corporate-acceptance.md](docs/qa/phase-02-corporate-acceptance.md) |
| Professional | [phase-03-professional-acceptance.md](docs/qa/phase-03-professional-acceptance.md) |
| Pre-GA | [pre-ga-hardening.md](docs/qa/pre-ga-hardening.md) |
| **GA (خروج کاتالوگ)** | [GA-checklist.md](docs/qa/GA-checklist.md) |

E2Eها API-first هستند (`devCode`، `PDF_RENDERER=fake`). برای UI دستی: locale `fa` + هر دو تم chrome.

```bash
npm run test
npm run typecheck
```

---

## API و مستندات

- **OpenAPI (منبع حقیقت):** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- خلاصه انسانی: [`docs/api/README.md`](docs/api/README.md)
- پیشوند `/api` · منابع Business زیر `/api/businesses/:businessId/...`
- خطا: `{ errors: [{ code, message }] }` (کلاینت `code` را به i18n نگاشت می‌کند)
- ADRها: [`docs/adr/`](docs/adr/) (۰۰۱–۰۳۳)

### گروه‌های مسیر

**Core:** OTP · businesses · subscription · entitlements · checkout/license · media · fonts · themes · templates · documents · export/pdf  

**Corporate:** projects · team · galleries · locations · map · org-chart · timeline · qr/encode · collections · gates  

**Professional:** import/jobs · versions · submit-review · approve · reject · unpublish · comments · audit-events · backup/restore  

**Product:** members · permissions · branding · web-publish · share-links · analytics · marketplace · plugins · platform-admin · dunning  

هر تغییر route → هم‌زمان به‌روز کردن `docs/api`.

---

## قوانین توسعه و عامل‌ها

- [`AGENTS.md`](AGENTS.md) — فهرست قوانین و قرارداد عامل
- [`.cursor/rules/`](.cursor/rules/) — دامنه، معماری، امنیت، تم/i18n، قالب، Product، پروتکل پیاده‌سازی

قواعد غیرقابل مذاکره:

- فیچر کاربرمحور = برش **DB + Nest + Next** مگر خلافش صریح گفته شود  
- مرز مستأجر = **Business**  
- UI ممکن است قفل کند؛ **API باید رد کند**  
- یک Core / دو Edition — بدون فورک محصول  
- پایان پیام پیاده‌سازی: **`تموم شد`** یا **`تموم نشد` + مرحله بعدی**

---

## نقشه راه پس از GA

فازهای ۰۱–۰۴ در `implementation-prompts/` تکمیل و با [`docs/qa/GA-checklist.md`](docs/qa/GA-checklist.md) بسته‌اند.

کارهای بعدی (بیرون از این کاتالوگ):

- اجرای زندهٔ funnelها روی محیط release و تیک §10 در GA-checklist  
- soak / CDN / WAF عملیاتی  
- گسترش اختیاری e2e برای gallery و Product funnel  

این کارها نباید tenancy، entitlement، یا دو Edition را بشکنند.  
خروجی Office (DOCX/PPTX) عمداً خارج از scope است (ADR 025).

---

## مجوز

Proprietary / All rights reserved مگر خلافش در ریپو اعلام شود.
