# P04-T02 — RBAC ریزدانه

## هدف
Permissionهای ریز: Manage Templates، Manage Data، Export PDF، Manage Fonts/Media، Publish، Manage Billing.

## پرامپت اجرا

```
طبق Permissions عمل کن؛ همه را در Nest Guard enforce کن نه فقط UI.

تسک: RBAC ریزدانه را Full-Stack روی نقش‌ها پیاده کن.

الزامات:
1) تحلیل ماتریس نقش×permission + تسک‌لیست.
2) پیاده‌سازی در Entitlement/Permission layer جدا از module entitlements ولی سازگار.
3) تست deny برای Viewer روی export/mutate.
4) UI مخفی/disable؛ docs؛ i18n.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
