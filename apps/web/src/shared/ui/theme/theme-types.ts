export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_COOKIE = 'vdb-theme';

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): 'light' | 'dark' {
  if (preference === 'system') {
    return systemDark ? 'dark' : 'light';
  }
  return preference;
}
