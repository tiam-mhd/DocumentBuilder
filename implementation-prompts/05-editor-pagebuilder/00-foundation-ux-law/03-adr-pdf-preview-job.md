# P05-T00-03 — ADR پیش‌نمایش PDF صف‌شده (جدا از Export نهایی)

## هدف
تصمیم معماری برای **PDF Preview داخل ادیتور** قبل از انتشار/دانلود: جاب صف‌شده، هزینه/نرخ محدود، تمایز از `export.pdf` نهایی، بدون نقض ممنوعیت render روی keystroke.

## پیش‌نیاز
- `01-pagebuilder-ux-law-rule.md`
- ADR `007` (PDF export pipeline)، rule `26-performance-security-hardening.mdc`
- آشنایی با `export_jobs` و entitlement `export.pdf`

## دامنه Full-Stack
- Database: تصمیم دربارهٔ reuse جدول `export_jobs` در برابر جدول/kind جدید (فقط در ADR)
- Backend/Frontend: ندارد در این تسک
- Docs: `docs/adr/036-editor-pdf-preview.md` (+ README ایندکس)
- Env knobs پیشنهادی در ADR و اشاره به `.env.example` برای فاز پیاده‌سازی بعدی (این تسک می‌تواند کلیدها را فقط در ADR لیست کند؛ تغییر `.env.example` اختیاری ولی توصیه‌شده به‌صورت comment/doc)

## معیار تموم شدن (DoD)
- [ ] ADR نوشته شده با Decision واضح
- [ ] تفکیک: `preview` vs `final` (purpose، واترمارک؟، entitlement، نگهداری فایل، TTL)
- [ ] صف: همان `export.pdf` با `kind` یا صف جدا — با دلیل
- [ ] Rate/concurrency: هم‌تراز یا زیرمجموعهٔ `EXPORT_*`؛ سوءاستفاده پیش‌بینی شده
- [ ] UX contract: polling، حالت‌های queued/processing/completed/failed، لغو؟
- [ ] امنیت: JWT + businessId + membership؛ بدون URL عمومی بدون سهم
- [ ] صریح: autosave و DnD هرگز enqueue نمی‌کنند
- [ ] ایندکس ADR + ارجاع از rule 29

## پرامپت اجرا

```
طبق rules و ADR 007 و hardening 26 عمل کن. فقط docs/ADR (و ارجاع rule) — بدون پیاده‌سازی worker/UI.

تسک: ADR پیش‌نمایش PDF ادیتور را بنویس.

الزامات:
1) تحلیل + تسک‌لیست.
2) فایل `docs/adr/036-editor-pdf-preview.md` (یا شماره آزاد) با بخش‌های Context / Decision / Consequences.
3) Decision باید جواب این‌ها را بدهد:
   - آیا preview از همان renderer HTML→PDF استفاده می‌کند؟ (باید بله مگر دلیل قوی)
   - ذخیره: همان ObjectStorage با prefix متمایز مثلاً `{businessId}/export-previews/{jobId}.pdf` یا زیر export_jobs با `purpose=preview`
   - آیا سند باید writable باشد برای preview؟ پیشنهاد: membership + قابلیت دیدن سند کافی است؛ final download همچنان entitlement و/یا approval gate
   - رابطه با ADR 021: قبل از publish، preview مجاز در draft/review/approved طبق تصمیم صریح
   - واترمارک «پیش‌نمایش» برای draft؟ بله/خیر با دلیل
   - TTL حذف فایل preview و جاب‌های قدیمی
   - Idempotency: اگر body تغییر نکرده، reuse جاب اخیر؟ (پیشنهاد محصول)
   - Rate limits: کلیدهای env پیشنهادی مثلاً `EXPORT_PREVIEW_RATE_MAX` جدا یا مشترک با export
   - Worker concurrency: preview نباید final را گرسنه بگذارد — اولویت یا سقف جدا
4) API shape پیشنهادی (فقط در ADR، پیاده‌سازی نکن):
   - POST preview enqueue
   - GET job status
   - GET file
   کدهای خطا
5) Non-goals: PDF روی websocket هر تغییر؛ client-side jsPDF به‌عنوان مسیر اصلی؛ DOCX
6) `docs/adr/README.md` + ارجاع در rule صفحه‌ساز UX.
7) اگر کلید env را در `.env.example` فقط به‌صورت توضیح/placeholder اضافه می‌کنی، مقدار سکرت نگذار.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
