import { RequireAuth } from '@/features/auth/require-auth';

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
