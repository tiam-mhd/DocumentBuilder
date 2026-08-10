# روبریک پذیرش «عشق‌وحال» — صفحه‌ساز سند VDB

**Status:** Accepted for scoring (P05-T00-05)  
**Related:** [`editor-pagebuilder-ia.md`](../ux/editor-pagebuilder-ia.md) · rule `29-editor-pagebuilder-ux.mdc` · ADR 035/036  
**Pack:** `implementation-prompts/05-editor-pagebuilder/`  
**Manual checklist (when written):** `editor-pagebuilder-acceptance.md`

امتیازدهی برای کیفیت تجربهٔ صفحه‌ساز است — فراتر از «فیچر وجود دارد». ارزیاب روی build واقعی (یا staging) با یک Business آزمایشی کار می‌کند.

---

## مقیاس

| نمره | معنی کلی |
| --- | --- |
| **1** | دردناک / گیج‌کننده / غیرقابل اعتماد |
| **3** | قابل‌استفاده ولی ناهماهنگ یا ناقص |
| **5** | روان، واضح، لذت‌بخش — حس صفحه‌ساز حرفه‌ای |

نمرات میانی (۲/۴) مجازند اگر بین تعاریف زیر قرار بگیرند.

---

## ابعاد

### 1) Discoverability — پیدا کردن ابزار بدون آموزش

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | Export/Share/Workflow/Palette همه‌جا روی هم در یک ستون؛ کاربر برای «سایز صفحه» یا «پیش‌نمایش» مسیر واضحی ندارد |
| **3** | ابزارها در More یا پنل‌ها هستند ولی نام/گروه مبهم است؛ هنوز باید بگردد |
| **5** | Top bar گروه‌بندی‌شده + Mode switch + Palette/Layers + Page settings وقتی چیزی انتخاب نیست؛ coach marks کوتاه برای اولین ورود |

### 2) Fluidity — DnD، undo، autosave، بدون جلق

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | فقط reorder لیست خشک؛ undo بی‌اثر؛ هر کلید PDF/paginate سنگین؛ UI قفل می‌شود |
| **3** | Undo/autosave کار می‌کند؛ DnD پالت یا nested ناقص؛ گاه تأخیر محسوس روی سند متوسط |
| **5** | درگ از پالت با نشانگر درج، nested در section/columns، undo یکپارچه، autosave ~800ms بدون PDF، سوییچ mode نرم |

### 3) Clarity of properties — فهم کنترل‌ها

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | فیلدها با نام فنی (`widthFraction`, raw ids)؛ JSON در inspector؛ بدون hint |
| **3** | لیبل فارسی/انگلیسی هست ولی تب Content/Design قاطی یا خالی گیج‌کننده |
| **5** | تب‌های Content \| Design \| Advanced؛ hint برای QR/TOC/when/breaks؛ media picker به‌جای UUID اجباری |

### 4) Output confidence — اطمینان از خروجی قبل از انتشار

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | فقط export نهایی؛ یا PDF روی هر تغییر؛ تمایز preview/download نیست |
| **3** | HTML preview هست ولی stage فرعی؛ PDF preview نیست یا بدون stale/rate پیام |
| **5** | Mode HTML با paper/zoom؛ PDF preview صف‌شده (ADR 036) با واترمارک/وضعیت؛ تمایز «دانلود نهایی»؛ soft-gate قبل از publish |

### 5) Visual polish — تم، فاصله، motion، paper

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | لیست خاکستری بدون قاب کاغذ؛ شکستن dark/light؛ motion آزار یا هیچ بازخوردی |
| **3** | قاب کاغذ هست؛ فاصله‌ها متوسط؛ selection ضعیف |
| **5** | Paper متمایز از میز کار؛ selection/hover واضح؛ motion هدفمند + `prefers-reduced-motion`؛ هر دو تم تمیز |

### 6) Trust & safety — قفل‌ها و حفظ کار

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | ذخیره خطا می‌دهد و متن ناپدید می‌شود؛ قفل published نامشخص؛ IDOR در UI القا می‌شود |
| **3** | بنر read-only/locked هست؛ خطای save دیده می‌شود ولی Retry/offline ضعیف است |
| **5** | بنرهای writable/body-lock + CTA workflow؛ save states واضح؛ offline/retry (فاز 08)؛ preview بدون اجبار writable |

### 7) Inclusive UX — fa/en، RTL، keyboard، reduced-motion

| نمره | مثال عینی VDB |
| --- | --- |
| **1** | سند `locale=fa` روی کاغذ LTR می‌شکند؛ فقط یک زبان UI؛ بدون کیبورد |
| **3** | fa/en UI هست؛ RTL کاغذ اغلب درست؛ شورتکات محدود |
| **5** | UI locale جدا از document.locale؛ ستون‌ها منطقی در RTL (ADR 035)； Cmd/Ctrl shortcuts + announcer؛ reduced-motion رعایت شده |

---

## آستانهٔ خروج پک پیاده‌سازی

صفحه‌ساز از نظر delight **Accept** است وقتی **همه** برقرار باشند:

1. میانگین هفت بُعد **≥ 4.0**  
2. **هیچ** بُعدی **< 3**  
3. تعداد **معیارهای رد فوری** = **0**  
4. حداقل **۴ از ۵** سناریوی طلایی زیر Pass (پنجم می‌تواند N/A اگر ماژول در محیط تست نیست)

در غیر این صورت: **Accept with follow-ups** (لیست فاز) یا **Reject** برای GA صفحهٔ ادیتور.

---

## معیارهای رد فوری (هر کدام = Fail کل delight)

| # | شرط رد |
| --- | --- |
| F1 | PDF/Chromium روی keystroke، autosave، یا DnD enqueue می‌شود |
| F2 | JSON خام / dump اسکیما / Zod stack در UI اصلی ادیتور به کاربر نهایی نشان داده می‌شود |
| F3 | بعد از خطای ذخیره، کار کاربر بدون پیام از بین می‌رود یا overwrite خاموش رخ می‌دهد |
| F4 | با `document.locale=fa` جهت متن/ستون‌های کاغذ آشکارا اشتباه است (LTR اجباری روی محتوا) |
| F5 | PDF preview بدون سقف rate/concurrency (یا بدون پیام 429) و قابل سوءاستفاده نامحدود است |
| F6 | Absolute free-canvas x/y به‌عنوان مسیر اصلی چیدمان ship شده بدون ADR Unlock |
| F7 | کاربر VIEWER/membership نتواند سند را ببیند ولی mutationهای قفل‌شده همچنان ذخیره شوند (نقض gate) |
| F8 | Final download و Preview در copy/CTA چنان قاطی‌اند که کاربر فایل واترمارک‌شده را «نهایی» بگیرد بدون هیچ تمایزی |

---

## سناریوهای طلایی (به زبان کاربر)

| # | سناریو | Pass وقتی |
| --- | --- | --- |
| S1 | «یک بروشور A4 دو ستونه با لوگو و متن می‌سازم» | Page=A4، preset/row دو ستون، image از کتابخانه، متن، HTML درست به نظر می‌رسد |
| S2 | «حاشیه را زیاد می‌کنم و قاب کاغذ را می‌بینم» | راهنمای حاشیه روی paper عوض می‌شود؛ autosave؛ بدون JSON |
| S3 | «اول پیش‌نمایش صفحه، بعد PDF، بعد برمی‌گردم ویرایش» | Mode HTML → PDF preview (جاب+viewer) → Edit با selection حفظ‌شده best-effort |
| S4 | «سند منتشر شده را باز می‌کنم؛ نمی‌توانم خرابش کنم مگر مسیر درست» | Banner قفل؛ mutation disabled؛ از Workflow مسیر reopen/unpublish واضح است |
| S5 | «بلوک نقشه/ماژول قفل را می‌زنم» | در پالت قفل + CTA ارتقا؛ ذخیرهٔ غیرمجاز 403/پیام؛ بدون crash |

---

## نگاشت بُعد → فازهای پک

| بُعد | فازهای اصلی پوشش |
| --- | --- |
| Discoverability | 01 chrome، 08 coach/command palette |
| Fluidity | 03 canvas، 05 columns DnD، 06 perf، 01 shell |
| Clarity of properties | 04 inspector panels |
| Output confidence | 06 HTML، 07 PDF preview + workflow gate |
| Visual polish | 02 paper، 03 selection، 08 motion |
| Trust & safety | 01 locks، 08 offline/save، 07 rate messages |
| Inclusive UX | سراسر + 03 shortcuts، 08 a11y، 02/05/06 locale RTL |

فاز **00** این روبریک و IA/ADR را قفل می‌کند. فاز **09** با checklist/E2E/signoff امتیاز را ثبت می‌کند.

---

## برگهٔ امتیاز (کپی برای هر دور QA)

| بُعد | نمره (1–5) | یادداشت |
| --- | --- | --- |
| Discoverability | | |
| Fluidity | | |
| Clarity of properties | | |
| Output confidence | | |
| Visual polish | | |
| Trust & safety | | |
| Inclusive UX | | |
| **میانگین** | | |
| رد فوری؟ | بله/خیر + کد F# | |
| سناریو S1–S5 | P/F/N/A | |
| **نتیجه** | Accept / Accept+FU / Reject | |

تاریخ: ________  محیط: ________  ارزیاب: ________
