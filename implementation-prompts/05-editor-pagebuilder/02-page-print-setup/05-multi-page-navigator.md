# P05-T02-05 — ناوبری و مدیریت چند صفحه (`pages[]`)

## هدف
کاربر بتواند صفحات منطقی سند (`body.pages[]`) را ببیند، بین آن‌ها جابه‌جا شود، صفحه اضافه/حذف/جابه‌جا کند (با undo)، و master انتسابی را در حد UI موجود ببیند — هم‌تراز schema v3 masters/pages.

## پیش‌نیاز
- Paper frame و page config (۰۱–۰۳)
- `MasterPanel` موجود؛ ADR 006
- editor store، layers (فاز 01)
- قفل body و writable

## دامنه Full-Stack
- Backend: معمولاً ندارد (body یکپارچه PATCH می‌شود)؛ validate حذف آخرین صفحه را در schema/service منع کن اگر لازم است
- Frontend: page navigator زیر canvas یا top bar؛ عملیات add/duplicate/delete/reorder
- Shared: helperهای امن برای mutate pages با id جدید
- Docs: اگر قانون «حداقل یک صفحه» جدید است در rule/ADR کوتاه

## معیار تموم شدن (DoD)
- [ ] نشان‌دادن لیست/نوار صفحات با شمارهٔ ۱-based کاربرپسند
- [ ] انتخاب صفحهٔ فعال → canvas روی بلوک‌های همان صفحه
- [ ] افزودن صفحه (با master پیش‌فرض معقول)
- [ ] حذف صفحه با confirm اگر خالی نیست؛ ممنوعیت حذف تنها صفحه
- [ ] جابجایی ترتیب صفحات (دکمه یا DnD ساده روی navigator)
- [ ] undo/redo برای این عملیات‌ها
- [ ] Layers (فاز 01) با صفحهٔ فعال هم‌خوان
- [ ] i18n؛ قفل‌ها؛ بدون نشان دادن id خام به‌عنوان تنها برچسب (id می‌تواند secondary باشد)

## پرامپت اجرا

```
طبق ADR 006 (masters/pages) و document-schema v3 و rules ادیتور عمل کن.

تسک: ناوبری و مدیریت چندصفحه را در صفحه‌ساز پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ مدل «صفحهٔ فعال» را در editor store اضافه کن (`activePageId`) با پیش‌فرض اولین صفحه.
2) UI navigator: نوار افقی زیر top bar یا بالای paper — شماره صفحه، افزودن، منوی صفحه (duplicate/delete/move).
3) FlowCanvas و Layers فقط روی `activePage` تمرکز کنند (یا همه را نشان بدهند ولی scroll-into-view — یکی را انتخاب و ثابت کن؛ پیشنهاد: تمرکز روی active).
4) addPage: id جدید، masterId از master پیش‌فرض یا master صفحهٔ جاری، blocks شروع خالی یا یک section خالی مطابق createEmpty الگو.
5) deletePage: confirm؛ اگر length===1 خطا کاربرپسند.
6) reorder pages با undo.
7) انتساب master: اگر MasterPanel جدا است، از navigator به همان پنل deep-link/باز کردن؛ منطق master را duplicate کامل نکن مگر لازم.
8) pagination منطقی TOC (ADR 012) را نشکن — شماره صفحات logical همان index pages است؛ در UI شمارهٔ نمایش ۱-based.
9) i18n fa+en؛ dark/light؛ writable/bodyLock.
10) PDF preview جاب نساز؛ فقط body درست بماند برای export بعدی.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
