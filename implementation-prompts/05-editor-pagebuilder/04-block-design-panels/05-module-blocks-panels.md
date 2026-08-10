# P05-T04-05 — پنل‌های ماژول Gallery / Map / OrgChart / Timeline

## هدف
برای بلوک‌های ماژولی، inspector کامل و صادقانه: وقتی entitlement نیست CTA؛ وقتی هست کنترل‌های props واقعی + لینک به صفحات محتوای Business در صورت نیاز — نه فیلدهای مبهم.

## پیش‌نیاز
- فاز corporate modules در محصول؛ block registry `moduleCode`
- ADR 008/009/010 و gallery module
- Media picker قابل‌reuse از تسک 03 برای gallery

## دامنه Full-Stack
- Frontend panels per type
- Backend فقط اگر GET کمکی (لیست galleries، locations، team) برای picker لازم است — با membership و docs/api
- EntitlementGate در UI و یادآوری gate سمت API هنگام save

## معیار تموم شدن (DoD)
- [ ] Gallery: انتخاب galleryId از لیست Business نه UUID اجباری
- [ ] Map: center/zoom/markersSource (یا props فعلی) با برچسب روشن؛ hint دربارهٔ PDF استاتیک
- [ ] OrgChart: layout/rootMemberId از team picker اگر ممکن
- [ ] Timeline: layout vertical/alternating + منبع رویدادها
- [ ] بدون module: پنل قفل + ModuleUpgradeCta
- [ ] Design tab برای ارتفاع/layout بصری در حد props موجود
- [ ] i18n؛ fail-safe

## پرامپت اجرا

```
طبق module entitlements و ADRهای map/org/timeline/gallery عمل کن.

تسک: پنل‌های inspector ماژول‌های gallery/map/orgChart/timeline را کامل کن.

الزامات:
1) تحلیل props هر type در schema + UI فعلی.
2) برای هر کدام Content/Design را پر کن؛ از نام فیلد فنی تنها استفاده نکن — label+hint انسانی.
3) Pickers وابسته به دادهٔ Business (gallery list، team members، locations) با فیلتر businessId.
4) اگر داده خالی است empty state «ابتدا در بخش … بسازید» با لینک route موجود.
5) PDF محدودیت‌ها (نقشه استاتیک و …) را در hint بگو نه در error ترسناک.
6) documentCollectRequiredModuleCodes / save 403 را در UX پیش‌بینی کن.
7) docs/api برای endpointهای جدید.
8) plugin.* types: fail-safe پیام «افزونه» اگر در registry هستند — عمیق نشو مگر ساده است.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
