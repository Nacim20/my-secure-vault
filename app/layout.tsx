import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SecureVault',
  description: 'Coffre fort sécurisé',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      {/* On s'assure que le body prend tout l'écran et permet le scroll */}
      <body className="min-h-screen bg-gray-950 text-white antialiased overflow-y-auto">
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}