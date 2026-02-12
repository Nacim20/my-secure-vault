import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { VaultProvider } from "@/components/providers/VaultProvider";


export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureVault - Gestionnaire Zero-Knowledge",
  description: "Vos mots de passe chiffrés, accessibles uniquement par vous.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {/* On enveloppe toute l'app ici */}
        <VaultProvider>
          {children}
        </VaultProvider>
      </body>
    </html>
  );
}