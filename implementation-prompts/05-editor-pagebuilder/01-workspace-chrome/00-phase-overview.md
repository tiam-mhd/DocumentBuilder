# فاز 01 — کروم فضای کار (Workspace Chrome)

## هدف فاز
بازآرایی `EditorShell` به فضای کار شبیه صفحه‌ساز حرفه‌ای: نوار بالا، پنل چپ (پالت/لایه‌ها)، بوم مرکزی، پنل راست (ویژگی‌ها)، سوییچ حالت‌ها — بدون عمیق کردن همهٔ inspectorها یا PDF preview واقعی.

## معیار خروج فاز
### نگارشی
- [x] پنج فایل تسک با پرامپت کامل

### اجرایی
- [x] IA ثابت در هر دو تم و `fa`/`en`
- [x] حالت Edit در برابر HTML Preview از نظر UX جدا؛ PDF Preview حداقل پوسته
- [x] پنل‌های جانبی جمع‌شو / تحت More؛ تمرکز روی بوم
- [x] Layers همگام با selection
- [x] Inspector قاب تب‌دار
- [x] قفل‌ها و empty states اعتمادساز

## فهرست تسک‌ها

| فایل | کد | عنوان | اجرا |
| --- | --- | --- | --- |
| `01-workspace-shell-layout.md` | P05-T01-01 | لایه‌بندی سه‌ناحیه + top bar | ✅ |
| `02-left-rail-palette-layers.md` | P05-T01-02 | ریل چپ: پالت + لایه‌ها | ✅ |
| `03-right-rail-inspector-frame.md` | P05-T01-03 | ریل راست: قاب inspector تب‌دار | ✅ |
| `04-editor-mode-switcher.md` | P05-T01-04 | سوییچ Edit / HTML / PDF (shell) | ✅ |
| `05-writable-lock-empty-states.md` | P05-T01-05 | قفل‌ها + empty states | ✅ |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05`  
(۲ و ۳ پس از ۱ می‌توانند تا حدی موازی شوند؛ ۵ آخر برای یکپارچه‌سازی بنرها.)

## وابستگی به فازهای دیگر
- Page size UI → فاز 02  
- DnD از پالت / تودرتو → فاز 03  
- عمق Design panels → فاز 04  
- PDF preview جاب واقعی → فاز 07  

## وضعیت
**پرامپت‌ها و اجرای محصول فاز 01 کامل شد.**  
مرحلهٔ بعدی: فاز `02-page-print-setup` از `01-page-size-presets-ui.md`.
