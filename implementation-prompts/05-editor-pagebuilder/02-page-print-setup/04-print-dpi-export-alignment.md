# P05-T02-04 — تراز DPI / پرینت با مسیر Export

## هدف
تنظیمات چاپ/کیفیت (DPI یا پریست کیفیت) را با **export pipeline** هم‌تراز کن تا UI ادیتور و PDF نهایی یک قرارداد داشته باشند — بدون hardcode پنهان فقط در Playwright call site، و بدون PDF روی keystroke.

## پیش‌نیاز
- `01`…`03` همین فاز
- `apps/api/src/modules/export/*` (playwright renderer، export.service)
- ADR 007؛ rule `26-performance-security-hardening.mdc`
- قانون 07: print presets در export config نه پراکنده در UI components

## دامنه Full-Stack
- Database: در صورت نیاز ستون/فیلد روی export job meta یا ذخیره در `page` / `exportHints` داخل body — **با ADR کوتاه اگر shape جدید است**
- Backend: خواندن preset از body یا درخواست enqueue؛ اعمال به renderer
- Frontend: کنترل کیفیت در Page/Export settings (واضح: روی preview HTML اثر بصری محدود دارد؛ روی PDF اثر دارد)
- Docs: OpenAPI export enqueue اگر request shape عوض شود؛ `.env.example` اگر default DPI سروری است
- Shared-types: enum کیفیت

## معیار تموم شدن (DoD)
- [ ] منبع حقیقت برای print quality/DPI مشخص (shared const یا schema field)
- [ ] UI کاربرپسند (مثلاً «استاندارد / بالا») نه فقط عدد خام — عدد می‌تواند advanced باشد
- [ ] Final PDF از همان تنظیم استفاده می‌کند
- [ ] تغییر کیفیت باعث enqueue خودکار نمی‌شود
- [ ] Rate limit/cost تغییر نکرده مگر مستند شود
- [ ] i18n؛ قفل writable رعایت شود
- [ ] اگر فیلد در Mongo body است: parse/validate + نسخه‌بندی schema در صورت نیاز

## پرامپت اجرا

```
طبق ADR 007 و 07-document-editor («print presets in export config») و hardening 26 عمل کن.

تسک: تراز DPI/کیفیت چاپ بین ادیتور و export را Full-Stack پیاده کن.

الزامات:
1) تحلیل وضعیت فعلی playwright `page.pdf` و اینکه DPI/preferCSSPageSize امروز چیست.
2) تصمیم طراحی (در کد + اگر لازم ADR خیلی کوتاه در docs/adr یا بند در 007):
   - آیا کیفیت بخشی از PageConfig است یا فقط پارامتر job؟
   - پیشنهاد محصول: `page.printQuality: 'standard'|'high'` در schema یا `exportOptions` روی document meta — یکی را انتخاب و توجیه کن؛ از دو منبع حقیقت پرهیز کن.
3) Shared enum + validation.
4) UI در ادیتور (نزدیک page setup یا پنل export نهایی) با hint: «روی فایل PDF اثر دارد؛ پیش‌نمایش HTML تقریبی است».
5) export.service / renderer تنظیم را اعمال کند (مثلاً scale یا معادل امن Playwright).
6) OpenAPI و docs/api اگر API عوض شد.
7) هرگز با تغییر DPI از autosave PDF نساز.
8) i18n fa+en؛ تست دستی یک export fake یا playwright در صورت محیط.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
