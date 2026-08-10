# P05-T00-01 — قانون دائمی UX صفحه‌ساز سند

## هدف
یک فایل قانون دائمی در `.cursor/rules/` بنویسید که تجربهٔ ویرایشگر را به‌عنوان **صفحه‌ساز حرفه‌ای سند** قفل کند (حس Elementor از نظر جذابیت/روان بودن/عمق پنل)، بدون نقض قوانین موجود flow، tenancy، و ممنوعیت PDF روی keystroke.

## پیش‌نیاز
- مطالعه: `implementation-prompts/05-editor-pagebuilder/README.md`
- مطالعه: `implementation-prompts/05-editor-pagebuilder/00-vision-and-gap-analysis.md`
- قوانین: `07-document-editor.mdc`، `10-theme-and-i18n.mdc`، `13-templates-blocks.mdc`، `05-api-security-billing.mdc`
- ADRهای مرتبط: `005`، `006`، `007`، `017`

## دامنه Full-Stack
- Database: ندارد (فقط قانون)
- Backend: ندارد
- Frontend: ندارد (کد ادیتور نزن)
- Docs/Rules: `.cursor/rules/29-editor-pagebuilder-ux.mdc` (نام پیشنهادی؛ اگر شمارهٔ آزاد دیگری لازم است هماهنگ با `AGENTS.md`)
- Index: به‌روزرسانی `AGENTS.md` جدول rule index

## معیار تموم شدن (DoD)
- [ ] فایل rule جدید با `alwaysApply: true` (یا صریح در AGENTS) ایجاد شده
- [ ] مدل سه‌حالته Edit / HTML Preview / PDF Preview تعریف شده
- [ ] مرز «Elementor-like ≠ absolute free-canvas» صریح است
- [ ] الزامات: پالت، لایه‌ها، inspector تب‌دار، قاب کاغذ، شورتکات پایه، empty/lock states
- [ ] ممنوعیت‌ها: PDF روی keystroke، نشت دادهٔ فنی JSON به کاربر نهایی ادیتور، نادیده گرفتن body-lock workflow
- [ ] ارجاع به ADRهای layout columns و PDF preview (حتی اگر هنوز Proposed باشند)
- [ ] `AGENTS.md` ایندکس شده
- [ ] **هیچ** تغییر UI/API در این تسک مگر ضروری برای docs

## پرامپت اجرا

```
طبق AGENTS.md و تمام `.cursor/rules/` عمل کن. کدنویسی محصول (Nest/Next/schema) در این تسک ممنوع است مگر به‌روزرسانی docs/rules.

تسک: قانون دائمی UX صفحه‌ساز سند را بنویس.

الزامات:
1) تحلیل کوتاه + تسک‌لیست؛ سپس فقط فایل‌های rule/docs را تغییر بده.
2) فایل جدید بساز: `.cursor/rules/29-editor-pagebuilder-ux.mdc` (اگر 29 گرفته شده، شمارهٔ آزاد بعدی).
3) محتوا باید حداقل این‌ها را قفل کند:
   - هدف حس: صفحه‌ساز حرفه‌ای (جذاب، روان، منعطف) برای سند چاپی/وب — نه IDE برنامه‌نویسی و نه Canva آزاد.
   - Layout پیش‌فرض: flow + sections/blocks؛ absolute free-canvas x/y ممنوع مگر ADR صریح محصول آن را Unlock کند.
   - انعطاف مجاز مسیر اصلی: row/columns (یا معادل) طبق ADR layout — حس Elementor از طریق ستون/قید نه مختصات آزاد.
   - فضای کار: Left rail (palette + layers) / Center canvas (paper frame) / Right rail (inspector با تب‌های Content | Design | Advanced) / Top bar (سند، undo/redo، page setup، mode switch، save status).
   - حالت‌ها: `edit` | `htmlPreview` | `pdfPreview` — تعریف رفتار هر حالت (چه چیزی editable است، چه چیزی فقط مشاهده).
   - Preview HTML: زنده با brand tokens؛ همگام‌سازی انتخاب وقتی ممکن؛ هرگز جایگزین Final PDF نیست.
   - Preview PDF: فقط جاب صف‌شده (ADR pdf-preview)؛ throttle/rate؛ جدا از export نهایی دانلود؛ ممنوع روی keystroke/autosave.
   - Page setup UI: اندازه/جهت/حاشیه جزء first-class ادیتور است (نه فقط در export پنل پنهان).
   - Inspector: هر block type باید کنترل‌های قابل‌فهم کاربر داشته باشد؛ لیبل+hint i18n؛ بدون نمایش JSON خام به کاربر نهایی.
   - Gates: writable entitlement + body lock (review/approved/published) باید در UI واضح باشد.
   - i18n fa/en + RTL/LTR برای UI ادیتور؛ document.locale جدا از UI locale.
   - Delight حداقل: empty states هدایت‌شده، شورتکات‌های پایه، بازخورد ذخیره، reduced-motion.
   - Forbidden: eval bindings، PDF در مسیر تعاملی، CORS/Helmet تضعیف، حذف داده به‌خاطر اشتراک.
4) `07-document-editor.mdc` را فقط در صورت نیاز با یک ارجاع کوتاه به rule 29 هم‌تراز کن — قانون قدیمی را نقض نکن؛ تکمیلش کن.
5) `AGENTS.md` جدول rule index را آپدیت کن.
6) اگر کشف قانون سراسری دیگری لازم شد همان‌جا اضافه کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی. هیچ UI صفحه‌ساز را در این تسک پیاده نکن.
```
