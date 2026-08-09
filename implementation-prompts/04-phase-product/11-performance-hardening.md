# P04-T11 — سخت‌سازی عملکرد و امنیت

## هدف
مرور امنیتی/عملکردی قبل از GA: ایندکس‌ها، rate limit، آپلود، IDOR، صف PDF، هزینه‌ها.

## پرامپت اجرا

```
طبق Security checklist و Coding standards عمل کن.

تسک: Performance & Security hardening پیش از GA.

الزامات:
1) چک‌لیست امنیتی rules را مرور و شکاف‌ها را ببند.
2) ایندکس businessId؛ محدودیت export همزمان؛ سخت‌سازی CORS/Helmet.
3) تست بار سبک روی export queue؛ رفع N+1های واضح.
4) گزارش کوتاه در docs/qa/pre-ga-hardening.md.
5) اگر قانون سراسری جدیدی لازم شد اول rules.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
