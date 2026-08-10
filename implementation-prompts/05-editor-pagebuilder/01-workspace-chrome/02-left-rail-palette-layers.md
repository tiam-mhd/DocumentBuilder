# P05-T01-02 — ریل چپ: پالت + درخت لایه‌ها

## هدف
ریل چپ را به دو سطح اصلی **Palette** و **Layers** ارتقا بده: پالت قابل جستجو/گروه‌بندی، و درخت ساختار صفحه→بلوک با انتخاب همگام با canvas — پایهٔ حس صفحه‌ساز.

## پیش‌نیاز
- `01-workspace-shell-layout.md`
- `block-palette.tsx`، `flow-canvas.tsx`، `store/editor-store.ts`
- Registry: `GET .../blocks` / entitlement فیلتر موجود

## دامنه Full-Stack
- Database: ندارد
- Backend: فقط در صورت نیاز endpoint سبک برای درخت از body فعلی لازم نیست — از store بخوان
- Frontend: `editor-left-rail.tsx` (یا معادل)، ارتقای palette، کامپوننت layers tree
- Docs: رفتار layers در IA اگر تفاوت دارد به‌روز کن
- i18n: کلیدها

## معیار تموم شدن (DoD)
- [ ] سوییچ/تب Left: Palette | Layers
- [ ] Palette: جستجو، گروه core در برابر module، قفل module با CTA ارتقا (رفتار موجود حفظ/بهتر)
- [ ] Layers: درخت خوانا؛ کلیک → `selectedBlockId`؛ بلوک انتخاب‌شده در درخت highlight
- [ ] برای documents چند صفحه‌ای: گروه‌بندی بر اساس `pages[]` (حداقل نمایش)
- [ ] افزودن بلوک از پالت مثل قبل کار کند (کلیک)؛ درگ به بوم می‌تواند فاز 03 باشد — اگر آسان است bonus، اجباری نیست
- [ ] RTL و تم‌ها
- [ ] بدون نمایش type خام فنی به‌عنوان تنها برچسب؛ از label i18n استفاده کن (type را می‌توان secondary نشان داد)

## پرامپت اجرا

```
طبق rules صفحه‌ساز و IA عمل کن. پیش‌نیاز: shell سه‌ناحیه از P05-T01-01.

تسک: ریل چپ Palette + Layers را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) Left rail را با دو حالت Palette و Layers بساز (تب یا segmented control).
3) Palette:
   - ورودی جستجو روی نام ترجمه‌شده بلوک
   - گروه‌بندی منطقی (متن و ساختار / رسانه / داده / ماژول‌ها)
   - moduleهای بدون entitlement: disabled + ModuleUpgradeCta یا معادل موجود
   - افزودن بلوک به صفحهٔ فعال (رفتار فعلی append را حفظ یا واضح‌تر کن)
4) Layers:
   - از body store درخت بساز: pages → blocks (و children section)
   - آیکون/برچسب نوع ترجمه‌شده
   - کلیک انتخاب؛ اسکرول به آیتم انتخاب‌شده وقتی از canvas انتخاب می‌شود (best-effort)
   - اگر bodyLocked یا !writable: درخت فقط‌خواندنی
5) دسترس‌پذیری پایه: role tree یا list + keyboard focus در حد معقول MVP.
6) i18n fa+en؛ dark/light.
7) nested DnD و columns UI را به فازهای بعد واگذار کن.
8) API جدید لازم نیست مگر کشف باگ IDOR — آن را جدا گزارش/رفع کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
