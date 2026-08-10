# فاز 00 — قانون UX و ADRهای صفحه‌ساز

## هدف فاز
قبل از هر UI بزرگ: قفل کردن مدل تعامل صفحه‌ساز، مرز Elementor-like در برابر free-canvas، و ADR/ruleهای لازم تا پیاده‌سازی بعدی متناقض نشود.

## معیار خروج فاز
### نگارشی (کاتالوگ پرامپت)
- [x] پنج فایل تسک با پرامپت کامل آماده‌کپی

### اجرایی (Agent)
- [x] قانون UX: `.cursor/rules/29-editor-pagebuilder-ux.mdc`
- [x] ADR ستون‌ها: [`docs/adr/035-editor-flow-columns.md`](../../../docs/adr/035-editor-flow-columns.md)
- [x] ADR PDF preview: [`docs/adr/036-editor-pdf-preview.md`](../../../docs/adr/036-editor-pdf-preview.md)
- [x] IA: [`docs/ux/editor-pagebuilder-ia.md`](../../../docs/ux/editor-pagebuilder-ia.md)
- [x] روبریک عشق‌وحال: [`docs/qa/editor-pagebuilder-delight-rubric.md`](../../../docs/qa/editor-pagebuilder-delight-rubric.md)

## فهرست تسک‌ها

| فایل | کد | عنوان | اجرا |
| --- | --- | --- | --- |
| `01-pagebuilder-ux-law-rule.md` | P05-T00-01 | قانون دائمی UX صفحه‌ساز | ✅ |
| `02-adr-layout-columns-grid.md` | P05-T00-02 | ADR انعطاف چیدمان | ✅ |
| `03-adr-pdf-preview-job.md` | P05-T00-03 | ADR پیش‌نمایش PDF | ✅ |
| `04-editor-ia-information-architecture.md` | P05-T00-04 | IA فضای کار | ✅ |
| `05-acceptance-rubric-delight.md` | P05-T00-05 | روبریک عشق‌وحال | ✅ |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05`

## وضعیت
**فاز 00 اجرایی کامل شد.**  
مرحلهٔ بعدی اجرای محصول: فاز `01-workspace-chrome` (از `01-workspace-shell-layout.md`).
