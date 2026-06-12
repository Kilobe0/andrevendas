import { getFeaturedArtworks, getCategories } from '@/lib/api';
import ArtworkCard from '@/components/gallery/ArtworkCard';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/api';
import styles from './page.module.css';

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedArtworks().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const hero = featured[0];
  const grid = featured.slice(1);

  return (
    <>
      {/* ── HERO — composição editorial ──────────────────── */}
      {hero && (
        <section className={styles.hero} data-header-divider>
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <span className={styles.heroIndex}>Nº 001 — Em exposição</span>
              <h1 className={styles.heroTitle}>
                <em>{hero.title}</em>
              </h1>
              <p className={styles.heroMaterial}>
                {hero.material} · {hero.dimensions}
              </p>
              <div className={styles.heroActions}>
                <Link href={`/obra/${hero.slug}`} className="btn btn-primary" id="hero-cta">
                  Ver obra
                </Link>
              </div>
            </div>

            <div className={styles.heroFigure}>
              <div className={styles.heroImage}>
                {/* width/height são só proporção inicial; o CSS deixa a obra
                    no formato natural dela, sem corte */}
                <Image
                  src={getImageUrl(hero.images[0])}
                  alt={hero.title}
                  width={1200}
                  height={1200}
                  priority
                  quality={90}
                  sizes="(max-width: 900px) 100vw, 52vw"
                />
              </div>
              <figcaption className={styles.heroCaption}>
                <span>André Valença</span>
                <span>{hero.year || 'Peça única'}</span>
              </figcaption>
            </div>
          </div>

          <div className={styles.heroScroll} aria-hidden="true">
            <span>Rolar</span>
            <div className={styles.heroScrollLine} />
          </div>
        </section>
      )}

      {/* ── MANIFESTO ────────────────────────────────────── */}
      <section className={`section ${styles.manifesto}`}>
        <div className="container--narrow">
          <span className="index">Manifesto</span>
          <p className={styles.manifestoText}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
            tempor incididunt — <em>ut labore et dolore magna aliqua.</em>
          </p>
        </div>
      </section>

      {/* ── GRID DE OBRAS ────────────────────────────────── */}
      {grid.length > 0 && (
        <section className={`section ${styles.gridSection}`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className="index">01 — Acervo</span>
                <h2 className={styles.sectionTitle}>Obras em destaque</h2>
              </div>
              <Link href="/catalogo" className={styles.sectionLink}>
                Catálogo completo
              </Link>
            </div>
            <div className={styles.artworkGrid}>
              {grid.map((artwork, i) => (
                <div
                  key={artwork._id}
                  className={styles.gridItem}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <ArtworkCard artwork={artwork} priority={i < 2} showPrice={false} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORIAS — índice sobre tinta ──────────────── */}
      {categories.length > 0 && (
        <section className={styles.categoriesSection}>
          <div className="container">
            <span className={`index ${styles.indexOnDark}`}>02 — Índice</span>
            <h2 className={styles.categoriesTitle}>Explorar por categoria</h2>
            <div className={styles.categoriesList}>
              {categories.map((cat, i) => (
                <Link
                  key={cat._id}
                  href={`/catalogo?categoria=${cat.slug}`}
                  className={styles.categoryRow}
                  id={`category-${cat.slug}`}
                >
                  <span className={styles.categoryNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.categoryName}>{cat.name}</span>
                  <span className={styles.categoryDesc}>{cat.description}</span>
                  <span className={styles.categoryArrow} aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── ARTISTA ──────────────────────────────────────── */}
      <section className={`section ${styles.artistSection}`}>
        <div className="container--narrow">
          <div className={styles.artistContent}>
            <span className="index">03 — O artista</span>
            <h2 className={styles.artistTitle}>André Valença</h2>
            <p className={styles.artistText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.
            </p>
            <Link href="/artista" className="btn btn-outline" id="artist-cta">
              Conheça o artista
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
