import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wordmarkWrap} aria-hidden="true">
        <span className={styles.wordmark}>André Valença</span>
      </div>

      <div className={styles.inner}>
        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <span className={styles.groupTitle}>Galeria</span>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/catalogo?categoria=esculturas">Esculturas</Link>
            <Link href="/catalogo?categoria=pinturas-em-tela">Pinturas</Link>
            <Link href="/catalogo?categoria=desenhos">Desenhos</Link>
          </div>
          <div className={styles.linkGroup}>
            <span className={styles.groupTitle}>Institucional</span>
            <Link href="/artista">O Artista</Link>
            <Link href="/contato">Contato</Link>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} André Valença. Todos os direitos reservados.</p>
        <p className={styles.bottomRight}>
          Feito com ❤️ por{' '}
          <a href="https://github.com/Kilobe0" target="_blank" rel="noopener noreferrer">
            Matheus Achim
          </a>
        </p>
      </div>
    </footer>
  );
}
