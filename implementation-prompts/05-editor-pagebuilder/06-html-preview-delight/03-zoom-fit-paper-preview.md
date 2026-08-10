# P05-T06-03 — زوم و Fit-to-width برای قاب کاغذ Preview

## هدف
کنترل زوم (% / fit width / fit page) روی stage کاغذ در حالت HTML preview (و در صورت اشتراک کامپوننت، روی edit paper) تا اسناد A3 landscape یا مانیتور کوچک قابل کار باشند.

## پیش‌نیاز
- Paper frame فاز 02؛ HTML preview stage فاز 06-01
- ترجیحاً یک `previewZoom` در store یا state محلی mode

## دامنه Full-Stack
- Frontend CSS transform/scale یا width% با origin درست
- i18n کنترل‌ها
- Docs کوتاه میانبر اختیاری (Ctrl+0 reset) اگر با فاز 03 تداخل ندارد

## معیار تموم شدن (DoD)
- [ ] کنترل‌های زوم در نوار preview: − / + / درصد / Fit width
- [ ] Fit width با عرض stage منهای padding حساب می‌شود
- [ ] اسکرول بعد از زوم usable می‌ماند
- [ ] مقدار زوم هنگام سوییچ به edit می‌تواند مستقل یا مشترک باشد — تصمیم مستند
- [ ] reduced-motion: تغییر زوم بدون انیمیشن اجباری طولانی
- [ ] dark/light؛ RTL جای کنترل‌ها

## پرامپت اجرا

```
طبق paper frame و preview stage عمل کن. کیفیت پیکسل PDF را وعده نده — فقط خوانایی UI.

تسک: زوم و fit-to-width را برای پیش‌نمایش HTML (و در صورت امکان paper ادیت) پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ از transform: scale با transform-origin top center|logical استفاده کن یا روش width — یکی را انتخاب و ثابت بمان.
2) UI: دکمه‌ها + خواندن درصد فعلی؛ بازه مثلاً 50%–150% یا 25%–200%.
3) Fit width: ResizeObserver روی stage.
4) Ctrl/Cmd + wheel اختیاری با preventDefault فقط وقتی pointer روی stage است.
5) افقی landscape را تست کن.
6) i18n؛ ذخیرهٔ localStorage اختیاری برای zoom ترجیحی کاربر.
7) با selection-sync (اسکرول) سازگار بمان.
8) worker PDF صدا نزن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
