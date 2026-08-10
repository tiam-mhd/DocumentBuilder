# P05-T03-01 — درگ از پالت روی بوم (محل درج)

## هدف
کاربر بتواند بلوک را از **Palette** روی canvas بکشد و در یک **drop target** معتبر رها کند (بین بلوک‌های صفحهٔ فعال یا داخل section) — نه فقط کلیک «افزودن به انتها».

## پیش‌نیاز
- فاز 01: left rail palette + layers؛ فاز 02: `activePageId` / paper frame (اگر نیست، روی صفحهٔ اول کار کن و در خلاصه بگو)
- `block-palette.tsx`، `flow-canvas.tsx`، store: `addBlock` / `appendChildBlock`
- `@dnd-kit` از قبل در پروژه
- قوانین: flow فقط — بدون x/y آزاد؛ rule صفحه‌ساز 29

## دامنه Full-Stack
- Database/Backend: ندارد
- Frontend: draggable palette items + droppable indicators روی canvas؛ store API برای insert at index / into parent
- Shared: در صورت نیاز helper درج در درخت بلوک بدون فساد schema
- i18n: پیام‌های drop غیرمجاز

## معیار تموم شدن (DoD)
- [ ] درگ از پالت با پیش‌نمایش ghost ساده
- [ ] نشانگر محل درج بین ردیف‌های صفحهٔ فعال
- [ ] drop داخل section (اگر type مجاز child است) یا append به children
- [ ] drop غیرمجاز (مثلاً داخل text) feedback واضح / no-op
- [ ] کلیک افزودن قبلی همچنان کار می‌کند
- [ ] undo؛ bodyLock/!writable غیرفعال
- [ ] module قفل‌شده از پالت draggable نیست
- [ ] dark/light + fa/en؛ reduced-motion: بدون انیمیشن اغراق‌آمیز

## پرامپت اجرا

```
طبق `.cursor/rules/` ادیتور (flow، بدون free-canvas) و کروم فاز 01 عمل کن.

تسک: درگ از پالت به بوم با drop indicator را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ تصمیم DnD: یک DndContext مشترک palette+canvas یا دو context هماهنگ — از conflict با sortable موجود جلوگیری کن.
2) Palette itemها `useDraggable` (یا معادل) با data: `{ type, from: 'palette' }`.
3) Canvas: droppable slots بین بلوک‌ها + droppable روی section containers.
4) Store: متدهایی مثل `insertBlockAt(pageId, index, type)` و استفاده از `appendChildBlock` برای section؛ id جدید پایدار.
5) فقط typeهای registry و entitlement مجاز.
6) headerSlot/footerSlot و محدودیت‌های schema را رعایت کن (اگر drop نقض superRefine است، اجازه نده).
7) i18n برای aria و خطاهای drop.
8) columns/row اگر هنوز در schema نیست، فرض نکن — فقط section.children و top-level page blocks.
9) تست دستی: درگ text بین دو بلوک؛ درگ به داخل section؛ تلاش drop نامعتبر.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
