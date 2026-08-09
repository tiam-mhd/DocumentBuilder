# P00-T05 — چندزبانه fa/en + RTL/LTR

## هدف
راه‌اندازی i18n با next-intl (یا معادل قفل‌شده)، فارسی پیش‌فرض و انگلیسی + RTL/LTR.

## پیش‌نیاز
- `00-foundation/03-web-nextjs-baseline.md`

## دامنه Full-Stack
- Database: اختیاری locale روی User در PostgreSQL
- Backend: خطاها با `code`؛ کلاینت map به i18n
- Frontend: `[locale]`، پیام‌ها، سوییچ زبان، dir
- Docs: در صورت پشتیبانی API از locale

## معیار تموم شدن (DoD)
- [ ] fa و en برای shell کامل‌اند
- [ ] dir=rtl|ltr درست است
- [ ] next-intl (ترجیحی) به‌عنوان تنها سیستم i18n قفل شده
- [ ] رشته هاردکد کاربرمحور در shell نمانده

## پرامپت اجرا

```
طبق `.cursor/rules/` فایل `10-theme-and-i18n.mdc` عمل کن.

تسک: i18n فارسی/انگلیسی + RTL/LTR را روی Next.js App Router پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ next-intl را ترجیح بده و اگر انتخاب نهایی است در rules قفل کن.
2) مسیر app/[locale]/... و پیام‌ها در shared/i18n.
3) پیش‌فرض fa؛ سوییچ زبان؛ dir صحیح.
4) قرارداد خطای Nest: code → پیام i18n در shared/api.
5) اگر locale روی User ذخیره می‌شود: migration PostgreSQL + API + docs.
6) Vite/i18next موازی نساز مگر rule صریح قبلی — یک سیستم فقط.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
