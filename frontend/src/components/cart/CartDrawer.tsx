'use client';
import { Lock } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatPrice, getImageUrl } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { items, removeItem, clearCart, total, isOpen, closeCart } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={closeCart} aria-hidden="true" />
      <aside className={styles.drawer} role="dialog" aria-label="Carrinho de compras" aria-modal="true">

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Carrinho
              {items.length > 0 && (
                <span className={styles.itemCount}>· {items.length} {items.length === 1 ? 'obra' : 'obras'}</span>
              )}
            </h2>
          </div>
          <button onClick={closeCart} className={styles.closeBtn} aria-label="Fechar carrinho" id="close-cart-btn">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">◻</span>
              <p className={styles.emptyText}>Seu carrinho está vazio</p>
              <p className={styles.emptyHint}>Explore o catálogo e adicione obras que despertem seu interesse.</p>
              <button className="btn btn-outline" onClick={closeCart} style={{ marginTop: 'var(--sp-2)' }}>
                Explorar obras
              </button>
            </div>
          ) : (
            <>
              <ul className={styles.items} role="list">
                {items.map(item => {
                  const variantImage = item.variant
                    ? item.artwork.variants?.find(v => v.name === item.variant)?.image
                    : undefined;
                  return (
                    <li key={`${item.artwork._id}-${item.variant ?? ''}`} className={styles.item}>
                      <div className={styles.itemImage}>
                        <Image
                          src={getImageUrl(variantImage || item.artwork.images[0])}
                          alt={item.artwork.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="72px"
                        />
                      </div>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>
                          {item.artwork.title}
                          {item.variant ? ` — ${item.variant}` : ''}
                        </span>
                        <span className={styles.itemMaterial}>{item.artwork.material}</span>
                        <span className={styles.itemPrice}>{formatPrice(item.artwork.price)}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.artwork._id, item.variant)}
                        className={styles.removeBtn}
                        aria-label={`Remover ${item.artwork.title} do carrinho`}
                      >
                        <CloseIcon size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Footer / Checkout */}
              <div className={styles.footer}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrice(total)}</span>
                </div>

                {/* PRIMARY CTA — maximum prominence */}
                <Link
                  href="/checkout"
                  className={styles.checkoutBtn}
                  onClick={closeCart}
                  id="checkout-btn"
                >
                  Finalizar Compra
                  <span className={styles.checkoutArrow} aria-hidden="true">→</span>
                </Link>

                <p className={styles.secureNote}>
                  <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
                  Compra segura · Pix, Cartão ou Boleto
                </p>

                <button onClick={clearCart} className={styles.clearBtn}>
                  Esvaziar carrinho
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
