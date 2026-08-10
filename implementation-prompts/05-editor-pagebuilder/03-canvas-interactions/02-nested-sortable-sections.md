# P05-T03-02 — Sortable تودرتو داخل Section

## هدف
جابجایی بلوک‌ها فقط در سطح صفحه نباشد: **children داخل `section`** هم با DnD عمودی مرتب شوند؛ در صورت امکان جابجایی بین سطح صفحه و داخل section (عمق یک‌سطح section برای MVP این تسک کافی است مگر store از قبل عمیق‌تر است).

## پیش‌نیاز
- `01-palette-drag-onto-canvas.md` (ترجیحی؛ حداقل sortable فعلی top-level)
- `FlowCanvas` + `section.children`
- ADR columns (فاز 05) را اینجا پیاده نکن — فقط section

## دامنه Full-Stack
- Frontend + store tree mutations با undo
- Schema: نقض nesting ممنوع را در UI منع کن
- Docs: اگر رفتار IA لایه‌ها عوض شد یک خط آپدیت

## معیار تموم شدن (DoD)
- [ ] children section sortable مستقل یا nested context صحیح
- [ ] reorder داخل section → undo
- [ ] انتخاب بلوک فرزند در canvas و layers همگام
- [ ] حذف/قفل‌ها مثل قبل
- [ ] عملکرد قابل قبول تا ده‌ها بلوک (بدون freeze)
- [ ] بدون absolute positioning

## پرامپت اجرا

```
طبق flow editor rules و dnd-kit best practices برای nested sortable عمل کن.

تسک: DnD تودرتو برای children مربوط به section را پیاده کن.

الزامات:
1) تحلیل محدودیت sortable فعلی (فقط top-level) + تسک‌لیست.
2) رندر بازگشتی section: لیست children با SortableContext جدا یا الگوی nested رسمی dnd-kit.
3) Store: `reorderBlocks(parentId | null, activeId, overId)` یا معادل امن روی صفحهٔ فعال.
4) جابجایی از top-level به داخل section و برعکس اگر بدون باگ پیچیدگی‌اش معقول است؛ وگرنه فقط reorder داخل هر ظرف + در خلاصه محدودیت را بنویس و تسک follow-up پیشنهاد بده.
5) Visual: تورفتگی children تا سلسله‌مراتب دیده شود (هم‌تراز selection chrome تسک 03).
6) repeater.children اگر در editor امروز قابل ویرایش است، همان الگو را با احتیاط اعمال کن یا صریحاً out of scope بگو (nested repeater طبق محصول unsupported است — ویرایش کارت قالب اگر هست حفظ شود).
7) i18n/theme؛ disabled وقتی locked.
8) ستون/row فاز 05 را پیاده‌سازی نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
