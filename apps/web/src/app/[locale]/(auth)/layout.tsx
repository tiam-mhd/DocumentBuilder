'use client';

import { RedirectIfAuthenticated } from '@/features/auth/require-auth';

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RedirectIfAuthenticated>{children}</RedirectIfAuthenticated>;
}
