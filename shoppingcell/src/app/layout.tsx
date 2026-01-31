import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShoppingCell — Peças Apple para revenda',
  description:
    'Peças de reposição Apple genuínas para revenda. Qualidade premium para assistências técnicas e revendedores.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
