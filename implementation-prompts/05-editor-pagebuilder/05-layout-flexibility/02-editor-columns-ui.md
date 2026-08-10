# P05-T05-02 — UI ساخت و تنظیم ستون در بوم و Inspector

## هدف
کاربر بتواند ردیف چندستونه بسازد، عرض ستون‌ها را تنظیم کند، و داخل ستون‌ها بلوک بگذارد/جابه‌جا کند — حس انعطاف Elementor در چارچوب flow.

## پیش‌نیاز
- `01-schema-columns-row-block.md`
- فاز 03: palette DnD + nested sortable (الگو را برای column children گسترش بده)
- فاز 04: قاب inspector

## دامنه Full-Stack
- Frontend: palette entry، canvas chrome برای row/columns، inspector Design برای widths
- Store: insert row preset، update column widths، DnD into column
- Backend: ذخیره body همان PATCH؛ validate سرور از schema
- i18n

## معیار تموم شدن (DoD)
- [ ] افزودن row از پالت (مثلاً پیش‌فرض ۲ ستون)
- [ ] نمایش ستون‌ها روی canvas با تورفتگی/جداکنندهٔ واضح
- [ ] تنظیم عرض (slider یا نسبت‌های از پیش: 50/50، 33/67، …)
- [ ] drop/sort داخل هر column
- [ ] Layers درخت row→column→children را نشان می‌دهد
- [ ] undo؛ قفل‌ها؛ RTL: ترتیب ستون‌ها درست (logical start)
- [ ] بدون drag آزاد x/y روی صفحه

## پرامپت اجرا

```
طبق ADR ستون‌ها و تعامل بوم فاز 03 عمل کن. پیش‌نیاز schema.

تسک: UI ادیتور برای ساخت/تنظیم row-columns را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) Palette: بلوک row (و اگر column جدا در پالت نیست، فقط از داخل row مدیریت شود طبق ADR).
3) Canvas: row به‌صورت افقی flex/grid CSS در chrome ادیتور؛ هر column droppable+sortable.
4) Inspector Design روی row: تعداد ستون (افزودن/حذف با confirm اگر محتوا دارد)، presets عرض، ورودی دقیق اختیاری.
5) حذف column غیرخالی: confirm؛ حداقل ۱ یا ۲ ستون طبق ADR.
6) RTL: columns از سمت شروع منطقی؛ در PDF بعداً همان منطق.
7) i18n fa+en؛ selection chrome برچسب «ردیف/ستون».
8) presets کتابخانهٔ غنی تسک 04 است — اینجا حداقل یکی دو preset کافی است.
9) renderer نهایی را کامل فرض نکن؛ اگر HTML خام ستون ندارد، حداقل canvas edit درست باشد و تسک 03 را متوقف نکن — ولی ideally یک CSS موقت مشترک.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
