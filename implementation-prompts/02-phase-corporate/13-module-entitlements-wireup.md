# P02-T13 — اتصال ماژول‌ها به پلن و UI ادیتور

## هدف
هم‌ترازی کامل: پلن/ماژول خریداری‌شده → entitlements → نمایش بلوک‌ها در editor و deny API.

## پیش‌نیاز
- همه ماژول‌های 06–08 و Billing Core

## پرامپت اجرا

```
طبق EntitlementGuard و کاتالوگ پلن عمل کن.

تسک: wire-up ماژول‌های Corporate به Billing و Editor را تمام کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) اطمینان seeder پلن‌ها ماژول‌های map/org_chart/timeline/projects را دارد.
3) Editor فقط بلوک‌های مجاز را نشان دهد؛ API ذخیره/export ماژول قفل را 403 کند.
4) CTA ارتقا در UI؛ i18n.
5) تست‌های deny/allow؛ docs.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
