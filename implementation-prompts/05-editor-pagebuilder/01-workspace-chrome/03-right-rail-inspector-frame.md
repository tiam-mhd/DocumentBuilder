# P05-T01-03 — ریل راست: قاب Inspector با تب‌ها

## هدف
قاب پایدار **Right rail Inspector** با تب‌های `Content | Design | Advanced` بساز و فیلدهای فعلی `block-inspector` را بدون از دست رفتن قابلیت به این تب‌ها منتقل کن — عمق طراحی جدید (spacing کامل و …) در فاز 04 است؛ اینجا فقط **قاب + جابجایی منطقی**.

## پیش‌نیاز
- `01-workspace-shell-layout.md`
- `block-inspector.tsx` + فیلدهای وابسته (`binding-insert-field`, `visibility-condition-fields`, `break-rules-fields`, `block-link-fields`)

## دامنه Full-Stack
- Database/Backend: ندارد
- Frontend: بازآرایی inspector؛ state تب در store یا local
- وقتی هیچ بلوکی انتخاب نشده: پنل «Document / Page» خلاصه (عنوان راهنما + CTA انتخاب بلوک؛ تنظیمات صفحهٔ عمیق → فاز 02)
- i18n

## معیار تموم شدن (DoD)
- [ ] تب‌های Content / Design / Advanced با i18n
- [ ] Content: props محتوایی اصلی هر type (متن، src، …) همان قابلیت فعلی
- [ ] Design: هرچه امروز ظاهر است (سایز QR، …)؛ اگر خالی است empty state «به‌زودی در فاز طراحی» نه بن‌بست گیج‌کننده — یا فیلدهای موجود ظاهر را اینجا بگذار
- [ ] Advanced: link، when، breakRules
- [ ] بدون انتخاب بلوک: حالت خالی مفید
- [ ] bodyLocked: inputs disabled
- [ ] رگرسیون: ذخیرهٔ props همچنان store → autosave

## پرامپت اجرا

```
طبق rules و IA عمل کن. پیش‌نیاز shell سه‌ناحیه.

تسک: قاب Right rail Inspector با تب‌های Content | Design | Advanced را پیاده کن و inspector فعلی را مهاجرت بده.

الزامات:
1) تحلیل + تسک‌لیست؛ نقشهٔ «هر فیلد فعلی → کدام تب».
2) UI تب‌دار پایدار در right rail؛ عرض مناسب؛ اسکرول داخلی.
3) منطق per-type موجود را حذف نکن — فقط سازماندهی کن.
4) Advanced همیشه شامل (در صورت وجود در کد امروز): block link، visibility when، breakRules.
5) اگر برای typeی Design خالی است، پیام کوتاه + لینک ذهنی به فاز بعد (نه TODO در UI تولیدی؛ copy کاربرپسند).
6) Empty state بدون selection: توضیح «یک بلوک از بوم یا لایه‌ها انتخاب کنید» + در صورت امکان خلاصه عنوان سند.
7) i18n fa+en؛ dark/light؛ RTL.
8) schema و API را تغییر نده مگر باگ واضح validation.
9) page size controls را اینجا کامل نکن (فاز 02).

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
