import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SITE } from '@/lib/seo';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — Compare land lease communities Australia-wide`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Find and compare Australian land lease communities, lifestyle villages and over-50s communities. Real photos, site fees, reviews and homes for sale.',
  metadataBase: new URL(SITE.url),
  openGraph: { locale: 'en_AU' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en-AU" className={inter.variable}>
        <body className="min-h-screen flex flex-col">
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
