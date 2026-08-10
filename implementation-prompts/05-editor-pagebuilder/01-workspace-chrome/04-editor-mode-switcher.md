# P05-T01-04 — سوییچ حالت Edit / HTML Preview / PDF Preview (Shell)

## هدف
در Top bar یک **Mode switcher** سه‌حالته بساز: `edit` | `htmlPreview` | `pdfPreview`. در این تسک HTML preview واقعی به حالت `htmlPreview` وصل شود؛ برای `pdfPreview` فقط **پوستهٔ UI** (placeholder + پیام آماده‌سازی / غیرفعال تا فاز 07) مگر ADR و API از قبل آماده باشد.

## پیش‌نیاز
- `01-workspace-shell-layout.md`
- ADR `036-editor-pdf-preview` (اگر Accepted است، UI می‌تواند «به‌زودی» یا disabled با tooltip بگوید)
- `html-preview.tsx`، editor store

## دامنه Full-Stack
- Database/Backend: ندارد (enqueue PDF نزن مگر فاز 07 انجام شده)
- Frontend: `editorMode` در store؛ سوییچ UI؛ رفتار نمایش rails در هر mode طبق IA
- i18n
- Docs: اگر رفتار mode در IA نبود، IA را یک پاراگراف آپدیت کن

## معیار تموم شدن (DoD)
- [ ] Segmented control سه‌حالته در top bar با i18n و aria
- [ ] `edit`: canvas + rails قابل‌استفاده (طبق قفل‌ها)
- [ ] `htmlPreview`: تمرکز روی پیش‌نمایش HTML (rails می‌توانند جمع شوند یا فقط‌خواندنی طبق IA)
- [ ] `pdfPreview`: پوسته — نه جاب جعلی موفق؛ CTA واضح که نهایی در فاز PDF است یا اتصال واقعی فقط اگر backend آماده است
- [ ] تغییر mode وضعیت سند را خراب نکند؛ بازگشت به edit selection را best-effort حفظ کند
- [ ] هرگز از mode switch PDF روی keystroke نساز

## پرامپت اجرا

```
طبق rule صفحه‌ساز و ADR PDF preview عمل کن. پیش‌نیاز کروم سه‌ناحیه.

تسک: Mode switcher ادیتور (edit / htmlPreview / pdfPreview) را در shell پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) در editor store فیلد `editorMode` با اتحادیهٔ فوق اضافه کن؛ persist لازم نیست مگر UX بخواهد session-only.
3) Top bar: segmented control دسترس‌پذیر (keyboard).
4) رفتار:
   - edit: FlowCanvas فعال؛ HtmlPreview می‌تواند ثانویه بماند یا مخفی شود طبق IA — شلوغ نباشد
   - htmlPreview: HtmlPreview اصلی stage؛ ویرایش بلوک غیرفعال یا مخفی؛ انتخاب از preview اگر از قبل پشتیبانی می‌شود نگه دار وگرنه فاز 06
   - pdfPreview: پنل/stage با توضیح کاربرپسند + disabled state اگر API نیست؛ اگر API فاز 07 از قبل merge شده، می‌توانی به پنل واقعی وصل کنی
5) هنگام htmlPreview/pdfPreview: autosave را برای mutationهای UI که نباید رخ دهند قطع نکن غلط — فقط UI ویرایش را ببند؛ اگر کاربر نمی‌تواند mutate کند، debounce بی‌اثر است و اشکالی ندارد.
6) i18n fa+en؛ تم‌ها؛ RTL.
7) تست دستی کوتاه در خلاصه: سه mode جابه‌جا می‌شوند بدون crash.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
