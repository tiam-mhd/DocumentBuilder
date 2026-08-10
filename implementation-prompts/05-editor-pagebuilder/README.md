# پک پیاده‌سازی — صفحه‌ساز سند (Editor Page Builder)

این پوشه **نقشهٔ جدا و اختصاصی** ارتقای ویرایشگر سند به سطح یک صفحه‌ساز حرفه‌ای (حس Elementor: جذاب، روان، منعطف) است.

| لایه | وضعیت |
| --- | --- |
| **نگارش کاتالوگ** (۱۰ فاز × پرامپت آماده‌کپی) | ✅ کامل |
| **اجرای محصول — فاز `00`** (rules / ADR / IA / روبریک) | ✅ کامل |
| **اجرای محصول — فاز `01`** (کروم فضای کار) | ✅ کامل |
| **اجرای محصول — فاز `02`…`09`** | ⏳ منتظر اجرا (به‌ترتیب) |

> هر تسک بخش «پرامپت اجرا» را به Agent بدهید. Agent باید: rules → تحلیل+تسک‌لیست → اسلایس → `تموم شد` / `تموم نشد`.

## جایگاه نسبت به کاتالوگ قبلی

| کاتالوگ | نقش |
| --- | --- |
| `00`…`04` در `implementation-prompts/` | ساخت هسته تا GA (شامل editor flow اولیه `P01-T15`) |
| **`05-editor-pagebuilder` (اینجا)** | بازطراحی و تکمیل **تجربهٔ صفحه‌ساز** روی همان Core — بدون فورک محصول |

استک و قوانین پروژه (`AGENTS.md` + `.cursor/rules/`) همچنان حاکم‌اند. هر جا حس Elementor با قانون فعلی (flow، بدون free-canvas مطلق) در تنش باشد، **اول ADR/rule**، بعد کد.

## چشم‌انداز محصول (یک جمله)

کاربر داخل `/app/documents/[documentId]` باید حس کند یک **صفحه‌ساز حرفه‌ای سند چاپی/وب** دارد: پالت، بوم زنده، پنل ویژگی‌های واضح، سایزبندی خروجی، پیش‌نمایش HTML و PDF قبل از انتشار/دانلود — و از کار کردن در آن لذت ببرد.

## اسناد و قوانین قفل‌شده (فاز 00)

| سند | مسیر |
| --- | --- |
| قانون UX صفحه‌ساز | [`.cursor/rules/29-editor-pagebuilder-ux.mdc`](../../.cursor/rules/29-editor-pagebuilder-ux.mdc) |
| ADR ستون‌ها (`row`/`column`) | [`docs/adr/035-editor-flow-columns.md`](../../docs/adr/035-editor-flow-columns.md) — **Accepted** |
| ADR پیش‌نمایش PDF (جاب صف‌شده) | [`docs/adr/036-editor-pdf-preview.md`](../../docs/adr/036-editor-pdf-preview.md) — **Accepted** |
| IA فضای کار | [`docs/ux/editor-pagebuilder-ia.md`](../../docs/ux/editor-pagebuilder-ia.md) |
| روبریک عشق‌وحال | [`docs/qa/editor-pagebuilder-delight-rubric.md`](../../docs/qa/editor-pagebuilder-delight-rubric.md) |
| تحلیل شکاف اولیه | [`00-vision-and-gap-analysis.md`](./00-vision-and-gap-analysis.md) |

## پیشرفت اجرای محصول

### فاز 00 — Foundation ✅

- قانون `29-editor-pagebuilder-ux` + ارجاع در `07` / `AGENTS.md`
- ADR 035 (ستون‌ها) و ADR 036 (PDF preview + سقف‌های `EXPORT_PREVIEW_*` در `.env.example`)
- IA و روبریک پذیرش

### فاز 01 — Workspace chrome ✅

پیاده در `apps/web/src/features/editor/`:

| تسک | تحویل |
| --- | --- |
| P05-T01-01 | Shell سه‌ناحیه + top bar + منوی More (drawer پنل‌های ثانویه) |
| P05-T01-02 | ریل چپ: تب Palette (جستجو/گروه/قفل ماژول) + Layers (درخت صفحات/بلوک‌ها) |
| P05-T01-03 | Inspector تب‌دار Content \| Design \| Advanced |
| P05-T01-04 | `editorMode`: `edit` \| `htmlPreview` \| `pdfPreview` (+ پوسته PDF تا فاز 07) |
| P05-T01-05 | `EditorBanner` قفل اشتراک/نقش/بدنه/ذخیره + empty canvas + tooltip دلیل قفل |

**مرحلهٔ بعدی اجرا:** [`02-page-print-setup/01-page-size-presets-ui.md`](./02-page-print-setup/01-page-size-presets-ui.md)

### هنوز اجرا نشده (شکاف باقی‌مانده)

- UI سایز/حاشیه/کاغذ و چندصفحه (فاز 02)
- DnD از پالت و تودرتو غنی (فاز 03)
- عمق Design panels per-block (فاز 04)
- اسکیما/UI ستون‌ها طبق ADR 035 (فاز 05)
- HTML preview delight / زوم / همگام انتخاب (فاز 06)
- enqueue واقعی PDF preview طبق ADR 036 (فاز 07)
- شورتکات، coach marks، a11y polish (فاز 08)
- QA / E2E / signoff (فاز 09)

## فازها (پوشه‌ها)

| پوشه | نام فاز | خروجی کلیدی | اجرا |
| --- | --- | --- | --- |
| [`00-foundation-ux-law`](./00-foundation-ux-law/) | قانون UX + ADR | قفل مدل تعامل | ✅ |
| [`01-workspace-chrome`](./01-workspace-chrome/) | کروم فضای کار | نوار / ریل‌ها / حالت‌ها / قفل‌ها | ✅ |
| [`02-page-print-setup`](./02-page-print-setup/) | سایزبندی خروجی | A4/A3/…، جهت، حاشیه، DPI، چندصفحه | ⏳ |
| [`03-canvas-interactions`](./03-canvas-interactions/) | تعامل بوم | درگ از پالت، تودرتو، انتخاب، کیبورد | ⏳ |
| [`04-block-design-panels`](./04-block-design-panels/) | پنل ویژگی المان‌ها | هر بلوک: ویرایش واضح | ⏳ |
| [`05-layout-flexibility`](./05-layout-flexibility/) | انعطاف چیدمان | ستون/گرید طبق ADR 035 | ⏳ |
| [`06-html-preview-delight`](./06-html-preview-delight/) | پیش‌نمایش HTML | زنده، همگام، زوم | ⏳ |
| [`07-pdf-preview-gate`](./07-pdf-preview-gate/) | پیش‌نمایش PDF | جاب صف‌شده ADR 036 | ⏳ |
| [`08-productivity-delight`](./08-productivity-delight/) | عشق‌وحال | شورتکات، راهنما، motion، a11y | ⏳ |
| [`09-qa-acceptance`](./09-qa-acceptance/) | پذیرش | E2E، checklist، perf | ⏳ |

**جمع تقریبی پک:** ~۵۳ تسک اجرایی + ۱۰ overview فاز + سند چشم‌انداز.

ترتیب اجرا: `00 → 09`؛ داخل هر فاز شماره فایل‌ها.

## قرارداد فایل تسک

همان [`_PROMPT-TEMPLATE.md`](../_PROMPT-TEMPLATE.md):

- هدف / پیش‌نیاز / دامنه Full-Stack / DoD / **پرامپت اجرا** آماده‌کپی
- Agent باید: rules → تحلیل+تسک‌لیست → اسلایس کامل → `تموم شد` / `تموم نشد`
- API تغییر کند → `docs/api/`؛ قانون سراسری → `.cursor/rules/` اول

## اصول غیرقابل‌مذاکره (یادآوری)

1. **Data ≠ Template ≠ Document**  
2. Preview HTML سریع ≠ Final PDF (صف Redis/BullMQ) — PDF روی هر کلید / autosave / DnD ممنوع  
3. Tenancy + Entitlement + قفل بدنه در وضعیت‌های `review|approved|published`  
4. i18n `fa`/`en` + تم تاریک/روشن برای UI ادیتور  
5. DOCX/PPTX همچنان non-goal مگر ADR جدید  
6. حس Elementor = **کیفیت تعامل و عمق پنل‌ها**؛ free-canvas مطلق فقط با ADR صریح محصول  
7. ستون‌ها فقط طبق **ADR 035**؛ پیش‌نمایش PDF فقط طبق **ADR 036**

## نحوهٔ نگارش این پک (مرحله‌ای) — آرشیو

1. ~~مرحله ۱: README + تحلیل شکاف + اسکلت فازها~~ ✅  
2. ~~… تا مرحله ۱۱: پرامپت کامل فاز `09`~~ ✅  

**نگارش کاتالوگ تمام شد.** اجرای Agent از فاز `00` شروع شده؛ ادامه از فاز `02`.
