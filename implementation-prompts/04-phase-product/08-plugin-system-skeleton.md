# P04-T08 — اسکلت Plugin / Extension

## هدف
قرارداد ثبت بلاک/ماژول خارجی بدون خراب کردن Core (registry + manifest).

## پرامپت اجرا

```
طبق Plugin System معماری عمل کن — Skeleton کافی است برای GA اگر مستند و امن باشد.

تسک: اسکلت Plugin/Extension را طراحی و پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ manifest (id، version، blocks، moduleCode).
2) بارگذاری پلاگین‌های داخلی first-party از پوشه packages/plugins یا modules.
3) Unknown block در renderer fail-safe.
4) امنیت: بدون eval کد کاربر در MVP؛ فقط پلاگین امضاشده/داخلی.
5) docs/adr + در صورت قانون سراسری آپدیت rules.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
