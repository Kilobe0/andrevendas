'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { createOrder, formatPrice, getImageUrl } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

interface FormData {
  name: string; email: string; phone: string; cpf: string;
  street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string; zipCode: string;
}

const EMPTY: FormData = {
  name: '', email: '', phone: '', cpf: '',
  street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '', zipCode: '',
};

const PAYMENT_OPTIONS = [
  { key: 'PIX' as PaymentMethod, icon: '◈', label: 'Pix', discount: '5% off' },
  { key: 'CREDIT_CARD' as PaymentMethod, icon: '▣', label: 'Cartão de Crédito', discount: '' },
  { key: 'BOLETO' as PaymentMethod, icon: '≡', label: 'Boleto', discount: '' },
];

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<FormData>(EMPTY);
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');

  const update = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isValid = form.name && form.email && form.cpf;

  if (items.length === 0 && !orderId) {
    return (
      <div className={styles.page}>
        <div className="container--narrow">
          <div className={styles.emptyCart}>
            <span style={{ fontSize: '2.5rem', color: 'var(--border)' }} aria-hidden="true">◻</span>
            <h1 className={styles.emptyCartTitle}>Carrinho vazio</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>
              Adicione obras ao carrinho antes de finalizar a compra.
            </p>
            <Link href="/catalogo" className="btn btn-primary">
              Explorar catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className={styles.page}>
        <div className="container--narrow">
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">✦</div>
            <h1 className={styles.successTitle}>Pedido confirmado!</h1>
            <p className={styles.successText}>
              Obrigado pela sua aquisição. Entraremos em contato em breve com
              os detalhes de envio e instruções de pagamento.
            </p>
            <span className={styles.orderId}>Pedido #{orderId.slice(-8).toUpperCase()}</span>
            <Link href="/" className="btn btn-primary btn-lg">
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const order = await createOrder({
        paymentMethod: payment,
        customer: {
          name: form.name, email: form.email, phone: form.phone, cpf: form.cpf,
          address: {
            street: form.street, number: form.number, complement: form.complement,
            neighborhood: form.neighborhood, city: form.city, state: form.state, zipCode: form.zipCode,
          },
        },
        items: items.map(i => ({ artworkId: i.artwork._id, variant: i.variant })),
      });
      setOrderId(order._id);
      clearCart();
    } catch (e: any) {
      setError(e.message || 'Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader} data-header-divider>
        <div className="container--narrow">
          <span className="label">Compra</span>
          <h1 className={styles.pageTitle}>Finalizar Compra</h1>
          <div className={styles.progressSteps} role="list" aria-label="Etapas do checkout">
            {['Dados Pessoais', 'Endereço', 'Pagamento'].map((label, i) => (
              <span key={i} role="listitem" style={{ display: 'contents' }}>
                <span className={`${styles.step} ${styles.stepActive}`}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  {label}
                </span>
                {i < 2 && <span className={styles.stepDivider} aria-hidden="true" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className={styles.formSection} noValidate>

          {/* Block 1: Dados pessoais */}
          <div className={styles.formBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum} aria-hidden="true">1</span>
              <h2 className={styles.blockTitle}>Dados pessoais</h2>
            </div>
            <div className={styles.formGrid}>
              <div className={`form-group ${styles.spanFull}`}>
                <label className="form-label" htmlFor="name">Nome completo *</label>
                <input
                  className="form-input"
                  id="name"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">E-mail *</label>
                <input
                  className="form-input"
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Telefone</label>
                <input
                  className="form-input"
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cpf">CPF *</label>
                <input
                  className="form-input"
                  id="cpf"
                  value={form.cpf}
                  onChange={e => update('cpf', e.target.value)}
                  required
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* Block 2: Endereço */}
          <div className={styles.formBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum} aria-hidden="true">2</span>
              <h2 className={styles.blockTitle}>Endereço de entrega</h2>
            </div>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="zipCode">CEP</label>
                <input
                  className="form-input"
                  id="zipCode"
                  value={form.zipCode}
                  onChange={e => update('zipCode', e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </div>
              <div className={`form-group ${styles.spanFull}`}>
                <label className="form-label" htmlFor="street">Rua / Avenida</label>
                <input
                  className="form-input"
                  id="street"
                  value={form.street}
                  onChange={e => update('street', e.target.value)}
                  autoComplete="address-line1"
                  placeholder="Nome da rua ou avenida"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="number">Número</label>
                <input
                  className="form-input"
                  id="number"
                  value={form.number}
                  onChange={e => update('number', e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="complement">
                  Complemento <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  className="form-input"
                  id="complement"
                  value={form.complement}
                  onChange={e => update('complement', e.target.value)}
                  autoComplete="address-line2"
                  placeholder="Apto, sala, bloco..."
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="neighborhood">Bairro</label>
                <input className="form-input" id="neighborhood" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="city">Cidade</label>
                <input className="form-input" id="city" value={form.city} onChange={e => update('city', e.target.value)} autoComplete="address-level2" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="state">Estado</label>
                <input className="form-input" id="state" value={form.state} onChange={e => update('state', e.target.value)} placeholder="SP" maxLength={2} autoComplete="address-level1" />
              </div>
            </div>
          </div>

          {/* Block 3: Pagamento */}
          <div className={styles.formBlock}>
            <div className={styles.blockHeader}>
              <span className={styles.blockNum} aria-hidden="true">3</span>
              <h2 className={styles.blockTitle}>Forma de pagamento</h2>
            </div>
            <div className={styles.paymentOptions} role="radiogroup" aria-label="Método de pagamento">
              {PAYMENT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  className={`${styles.paymentBtn} ${payment === opt.key ? styles.paymentActive : ''}`}
                  onClick={() => setPayment(opt.key)}
                  aria-checked={payment === opt.key}
                  id={`payment-${opt.key.toLowerCase()}`}
                >
                  <span className={styles.paymentIcon} aria-hidden="true">{opt.icon}</span>
                  <span className={styles.paymentLabel}>{opt.label}</span>
                  {opt.discount && (
                    <span className={styles.paymentDiscount}>{opt.discount}</span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.paymentDetails}>
              {payment === 'PIX' && (
                <p className={styles.paymentNote}>
                  💡 Após confirmar, você receberá a chave Pix e QR Code por e-mail.
                  Pagamento confirmado em segundos.
                </p>
              )}
              {payment === 'CREDIT_CARD' && (
                <div className={styles.formGrid} style={{ marginTop: 0 }}>
                  <div className={`form-group ${styles.spanFull}`}>
                    <label className="form-label">Número do cartão</label>
                    <input className="form-input" placeholder="0000 0000 0000 0000" inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Validade</label>
                    <input className="form-input" placeholder="MM/AA" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input className="form-input" placeholder="123" inputMode="numeric" />
                  </div>
                  <div className={`form-group ${styles.spanFull}`}>
                    <label className="form-label">Nome no cartão</label>
                    <input className="form-input" placeholder="Exatamente como no cartão" autoComplete="cc-name" />
                  </div>
                </div>
              )}
              {payment === 'BOLETO' && (
                <p className={styles.paymentNote}>
                  📄 O boleto será gerado após confirmação. Válido por 3 dias úteis.
                  O pedido é reservado até o pagamento ser identificado.
                </p>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className={styles.errorMsg} role="alert">
              <span aria-hidden="true">⚠</span>
              {error}
            </div>
          )}

          {/* ── PRIMARY SUBMIT CTA ── */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !isValid}
            id="confirm-order-btn"
            aria-busy={loading}
          >
            {loading ? (
              <span className={styles.submitBtnLoading}>
                <span className={styles.spinner} aria-hidden="true" />
                Processando...
              </span>
            ) : (
              `Confirmar Pedido · ${formatPrice(total)}`
            )}
          </button>

          {/* Trust signals below CTA */}
          <div className={styles.trustLine}>
            <span className={styles.trustItem}><span aria-hidden="true">🔒</span> Compra segura</span>
            <span className={styles.trustItem}><span aria-hidden="true">📦</span> Entrega com seguro</span>
            <span className={styles.trustItem}><span aria-hidden="true">✦</span> Certificado incluso</span>
          </div>
        </form>

        {/* ── Order Summary ── */}
        <aside className={styles.summary} aria-label="Resumo do pedido">
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Resumo</h2>
          </div>
          <div className={styles.summaryItems}>
            {items.map(item => {
              const variantImage = item.variant
                ? item.artwork.variants?.find(v => v.name === item.variant)?.image
                : undefined;
              return (
                <div key={`${item.artwork._id}-${item.variant ?? ''}`} className={styles.summaryItem}>
                  <div className={styles.summaryItemImage}>
                    <Image
                      src={getImageUrl(variantImage || item.artwork.images[0])}
                      alt={item.artwork.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="52px"
                    />
                  </div>
                  <div className={styles.summaryItemInfo}>
                    <span className={styles.summaryItemTitle}>
                      {item.artwork.title}
                      {item.variant ? ` — ${item.variant}` : ''}
                    </span>
                    <span className={styles.summaryItemMaterial}>{item.artwork.material}</span>
                  </div>
                  <span className={styles.summaryItemPrice}>{formatPrice(item.artwork.price)}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.summaryFooter}>
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalValue}>{formatPrice(total)}</span>
            </div>
            <p className={styles.summaryNote}>
              Cada obra é uma peça única. Após a confirmação do pagamento,
              ela é marcada como indisponível e reservada exclusivamente para você.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
