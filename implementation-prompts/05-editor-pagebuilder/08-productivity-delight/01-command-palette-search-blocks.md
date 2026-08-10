# P05-T08-01 — Command Palette و جستجوی سریع بلوک/دستور

## هدف
یک **Command Palette** (Ctrl/Cmd+K) برای جستجوی بلوک‌ها، دستورات (undo، preview modes، duplicate، …) و پرش به پنل‌ها — تا کاربر حرفه‌ای بدون گشتن در UI کار کند.

## پیش‌نیاز
- کروم فاز 01؛ شورتکات‌های فاز 03؛ پالت لایه‌ها
- i18n editor keys موجود

## دامنه Full-Stack
- Frontend: `editor-command-palette.tsx` + registry دستورات
- Docs: ردیف در `docs/ux/editor-shortcuts.md`
- Backend: ندارد

## معیار تموم شدن (DoD)
- [ ] باز/بسته با Ctrl/Cmd+K و Escape
- [ ] جستجوی فازی روی نام ترجمه‌شده بلوک + دستورات
- [ ] اجرای دستور: افزودن بلوک، سوییچ mode، focus layers، باز کردن page settings
- [ ] module قفل‌شده در نتایج با نشانهٔ قفل / CTA
- [ ] در inputهای متنی تداخل مخرب نباشد (فقط وقتی shell ادیتور فوکوس است یا با capture هوشمند)
- [ ] dark/light؛ fa/en؛ a11y listbox

## پرامپت اجرا

```
طبق صفحه‌ساز UX و میانبرهای موجود عمل کن. وابستگی سنگین به کتابخانهٔ جدید فقط اگر سبک و موجه است — در غیر این صورت UI خودمان.

تسک: Command Palette ادیتور را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ فهرست دستورات MVP (حداکثر ~20) را قفل کن.
2) Modal مرکز صفحه؛ input جستجو؛ نتایج کیبورد↑↓ Enter.
3) گروه‌بندی: Blocks / Edit / View / Document.
4) افزودن بلوک از نتیجه = همان مسیر store که پالت استفاده می‌کند + entitlement check.
5) سند میانبر Cmd+K را آپدیت کن.
6) bodyLock: دستورات mutation را نشان بده ولی disable با دلیل.
7) PDF enqueue از palette نساز مگر دستور صریح «PDF Preview» که به mode می‌رود.
8) i18n کامل.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
