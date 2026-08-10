# P05-T06-04 — وفاداری Theme و Document Locale در Preview

## هدف
HTML preview حداکثر به خروجی نهایی نزدیک شود از نظر **توکن‌های brand theme**، فونت‌های ثبت‌شده در حد ممکن وب، و `dir`/`lang` بر اساس `document.locale` — جدا از locale UI کروم.

## پیش‌نیاز
- ADR 002 themes، 015 document locale، 011–013 previews
- `getDefaultTheme` / theme روی سند اگر هست
- HtmlPreview tokens امروز

## دامنه Full-Stack
- Frontend: تزریق CSS variables از DesignThemeTokens؛ dir/lang روی root کاغذ
- Backend اختیاری: اگر font file URL authenticated برای @font-face در preview لازم است — endpoint موجود fonts را مصرف کن (membership)
- Docs: محدودیت «وب فونت ≈ PDF embed ولی یکی نیست» در بنر کوتاه

## معیار تموم شدن (DoD)
- [ ] تغییر theme tokens (یا انتخاب تم اگر UI دارد) preview را عوض می‌کند
- [ ] `body.locale=fa` → dir=rtl روی paper؛ en → ltr — مستقل از next-intl UI
- [ ] رنگ‌های primary/text/background از tokens
- [ ] فونت heading/body در حد خانوادهٔ CSS؛ اگر fontFaceId هست تلاش برای بارگذاری فایل
- [ ] masters header/footer در preview هم‌خوان با قرارداد موجود
- [ ] بنر صادقانه دربارهٔ تفاوت جزئی با PDF

## پرامپت اجرا

```
طبق ADR 002 و 015 و قوانین theme/font عمل کن.

تسک: وفاداری theme و document locale را در HTML preview بالا ببر.

الزامات:
1) تحلیل HtmlPreview tokens + CSS فعلی + تسک‌لیست.
2) root کاغذ: style variables از DesignThemeTokens؛ lang و dir از body.locale.
3) اگر سند themeId جدا از default دارد و API می‌دهد، همان را load کن نه فقط default — در غیر این صورت در خلاصه بنویس و default را درست نگه دار.
4) Font faces: برای preview وب از GET font file با JWT/cookie الگوی موجود؛ شکست بارگذاری → fallback خانوادهٔ CSS بدون crash.
5) اطمینان از اینکه UI chrome (اپ) با dir سند قاطی نمی‌شود.
6) i18n بنر؛ تست fa و en document locale با UI برعکس.
7) PDF renderer را فقط اگر باگ مشترک tokens دیدی هم‌تراز کن؛ دامنه را بی‌جهت بزرگ نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
