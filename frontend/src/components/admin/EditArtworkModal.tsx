'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Artwork, Category } from '@/lib/api';
import ArtworkEditForm from './ArtworkEditForm';
import styles from './EditArtworkModal.module.css';

interface Props {
  artwork: Artwork;
  categories: Category[];
  token: string;
  onSaved: (updated: Artwork) => void;
  onClose: () => void;
}

export default function EditArtworkModal({ artwork, categories, token, onSaved, onClose }: Props) {
  // ESC fecha; trava o scroll da página enquanto o modal está aberto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Editar obra ${artwork.title}`}
      id="edit-artwork-modal"
    >
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Editar — {artwork.title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <ArtworkEditForm
          artwork={artwork}
          categories={categories}
          token={token}
          onSaved={onSaved}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
