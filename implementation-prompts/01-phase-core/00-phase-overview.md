# فاز 01 — Core (MVP هسته)

## هدف فاز
MVP قابل فروش روی استک **NestJS + Next.js + PostgreSQL + Redis + MongoDB**: OTP، Business، اشتراک/Trial، Gate، Media/Font، سند پایه، PDF، Dual Deployment.

## معیار خروج فاز
- SAAS: OTP → Business+Trial → سند → پرداخت → PDF
- SELF_HOSTED: License → همان هسته
- EntitlementGuard سمت Nest
- Document body در MongoDB؛ تراکنش‌ها در PostgreSQL؛ صف در Redis
- docs/api به‌روز؛ تم + i18n

## فهرست تسک‌ها

| فایل | عنوان |
| --- | --- |
| `01-identity-user-otp.md` | User + OTP (PG + Redis) |
| `02-auth-session-web.md` | JWT + UI احراز هویت Next |
| `03-business-crud-switcher.md` | Business CRUD + Switcher |
| `04-subscription-states.md` | Subscription states (PG) |
| `05-trial-first-business.md` | Trial ۷روزه |
| `06-plans-modules-catalog.md` | Plan/Module catalog |
| `07-billing-payment-saas.md` | پرداخت SAAS |
| `08-entitlement-gate.md` | EntitlementGuard |
| `09-license-self-hosted.md` | لایسنس SELF_HOSTED |
| `10-media-library.md` | Media Library |
| `11-font-manager.md` | Font Manager |
| `12-design-theme-tokens.md` | Theme Tokens سند |
| `13-template-blocks-basic.md` | Template + Blocks |
| `14-document-crud-schema.md` | Document CRUD |
| `15-editor-shell-flow.md` | Editor Flow |
| `16-master-header-footer.md` | Master / Header / Footer |
| `17-pdf-export-pipeline.md` | PDF Export Pipeline |
| `18-e2e-saas-funnel.md` | E2E SAAS |
| `19-e2e-self-hosted-funnel.md` | E2E SELF_HOSTED |

## ترتیب
`01→19` به‌ترتیب شماره؛ E2Eها در انتها.
