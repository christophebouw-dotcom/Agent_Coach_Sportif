import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Facturation Intelligente',
  description: 'Facturation, relances et prévisions de trésorerie automatisées.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
