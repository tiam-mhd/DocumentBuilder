# P00-T04 — سیستم تم دارک و لایت

## هدف
پیاده‌سازی theme provider با توکن‌های CSS برای Dark و Light در Next.js.

## پیش‌نیاز
- `00-foundation/03-web-nextjs-baseline.md`

## دامنه Full-Stack
- Database: اختیاری بعداً؛ فعلاً localStorage/cookie کافی است
- Backend: الزامی نیست مگر ذخیره ترجیح روی User
- Frontend: ThemeProvider + توکن‌ها + toggle
- Docs: ندارد

## معیار تموم شدن (DoD)
- [ ] هر دو تم روی shell درست‌اند
- [ ] Persist ترجیح کاربر
- [ ] پیش‌فرض system preference
- [ ] shared/ui از توکن استفاده می‌کند

## پرامپت اجرا

```
طبق `.cursor/rules/` به‌ویژه `10-theme-and-i18n.mdc` عمل کن.

تسک: سیستم تم Dark/Light را در apps/web (Next.js) پیاده‌سازی کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) CSS variables برای light/dark سازگار با App Router (بدون FOUC تا حد ممکن).
3) ThemeProvider + toggle در shell.
4) Persist (cookie یا localStorage — روش را ثابت کن).
5) رنگ هاردکد در features برای shell ممنوع؛ از توکن shared استفاده کن.
6) کلیدهای i18n دکمه تم را fa/en آماده کن (با تسک 05 هماهنگ).
7) اگر ترجیح را در Nest هم ذخیره می‌کنی: PostgreSQL + endpoint + docs/api هم‌زمان.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
