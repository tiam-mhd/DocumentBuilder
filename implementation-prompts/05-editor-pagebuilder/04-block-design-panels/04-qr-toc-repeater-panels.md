# P05-T04-04 — پنل‌های QR / TOC / Repeater

## هدف
عمق UX برای سه بلوک داده/ساختار مهم: QR (نوع هدف، مقدار، اندازه، کپشن)، TOC (سطح، شماره صفحه، عنوان)، Repeater (منبع، حد، پیام خالی، راهنمای `{{item.*}}`) — همه با hint روشن و بدون jargon خام.

## پیش‌نیاز
- تب‌های inspector
- ADR 011 QR، 012 TOC، 013 Repeater؛ encode preview API اگر هست
- فیلدهای فعلی در block-inspector

## دامنه Full-Stack
- Frontend panels + در صورت نیاز دکمه «پیش‌نمایش QR» با API موجود
- Backend: فقط اگر encode/list collections ناقص است — کامل کن + docs
- Collections preview: `GET .../collections/:source` طبق محصول

## معیار تموم شدن (DoD)
- [ ] QR: targetType UX انتخابی، value با placeholder بر اساس نوع، sizePx، caption؛ دکمه encode preview اگر API هست
- [ ] TOC: maxLevel، showPageNumbers، title؛ توضیح شمارهٔ logical pages
- [ ] Repeater: source select با entitlement، limit، emptyMessage؛ لیست کلیدهای item کمکی؛ هشدار nested repeater unsupported
- [ ] Design tab: size QR؛ TOC فاصله اختیاری اگر prop دارید
- [ ] i18n کامل؛ validation پایه
- [ ] module gate برای sources پروژه‌ها/timeline

## پرامپت اجرا

```
طبق ADR 011/012/013 و entitlement repeater sources عمل کن.

تسک: پنل‌های QR و TOC و Repeater را عمیق و کاربرپسند کن.

الزامات:
1) تحلیل UI فعلی هر سه + تسک‌لیست.
2) QR: select نوع هدف با توضیح (url/phone/email/map/custom)؛ ساخت payload مطابق schema؛ اگر POST encode هست از inspector صدا بزن و thumb نشان بده — PDF مسیر جدا را نشکن.
3) TOC: کنترل‌ها + hint که شماره صفحات منطقی است نه ورق چاپگر.
4) Repeater: source از لیست مجاز؛ وقتی module لازم است CTA ارتقا؛ راهنمای کوتاه {{item.field}} بدون eval؛ محدودیت nested را در UI بگو.
5) Advanced را برای when/link در تسک 06 نگه دار مگر امروز داخل همین‌هاست — جایشان را درست به Advanced منتقل کن.
6) fa+en؛ dark/light؛ locked.
7) تست: تغییر props → html preview به‌روز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
