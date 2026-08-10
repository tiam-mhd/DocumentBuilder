# P05-T02-03 — قاب کاغذ روی بوم + راهنمای حاشیه

## هدف
Center canvas و/یا HTML preview یک **قاب کاغذ** واقعی نشان دهد: نسبت ابعاد A4/A3 و orientation، و راهنمای ناحیهٔ حاشیه — تا کاربر بفهمد خروجی چطور دیده می‌شود.

## پیش‌نیاز
- `01` و `02` همین فاز (size/orientation/margins در store)
- `flow-canvas.tsx`، `html-preview.tsx`، `use-paginated-preview-body.ts`
- قانون: preview تقریبی است؛ دقیق بودن پیکسل چاپ اجباری نیست ولی باید «باورپذیر» باشد

## دامنه Full-Stack
- Backend: ندارد
- Frontend: paper stage wrapper، تبدیل mm→CSS px با مقیاس zoom ساده (zoom عمیق‌تر فاز 06)
- Shared اختیاری: helper `pageSizeMm(size, orientation)` در document-schema
- Docs: یک پاراگراف در IA دربارهٔ paper frame

## معیار تموم شدن (DoD)
- [ ] بوم edit داخل مستطیل کاغذ با نسبت صحیح
- [ ] تغییر size/orientation فوراً قاب را عوض می‌کند
- [ ] ناحیهٔ حاشیه به‌صورت راهنمای غیرمزاحم (خط چین/سایهٔ امن) دیده می‌شود
- [ ] اسکرول سند بلند داخل stage درست کار می‌کند
- [ ] dark/light: کاغذ از پس‌زمینهٔ workspace متمایز است (مثل میز کار صفحه‌ساز)
- [ ] RTL: موقعیت قاب می‌شکند نه محتوا
- [ ] performance: بدون reflow فاجعه‌بار روی هر keystroke (فقط وابسته به page config + zoom)

## پرامپت اجرا

```
طبق rules صفحه‌ساز و ADR 017 (preview تقریبی) عمل کن. پیش‌نیاز page config UI.

تسک: قاب کاغذ و راهنمای حاشیه را روی stage ادیتور پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ تصمیم بگیر frame دور FlowCanvas است، دور HtmlPreview، یا هر دو در edit mode — حداقل edit canvas باید کاغذ داشته باشد.
2) ابعاد mm استاندارد ISO را برای A4/A3 portrait/landscape از helper مشترک بخوان.
3) مقیاس: fit-to-width پیش‌فرض معقول برای ریل‌های باز؛ ثابت CSS جادویی پراکنده نگذار.
4) Margin guides: inset بر اساس marginsMm؛ محتوا visually داخل content box بماند (بهترین تلاش با padding).
5) پس‌زمینهٔ workspace (خاکستری/سطح) vs سطح کاغذ (elevated) — هر دو تم.
6) با mode=htmlPreview سازگار باش (فاز 01 mode switch).
7) i18n برای aria روی paper region (مثلاً «صفحه A4 عمودی»).
8) PDF واقعی و DPI را اینجا حل نکن (تسک 04).
9) کدهای dirty برای absolute free-canvas ننویس.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
