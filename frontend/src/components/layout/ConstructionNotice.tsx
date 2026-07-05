'use client';
import { useEffect, useState } from 'react';
import styles from './ConstructionNotice.module.css';

const STORAGE_KEY = 'construction-notice-dismissed';

// Aviso fixo de site em construção. Ao ser fechado, colapsa em um botão "i"
// que acompanha o scroll em todo o site e reabre o aviso completo.
export default function ConstructionNotice() {
  // null = ainda não hidratado (não renderiza nada no SSR)
  const [state, setState] = useState<'open' | 'collapsed' | null>(null);

  useEffect(() => {
    try {
      setState(sessionStorage.getItem(STORAGE_KEY) ? 'collapsed' : 'open');
    } catch {
      setState('open');
    }
  }, []);

  if (state === null) return null;

  const collapse = () => {
    setState('collapsed');
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  };

  const expand = () => setState('open');

  if (state === 'collapsed') {
    return (
      <button
        type="button"
        className={styles.infoButton}
        onClick={expand}
        aria-label="Informações sobre o site"
        title="Informações sobre o site"
      >
        <span className={styles.infoGlyph} aria-hidden="true">i</span>
      </button>
    );
  }

  return (
    <div className={styles.notice} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.text}>
        <strong className={styles.title}>Site em construção</strong>
        <span className={styles.detail}>
          Algumas informações ainda estão sendo finalizadas.
        </span>
        <span className={styles.detail}>
          As obras à venda são entregues apenas em Sete Lagoas (MG) e região.
          Compras de outras localidades valem como reserva da obra.
        </span>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={collapse}
        aria-label="Recolher aviso"
      >
        ×
      </button>
    </div>
  );
}
