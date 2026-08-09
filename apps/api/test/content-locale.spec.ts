import {
  asEntityTranslations,
  contentLocaleDir,
  normalizeEntityTranslations,
  parseContentLocale,
  pickLocalized,
} from '@vdb/shared-types';

describe('content locale helpers (ADR 015)', () => {
  it('parses locale with fa default', () => {
    expect(parseContentLocale('en')).toBe('en');
    expect(parseContentLocale('fa')).toBe('fa');
    expect(parseContentLocale('de')).toBe('fa');
    expect(parseContentLocale(undefined)).toBe('fa');
  });

  it('maps locale to HTML dir', () => {
    expect(contentLocaleDir('fa')).toBe('rtl');
    expect(contentLocaleDir('en')).toBe('ltr');
  });

  it('pickLocalized uses FA columns for fa and EN bag with fallback', () => {
    const base = { title: 'آلفا', description: 'توضیح' };
    const translations = { en: { title: 'Alpha' } };
    expect(pickLocalized(base, translations, 'fa', ['title', 'description'])).toEqual(
      base,
    );
    expect(
      pickLocalized(base, translations, 'en', ['title', 'description']),
    ).toEqual({ title: 'Alpha', description: 'توضیح' });
  });

  it('normalizes translations to allowlisted en fields', () => {
    expect(
      normalizeEntityTranslations(
        { en: { title: ' A ', secret: 'x', description: '' }, fr: { title: 'x' } },
        ['title', 'description'],
      ),
    ).toEqual({ en: { title: 'A' } });
    expect(asEntityTranslations(null)).toEqual({});
  });
});
