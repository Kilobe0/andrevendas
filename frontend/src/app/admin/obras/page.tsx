'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArtworks, deleteArtwork, Artwork, formatPrice, getImageUrl } from '@/lib/api';
import styles from './page.module.css';

export default function AdminObrasPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    loadArtworks();
  }, []);

  async function loadArtworks() {
    const list = await getArtworks().catch(() => []);
    setArtworks(list);
    setLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remover a obra "${title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      await deleteArtwork(id, token);
      setArtworks(prev => prev.filter(a => a._id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={styles.navItem}>◈ Dashboard</Link>
          <Link href="/admin/pedidos" className={styles.navItem}>✉ Pedidos</Link>
          <Link href="/admin/obras" className={`${styles.navItem} ${styles.active}`}>▣ Obras</Link>
          <Link href="/admin/obras/nova" className={styles.navItem}>+ Nova Obra</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={() => { localStorage.removeItem('av_token'); router.push('/admin/login'); }} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Gerenciar Obras</h1>
          <Link href="/admin/obras/nova" className="btn btn-primary" id="add-obra-btn">
            + Nova obra
          </Link>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : (
          <div className={styles.grid}>
            {artworks.map(artwork => (
              <div key={artwork._id} className={styles.card}>
                <div className={styles.cardImage}>
                  <Image
                    src={getImageUrl(artwork.images[0])}
                    alt={artwork.title}
                    fill style={{ objectFit: 'cover' }}
                  />
                  <span className={`badge ${artwork.status === 'AVAILABLE' ? 'badge-available' : 'badge-sold'}`}
                    style={{ position: 'absolute', top: 8, left: 8 }}>
                    {artwork.status === 'AVAILABLE' ? 'Disponível' : 'Vendida'}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.cardTitle}>{artwork.title}</h3>
                    <p className={styles.cardMeta}>{artwork.material} · {artwork.category?.name}</p>
                    <p className={styles.cardPrice}>{formatPrice(artwork.price)}</p>
                  </div>
                  <div className={styles.cardActions}>
                    <Link href={`/admin/obras/${artwork._id}`} className="btn btn-outline" style={{ flex: 1 }}>
                      Editar
                    </Link>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(artwork._id, artwork.title)}
                      disabled={deleting === artwork._id}
                      id={`delete-${artwork._id}`}
                    >
                      {deleting === artwork._id ? '...' : 'Remover'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
