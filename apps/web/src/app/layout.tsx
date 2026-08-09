import { ReactNode } from 'react';

/** Passthrough — real shell lives under `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
