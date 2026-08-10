# فاز 07 — پیش‌نمایش PDF قبل از انتشار/دانلود

## هدف فاز
کاربر بتواند PDF را ببیند قبل از انتشار و قبل از دانلود نهایی — از طریق جاب صف‌شده جدا، با rate limit، بدون PDF روی keystroke.

## معیار خروج فاز
### نگارشی
- [x] پنج فایل تسک با پرامپت کامل

### اجرایی (وقتی به Agent داده شود)
- API/job پیش‌نمایش طبق ADR
- UI وضعیت + viewer در ادیتور
- تمایز Preview vs Export نهایی
- اتصال نرم/سخت به workflow انتشار
- caps و پیام‌های محدودیت

## فهرست تسک‌ها

| فایل | کد | عنوان |
| --- | --- | --- |
| `01-api-pdf-preview-enqueue.md` | P05-T07-01 | API enqueue + caps |
| `02-pdf-preview-panel-ui.md` | P05-T07-02 | UI حالت PDF Preview |
| `03-preview-vs-final-export-ux.md` | P05-T07-03 | تمایز Preview vs Download |
| `04-workflow-gate-preview-publish.md` | P05-T07-04 | اتصال به workflow/publish |
| `05-preview-rate-limit-cost-controls.md` | P05-T07-05 | هزینه و پیام محدودیت |

## ترتیب اجرا
`01 → 02 → 03 → 04 → 05`

## پیش‌نیاز فاز
- ADR پیش‌نمایش PDF از فاز 00 (`P05-T00-03`) قبل از کدنویسی Accepted باشد.

## وضعیت کاتالوگ
**پرامپت‌های فاز 07 کامل شد.**  
مرحلهٔ نگارشی بعدی: فاز `08-productivity-delight`.
