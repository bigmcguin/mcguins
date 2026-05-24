import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SITE } from '@/lib/seo';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name}: Compare Australian land lease communities`,
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
      <html lang="en-AU" className={`${sans.variable} ${display.variable}`}>
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
