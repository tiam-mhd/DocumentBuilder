# P02-T07 — Organization Chart (`module.org_chart`)

## هدف
موتور چارت سازمانی از روی Team + روابط والد/فرزند؛ layouts متنوع پایه.

## پیش‌نیاز
- Team members

## پرامپت اجرا

```
طبق module.org_chart عمل کن (Nest/Next؛ داده در PG؛ رندر در editor/PDF).

تسک: Organization Chart Engine را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل رابطه گزارش‌دهی (parentMemberId) یا ساختار درخت جدا با businessId.
3) Block org_chart + layouts: tree vertical/horizontal حداقل.
4) EntitlementGuard؛ UI ویرایش ساختار (drag اختیاری فاز بعد اگر سنگین است — حداقل فرم parent).
5) Preview + مسیر رندر PDF (SVG/HTML).
6) docs/api + schema؛ i18n/theme.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
