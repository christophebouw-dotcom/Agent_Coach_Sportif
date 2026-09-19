'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LIENS = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/factures', label: 'Factures' },
  { href: '/recurrences', label: 'Récurrences' },
  { href: '/clients', label: 'Clients' },
  { href: '/produits', label: 'Prestations' },
  { href: '/parametres', label: 'Paramètres' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              actif ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
