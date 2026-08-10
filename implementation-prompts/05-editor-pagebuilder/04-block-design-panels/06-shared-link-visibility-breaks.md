# P05-T04-06 — Advanced مشترک: Link / Visibility / Break rules

## هدف
تب **Advanced** برای (تقریباً) همهٔ بلوک‌ها یک تجربهٔ یکپارچه باشد: لینک قابل‌کلیک، شرط نمایش `when`، و قواعد شکست صفحه — با توضیح plain-language و مثال کوتاه.

## پیش‌نیاز
- ADR 014 visibility، 017 breakRules، 018 links
- کامپوننت‌های `block-link-fields`، `visibility-condition-fields`، `break-rules-fields`
- تب Advanced از معماری 01

## دامنه Full-Stack
- Frontend UX بازنویسی/جلای فیلدهای موجود
- Schema معمولاً بدون تغییر؛ اگر UX به enum جدید نیاز دارد هم‌تراز کن
- Docs UX: یک صفحهٔ کوتاه «Advanced چیست؟»

## معیار تموم شدن (DoD)
- [ ] Link: نوع external/email/phone/internal با راهنما؛ preview نشان نمی‌دهد clickbait خطرناک
- [ ] when: exists/empty/eq با انتخاب path از گزینه‌ها نه typing کور؛ توضیح «چه زمانی مخفی می‌شود»
- [ ] breakRules: keepTogether / pageBreakBefore و … با آیکون/جملهٔ انسانی
- [ ] روی typeهایی که معنا ندارد (مثلاً slots) مخفی یا disable با دلیل
- [ ] i18n؛ همگام preview (مخفی شدن بلوک در HTML preview)
- [ ] بدون AND/OR درخت پیچیده (غیرهدف ADR 014)

## پرامپت اجرا

```
طبق ADR 014/017/018 عمل کن. منطق را از نو اختراع نکن — UX را صفحه‌ساز کن.

تسک: تب Advanced مشترک link/when/breakRules را یکپارچه و فهمیدنی کن.

الزامات:
1) تحلیل سه کامپوننت فعلی + تسک‌لیست.
2) آن‌ها را زیر Advanced با جداکنندهٔ بصری بخش‌ها بگذار؛ هر بخش عنوان+یک جمله توضیح.
3) Visibility: path picker محدود به collection.* مجاز؛ op محدود؛ value فقط وقتی eq.
4) Link: validate ساده (url/email) با پیام i18n.
5) Break rules: از اصطلاح چاپ ترسناک کم کن؛ «این بلوک با هم بماند» بهتر از jargon.
6) اعمال به canvas/preview: isBlockVisible از قبل — مطمئن شو inspector تغییر when فوراً در preview اثر دارد.
7) docs/ux کوتاه؛ fa+en.
8) فرمول‌های پیچیده و rule engine نساز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
