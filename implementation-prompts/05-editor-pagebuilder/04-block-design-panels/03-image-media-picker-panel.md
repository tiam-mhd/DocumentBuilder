# P05-T04-03 — پنل Image + انتخابگر Media Library

## هدف
بلوک `image` با انتخاب رسانه از **کتابخانهٔ Business** (نه فقط چسباندن id خام)، پیش‌نمایش بندانگشتی، alt/caption اگر در schema هست یا اضافهٔ سازگار، و کنترل‌های Design معقول (عرض/تراز) با تراز preview/PDF.

## پیش‌نیاز
- معماری تب‌ها
- API media list/upload موجود (`11-fonts`/`media` rules؛ مسیر features/media یا shared api)
- props فعلی image در schema

## دامنه Full-Stack
- Backend: معمولاً list media کافی است؛ اگر endpoint جستجو لازم است اضافه + docs/api
- Frontend: MediaPicker modal/drawer در ادیتور؛ entitlement writable
- Schema: altText/caption/fit اگر نیست و محصول لازم دارد — با version note
- i18n

## معیار تموم شدن (DoD)
- [ ] دکمه «انتخاب از کتابخانه» + نمایش thumb
- [ ] امکان پاک کردن تصویر
- [ ] عدم اجبار کاربر به تایپ UUID؛ اگر id دستی در Advanced می‌ماند اختیاری و مخفی‌تر
- [ ] alt (دسترس‌پذیری) در Content
- [ ] Design: عرض نسبی یا max width / align در صورت پشتیبانی renderer
- [ ] IDOR: فقط media همان businessId
- [ ] قفل‌ها؛ i18n؛ تم‌ها

## پرامپت اجرا

```
طبق قوانین media/tenancy و editor عمل کن.

تسک: پنل image با Media Library picker کاربرپسند را Full-Stack پیاده کن.

الزامات:
1) تحلیل props image فعلی و API media لیست.
2) MediaPicker: paginated، فیلتر تصویر، انتخاب → نوشتن storage/media id مطابق قرارداد موجود renderer.
3) Content: picker، alt، caption (اگر schema).
4) Design: کنترل‌های ظاهر که preview و PDF هر دو احترام بگذارند؛ اگر امروز فقط URL در HTML است، مسیر را کامل کن نه نیمه‌کاره.
5) Upload جدید از داخل picker اگر API upload موجود است — در غیر این صورت لینک به صفحه media + پیام.
6) docs/api اگر route جدید/عوض شد.
7) SVG خطرناک را طبق قوانین upload رد کن (از قبل باید باشد).
8) gallery را به تسک 05 واگذار کن ولی picker قابل‌reuse باشد.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
