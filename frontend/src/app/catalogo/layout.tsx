import type { Metadata } from 'next';

// A página do catálogo é client component; a metadata vive neste layout.
export const metadata: Metadata = {
  title: 'Catálogo de Obras',
  description:
    'Catálogo completo de obras de André Valença — esculturas, pinturas e desenhos originais disponíveis para venda.',
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
