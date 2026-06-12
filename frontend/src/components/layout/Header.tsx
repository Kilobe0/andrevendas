'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/artista', label: 'Artista' },
  { href: '/contato', label: 'Contato' },
];

export default function Header() {
  const { count, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMain}>André Valença</span>
          <span className={styles.logoSub}>Galeria de Arte</span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            onClick={openCart}
            className={styles.cartBtn}
            aria-label={`Carrinho (${count} itens)`}
            id="cart-button"
          >
            <CartIcon />
            {count > 0 && <span className={styles.cartBadge}>{count}</span>}
          </button>

          {/* Mobile menu toggle */}
          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            id="mobile-menu-toggle"
          >
            <span className={`${styles.menuLine} ${menuOpen ? styles.open : ''}`} />
            <span className={`${styles.menuLine} ${menuOpen ? styles.open : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav className={styles.mobileNav} aria-label="Navegação mobile">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
