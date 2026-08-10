# فاز 09 — پذیرش کیفیت و E2E صفحه‌ساز

## هدف فاز
اثبات اینکه مسیر طلایی صفحه‌ساز کار می‌کند و رگرسیون ایجاد نمی‌کند؛ چک‌لیست دستی + اسکریپت E2E + perf smoke + ممیزی docs + signoff.

## معیار خروج فاز
### نگارشی
- [x] پنج فایل تسک با پرامپت کامل

### اجرایی (وقتی به Agent داده شود)
- سناریوی A4 → ویرایش → HTML preview → PDF preview → publish/download پوشش داده‌شده در checklist/E2E
- امتیازدهی با روبریک: [`docs/qa/editor-pagebuilder-delight-rubric.md`](../../../docs/qa/editor-pagebuilder-delight-rubric.md)
- اسناد در `docs/qa/` (acceptance، perf، audit، signoff)
- perf smoke
- ممیزی docs/ADR/OpenAPI
- signoff کتبی

## فهرست تسک‌ها

| فایل | کد | عنوان |
| --- | --- | --- |
| `01-qa-checklist-pagebuilder.md` | P05-T09-01 | چک‌لیست پذیرش دستی |
| `02-e2e-editor-pagebuilder-funnel.md` | P05-T09-02 | E2E مسیر طلایی |
| `03-perf-smoke-editor.md` | P05-T09-03 | Smoke عملکرد |
| `04-docs-api-adr-sync-audit.md` | P05-T09-04 | ممیزی docs/rules/OpenAPI |
| `05-phase-exit-signoff.md` | P05-T09-05 | Signoff خروج |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05`  
(۰۲ و ۰۳ پس از وجود چک‌لیست می‌توانند موازی شوند؛ ۰۵ آخر.)

## وضعیت کاتالوگ
**پرامپت‌های فاز 09 کامل شد.**  
با این فاز، **نگارش کاتالوگ پک `05-editor-pagebuilder` کامل است.**
