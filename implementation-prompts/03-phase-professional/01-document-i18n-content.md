# P03-T01 — چندزبانه محتوای سند (fa/en)

## هدف
ترجمه فیلدهای Content و تولید Document/PDF به ازای locale سند (جدا از UI chrome i18n).

## پرامپت اجرا

```
طبق Multi-language محصول و جداسازی UI i18n از Document language عمل کن (Nest/Next/PG/Mongo).

تسک: چندزبانه محتوای Business و locale سند را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل ترجمه‌ها برای entities کلیدی (مثلاً JSONB locale map یا جدول translations) با businessId.
3) document.language / locale؛ رندر و export بر اساس آن.
4) UI مدیریت ترجمه + سوییچ زبان سند در editor.
5) docs/api؛ تست FA/EN export.
6) RTL/LTR خروجی مطابق زبان سند.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
