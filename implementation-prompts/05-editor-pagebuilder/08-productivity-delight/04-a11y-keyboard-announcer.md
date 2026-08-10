# P05-T08-04 — دسترس‌پذیری کیبورد و Live Announcer

## هدف
مسیرهای اصلی ادیتور با کیبورد قابل استفاده باشند و تغییرات مهم (انتخاب بلوک، ذخیره، خطا، اتمام PDF preview) برای screen reader از طریق **aria-live** اعلام شوند.

## پیش‌نیاز
- Layers tree؛ command palette؛ hotkeys فاز 03
- روبریک Inclusive UX

## دامنه Full-Stack
- Frontend a11y
- Docs: بخش a11y در UX shortcuts یا QA checklist پیوند

## معیار تموم شدن (DoD)
- [ ] Tab order منطقی در top bar → rails → canvas
- [ ] درخت لایه‌ها با فلش‌های کیبورد (حداقل بالا/پایین/enter)
- [ ] `aria-live="polite"` برای saveStatus و انتخاب بلوک (throttle)
- [ ] دکمه‌ها نام دسترس‌پذیر دارند (نه فقط آیکون)
- [ ] focus visible در هر دو تم
- [ ] تست دستی با keyboard-only سناریوی افزودن متن و ذخیره

## پرامپت اجرا

```
طبق WCAG ذهنیت معقول MVP و next-intl عمل کن. ممیزی کامل axe اجباری نیست ولی نقض‌های واضح را رفع کن.

تسک: a11y کیبورد و announcer ادیتور را پیاده کن.

الزامات:
1) تحلیل نقش‌های ARIA فعلی + تسک‌لیست.
2) EditorAnnouncer یا region ثابت در shell.
3) اعلام: block selected (نام ترجمه‌شده)، saved، save failed، pdf preview completed/failed.
4) Throttle اعلام انتخاب هنگام پیمایش سریع.
5) Palette و command palette: listbox/option یا الگوی معادل.
6) لینک‌های i18n برای aria-label آیکون‌های top bar.
7) با coach marks و modalها focus restore درست.
8) محتوا/متن سند را در announcer کامل نخوان (حریم و شلوغی).

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
