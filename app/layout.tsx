import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
// On importe le moteur qu'on a retrouvé grâce à toi
import { VaultProvider } from '@/components/providers/VaultProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SecureVault',
  description: 'Votre coffre fort sécurisé',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-950 text-white antialiased overflow-y-auto`}>
        {/* On englobe tout le site avec le moteur (Provider) */}
        <VaultProvider>
          <main className="min-h-screen relative z-10">
            {children}
          </main>
          
          {/* Les notifications (Toast) */}
          <Toaster richColors position="top-center" />
        </VaultProvider>
      </body>
    </html>
  );
}