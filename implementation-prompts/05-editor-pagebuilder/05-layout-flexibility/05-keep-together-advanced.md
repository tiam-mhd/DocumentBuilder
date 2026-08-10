# P05-T05-05 — قیدهای نگهداشت پیشرفته‌تر در UX (Keep-together)

## هدف
کنترل‌های فهمیدنی برای جلوگیری از شکستن بد ردیف/بلوک‌های حساس در صفحه‌بندی: تقویت `breakRules` در سطح row و بلوک‌های media، با پیش‌فرض‌های هوشمند و توضیح اثر روی preview تقریبی و PDF.

## پیش‌نیاز
- ADR 017؛ فیلدهای Advanced breakRules (فاز 04)
- row/columns در schema و renderer
- packer تخمینی

## دامنه Full-Stack
- Schema: در صورت نیاز پیش‌فرض `keepTogether` برای `row` و column wrappers
- Backend/Frontend preview packer احترام به قواعد جدید
- Inspector: presets «این ردیف با هم بماند»، «قبلش صفحهٔ جدید»
- Docs: بند کوتاه در ADR 017 یا صفحه‌ساز UX

## معیار تموم شدن (DoD)
- [ ] پیش‌فرض معقول keepTogether برای row (طبق ADR)
- [ ] UI Advanced یا Design روی row برای override
- [ ] packer و CSS print hints هم‌تراز
- [ ] بلوک‌های media داخل ستون رفتار بد صفحه را کمتر می‌کنند
- [ ] i18n؛ بدون وعدهٔ پیکسل‌پرفکت بودن preview
- [ ] رگرسیون اسناد بدون breakRules

## پرامپت اجرا

```
طبق ADR 017 و مدل ستون‌ها عمل کن. هدف UX اعتماد به صفحه‌بندی است نه موتور قاعدهٔ پیچیده.

تسک: قیدهای keep-together پیشرفته‌تر را برای layout جدید Full-Stack جلا بده.

الزامات:
1) تحلیل defaults فعلی breakRules در schema برای typeهای مختلف + row جدید.
2) برای row: default keepTogether=true (یا طبق ADR)؛ قابل خاموش کردن در Advanced با hint.
3) packer: اگر row با keepTogether در صفحه جا نشد، به صفحهٔ بعد بفرست نه نصف کردن ستون‌ها.
4) CSS PDF: break-inside: avoid روی wrapper مناسب.
5) در html preview تقریبی همان تصمیم را best-effort نشان بده و برچسب «تقریبی» را حفظ کن.
6) i18n؛ تست با row بلند که صفحه را لبریز می‌کند.
7) AND/OR visibility و absolute canvas نساز.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
