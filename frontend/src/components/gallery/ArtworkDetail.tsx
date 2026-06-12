'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Artwork, formatPrice, getImageUrl } from '@/lib/api';
import { useCart } from '@/lib/cart';
import ArtworkCard from './ArtworkCard';
import styles from './ArtworkDetail.module.css';

interface Props {
  artwork: Artwork;
  related: Artwork[];
}

export default function ArtworkDetail({ artwork, related }: Props) {
  const { addItem, hasItem, openCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const variants = artwork.variants ?? [];
  const hasVariants = variants.length > 0;

  const isAvailable = artwork.status === 'AVAILABLE';
  const needsVariant = hasVariants && !selectedVariant;
  const inCart = hasItem(artwork._id, selectedVariant ?? undefined);

  function selectVariant(name: string, image: string) {
    setSelectedVariant(name);
    const idx = artwork.images.indexOf(image);
    if (idx >= 0) setActiveImage(idx);
  }

  function handleAddToCart() {
    if (needsVariant) return;
    if (inCart) { openCart(); return; }
    addItem(artwork, selectedVariant ?? undefined);
  }

  const categoryName = typeof artwork.category === 'object' ? artwork.category.name : '';
  const categorySlug = typeof artwork.category === 'object' ? artwork.category.slug : '';

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className="container">
          <div className={styles.breadcrumbInner}>
            <Link href="/catalogo">Catálogo</Link>
            <span className={styles.breadcrumbSep} aria-hidden="true">·</span>
            <Link href={`/catalogo?categoria=${categorySlug}`}>{categoryName}</Link>
            <span className={styles.breadcrumbSep} aria-hidden="true">·</span>
            <span aria-current="page">{artwork.title}</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* ── Images ── */}
          <div className={styles.images}>
            <div className={styles.mainImage} role="img" aria-label={`${artwork.title} — imagem principal`}>
              {/* width/height são só proporção inicial; o CSS exibe a obra
                  completa no formato natural dela, sem corte */}
              <Image
                src={getImageUrl(artwork.images[activeImage] || artwork.images[0])}
                alt={artwork.title}
                width={1200}
                height={1200}
                priority
                quality={95}
                sizes="(max-width: 900px) 100vw, 58vw"
              />
              {!isAvailable && (
                <div className={styles.soldOverlay} role="status" aria-label="Obra indisponível">
                  <span className={styles.soldOverlayText}>Obra Vendida</span>
                </div>
              )}
            </div>

            {!hasVariants && artwork.images.length > 1 && (
              <div className={styles.thumbnails} role="tablist" aria-label="Galeria de imagens">
                {artwork.images.map((img, i) => (
                  <button
                    key={i}
                    role="tab"
                    className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Ver imagem ${i + 1}`}
                    aria-selected={i === activeImage}
                  >
                    <Image
                      src={getImageUrl(img)}
                      alt=""
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="72px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info Panel ── */}
          <div className={styles.info}>

            {/* Category pill */}
            <div className={styles.categoryLabel}>
              <Link href={`/catalogo?categoria=${categorySlug}`} className={styles.categoryLink}>
                {categoryName}
              </Link>
            </div>

            {/* Title */}
            <h1 className={styles.title}>{artwork.title}</h1>

            {/* Status badge */}
            <div className={styles.statusRow}>
              <span className={`badge ${isAvailable ? 'badge-available' : 'badge-sold'}`}>
                {isAvailable ? '● Disponível' : '○ Indisponível'}
              </span>
              {hasVariants && (
                <span className={styles.seriesNote}>Série de {variants.length} pinturas</span>
              )}
            </div>

            {/* Price — prominent anchor */}
            <div className={styles.priceDisplay} aria-label={`Preço: ${formatPrice(artwork.price)}`}>
              {formatPrice(artwork.price)}
            </div>

            {/* Description */}
            {artwork.description && (
              <p className={styles.description}>{artwork.description}</p>
            )}

            {/* Specs */}
            <dl className={styles.specs}>
              <div className={styles.spec}>
                <dt className={styles.specLabel}>Material</dt>
                <dd className={styles.specValue}>{artwork.material}</dd>
              </div>
              {artwork.dimensions && (
                <div className={styles.spec}>
                  <dt className={styles.specLabel}>Dimensões</dt>
                  <dd className={styles.specValue}>{artwork.dimensions}</dd>
                </div>
              )}
              {artwork.weight && (
                <div className={styles.spec}>
                  <dt className={styles.specLabel}>Peso</dt>
                  <dd className={styles.specValue}>{artwork.weight}</dd>
                </div>
              )}
              {artwork.year && (
                <div className={styles.spec}>
                  <dt className={styles.specLabel}>Ano</dt>
                  <dd className={styles.specValue}>{artwork.year}</dd>
                </div>
              )}
              <div className={styles.spec}>
                <dt className={styles.specLabel}>Edição</dt>
                <dd className={styles.specValue}>
                  {hasVariants ? `Série de ${variants.length} peças únicas` : 'Peça única e original'}
                </dd>
              </div>
              <div className={styles.spec}>
                <dt className={styles.specLabel}>Artista</dt>
                <dd className={styles.specValue}>André Valença</dd>
              </div>
            </dl>

            {/* ── Seletor de pintura (obras em série) ── */}
            {hasVariants && (
              <div className={styles.variantSection} role="radiogroup" aria-label="Selecione a pintura">
                <span className={styles.variantLabel}>Selecione a pintura</span>
                <div className={styles.variantOptions}>
                  {variants.map(v => {
                    const sold = v.status !== 'AVAILABLE';
                    const active = selectedVariant === v.name;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={sold}
                        className={`${styles.variantBtn} ${active ? styles.variantActive : ''} ${sold ? styles.variantSold : ''}`}
                        onClick={() => selectVariant(v.name, v.image)}
                        id={`variant-${v.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span className={styles.variantThumb}>
                          <Image
                            src={getImageUrl(v.image)}
                            alt=""
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="64px"
                          />
                        </span>
                        <span className={styles.variantName}>{v.name}</span>
                        {sold && <span className={styles.variantSoldTag}>Vendida</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CTAs — clear hierarchy ── */}
            <div className={styles.actions}>
              {/* PRIMARY: Add to cart / View cart */}
              <button
                className={`${styles.btnBuyPrimary} ${inCart ? styles.inCart : ''}`}
                onClick={handleAddToCart}
                disabled={!isAvailable || needsVariant}
                id={`add-to-cart-${artwork.slug}`}
                aria-label={
                  !isAvailable ? 'Obra indisponível' :
                  needsVariant ? 'Selecione uma pintura para continuar' :
                  inCart ? 'Ver carrinho' : `Adicionar ${artwork.title} ao carrinho`
                }
              >
                {!isAvailable
                  ? 'Obra Indisponível'
                  : needsVariant
                    ? 'Selecione uma pintura'
                    : inCart
                      ? <>Ver carrinho <span className={styles.btnArrow} aria-hidden="true">→</span></>
                      : <>Adicionar ao Carrinho</>
                }
              </button>

              {/* SECONDARY: Buy now (direct checkout) */}
              {isAvailable && !inCart && !needsVariant && (
                <Link
                  href={`/checkout?obra=${artwork._id}`}
                  className={styles.btnBuyNow}
                  onClick={() => addItem(artwork, selectedVariant ?? undefined)}
                  id={`buy-now-${artwork.slug}`}
                >
                  Comprar agora
                </Link>
              )}
            </div>

            {/* Guarantee / trust block */}
            <div className={styles.guarantee}>
              <span className={styles.guaranteeIcon} aria-hidden="true">✦</span>
              <p className={styles.guaranteeText}>
                <strong>Lorem ipsum dolor sit amet</strong>
                Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
                et dolore magna aliqua.
              </p>
            </div>

          </div>
        </div>

        {/* ── Related Works ── */}
        {related.length > 0 && (
          <section className={styles.related} aria-label="Obras relacionadas">
            <h2 className={styles.relatedTitle}>Obras da mesma categoria</h2>
            <div className={styles.relatedGrid}>
              {related.map(r => (
                <ArtworkCard key={r._id} artwork={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
