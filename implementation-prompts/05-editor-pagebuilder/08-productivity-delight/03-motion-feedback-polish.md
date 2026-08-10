# P05-T08-03 — Motion و بازخورد بصری هدفمند

## هدف
۲–۴ حرکت هدفمند برای حس زنده بودن صفحه‌ساز: درج بلوک، حذف، باز/بسته شدن rails، موفقیت ذخیره — با احترام کامل به `prefers-reduced-motion`.

## پیش‌نیاز
- Selection chrome؛ saveStatus؛ rails جمع‌شو
- قانون تم / tokens پروژه

## دامنه Full-Stack
- Frontend CSS transitions/animations فقط
- بدون library سنگین مگر از قبل در پروژه است

## معیار تموم شدن (DoD)
- [ ] حداقل ۳ motion مشخص در خلاصهٔ تحویل
- [ ] reduced-motion → عملاً خاموش یا crossfadeMinimal
- [ ] عدم تداخل با DnD اندازه‌گیری
- [ ] بدون glow بنفش کلیشه‌ای؛ از accent تم استفاده کن
- [ ] عملکرد: نه animation روی هر keystroke متن

## پرامپت اجرا

```
طبق قوانین UI delight و reduced-motion عمل کن. افراط ممنوع.

تسک: motion هدفمند ادیتور صفحه‌ساز را اضافه کن.

الزامات:
1) تحلیل نقاط بازخورد فعلی + تسک‌لیست.
2) پیاده کن: (a) فلش کوتاه ردیف تازه درج‌شده (b) fade خروج حذف (c) انتقال عرض rail (d) پالس ملایم save=saved.
3) همه زیر `@media (prefers-reduced-motion: reduce)`.
4) از animate کردن کل paper در هر autosave بپرهیز.
5) با zoom preview سازگار بمان.
6) اسکرین‌شات لازم نیست؛ در تموم شد لیست motionها را بنویس.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
