# P01-T19 — E2E قیف SELF_HOSTED (Install → License → Export)

## هدف
اثبات Edition=SELF_HOSTED: لایسنس نصب + همان هسته سند/PDF.

## پیش‌نیاز
- `09-license-self-hosted.md`
- `17-pdf-export-pipeline.md`
- ترجیحاً بعد از `18-e2e-saas-funnel.md`

## دامنه Full-Stack
- env APP_EDITION=SELF_HOSTED
- تست/اسکریپت فعال‌سازی لایسنس + export
- Docs: acceptance SELF_HOSTED

## معیار تموم شدن (DoD)
- [ ] بدون لایسنس عملیات حساس قفل
- [ ] با لایسنس معتبر مسیر سند→PDF باز است
- [ ] SAAS behavior در این حالت لازم نیست و تداخل ندارد
- [ ] چک‌لیست پذیرش مستند

## پرامپت اجرا

```
طبق Dual Deployment و معیار خروج Core برای SELF_HOSTED عمل کن.

تسک: E2E قیف Install→License→Export را پیاده/اتومات و مستند کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) سناریو: APP_EDITION=SELF_HOSTED، deny بدون license، activate license، OTP/user، business، document، export.pdf.
3) تفاوت Signup عمومی SAAS را در assertionها پوشش بده.
4) docs/qa/phase-01-self-hosted-acceptance.md + اشاره در docs/deploy.
5) یک Core — بدون فورک کد.

پایان: اگر کل فاز 01 از نظر کاتالوگ+پذیرش آماده است صریح بگو؛ وگرنه تموم نشد + مرحله بعدی.
```
