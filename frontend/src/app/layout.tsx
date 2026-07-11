import type { Metadata } from 'next';
import { Newsreader, Instrument_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import SiteChrome from '@/components/layout/SiteChrome';
import { SITE_URL, SITE_NAME } from '@/lib/site';

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
  // Resolve URLs relativas de OG/canonical para o domínio de produção
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: '%s | André Valença' },
  description: 'Galeria de arte de André Valença — esculturas, pinturas e desenhos originais. Obras únicas à venda e acervo do artista.',
  keywords: ['galeria de arte', 'obras de arte', 'esculturas', 'pinturas', 'arte contemporânea', 'André Valença'],
  authors: [{ name: 'André Valença' }],
  // './' faz cada rota apontar o canonical para si mesma
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: './',
    siteName: SITE_NAME,
    title: 'André Valença — Galeria de Arte Contemporânea',
    description: 'Esculturas, pinturas e desenhos originais de André Valença.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Aplica o tema antes do primeiro paint para não piscar claro→escuro
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

  return (
    <html
      lang="pt-BR"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
