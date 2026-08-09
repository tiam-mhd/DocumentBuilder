'use client';

/**
 * Compact English translation inputs for content create forms (ADR 015).
 * Canonical FA columns stay primary; optional `translations.en` bag on write.
 */

export type EnTranslationField = {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  fields: EnTranslationField[];
  disabled?: boolean;
  fieldClassName?: string;
  inputClassName?: string;
};

/** Build `{ en: { ... } }` only when at least one EN value is non-empty. */
export function buildEnTranslations(
  fields: Record<string, string | undefined>,
): { en: Record<string, string> } | undefined {
  const en: Record<string, string> = {};
  for (const [key, raw] of Object.entries(fields)) {
    const value = raw?.trim();
    if (value) en[key] = value;
  }
  return Object.keys(en).length > 0 ? { en } : undefined;
}

export function EnTranslationFields({
  fields,
  disabled,
  fieldClassName,
  inputClassName,
}: Props) {
  return (
    <>
      {fields.map((field) => (
        <label key={field.key} className={fieldClassName}>
          {field.label}
          <input
            className={inputClassName}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            disabled={disabled}
            dir="ltr"
            lang="en"
          />
        </label>
      ))}
    </>
  );
}
