# P05-T07-05 — Rate Limit و کنترل هزینهٔ Preview + پیام‌ها

## هدف
سقف هزینهٔ پیش‌نمایش PDF را در عمل سخت کن و به کاربر پیام‌های فهمیدنی بده: محدودیت نرخ، صف شلوغ، سقف همزمانی per business — هم‌تراز rule 26 و بدون دور زدن.

## پیش‌نیاز
- API caps از تسک 01
- UI preview از تسک 02
- `EXPORT_*` و کلیدهای preview در env

## دامنه Full-Stack
- Backend: اطمینان از enforce واقعی Redis؛ کدهای خطا پایدار
- Frontend: mapping i18n + CTA «بعداً تلاش کنید» با زمان تقریبی اگر دارید
- `.env.example` مقادیر پیشنهادی dev
- Docs: جدول knobs در deploy یا api README
- تست: تجاوز از rate → 429

## معیار تموم شدن (DoD)
- [ ] 429/403 با code مشخص برای preview rate و concurrency
- [ ] UI پیام غیر فنی + عدم retry storm (دکمه disable موقت)
- [ ] preview و final در صف یکدیگر را گرسنه نمی‌گذارند طبق ADR (اولویت/سقف)
- [ ] لاگ بدون محتوای سند و بدون راز
- [ ] fa+en
- [ ] سند knobs برای اپراتور

## پرامپت اجرا

```
طبق 26-performance-security-hardening و ADR preview عمل کن.

تسک: کنترل هزینه و پیام‌های محدودیت پیش‌نمایش PDF را کامل کن.

الزامات:
1) بازبینی کد rate store تسک 01؛ حفره‌ها را ببند (مثلاً فقط UI).
2) کدهای خطا را در shared-types و errors i18n ثبت کن.
3) UI: هنگام 429 شمارش معکوس ساده یا «حدود N ثانیه دیگر» اگر سرور Retry-After می‌دهد.
4) جلوگیری از double-click enqueue (in-flight lock سمت کلاینت + سرور).
5) متریک/لاگ شمارشی اختیاری بدون PII.
6) جدول env در docs/deploy یا api README.
7) تست خودکار rate deny.
8) افزایش بی‌حد concurrency برای «راحتی dev» در production defaults نگذار.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
