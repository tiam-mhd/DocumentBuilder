# P05-T06-02 — همگامی انتخاب: Preview ↔ بلوک

## هدف
کلیک روی المان در HTML preview همان بلوک را در store انتخاب کند؛ و با انتخاب از Layers/canvas، preview به همان لنگر اسکرول شود — حلقهٔ بازخورد صفحه‌ساز.

## پیش‌نیاز
- `01-html-preview-mode-canvas.md`
- `blockAnchorId` در document-schema؛ لینک‌های داخلی ADR 018
- Layers + selectedBlockId

## دامنه Full-Stack
- Frontend: data-block-id روی wrapperهای preview؛ handlers کلیک؛ scrollIntoView
- Shared: اگر لازم است helper لنگر یکسان با PDF
- i18n aria

## معیار تموم شدن (DoD)
- [ ] هر بلوک قابل‌مشاهده در preview دارای لنگر/شناسه پایدار
- [ ] کلیک (بدون باز کردن لینک خارجی ناخواسته با modifier) → selectBlock
- [ ] تغییر selection از بیرون → scroll و highlight موقت در preview
- [ ] کلیک روی لینک واقعی: Ctrl/Cmd+click یا حالت جدا؛ پیش‌فرض انتخاب بلوک نه ترک صفحه
- [ ] بلوک‌های مخفی when انتخاب‌پذیر از preview نیستند
- [ ] performance روی ده‌ها بلوک قابل قبول

## پرامپت اجرا

```
طبق blockAnchorId و صفحه‌ساز UX عمل کن. پیش‌نیاز stage HTML preview.

تسک: همگامی دوطرفه selection بین HTML preview و editor store را پیاده کن.

الزامات:
1) تحلیل renderBlock فعلی + تسک‌لیست.
2) روی wrapper هر بلوک: data-block-id={id} و id={blockAnchorId(id)} در صورت سازگاری با TOC.
3) onClick capture روی سطح preview: نزدیک‌ترین [data-block-id] را select کن؛ stop روی کنترل‌های تعاملی داخلی map اگر لازم.
4) لینک‌ها: جلوگیری از navigation پیش‌فرض در preview mode مگر کاربر صریحاً «باز کردن لینک» بخواهد (منوی کوچک یا modifier).
5) useEffect روی selectedBlockId → scrollIntoView({ block: 'nearest' }) + کلاس highlight کوتاه.
6) در edit mode اگر preview ثانویه هنوز هست، همان رفتار best-effort یا فقط در htmlPreview — تصمیم را ثابت و مستند کن.
7) a11y: focus ring؛ fa+en برای label.
8) PDF sync نساز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
