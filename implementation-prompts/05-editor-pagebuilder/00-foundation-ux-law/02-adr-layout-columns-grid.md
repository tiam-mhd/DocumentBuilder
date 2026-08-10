# P05-T00-02 — ADR انعطاف چیدمان (ستون / ردیف در Flow)

## هدف
یک ADR رسمی بنویسید که «انعطاف شبیه Elementor» را از طریق **row/columns داخل flow** تعریف کند و صریحاً absolute free-canvas را non-goal نگه دارد مگر Unlock بعدی — تا فازهای layout/schema بدون ابهام اجرا شوند.

## پیش‌نیاز
- `01-pagebuilder-ux-law-rule.md` (قانون UX باید وجود داشته باشد یا هم‌زمان Proposed شود)
- `07-document-editor.mdc`، `13-templates-blocks.mdc`
- ADR `005` (flow editor)، `017` (pagination)
- آشنایی با `packages/document-schema` مدل `pages[].blocks` و `section.children`

## دامنه Full-Stack
- Database: ندارد در این تسک (پیاده‌سازی schema بعداً در فاز 05)
- Backend/Frontend: ندارد
- Docs: `docs/adr/035-editor-flow-columns.md` (شماره را با ایندکس هم‌تراز کن اگر 035 گرفته شده)
- به‌روزرسانی: `docs/adr/README.md`
- ارجاع از rule 29 به این ADR

## معیار تموم شدن (DoD)
- [ ] ADR با Status: Accepted (یا Proposed با دلیل — ترجیح Accepted برای قفل پک)
- [ ] مدل داده پیشنهادی: نوع بلوک(های) جدید یا گسترش `section` — با نام پایدار
- [ ] قواعد nesting: چند ستون، نسبت عرض، ممنوعیت‌های تو در تو (مثلاً column داخل column تا N سطح)
- [ ] رفتار pagination/preview/PDF برای ستون‌ها مشخص است (سطح تصمیم، نه کد)
- [ ] Migration/version: آیا `DOCUMENT_SCHEMA_VERSION` bump لازم است؟ بله/خیر با دلیل
- [ ] صریح: absolute x/y = Won't در این ADR
- [ ] پیامدها برای editor DnD و inspector فهرست شده
- [ ] ایندکس ADR به‌روز

## پرامپت اجرا

```
طبق `.cursor/rules/` و پک `05-editor-pagebuilder` عمل کن. در این تسک فقط ADR + ارجاعات docs/rules — بدون پیاده‌سازی schema/UI.

تسک: ADR انعطاف چیدمان flow-columns را بنویس.

الزامات:
1) تحلیل گزینه‌ها حداقل دو بدیل و انتخاب یکی:
   A) بلوک جدید `row` با `children` از نوع `column` که هرکدام children معمولی دارند
   B) گسترش `section` با `props.layout = stack|columns` و `props.columnWidths`
   C) بدیل بهتر اگر پیدا کردی — با دلیل رد A/B
2) تصمیم را در `docs/adr/035-editor-flow-columns.md` (یا شماره آزاد بعدی) ثبت کن شامل:
   - Context: نیاز حس Elementor بدون free-canvas
   - Decision: شکل schema، محدودیت nesting، عرض ستون (fraction یا % ثابت MVP)، RTL رفتار ستون‌ها
   - Pagination: ستون‌ها چگونه با ADR 017 هم‌زیستی می‌کنند (حداقل: keep-together در سطح row)
   - Renderer: HTML preview و PDF باید همان ساختار را بفهمند؛ unknown layout fail-safe
   - Editor: DnD مجاز برای جابجایی بین ستون‌ها در فازهای بعدی
   - Non-goals: absolute positioning، overlap آزاد، breakpoint موبایل Elementor-style در MVP این ADR (اختیاری: «web width preview» فقط برای publish جداگانه ذکر شود به‌عنوان future)
   - Schema version: اگر شکل بلاک breaking است bump را الزام کن
3) `docs/adr/README.md` را آپدیت کن.
4) در `.cursor/rules/29-editor-pagebuilder-ux.mdc` (یا معادل) به این ADR لینک بده؛ اگر rule هنوز نیست، در `07-document-editor.mdc` یک بند «Columns: see ADR …» اضافه کن.
5) هیچ کد Nest/Next/document-schema را تغییر نده.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
