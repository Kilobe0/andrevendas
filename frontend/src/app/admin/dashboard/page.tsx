'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getArtworks, getOrderStats, getOrders, publishSite, Artwork, Order, formatPrice } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import AdminShell from '@/components/admin/AdminShell';
import styles from './page.module.css';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, sold: 0, revenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);

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

  async function handlePublish() {
    setPublishing(true);
    try {
      const { ok, message } = await publishSite(token);
      toast(message, ok ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message || 'Erro ao publicar o site', 'error');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}><span>Carregando...</span></div>;
  }

  const available = artworks.filter(a => a.status === 'AVAILABLE').length;
  const sold = artworks.filter(a => a.status === 'SOLD').length;

  return (
    <AdminShell>
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
          <button
            className="btn btn-outline"
            onClick={handlePublish}
            disabled={publishing}
            id="publish-site-btn"
          >
            {publishing ? 'Publicando...' : 'Publicar site'}
          </button>
        </div>
        <p className={styles.publishNote}>
          Obras salvas são publicadas no site automaticamente em alguns minutos.
          Use “Publicar site” para forçar a atualização agora.
        </p>
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
                <span data-label="Cliente">{order.customer.name}</span>
                <span data-label="Itens">{order.items.length} obra(s)</span>
                <span data-label="Total">{formatPrice(order.totalAmount)}</span>
                <span data-label="Status">
                  <span className={`badge ${order.status === 'PAID' ? 'badge-available' : 'badge-sold'}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </span>
                <span data-label="Pagamento">{order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
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
