import { requireUser } from '@/lib/session';
import { NavLinks } from '@/components/NavLinks';
import { SignOutButton } from '@/components/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2">
          <p className="text-base font-semibold text-slate-900">Facturation Intelligente</p>
          <p className="truncate text-xs text-slate-500">{user.companyName || user.name}</p>
        </div>
        <NavLinks />
        <div className="mt-auto pt-4">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
