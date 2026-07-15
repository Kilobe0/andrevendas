'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Inbox, Frame, Plus, ArrowLeft } from 'lucide-react';
import { getArtworks, getCategories, Artwork, Category } from '@/lib/api';
import ArtworkEditForm from '@/components/admin/ArtworkEditForm';
// Reaproveita o visual da tela "Nova Obra" (mesmo layout de formulário).
import styles from '../nova/page.module.css';

// Acesso direto por URL (?id=...). A edição a partir da lista de obras
// abre em modal na própria página — ver EditArtworkModal.
function EditarObraInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') || '';

  const [token, setToken] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getCategories().then(setCategories).catch(() => {});

    // Sem endpoint de busca por id: carrega a lista e localiza a obra.
    getArtworks()
      .then(list => {
        const a = list.find(x => x._id === id);
        if (!a) { setNotFound(true); return; }
        setArtwork(a);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingData(false));
  }, [id]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={styles.navItem}><LayoutDashboard size={16} strokeWidth={1.5} /> Dashboard</Link>
          <Link href="/admin/pedidos" className={styles.navItem}><Inbox size={16} strokeWidth={1.5} /> Pedidos</Link>
          <Link href="/admin/obras" className={`${styles.navItem} ${styles.active}`}><Frame size={16} strokeWidth={1.5} /> Obras</Link>
          <Link href="/admin/obras/nova" className={styles.navItem}><Plus size={16} strokeWidth={1.5} /> Nova Obra</Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Editar Obra</h1>
          <Link href="/admin/obras" className="btn btn-outline"><ArrowLeft size={16} strokeWidth={1.5} /> Voltar</Link>
        </div>

        {loadingData ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Carregando...</p>
        ) : notFound || !artwork ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Obra não encontrada. <Link href="/admin/obras" style={{ color: 'var(--accent-warm)' }}>Voltar para a lista</Link>.
          </p>
        ) : (
          <ArtworkEditForm
            artwork={artwork}
            categories={categories}
            token={token}
            onSaved={() => router.push('/admin/obras')}
            onCancel={() => router.push('/admin/obras')}
          />
        )}
      </main>
    </div>
  );
}

export default function EditarObraPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <EditarObraInner />
    </Suspense>
  );
}
