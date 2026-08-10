# P05-T04-01 — تکمیل معماری تب‌های Inspector (Content / Design / Advanced)

## هدف
قاب تب‌دار فاز 01 را به **قرارداد پایدار** برسان: ثبت‌نام فیلدها per-type، جای خالی Design معنی‌دار، و الگوی مشترک Field/Hint تا تسک‌های بعدی فقط پنل type اضافه کنند نه ساختار را از نو بسازند.

## پیش‌نیاز
- `P05-T01-03` (قاب تب‌دار) — اگر نبود، ابتدا همان را انجام بده یا در این تسک ادغام کن
- `block-inspector.tsx` فعلی
- rule 29 صفحه‌ساز + IA

## دامنه Full-Stack
- Frontend: لایهٔ `inspector/` (registry of panels، `InspectorField`، tab state)
- Docs اختیاری: جدول «کدام prop در کدام تب» در `docs/ux/`
- Schema فقط اگر prop طراحی مشترک جدید (مثلاً spacing) اضافه می‌کنی — ترجیح: در تسک‌های type بعدی

## معیار تموم شدن (DoD)
- [ ] ساختار کد: یک registry یا switch تمیز per `block.type` → `{ content, design, advanced }`
- [ ] کامپوننت Field مشترک: label، hint، error slot
- [ ] تب Design برای typeهای بدون استایل هنوز empty state مفید دارد نه بن‌بست
- [ ] headerSlot/footerSlot: پیام «از Master تنظیم می‌شود» + لینک به Master panel
- [ ] i18n پایهٔ تب‌ها و hintهای مشترک
- [ ] رگرسیون: همهٔ کنترل‌های قبلی هنوز از طریق تب‌ها در دسترسند

## پرامپت اجرا

```
طبق rules صفحه‌ساز و IA عمل کن. پیش‌نیاز قاب inspector فاز 01.

تسک: معماری پایدار تب‌های Content|Design|Advanced و Field مشترک را تکمیل کن.

الزامات:
1) تحلیل + تسک‌لیست؛ block-inspector را به ماژول‌های کوچک‌تر بشکن بدون از دست رفتن رفتار.
2) قرارداد: هر type یک ماژول پنل صادر کند؛ Advanced مشترک جدا بماند (تسک 06 تکمیلش می‌کند).
3) InspectorField: label + optional hint + children + errorMessage.
4) Document/Page settings وقتی selection نیست (از فاز 01/02) را نشکن.
5) جدول کوتاه در docs/ux برای نگاشت prop→tab برای typeهای اصلی (می‌تواند در پایان فاز کامل شود؛ حداقل اسکلت).
6) schema سنگین و media picker را اینجا عمیق نکن (تسک‌های بعد).
7) fa+en؛ dark/light؛ disabled قفل‌ها.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
