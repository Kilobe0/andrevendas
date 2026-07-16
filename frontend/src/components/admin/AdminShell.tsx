'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, Frame, Plus, LogOut } from 'lucide-react';
import styles from './AdminShell.module.css';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', Icon: Inbox },
  { href: '/admin/obras', label: 'Obras', Icon: Frame },
  { href: '/admin/obras/nova', label: 'Nova Obra', Icon: Plus },
];

// Casca comum das telas do admin: sidebar no desktop, topbar + barra de
// navegação inferior no mobile. Centraliza o nav (antes duplicado em cada
// página) e o logout.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    try {
      const a = localStorage.getItem('av_admin');
      if (a) setAdminName(JSON.parse(a).name ?? '');
    } catch {}
  }, []);

  function logout() {
    localStorage.removeItem('av_token');
    localStorage.removeItem('av_admin');
    router.push('/admin/login');
  }

  // "Obras" não pode acender junto com "Nova Obra" (prefixo em comum).
  const isActive = (href: string) =>
    href === '/admin/obras' ? pathname === '/admin/obras' : pathname?.startsWith(href);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${isActive(href) ? styles.active : ''}`}
            >
              <Icon size={16} strokeWidth={1.5} /> {label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          {adminName && <span className={styles.adminName}>{adminName}</span>}
          <button onClick={logout} className={styles.logoutBtn}>Sair</button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className={styles.topbar}>
        <Link href="/admin/dashboard" className={styles.topbarBrand}>
          André Valença <span>Admin</span>
        </Link>
        <button onClick={logout} className={styles.topbarLogout} aria-label="Sair">
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      {/* Navegação inferior mobile */}
      <nav className={styles.bottomNav} aria-label="Navegação do admin">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.bottomNavItem} ${isActive(href) ? styles.bottomActive : ''}`}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
