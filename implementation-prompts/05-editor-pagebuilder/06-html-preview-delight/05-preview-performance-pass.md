# P05-T06-05 — گذر عملکرد Preview (Performance Pass)

## هدف
روی سند متوسط (چند صفحه، repeater، نقشه) HTML preview و سوییچ mode بدون جلق محسوس بماند: کاهش re-paginate بی‌مورد، memo، تعویق کار سنگین، و جلوگیری از fetch تکراری collections.

## پیش‌نیاز
- `use-paginated-preview-body.ts`، binding/visibility hooks
- تسک‌های ۰۱–۰۴ همین فاز ترجیحاً merge شده
- rule 26 hardening ذهنیت هزینه

## دامنه Full-Stack
- Frontend performance
- اختیاری: debounce paginate؛ React compiler/memo مطابق الگوی ریپو (بدون useMemo اجباری بی‌دلیل اگر تیم compiler دارد — از الگوی موجود پیروی کن)
- Docs: نکته در delight rubric یا QA دربارهٔ اندازهٔ سند توصیه‌شده

## معیار تموم شدن (DoD)
- [ ] تغییر متن یک بلوک کل preview را بی‌دلیل از صفر با fetch همهٔ collections دوباره نسازد مگر source عوض شود
- [ ] سوییچ edit↔htmlPreview زیر ~300ms احساس برای سند نمونه (best-effort اندازه‌گیری دستی)
- [ ] map/org سنگین فقط وقتی بلوک可见/mounted است یا lazy
- [ ] بدون memory leak روی unmount (cancelled flags موجود را حفظ/تقویت)
- [ ] لیست کوتاه بهینه‌سازی‌ها در خلاصهٔ تموم شد

## پرامپت اجرا

```
طبق ADR 017 (تقریبی) و عملکرد ادیتور عمل کن. میکروبنچ مصنوعی اجباری نیست؛ شواهد دستی کافی است.

تسک: گذر عملکرد HTML preview را انجام بده.

الزامات:
1) پروفایل ذهنی/devtools: چه چیزی روی هر keystroke می‌سوزد؟ تسک‌لیست رفع.
2) وابستگی‌های useEffect paginate را تنگ‌تر کن (serialize پایدار page config + ساختار لازم نه کل object identity هر رندر اگر ممکن).
3) debounce کوتاه برای paginate بعد از edit (مثلاً 100–200ms) بدون احساس lag بد.
4) memo برای ردیف‌های بلوک preview یا مجازی‌سازی فقط اگر سند خیلی بلند است — پیچیدگی مجازی‌سازی را فقط با دلیل بیاور.
5) Map/Leaflet: یک instance؛ عدم init در edit mode اگر preview مخفی است.
6) مطمئن شو selection-sync و zoom بعد از بهینه‌سازی نشکنند.
7) PDF job اضافه نکن.
8) در خلاصه: قبل/بعد کیفی بنویس.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
