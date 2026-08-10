# P05-T09-01 — چک‌لیست پذیرش دستی صفحه‌ساز

## هدف
یک چک‌لیست QA دستی کامل در `docs/qa/` برای پذیرش صفحه‌ساز: مسیر طلایی، تم‌ها، RTL، قفل‌ها، HTML/PDF preview، و پیوند به روبریک عشق‌وحال فاز 00.

## پیش‌نیاز
- روبریک: `docs/qa/editor-pagebuilder-delight-rubric.md` (از اجرای P05-T00-05؛ اگر نیست در همین تسک اسکلت+لینک بساز)
- الگوی چک‌لیست‌های موجود: `docs/qa/phase-03-professional-acceptance.md`، `GA-checklist.md`
- پک `05-editor-pagebuilder` فازهای 01–08 پیاده‌سازی‌شده یا در حال پذیرش تدریجی

## دامنه Full-Stack
- Docs فقط: `docs/qa/editor-pagebuilder-acceptance.md`
- ارجاع از README پک و در صورت نیاز یک ردیف در `GA-checklist.md` (اختیاری/غیرمسدود اگر GA قبلاً پاس شده)
- کد محصول نزن مگر اصلاح تایپو docs

## معیار تموم شدن (DoD)
- [ ] چک‌لیست با ستون Pass/Fail/Notes
- [ ] حداقل یک مسیر طلایی end-to-end نوشته شده
- [ ] پوشش: page size، columns (اگر shipped)، modes، locks، i18n fa/en، dark/light
- [ ] معیارهای رد فوری از روبریک delight کپی/لینک شده
- [ ] دستور آماده‌سازی محیط (env، seed، کاربر آزمایشی) کوتاه
- [ ] بدون وابستگی به ابزار داخلی غیرمستند

## پرامپت اجرا

```
طبق docs/qa موجود و پک 05-editor-pagebuilder عمل کن. کدنویسی محصول ممنوع مگر docs.

تسک: چک‌لیست پذیرش دستی صفحه‌ساز را بنویس.

الزامات:
1) فایل `docs/qa/editor-pagebuilder-acceptance.md` بساز با ساختار شبیه phase acceptanceهای موجود.
2) بخش‌ها حداقل:
   - Setup (edition SAAS یا SELF_HOSTED، business فعال، قالب/سند)
   - Workspace chrome (rails، top bar، modes)
   - Page setup (A4/A3، جهت، حاشیه، paper frame، چندصفحه)
   - Canvas (palette drag، section nested، selection، shortcuts، duplicate/delete)
   - Inspector (تب‌ها per typeهای اصلی + Advanced)
   - Layout columns اگر در scope انتشار این پذیرش است — وگرنه N/A با دلیل
   - HTML preview (stage، zoom، selection sync، locale/theme)
   - PDF preview vs final download (تمایز، rate message)
   - Workflow soft/hard gate
   - Delight (tour، command palette، offline banner، a11y smoke)
   - Negative: JSON خام در UI، PDF روی keystroke، IDOR حدس‌زدنی
3) هر ردیف: گام، نتیجهٔ مورد انتظار، Pass/Fail.
4) لینک به delight rubric و ADRهای 035/036 در صورت وجود.
5) `implementation-prompts/05-editor-pagebuilder/README.md` و overview فاز 09 را به این فایل لینک بده.
6) اگر GA-checklist باید اشاره کند، یک ردیف Optional/Pagebuilder اضافه کن بدون شکستن الزامات GA قبلی مگر محصول بخواهد Gate جدید.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
