# P05-T02-02 — جهت صفحه و کنترل حاشیه (mm)

## هدف
UI کامل برای `page.orientation` (`portrait|landscape`) و `page.marginsMm` (top/right/bottom/left) + در صورت وجود در UI، `autoPaginate` — با اعتبارسنجی معقول و بازخورد فوری.

## پیش‌نیاز
- `01-page-size-presets-ui.md`
- `PageConfigSchema.marginsMm` و `orientation` و `autoPaginate`
- منطق `pageContentCapacity` / pagination تقریبی

## دامنه Full-Stack
- Shared: در صورت نیاز محدود کردن min/max حاشیه در schema (zod) تا API و UI یک زبان داشته باشند
- Backend: parseDocumentBody باید همان محدودیت‌ها را enforce کند
- Frontend: کنترل‌های عددی mm، دکمهٔ «حاشیه یکسان»، پیش‌فرض‌ها
- Docs: اگر validation error code جدید آمد → docs/api و errors i18n

## معیار تموم شدن (DoD)
- [ ] سوییچ portrait/landscape با i18n و آیکون/برچسب واضح
- [ ] چهار ورودی حاشیه (mm) + گزینه link/unlink برای یکسان‌سازی
- [ ] مقادیر نامعتبر (منفی، بزرگ‌تر از نصف صفحه، …) رد یا clamp با پیام کاربرپسند
- [ ] `autoPaginate` toggle با hint که چه می‌کند (زبان غیر فنی)
- [ ] undo + autosave
- [ ] disable در قفل‌ها
- [ ] تغییر orientation روی preview/export اثر دارد (رگرسیون)

## پرامپت اجرا

```
طبق document-schema PageConfig و rules ادیتور عمل کن. پیش‌نیاز پریست سایز.

تسک: کنترل جهت و حاشیه میلی‌متری (+ autoPaginate) را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ قواعد min/max حاشیه را مشخص کن (پیشنهاد: هر ضلع 0–50mm یا نسبت به اندازه صفحه؛ در schema منعکس کن اگر امروز خیلی باز است).
2) UI کنار page size در Page settings.
3) orientation: دو حالت؛ در RTL برچسب‌ها درست بمانند (landscape≠آینه اشتباه).
4) marginsMm: number inputs؛ واحد «mm» نمایش داده شود؛ دکمه «اعمال به همه طرف‌ها».
5) autoPaginate: toggle + توضیح کوتاه که صفحه‌بندی تقریبی preview/PDF از این تبعیت می‌کند (ارجاع مفهومی به ADR 017 بدون jargon در UI).
6) Mutationها وارد undo stack شوند.
7) خطاها با code قابل i18n؛ نه ZodException خام.
8) i18n fa+en؛ dark/light.
9) کاغذ frame (راهنمای حاشیه بصری) تسک 03 است — اینجا داده درست باشد.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
