'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getArtworks, getOrderStats, getOrders, Artwork, Order, formatPrice } from '@/lib/api';
import styles from './page.module.css';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, sold: 0, revenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    const a = localStorage.getItem('av_admin');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    if (a) setAdmin(JSON.parse(a));

    Promise.all([
      getArtworks().catch(() => []),
      getOrderStats(t).catch(() => ({ total: 0, sold: 0, revenue: 0, pendingOrders: 0 })),
      getOrders(t).catch(() => []),
    ]).then(([artworkList, orderStats, orderList]) => {
      setArtworks(artworkList as Artwork[]);
      setStats(orderStats as any);
      setOrders((orderList as Order[]).slice(0, 5));
      setLoading(false);
    });
  }, []);

  function logout() {
    localStorage.removeItem('av_token');
    localStorage.removeItem('av_admin');
    router.push('/admin/login');
  }

  if (loading) {
    return <div className={styles.loading}><span>Carregando...</span></div>;
  }

  const available = artworks.filter(a => a.status === 'AVAILABLE').length;
  const sold = artworks.filter(a => a.status === 'SOLD').length;

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={`${styles.navItem} ${styles.active}`} id="nav-dashboard">
            ◈ Dashboard
          </Link>
          <Link href="/admin/pedidos" className={styles.navItem} id="nav-pedidos">
            ✉ Pedidos
          </Link>
          <Link href="/admin/obras" className={styles.navItem} id="nav-obras">
            ▣ Obras
          </Link>
          <Link href="/admin/obras/nova" className={styles.navItem} id="nav-nova-obra">
            + Nova Obra
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.adminName}>{admin?.name}</span>
          <button onClick={logout} className={styles.logoutBtn}>Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total de Obras</span>
            <span className={styles.statValue}>{artworks.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Disponíveis</span>
            <span className={`${styles.statValue} ${styles.statAvailable}`}>{available}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Vendidas</span>
            <span className={`${styles.statValue} ${styles.statSold}`}>{sold}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Pedidos</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
          <div className={styles.actions}>
            <Link href="/admin/obras/nova" className="btn btn-primary" id="quick-add-artwork">
              + Adicionar obra
            </Link>
            <Link href="/admin/obras" className="btn btn-outline">
              Gerenciar obras
            </Link>
          </div>
        </div>

        {/* Recent orders */}
        {orders.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Pedidos Recentes</h2>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>Cliente</span>
                <span>Itens</span>
                <span>Total</span>
                <span>Status</span>
                <span>Pagamento</span>
              </div>
              {orders.map(order => (
                <div key={order._id} className={styles.tableRow}>
                  <span>{order.customer.name}</span>
                  <span>{order.items.length} obra(s)</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                  <span className={`badge ${order.status === 'PAID' ? 'badge-available' : 'badge-sold'}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span>{order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelado' };
// Valores de payment_type_id do Mercado Pago (capturados no webhook)
const PAYMENT_LABELS: Record<string, string> = {
  account_money: 'Saldo MP',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Pix',
  ticket: 'Boleto',
};
