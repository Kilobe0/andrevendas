import type { Metadata } from 'next';
import ToastHost from '@/components/admin/Toast';

// Área administrativa não deve aparecer em buscadores.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// Bump manual a cada deploy do admin — identifica qual versão o navegador
// está rodando (diagnóstico de cache/bundle antigo).
const ADMIN_BUILD = 'v11';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
      <span
        style={{
          position: 'fixed', bottom: 4, left: 8, zIndex: 999,
          fontSize: 10, opacity: 0.45, pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
        aria-hidden="true"
      >
        admin {ADMIN_BUILD}
      </span>
    </>
  );
}
