# فاز 05 — انعطاف چیدمان (Layout Flexibility)

## هدف فاز
حس انعطاف Elementor بدون شکستن قانون سند: ستون‌ها/ردیف‌های flow، قیدهای نگهداشت، presets چیدمان — فقط روی ADR فاز 00.

## معیار خروج فاز
### نگارشی
- [x] پنج فایل تسک با پرامپت کامل

### اجرایی (وقتی به Agent داده شود)
- مدل ستون در schema + editor + preview + PDF
- Fail-safe اسناد قدیمی
- کتابخانهٔ preset
- keep-together برای row
- بدون absolute x/y

## فهرست تسک‌ها

| فایل | کد | عنوان |
| --- | --- | --- |
| `01-schema-columns-row-block.md` | P05-T05-01 | Schema ردیف/ستون + نسخه |
| `02-editor-columns-ui.md` | P05-T05-02 | UI بوم و inspector ستون‌ها |
| `03-preview-pdf-columns-parity.md` | P05-T05-03 | تراز HTML و PDF |
| `04-layout-presets-library.md` | P05-T05-04 | کتابخانهٔ preset |
| `05-keep-together-advanced.md` | P05-T05-05 | Keep-together پیشرفته |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05`  
(۰۴ می‌تواند کمی موازی با ۰۳ باشد؛ ۰۵ بعد از parity.)

## پیش‌نیاز فاز
- ADR ستون‌ها از فاز 00 (`P05-T00-02`) باید قبل از اجرای کدنویسی این فاز Accepted باشد.

## وضعیت کاتالوگ
**پرامپت‌های فاز 05 کامل شد.**  
مرحلهٔ نگارشی بعدی: فاز `06-html-preview-delight`.
