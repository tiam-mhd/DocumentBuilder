# P05-T04-02 — پنل‌های Text / Section / Divider

## هدف
ویرایش کامل و کاربرپسند برای بلوک‌های ساختاری پایه: متن (محتوا، heading، bindings)، بخش (عنوان، سطح)، جداکننده — با تب Content/Design واضح و hintهای غیر فنی.

## پیش‌نیاز
- `01-inspector-tabs-content-design-advanced.md`
- BindingInsertField موجود؛ ADR 012/016 برای heading و bindings

## دامنه Full-Stack
- Frontend panels
- Schema: فقط اگر prop ظاهری امن و لازم است (مثلاً `align: start|center|end` برای text/divider) — با validate + preview/PDF مصرف؛ bump نسخه در صورت breaking
- i18n

## معیار تموم شدن (DoD)
- [ ] Text Content: content، headingLevel، insert binding — UX بهتر (شمارنده کاراکتر اختیاری، hint binding)
- [ ] Text Design: حداقل تراز و/یا وزن ظاهری اگر در schema/theme قابل بیان است؛ اگر prop جدید نیاوردی، توضیح «از تم سند پیروی می‌کند» + لینک ذهنی به themes
- [ ] Section: title + headingLevel + binding روی عنوان؛ Design خالیِ مفید یا فاصلهٔ بخش اگر prop دارید
- [ ] Divider: Design (سبک خط: solid/dashed اگر schema اجازه می‌دهد یا فقط hint)
- [ ] بدون JSON؛ خطاهای کاربرپسند
- [ ] undo/autosave

## پرامپت اجرا

```
طبق document-schema و ADRهای text/toc/bindings عمل کن.

تسک: پنل‌های inspector برای text و section و divider را کامل و شفاف کن.

الزامات:
1) تحلیل props فعلی هر سه type + تسک‌لیست.
2) Content tab را اولویت بده؛ لیبل/hint fa+en («سطح عنوان برای فهرست مطالب» نه jargon TOC مگر لازم).
3) اگر prop Design جدید اضافه می‌کنی: schema + HTML renderer + PDF path را هم‌تراز کن؛ fail-safe برای اسناد قدیمی.
4) Binding insert را از بین نبر؛ UX را واضح‌تر کن (لیست عبارات مجاز کوتاه).
5) divider را از «بدون کنترل» درآور — حداقل یک کنترل یا پیام تم‌محور صادقانه.
6) تست دستی هر type روی بوم و preview HTML.
7) ماژول‌ها و image را اینجا نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
