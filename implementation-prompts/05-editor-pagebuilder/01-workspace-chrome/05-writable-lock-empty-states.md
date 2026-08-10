# P05-T01-05 — حالت‌های قفل، Empty states و اعتماد کاربر

## هدف
کروم صفحه‌ساز را از نظر **اعتماد و وضوح** کامل کن: قفل اشتراک (writable)، قفل بدنهٔ workflow، خالی بودن سند/انتخاب، خطای ذخیره، و بنرهای راهنما — تا کاربر گیج یا خاموش نماند.

## پیش‌نیاز
- `01`…`04` همین فاز
- `DOCUMENT_BODY_LOCKED_STATUSES`، entitlements، `use-editor-autosave.ts`
- ADR 021 (approval) رفتار قفل

## دامنه Full-Stack
- Backend: فقط اگر پیام خطای API کد مناسب ندارد — هم‌ترازی کدها در صورت نیاز + `docs/api` اگر route رفتارش عوض شود (معمولاً لازم نیست)
- Frontend: بنرها، empty states، disable یکپارچه کنترل‌ها در rails/top bar
- i18n کامل پیام‌ها

## معیار تموم شدن (DoD)
- [ ] بنر واضح وقتی `!writable` (اشتراک)
- [ ] بنر واضح وقتی body locked + CTA مسیر workflow (reopen/unpublish…) بدون دور زدن API
- [ ] Empty canvas: پیام + CTA «اولین بلوک را از پالت اضافه کنید»
- [ ] Empty inspector: از قبل؛ هم‌تراز بصری
- [ ] `saveStatus === 'error'`: پیام ماندگار تا تلاش بعدی/موفق
- [ ] در حالت قفل: palette add و inspector inputs و عنوان (اگر API اجازه‌اش را نمی‌دهد) disable
- [ ] dark/light + fa/en
- [ ] هیچ JSON یا stack trace به کاربر

## پرامپت اجرا

```
طبق rules ادیتور، billing entitlements، و ADR 021 عمل کن. پیش‌نیاز کروم + mode switch.

تسک: قفل‌ها و empty states اعتمادساز صفحه‌ساز را یکپارچه کن.

الزامات:
1) تحلیل مسیرهای فعلی disable در editor-shell؛ نقاط گیج‌کننده را فهرست کن.
2) یک الگوی Banner/InlineAlert مشترک ادیتور (تم‌aware) برای:
   - subscription read-only
   - body locked by status
   - save failed
   - missing business / load error (اگر جدا نیست یکپارچه کن)
3) Empty canvas state وقتی صفحه بلوکی ندارد.
4) هماهنگی: اگر mode=htmlPreview و locked، همچنان preview مجاز باشد (مشاهده).
5) دکمه‌های top bar که mutation می‌کنند در قفل disable + title/tooltip دلیل.
6) i18n fa+en برای همهٔ پیام‌های جدید؛ لحن انسانی نه فنی.
7) با WorkflowPanel موجود یکپارچه شو — منطق approve را دوباره ننویس؛ فقط لینک/CTA به همان سطح.
8) API را بی‌جهت عوض نکن؛ اگر کد خطای جدید لازم شد docs/api را آپدیت کن.
9) تست دستی: draft writable، published locked، اشتراک فرضی read-only (mock یا business منقضی اگر در دسترس).

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
