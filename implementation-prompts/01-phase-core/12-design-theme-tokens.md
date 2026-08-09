# P01-T12 — Design Theme Tokens (برند سند)

## هدف
Theme Engine سطح سند: رنگ‌ها، تایپوگرافی، توکن‌ها per-Business (جدا از تم UI اپ).

## پیش‌نیاز
- `11-font-manager.md`

## دامنه Full-Stack
- PostgreSQL: design_themes (یا JSONB توکن‌ها) + businessId
- Backend: DesignModule
- Frontend: ویرایشگر توکن برند
- Docs: docs/api

## معیار تموم شدن (DoD)
- [ ] توکن‌های primary/secondary/text/background/fonts/...
- [ ] اعمال توکن روی preview ساده
- [ ] اتصال اختیاری به font_faces
- [ ] fa/en + dark/light برای UI ابزار (نه لزوماً توکن چاپ)

## پرامپت اجرا

```
طبق `.cursor/rules/` Design / Theme Engine عمل کن (جدا از UI dark/light اپ).

تسک: Theme Tokens برند سند را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ مرز Theme سند vs Theme اپ را در کد واضح نگه دار.
2) مدل PostgreSQL برای themes و tokens (JSONB مجاز).
3) API CRUD؛ پیش‌فرض یک theme برای Business جدید.
4) Next: فرم توکن‌ها + preview نواری؛ i18n/theme UI.
5) packages/shared-types در صورت نیاز برای نام توکن‌ها.
6) docs/api به‌روز. Mongo برای theme لازم نیست مگر تصمیم مستند.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
