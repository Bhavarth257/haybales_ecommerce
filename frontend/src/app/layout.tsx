import type { Metadata, Viewport } from 'next';
import { Noto_Sans } from 'next/font/google';
import { Assistant } from '../components/ai/Assistant';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Providers } from '../components/Providers';
import { contentSecurityPolicy, SITE_URL } from '../lib/config';
import './globals.css';

// One plain sans for everything: headings are the same family, just heavier (Noto also covers the Indic scripts).
const body = Noto_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Parali Setu: sell stubble, stop burning', template: '%s · Parali Setu' },
  description: 'A marketplace where farmers sell crop stubble to biomass plants, mills and feed makers instead of burning it.',
  openGraph: {
    type: 'website',
    siteName: 'Parali Setu',
    locale: 'en_IN',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Parali Setu: sell stubble, stop burning' }],
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'Parali Setu', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = { themeColor: '#2f5d34', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable}>
      {/* Dev mode needs eval for hot reload, so the policy only ships in production builds. */}
      {process.env.NODE_ENV === 'production' && (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy()} />
        </head>
      )}
      <body className="min-h-dvh antialiased">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="mx-auto min-h-dvh max-w-6xl px-4 py-6 sm:py-10">
            {children}
          </main>
          <Footer />
          <Assistant />
        </Providers>
      </body>
    </html>
  );
}
