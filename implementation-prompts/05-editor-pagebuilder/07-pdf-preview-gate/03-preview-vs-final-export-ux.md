# P05-T07-03 — تمایز UX: Preview در برابر Export / Download نهایی

## هدف
کاربر هرگز Preview را با دانلود نهایی اشتباه نگیرد: کپی i18n، دکمه‌ها، entitlement، و جای ExportPanel در برابر PDF Preview از هم جدا و روشن باشند.

## پیش‌نیاز
- UI preview (۰۲) و ExportPanel موجود
- ADR 021 برای محدودیت download نهایی در صورت وجود
- Entitlement `export.pdf`

## دامنه Full-Stack
- Frontend copy + اطلاعات معماری دکمه‌ها در top bar / More
- Backend فقط اگر entitlement متفاوت برای preview لازم است طبق ADR — هم‌تراز کن
- i18n کامل؛ docs/api توضیح purpose

## معیار تموم شدن (DoD)
- [ ] واژه‌ها: «پیش‌نمایش PDF» ≠ «دانلود PDF نهایی»
- [ ] اگر preview واترمارک دارد در UI گفته شود
- [ ] Download نهایی همچنان از مسیر export + gate خودش
- [ ] در htmlPreview و edit، CTAهای اشتباه به هم قاطی نشوند
- [ ] fa+en یکسان در معنا
- [ ] راهنمای یک‌خطی نزدیک دکمه‌ها

## پرامپت اجرا

```
طبق ADR preview و approval/export gates عمل کن.

تسک: تمایز UX و کپی Preview در برابر Export نهایی را کامل کن.

الزامات:
1) فهرست همهٔ CTAهای PDF در ادیتور؛ جدول مسئولیت هر کدام.
2) ExportPanel را برچسب «نهایی / دانلود» کن؛ Preview را جدا.
3) اگر !canExportPdf یا status اجازهٔ final نمی‌دهد: final disable با دلیل؛ preview ممکن است هنوز مجاز باشد طبق ADR — UI را صادق نگه دار.
4) i18n: کلیدهای جدا؛ از ترجمهٔ مبهم یکسان پرهیز کن.
5) در mode switch: توضیح کوتاه زیر pdfPreview.
6) OpenAPI description فیلد purpose را اگر هست انسان‌خوان کن.
7) منطق worker را جز برچسب عوض نکن مگر باگ.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
