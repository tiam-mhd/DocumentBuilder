# P01-T15 — Editor Shell جریان‌محور (Flow)

## هدف
پوسته Editor در Next: انتخاب بلوک، چینش flow، autosave debounce، undo/redo — بدون PDF در هر کلید.

## پیش‌نیاز
- `14-document-crud-schema.md`

## دامنه Full-Stack
- Backend: endpoints ذخیره جزئی/کامل document body (از قبل)
- Frontend: features/editor (Client Components)
- Redis: اختیاری برای lock ویرایش تک‌کاربره
- Docs: رفتار autosave

## معیار تموم شدن (DoD)
- [ ] مدل layout = flow + blocks نه canvas آزاد
- [ ] Undo/Redo و autosave
- [ ] Preview HTML سریع (نه PDF)
- [ ] تم UI و i18n ادیتور

## پرامپت اجرا

```
طبق `.cursor/rules/` 07-document-editor و ممنوعیت Canva-free در MVP عمل کن.

تسک: Editor shell جریان‌محور را Full-Stack (عمدتاً Next + API ذخیره) پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) Editor client store (Zustand یا معادل) با undo/redo.
3) DnD سبک برای ترتیب بلوک‌ها (dnd-kit)؛ absolute free-canvas نساز.
4) Autosave debounce به Nest Documents API.
5) Preview HTML/CSS با توکن‌های theme سند.
6) هرگز در keystroke PDF نساز.
7) i18n/theme؛ Gate اگر سند قفل اشتراک دارد.
8) اگر قرارداد editor سراسری جدیدی دیدی در rules بنویس.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
