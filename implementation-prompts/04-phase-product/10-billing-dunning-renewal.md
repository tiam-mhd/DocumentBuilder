# P04-T10 — تمدید، یادآوری، Dunning

## هدف
یادآوری انقضای اشتراک، grace، تلاش مجدد پرداخت، پیامک/ایمیل وضعیت.

## پرامپت اجرا

```
طبق Billing ops و Redis scheduler/cron Nest عمل کن.

تسک: Renewal و Dunning را Full-Stack پیاده کن.

الزامات:
1) تحلیل stateها + تسک‌لیست.
2) Jobهای روزانه بررسی endsAt؛ ورود به grace/expired؛ نوتیفیکیشن SMS adapter.
3) UI وضعیت و تمدید؛ docs؛ تست زمان‌بندی با clock fake.
4) بدون حذف داده بعد از انقضا.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
