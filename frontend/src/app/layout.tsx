import type { Metadata } from 'next';
import { Newsreader, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

const serif = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-spline-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'André Valença — Galeria de Arte', template: '%s | André Valença' },
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  keywords: ['galeria de arte', 'obras de arte', 'esculturas', 'pinturas', 'arte contemporânea', 'André Valença'],
  authors: [{ name: 'André Valença' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://andrevalenca.com.br',
    siteName: 'André Valença — Galeria de Arte',
    title: 'André Valença — Galeria de Arte Contemporânea',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
