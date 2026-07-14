'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Inbox, Frame, Plus } from 'lucide-react';
import { getOrders, deleteOrder, Order, formatPrice, getImageUrl } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelado' };
const PAYMENT_LABELS: Record<string, string> = {
  account_money: 'Saldo MP',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Pix',
  ticket: 'Boleto',
};

type Filter = 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fullAddress(a: Order['customer']['address']): string {
  const line1 = [a.street, a.number].filter(Boolean).join(', ');
  const parts = [line1, a.complement, a.neighborhood, [a.city, a.state].filter(Boolean).join(' / '), a.zipCode];
  return parts.filter(Boolean).join(' · ');
}

export default function AdminPedidosPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('av_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getOrders(t).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  async function handleDelete(order: Order) {
    if (!confirm(`Excluir o pedido de ${order.customer.name} (${formatPrice(order.totalAmount)})? Esta ação não pode ser desfeita.`)) return;
    setDeleting(order._id);
    try {
      await deleteOrder(order._id, token);
      setOrders(prev => prev.filter(o => o._id !== order._id));
      toast('Pedido excluído');
    } catch (e: any) {
      toast(e.message || 'Erro ao excluir o pedido', 'error');
    } finally {
      setDeleting(null);
    }
  }

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>André Valença</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/dashboard" className={styles.navItem}><LayoutDashboard size={16} strokeWidth={1.5} /> Dashboard</Link>
          <Link href="/admin/pedidos" className={`${styles.navItem} ${styles.active}`}><Inbox size={16} strokeWidth={1.5} /> Pedidos</Link>
          <Link href="/admin/obras" className={styles.navItem}><Frame size={16} strokeWidth={1.5} /> Obras</Link>
          <Link href="/admin/obras/nova" className={styles.navItem}><Plus size={16} strokeWidth={1.5} /> Nova Obra</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={() => { localStorage.removeItem('av_token'); router.push('/admin/login'); }} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Pedidos</h1>
          <div className={styles.filters} role="tablist" aria-label="Filtrar pedidos">
            {(['ALL', 'PAID', 'PENDING', 'CANCELLED'] as Filter[]).map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'Todos' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : visible.length === 0 ? (
          <p className={styles.empty}>Nenhum pedido {filter !== 'ALL' ? `com status “${STATUS_LABELS[filter]}”` : 'ainda'}.</p>
        ) : (
          <div className={styles.list}>
            {visible.map(order => (
              <article key={order._id} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div className={styles.orderMeta}>
                    <span className={`badge ${order.status === 'PAID' ? 'badge-available' : 'badge-sold'}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                    <span className={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className={styles.orderTotalWrap}>
                    <span className={styles.orderTotal}>{formatPrice(order.totalAmount)}</span>
                    <span className={styles.orderPayment}>
                      {order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—'}
                    </span>
                  </div>
                </div>

                <div className={styles.orderBody}>
                  {/* Entrega / contato */}
                  <div className={styles.block}>
                    <h3 className={styles.blockTitle}>Cliente & entrega</h3>
                    <p className={styles.customerName}>{order.customer.name}</p>
                    <dl className={styles.dl}>
                      <div><dt>E-mail</dt><dd><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></dd></div>
                      {order.customer.phone && <div><dt>Telefone</dt><dd>{order.customer.phone}</dd></div>}
                      {order.customer.cpf && <div><dt>CPF</dt><dd>{order.customer.cpf}</dd></div>}
                      <div><dt>Endereço</dt><dd>{fullAddress(order.customer.address) || '—'}</dd></div>
                    </dl>
                  </div>

                  {/* Itens */}
                  <div className={styles.block}>
                    <h3 className={styles.blockTitle}>Obras ({order.items.length})</h3>
                    <div className={styles.items}>
                      {order.items.map((item, i) => (
                        <div key={i} className={styles.item}>
                          <div className={styles.itemImg}>
                            <Image src={getImageUrl(item.image)} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="48px" />
                          </div>
                          <span className={styles.itemTitle}>{item.title}</span>
                          <span className={styles.itemPrice}>{formatPrice(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.orderActions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(order)}
                    disabled={deleting === order._id}
                  >
                    {deleting === order._id ? 'Excluindo...' : 'Excluir pedido'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
