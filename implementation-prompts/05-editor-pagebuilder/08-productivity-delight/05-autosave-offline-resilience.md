# P05-T08-05 — تاب‌آوری Autosave و شبکه

## هدف
کاربر هنگام قطعی شبکه یا خطای سرور احساس امنیت کند: بنر واضح، صف/تلاش مجدد، جلوگیری از overwrite خاموش، و در حد MVP نگهداری آخرین draft محلی کوتاه‌مدت.

## پیش‌نیاز
- `use-editor-autosave.ts`؛ بنرهای قفل فاز 01
- API PATCH documents

## دامنه Full-Stack
- Frontend: online/offline detection، retry، optional localStorage draft
- Backend: فقط اگر کد خطای بهتر لازم است + docs/api
- هشدار conflict اگر نسخهٔ سرور جدیدتر است (اگر updatedAt دارید)

## معیار تموم شدن (DoD)
- [ ] `navigator.onLine` / رویداد online-offline → بنر
- [ ] save error: Retry دکمه؛ عدم ناپدید شدن خاموش
- [ ] local backup اختیاری keyed by documentId+businessId؛ پاکسازی بعد از save موفق
- [ ] هشدار قبل از unload اگر pending dirty (beforeunload)
- [ ] bodyLock همچنان autosave را قطع می‌کند
- [ ] i18n؛ بدون ذخیرهٔ رمز/OTP در localStorage
- [ ] محتوای local encrypted نیست — فقط هشدار در docs که device-local است

## پرامپت اجرا

```
طبق ادیتور autosave و اعتماد کاربر عمل کن. سرویس sync پیچیده نساز.

تسک: تاب‌آوری ذخیره و شبکه را برای ادیتور پیاده کن.

الزامات:
1) تحلیل use-editor-autosave + تسک‌لیست.
2) حالت‌های UI: saving / saved / offline / error / pendingRetry.
3) Retry با backoff کوتاه؛ حداکثر N تلاش سپس دستی.
4) localStorage draft: debounce نوشتن؛ سقف حجم؛ ignore اگر schemaVersion ناسازگار.
5) beforeunload وقتی dirty یا save in-flight.
6) اگر API conflict code دارد، پیام «نسخهٔ جدیدتر روی سرور» + CTA reload — بدون merge خودکار خطرناک.
7) i18n fa+en؛ تست DevTools offline.
8) PDF/telemetry جدا.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
