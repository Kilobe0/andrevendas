'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArtworks, getCategories, deleteArtwork, Artwork, Category, formatPrice, getImageUrl, statusBadge } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import EditArtworkModal from '@/components/admin/EditArtworkModal';
import AdminShell from '@/components/admin/AdminShell';
import styles from './page.module.css';

export default function AdminObrasPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Artwork | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    loadArtworks();
    getCategories().then(setCategories).catch(() => {});
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
      toast(`Obra "${title}" removida`);
    } catch (e: any) {
      toast(e.message || 'Erro ao remover a obra', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminShell>
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
                <span className={`badge ${statusBadge(artwork.status).cls}`}
                  style={{ position: 'absolute', top: 8, left: 8 }}>
                  {statusBadge(artwork.status).label}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div>
                  <h3 className={styles.cardTitle}>{artwork.title}</h3>
                  <p className={styles.cardMeta}>{artwork.material} · {artwork.category?.name}</p>
                  <p className={styles.cardPrice}>{formatPrice(artwork.price)}</p>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setEditing(artwork)}
                    id={`edit-${artwork._id}`}
                  >
                    Editar
                  </button>
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

      {editing && (
        <EditArtworkModal
          artwork={editing}
          categories={categories}
          token={token}
          onSaved={updated => {
            // Atualiza o card na lista sem recarregar a página.
            setArtworks(prev => prev.map(a => (a._id === updated._id ? updated : a)));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminShell>
  );
}
