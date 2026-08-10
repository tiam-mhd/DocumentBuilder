# P05-T03-05 — دستورات Duplicate / Delete / Move با Undo

## هدف
دستورات صریح و قابل‌کشف برای **تکرار، حذف، جابجایی** بلوک انتخاب‌شده (از canvas chrome، layers context، و/یا command buttons) با تاریخچهٔ undo قابل‌اعتماد و بدون فساد درخت.

## پیش‌نیاز
- `02` nested reorder، `04` hotkeys
- `cloneBlocksWithNewIds` در document-schema در صورت وجود
- قفل‌ها و empty states فاز 01

## دامنه Full-Stack
- Frontend + store
- Shared: clone با idهای جدید برای زیر‌درخت (section children)
- Backend: ندارد مگر validate سمت سرور قبلاً کافی نباشد

## معیار تموم شدن (DoD)
- [ ] Duplicate: کپی زیر انتخاب با idهای جدید؛ انتخاب روی کپی
- [ ] Delete: با confirm اختیاری برای section غیرخالی؛ همیشه undoable
- [ ] Move up/down در UI دکمه + هم‌تراز hotkey
- [ ] عملیات از منوی سه‌نقطه روی ردیف و/یا نوار کوچک بالای selection
- [ ] Layers همگام
- [ ] headerSlot/footerSlot و بلوک‌های سیستمی اگر نباید حذف شوند — قانون صریح
- [ ] i18n؛ dark/light؛ locked disabled
- [ ] هیچ orphan child یا page خراب

## پرامپت اجرا

```
طبق document-schema (clone ids) و editor store قوانین undo عمل کن.

تسک: دستورات duplicate/delete/move را کامل و کاربرپسند پیاده کن.

الزامات:
1) تحلیل removeBlock/addBlock فعلی + تسک‌لیست.
2) `duplicateBlock(id)` در store: deep clone با idهای جدید برای کل زیر‌درخت؛ درج بلافاصله بعد از اصل در همان parent.
3) `moveBlock(id, direction: 'up'|'down')` در همان parent؛ no-op در مرز با feedback اختیاری.
4) Delete: اگر انتخاب section با children دارد، confirm i18n؛ slots را طبق قانون محصول محافظت کن (حذف ممنوع یا هشدار).
5) UI: دکمه‌های واضح روی selection chrome + آیتم در layers context menu (حداقل duplicate/delete).
6) همه وارد past/future undo شوند؛ یک عمل = یک entry.
7) داغ‌کلید Ctrl/Cmd+D برای duplicate اگر در 04 رزرو شده.
8) تست دستی: duplicate section تودرتو؛ undo؛ حذف؛ move؛ تلاش روی locked.
9) PDF/export را درگیر نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
