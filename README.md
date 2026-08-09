# Visual Document Builder (VDB)

پلتفرم ساخت **بروشور و سند بصری سازمانی** با موتور Document مبتنی بر JSON، ادیتور جریان‌محور، و خروجی PDF سروری.

**یک Core · دو Edition** (`SAAS` | `SELF_HOSTED`) · **NestJS + Next.js + PostgreSQL + Redis + MongoDB**

| | |
| --- | --- |
| وضعیت | فاز ۰۱ Core، فاز ۰۲ Corporate، و **فاز ۰۳ Professional** پیاده‌سازی شده‌اند |
| زبان UI | فارسی (`fa`، پیش‌فرض) و انگلیسی (`en`) — RTL / LTR |
| تم اپ | تیره / روشن (`vdb-theme`) — جدا از تم برند سند |
| ریپو | مونوریپو npm workspaces |

---

## فهرست

1. [چیست؟](#چیست)
2. [وضعیت پیاده‌سازی](#وضعیت-پیاده‌سازی)
3. [فاز ۰۱ — Core](#فاز-۰۱--core)
4. [فاز ۰۲ — Corporate](#فاز-۰۲--corporate)
5. [فاز ۰۳ — Professional](#فاز-۰۳--professional)
6. [استک و معماری](#استک-و-معماری)
7. [ساختار ریپو](#ساختار-ریپو)
8. [دو Edition](#دو-edition)
9. [شروع سریع](#شروع-سریع)
10. [اسکریپت‌ها و تست](#اسکریپتها-و-تست)
11. [API و مستندات](#api-و-مستندات)
12. [قوانین توسعه](#قوانین-توسعه)

---

## چیست؟

VDB به سازمان‌ها امکان می‌دهد:

1. چند **Business** بسازند و داده سازمانی (پروژه، تیم، گالری، …) را مدیریت کنند  
2. **قالب** و **سند** را با بلوک‌های جریان‌محور طراحی کنند  
3. با **تم برند** و **فونت** اختصاصی پیش‌نمایش HTML بگیرند  
4. **PDF نهایی** را از صف سرور (نه روی هر keystroke) بگیرند  
5. در مسیر حرفه‌ای: **نسخه‌گذاری، تأیید، کامنت، حسابرسی، پشتیبان، import** داشته باشند  

جداسازی دامنهٔ قفل‌شده: **Data ≠ Template ≠ Document**.

---

## وضعیت پیاده‌سازی

| فاز | نام | وضعیت |
| --- | --- | --- |
| ۰۱ | Core Platform | ✅ کامل |
| ۰۲ | Corporate Brochure Engine | ✅ کامل |
| ۰۳ | Professional Features | ✅ کامل (DOCX/PPTX = Won't — ADR 025) |

چک‌لیست پذیرش: [`docs/qa/`](docs/qa/) · اسکریپت‌ها: [`scripts/e2e/`](scripts/e2e/)

---

## فاز ۰۱ — Core

### هویت و چند Business

- ورود فقط **موبایل + OTP** (بدون رمز در MVP)
- OTP: TTL کوتاه، تک‌مصرف، هش‌شده، rate-limit؛ در `SMS_PROVIDER=fake` کد `devCode`
- کاربر می‌تواند **نامحدود** Business بسازد؛ همهٔ داده با `businessId` ایزوله است

### اشتراک و Trial

- اشتراک **per-Business**: `trial` | `active` | `grace` | `expired` | `pending_payment`
- Trial **۷ روز فقط روی Business اول** یک‌بار (`trialConsumed`)
- Business دوم+ تا پرداخت `pending_payment`؛ Expire داده را پاک نمی‌کند

### دو Edition

| | `SAAS` | `SELF_HOSTED` |
| --- | --- | --- |
| ثبت‌نام عمومی | بله | معمولاً خیر |
| Checkout پلتفرم | بله (`PAYMENT_PROVIDER`) | خیر → `BILLING_CHECKOUT_UNAVAILABLE` |
| لایسنس نصب | — | لازم برای mutate / export |

### دارایی، تم برند، قالب، سند، PDF

- رسانه + مشتقات؛ فونت `.woff2` / `.ttf` / `.otf`
- `design_themes` در PostgreSQL (جدا از تم chrome اپ)
- قالب/سند: متادیتا PG + بدنه Mongo؛ ساخت از قالب = snapshot
- Schema v3: `masters[]` + `pages[].masterId`
- ادیتور: DnD عمودی، undo/redo، autosave ~۸۰۰ms؛ **بدون PDF روی keystroke**
- Export: BullMQ + HTML (RTL + embed فونت) → `PDF_RENDERER=fake|playwright`

### وب Core

ورود، داشبورد، Business، بیلینگ، لایسنس، رسانه، فونت، تم برند، قالب، سند، ادیتور + پنل export.

---

## فاز ۰۲ — Corporate

### داده کسب‌وکار

| موجودیت | گیت | UI تقریبی |
| --- | --- | --- |
| Projects / categories | `module.projects` | `/app/projects` |
| Team + Branches (+ درخت) | عضویت / writable | `/app/team` |
| Services · Clients · Certificates | foundational | `/app/profile-content` |
| Galleries | `module.gallery` | `/app/galleries` |
| Locations | foundational | `/app/locations` |
| Timeline | `module.timeline` | `/app/timeline` |
| Map markers | `module.map` | `/app/map` |
| Org chart | `module.org_chart` | `/app/org-chart` |

### بلوک‌ها

**Core:** `text` · `image` · `section` · `divider` · `headerSlot` · `footerSlot` · `qr` · `toc` · `repeater`  

**Module-gated:** `gallery` · `map` · `orgChart` · `timeline`

| قابلیت | قرارداد |
| --- | --- |
| QR | encode سرور → PNG؛ بدون short-link (ADR 011) |
| TOC | شماره صفحه = ایندکس منطقی `pages[]` (ADR 012) |
| Repeater | `{{item.*}}` فقط (ADR 013) |
| `when` | `exists` \| `empty` \| `eq` روی collection (ADR 014) |
| فرمول ساده | `{{count(...)}}` whitelist — بدون `eval` (ADR 016) |
| locale سند | `fa` \| `en` جدا از UI chrome (ADR 015) |
| Smart breaks | `breakRules` + packer مشترک preview/PDF (ADR 017) |
| لینک تعاملی PDF | `link` روی بلوک + outline (ADR 018) |

### Collections

`GET /api/businesses/:businessId/collections/:source`  
منابع: `projects` · `teamMembers` · `branches` · `services` · `clients` · `certificates` · `timelineEvents`

ذخیره سند/قالب و PDF با `documentCollectRequiredModuleCodes` → **۴۰۳** در صورت کمبود ماژول.

---

## فاز ۰۳ — Professional

| تسک | قابلیت | مسیر / قرارداد |
| --- | --- | --- |
| T05 | Import Excel/CSV پروژه‌ها | `POST .../import/jobs` · صف `import.content` · ADR 019 · UI در Projects |
| T06 | نسخه‌گذاری سند | `document_versions` + Mongo snapshot · publish auto · restore/clone · قفل بدنه published · ADR 020 |
| T07 | گردش تأیید | draft → review → approved → published · OWNER/ADMIN · PDF فقط approved/published · ADR 021 |
| T08 | کامنت سند | `document_comments` · resolve · بدون mention · ADR 022 · پنل ادیتور |
| T09 | Audit Log UI | `GET .../audit-events` OWNER/ADMIN · صفحه `/app/audit` · ADR 023 |
| T10 | Backup / Restore | ZIP `vdb.business-backup` v1 · OWNER · `/app/backup` · ADR 024 · قانون `16-backup-restore` |
| T11 | DOCX / PPTX | **Won't** — Spike → ADR 025 |
| T12 | E2E پذیرش | `npm run test:e2e:professional` · [`docs/qa/phase-03-professional-acceptance.md`](docs/qa/phase-03-professional-acceptance.md) |

### گردش سند (خلاصه)

```text
draft ──submit──▶ review ──approve──▶ approved ──publish──▶ published
  ▲                 │ reject              │ unpublish
  └─────────────────┴─────────────────────┘
```

- در `review` / `approved` / `published` بدنه با autosave عوض نمی‌شود (باید به draft برگردد).
- نسخه روی **publish** خودکار ساخته می‌شود؛ دستی هم `POST .../versions`.

---

## استک و معماری

| لایه | انتخاب |
| --- | --- |
| API | NestJS (Node.js LTS) |
| Web | Next.js App Router + TypeScript |
| DB | PostgreSQL + Prisma |
| صف / کش | Redis + BullMQ |
| بدنه سند | MongoDB (official driver) |
| Auth | Mobile OTP + JWT |
| Storage | local یا S3 / MinIO |
| PDF | Playwright یا `fake` |
| Map UI | Leaflet + OSM |
| i18n | **next-intl فقط** |

```text
Browser (Next)
  → Nest /api
       → JWT → membership (:businessId) → EntitlementGuard
       → PostgreSQL | Redis | MongoDB | Object Storage
```

هدف استقرار: **Docker / VPS** ([`docs/deploy/`](docs/deploy/)).

---

## ساختار ریپو

```text
/
├── apps/api/                 # NestJS
├── apps/web/                 # Next.js
├── packages/
│   ├── document-schema/      # JSON سند/قالب، بلوک‌ها، when، count، …
│   └── shared-types/         # entitlement، audit actions، backup، …
├── docs/
│   ├── api/                  # OpenAPI + README
│   ├── deploy/
│   ├── adr/                  # ۰۰۱–۰۲۵
│   ├── qa/                   # پذیرش فاز ۰۱–۰۳
│   └── spikes/               # مثلاً DOCX
├── scripts/e2e/              # saas · self-hosted · corporate · professional
├── implementation-prompts/
├── .cursor/rules/            # قوانین دائمی (۰۰–۱۶)
├── AGENTS.md
├── docker-compose.yml
└── README.md
```

---

## دو Edition

پیکربندی: `APP_EDITION=SAAS|SELF_HOSTED` · `GET /api/system/config`

همان موتور سند و entitlement؛ تفاوت در signup، checkout پلتفرم، و لایسنس نصب.

---

## شروع سریع

پیش‌نیاز: **Node.js ≥ ۲۰**، **Docker Desktop**.

```bash
npm run docker:up
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run prisma:generate
npm run migrate
npm run db:seed
npm run dev
```

| سرویس | آدرس |
| --- | --- |
| Web (fa) | http://localhost:3000/fa |
| API health | http://localhost:3001/api/health |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MongoDB | `localhost:27017` |

- **SAAS:** `APP_EDITION=SAAS`، `SMS_PROVIDER=fake`، `PAYMENT_PROVIDER=fake`، `PDF_RENDERER=fake`
- **SELF_HOSTED:** `APP_EDITION=SELF_HOSTED` + لایسنس مثل `VDB-DEV-LICENSE-KEY-0001`

جزئیات env: [`.env.example`](.env.example) · [`docs/deploy/README.md`](docs/deploy/README.md)  
**هرگز** `.env` واقعی را commit نکنید.

---

## اسکریپت‌ها و تست

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

### پذیرش

| مسیر | چک‌لیست |
| --- | --- |
| SAAS | [phase-01-saas-acceptance.md](docs/qa/phase-01-saas-acceptance.md) |
| SELF_HOSTED | [phase-01-self-hosted-acceptance.md](docs/qa/phase-01-self-hosted-acceptance.md) |
| Corporate | [phase-02-corporate-acceptance.md](docs/qa/phase-02-corporate-acceptance.md) |
| Professional | [phase-03-professional-acceptance.md](docs/qa/phase-03-professional-acceptance.md) |

E2Eها API-first هستند (`devCode`، `PDF_RENDERER=fake`). برای UI: locale `fa` + هر دو تم chrome.

```bash
npm run test
npm run typecheck
```

---

## API و مستندات

- **OpenAPI:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml) (منبع حقیقت)
- خلاصه: [`docs/api/README.md`](docs/api/README.md)
- پیشوند `/api` · Business زیر `/api/businesses/:businessId/...`
- خطا: `{ errors: [{ code, message }] }`
- ADRها: [`docs/adr/`](docs/adr/) (۰۰۱–۰۲۵)

### گروه‌های مسیر (نمونه)

**Core:** OTP · businesses · subscription · entitlements · checkout/license · media · fonts · themes · templates · documents · export/pdf  

**Corporate:** projects · team · galleries · locations · map · org-chart · timeline · qr/encode · collections · gates  

**Professional:** import/jobs · documents/…/versions · submit-review · approve · reject · unpublish · comments · audit-events · backup/jobs · restore/jobs  

هر تغییر route → هم‌زمان به‌روز کردن `docs/api`.

---

## قوانین توسعه

- [`AGENTS.md`](AGENTS.md)
- [`.cursor/rules/`](.cursor/rules/) — دامنه، معماری، امنیت، تم/i18n، فونت، قالب، محتوا، audit، backup، پروتکل پیاده‌سازی

فیچر کاربرمحور = برش **DB + Nest + Next** مگر خلافش صریح گفته شود.  
مرز مستأجر = **Business**. UI ممکن است قفل کند؛ **API باید رد کند**.

---

## نقشه راه

فازهای ۰۱–۰۳ در `implementation-prompts/` تکمیل شده‌اند.  
فازهای بعدی نباید tenancy، entitlement، یا دو Edition را بشکنند.  
خروجی Office (DOCX/PPTX) عمداً خارج از scope است (ADR 025).

---

## مجوز

Proprietary / All rights reserved مگر خلافش در ریپو اعلام شود.
