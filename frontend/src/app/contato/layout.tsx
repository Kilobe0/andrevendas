import type { Metadata } from 'next';

// A página de contato é client component; a metadata vive neste layout.
export const metadata: Metadata = {
  title: 'Contato',
  description:
    'Entre em contato com André Valença — encomendas, visitas ao ateliê e informações sobre obras disponíveis.',
};

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
