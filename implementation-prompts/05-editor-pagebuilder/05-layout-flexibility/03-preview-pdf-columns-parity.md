# P05-T05-03 — تراز HTML Preview و PDF برای ستون‌ها

## هدف
همان ساختار row/columns در **HTML preview** و **PDF نهایی** دیده شود با عرض نسبی یکسان، RTL درست، و pagination امن (keep-together در سطح row طبق ADR).

## پیش‌نیاز
- Schema + editor UI (۰۱–۰۲)
- `document-html.renderer.ts`، `html-preview.tsx`، packer ADR 017
- Export fake/playwright مسیر موجود

## دامنه Full-Stack
- Shared: در صورت نیاز `estimateHeight` برای row در packer
- Backend: renderer HTML + CSS چاپ
- Frontend: HtmlPreview مصرف همان ساختار (ترجیح اشتراک renderer/helpers نه دو پیاده)
- Docs: پیامد ADR اگر رفتار pagination ظریف شد

## معیار تموم شدن (DoD)
- [ ] Preview: ستون‌ها کنار هم با نسبت عرض
- [ ] PDF HTML: همان کلاس‌ها/ساختار؛ شکست صفحه عجیب ستون را نصف نکند مگر ADR اجازه دهد
- [ ] RTL document.locale=fa درست
- [ ] اسناد بدون row رگرسیون ندارند
- [ ] unknown/قدیمی fail-safe
- [ ] تست دستی حداقل یک سند ۲ستونه export

## پرامپت اجرا

```
طبق ADR 017 و ADR ستون‌ها و مسیر PDF 007 عمل کن. یک منبع حقیقت برای markup ستون‌ها بساز.

تسک: تراز preview HTML و PDF برای row/columns را Full-Stack کامل کن.

الزامات:
1) تحلیل + تسک‌لیست؛ کد تکراری preview vs server را کم کن (helper مشترک در document-schema یا پکیج render اگر وجود دارد).
2) CSS: display flex/grid؛ عرض از props؛ gap معقول؛ چاپ با break-inside روی column/row طبق ADR.
3) packer تخمینی: ارتفاع row ≈ max(columns) نه مجموع نادرست.
4) تصاویر/نقشه داخل ستون: overflow امن.
5) TOC/bindings داخل ستون کار کند.
6) تست: fa RTL دو ستون متن؛ en؛ سپس PDF fake یا playwright.
7) UI ادیتور را جز bugfix لازم عوض نکن.
8) docs اگر رفتار صفحه بندی تغییر کرد.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
