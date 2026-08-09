# فاز 03 — Professional (عمق حرفه‌ای)

## هدف فاز
چندزبانه بودن سند، Binding پیشرفته، Pagination هوشمند، PDF تعاملی، Import، Version/Approval/Audit، Backup/Restore.

## پیش‌نیاز
- فاز `02-phase-corporate`

## معیار خروج فاز
- یک Document بتواند خروجی FA و EN از داده ترجمه‌شده بدهد
- Import اکسل پروژه‌ها کار کند
- Version + approve جریان حداقلی
- Backup/restore workspace Business

## Non-goal فاز (Spike T11)
- **DOCX / PPTX export:** Won't برای نسخه فعلی — خروجی نهایی همان PDF است. جزئیات: `docs/adr/025-docx-pptx-export-wont.md` و `docs/spikes/docx-pptx-p03-t11.md`.

## فهرست تسک‌ها

| فایل | عنوان |
| --- | --- |
| `01-document-i18n-content.md` | چندزبانه محتوای سند (fa/en) |
| `02-advanced-data-binding.md` | Data Binding پیشرفته + فرمول‌های ساده |
| `03-smart-pagination-breaks.md` | Auto Pagination + Smart Breaks |
| `04-interactive-pdf.md` | لینک/Bookmark در PDF |
| `05-import-excel-csv.md` | Import Excel/CSV با mapping |
| `06-document-versioning.md` | Versioning اسناد |
| `07-approval-workflow-basic.md` | Draft→Review→Approved |
| `08-comments-on-document.md` | Comments روی سند |
| `09-audit-log-ui.md` | Audit Log قابل مشاهده |
| `10-backup-restore-business.md` | Backup/Restore Workspace |
| `11-optional-docx-pptx-spike.md` | Spike DOCX/PPTX → **Won't** (Non-goal ثبت شد) |
| `12-e2e-professional-acceptance.md` | E2E پذیرش فاز 03 |

## ترتیب
`01→10` سپس `11` اختیاری، `12` انتها.

## وضعیت پذیرش
- چک‌لیست: [`docs/qa/phase-03-professional-acceptance.md`](../../docs/qa/phase-03-professional-acceptance.md)
- اسکریپت: `npm run test:e2e:professional` → `scripts/e2e/professional-funnel.mjs`
