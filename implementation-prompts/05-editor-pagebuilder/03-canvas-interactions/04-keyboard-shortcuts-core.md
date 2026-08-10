# P05-T03-04 — شورتکات‌های هستهٔ بوم

## هدف
میانبرهای کیبورد ضروری صفحه‌ساز: undo/redo (اگر کامل نیست تقویت کن)، حذف، جابجایی بالا/پایین، Escape برای لغو انتخاب، و جلوگیری از تداخل با ورودی‌های متنی.

## پیش‌نیاز
- Selection chrome؛ store undo/remove/reorder
- Top bar undo/redo موجود

## دامنه Full-Stack
- Frontend: `use-editor-hotkeys.ts` یا معادل؛ ثبت فقط وقتی editor فوکوس/mount است نه کل اپ
- Docs: جدول شورتکات در `docs/ux/editor-pagebuilder-ia.md` یا فایل کوتاه `docs/ux/editor-shortcuts.md`
- i18n: اختیاری tooltip در UI «میانبرها»

## معیار تموم شدن (DoD)
- [ ] Ctrl/Cmd+Z undo؛ Ctrl/Cmd+Shift+Z یا Ctrl+Y redo
- [ ] Delete/Backspace حذف انتخاب وقتی فوکوس در input/textarea/contenteditable نیست
- [ ] Alt+↑ / Alt+↓ جابجایی یک پله در همان parent (یا معادل مستند)
- [ ] Escape → clear selection
- [ ] در bodyLock/!writable mutation hotkeys بی‌اثر
- [ ] سند میانبرها نوشته شده
- [ ] تداخل با browser shortcuts مخرب به حداقل رسیده

## پرامپت اجرا

```
طبق a11y و صفحه‌ساز UX عمل کن. کد فقط در features/editor (+docs ux).

تسک: شورتکات‌های هستهٔ بوم ادیتور را پیاده و مستند کن.

الزامات:
1) تحلیل + تسک‌لیست؛ فهرست نهایی میانبرهای MVP این تسک را قفل کن (زیاد نکن).
2) hook سراسری editor-shell وقتی mode=edit و سند loaded.
3) `event.target` را بررسی کن: INPUT/TEXTAREA/SELECT/contenteditable → Delete را بلع نکن.
4) به store commands وصل شو نه DOM hack.
5) Mac vs Windows modifier (metaKey/ctrlKey).
6) جدول در docs/ux بنویس (fa توضیح + کلیدها).
7) اختیاری: پنل کوچک «میانبرها» در منوی More — اجباری نیست.
8) duplicate را اگر در تسک 05 است اینجا کامل نکن مگر یک کلید رزرو مستند (مثلاً Ctrl+D) و پیاده‌سازی را به 05 پیوند بده.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
