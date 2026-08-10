# P05-T08-02 — راهنمای کوتاه اولین ورود (Coach marks)

## هدف
برای کاربر تازه‌وارد، یک تور **کوتاه و قابل‌رد** (۳–۵ گام) نقاط حیاتی صفحه‌ساز را نشان دهد: پالت، بوم کاغذ، inspector، mode switch — بدون modal اجباری بلند و بدون تکرار آزاردهنده.

## پیش‌نیاز
- Workspace chrome پایدار
- روبریک delight فاز 00 (Discoverability)

## دامنه Full-Stack
- Frontend: coach marks + localStorage/cookie کلید `vdb-editor-tour-v1`
- اختیاری: sync بعداً به user settings API — MVP محلی کافی است
- i18n گام‌ها
- Docs: نحوهٔ ریست تور برای QA

## معیار تموم شدن (DoD)
- [ ] فقط اولین بار per browser profile (یا تا Reset)
- [ ] Skip / Next / Done
- [ ] spotlight روی نواحی واقعی با resize امن
- [ ] reduced-motion: بدون انیمیشن اغراق
- [ ] دکمهٔ «راهنمای مجدد» در منوی More
- [ ] fa+en؛ تم‌ها؛ مسدود نکردن کامل ادیتور

## پرامپت اجرا

```
طبق delight rubric و i18n عمل کن. از کتابخانهٔ tour سنگین پرهیز کن مگر خیلی سبک باشد.

تسک: coach marks اولین ورود به ادیتور را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ حداکثر ۵ گام با متن کوتاه.
2) گام‌ها: (1) پالت (2) بوم/کاغذ (3)inspector (4) حالت‌های پیش‌نمایش (5) ذخیره/وضعیت.
3) ذخیرهٔ completion در localStorage؛ نسخهٔ کلید برای وقتی UI عوض شد.
4) عدم نمایش وقتی document load error.
5) a11y: focus trap ملایم در کارت تور؛ Esc=Skip.
6) i18n؛ RTL جای کارت.
7) analytics را به تسک 06 واگذار کن یا یک event محلی اختیاری بدون PII.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
