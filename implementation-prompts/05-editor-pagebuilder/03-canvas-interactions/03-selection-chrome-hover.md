# P05-T03-03 — حلقهٔ انتخاب، Hover و برچسب نوع بلوک

## هدف
بوم حس صفحه‌ساز بدهد: hover، انتخاب واضح، برچسب نوع ترجمه‌شده، و کنترل‌های شناور حداقلی (مثلاً drag handle جدا از کلیک محتوا) — بدون شلوغی Elementor افراطی.

## پیش‌نیاز
- Canvas با nested ساختار از تسک‌های ۱–۲
- Layers selection sync از فاز 01
- `getBlockRegistry().labelKey` + i18n `blocks.*`

## دامنه Full-Stack
- فقط Frontend CSS/UX + در صورت نیاز data-attribute روی ردیف‌ها
- a11y: `aria-selected`، فوکوس قابل‌مشاهده

## معیار تموم شدن (DoD)
- [ ] hover outline ملایم
- [ ] selected outline قوی‌تر + برچسب نوع روی گوشه (fa/en)
- [ ] handle درگ از ناحیهٔ کلیک انتخاب جدا یا مشخص است تا اشتباه نگیرد
- [ ] بلوک قفل‌شده ظاهر متفاوت (opacity/badge)
- [ ] هر دو تم؛ contrast کافی
- [ ] reduced-motion: بدون لرزش مداوم
- [ ] با paper frame فاز 02 تداخل مخرب ندارد

## پرامپت اجرا

```
طبق rule صفحه‌ساز (delight + clarity) و تم tokens عمل کن.

تسک: selection/hover chrome بوم را حرفه‌ای کن.

الزامات:
1) تحلیل UI فعلی rowSelected + تسک‌لیست.
2) استایلهای hover/selected با CSS variables تم؛ از glow بنفش کلیشه‌ای پرهیز کن.
3) Badge نام بلوک از i18n (blocks یا editor)؛ برای section عنوان را کنار type نشان بده اگر مفید است.
4) Drag handle را واضح کن (آیکون) و hit-area لمسی معقول.
5) وقتی selectedBlockId از Layers عوض می‌شود، همان chrome اعمال شود.
6) در mode=htmlPreview این chrome روی canvas edit مخفی است (اگر canvas مخفی است OK).
7) ابزارهای floating سنگین (عرض ستون و …) نساز — فاز 04/05.
8) fa+en؛ RTL: برچسب گوشهٔ مناسب منطقی.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
