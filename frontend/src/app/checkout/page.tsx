'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Lock, Package, BadgeCheck, Info, MapPin, Clock, Truck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import {
  createOrder, formatPrice, getImageUrl, getOrderStatus, quoteShipping,
  loadCheckoutSession, saveCheckoutSession, clearCheckoutSession,
  CHECKOUT_SESSION_TTL_MS, type CheckoutSession, type ShippingOption,
} from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

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

// Sete Lagoas e municípios vizinhos têm entrega local combinada (sem frete).
// Fora da região o frete é cotado no Melhor Envio; se a cotação falhar, a
// compra ainda é aceita como reserva da obra (fallback).
const REGIAO_SETE_LAGOAS = [
  'sete lagoas', 'prudente de morais', 'capim branco', 'matozinhos',
  'pedro leopoldo', 'caetanopolis', 'paraopeba', 'cachoeira da prata',
  'fortuna de minas', 'inhauma', 'funilandia', 'jequitiba', 'baldim',
  'aracai', 'cordisburgo', 'santana de pirapama',
];

const normalizeCity = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const isRegiao = (city: string) => REGIAO_SETE_LAGOAS.includes(normalizeCity(city));

type CepCheck = 'idle' | 'loading' | 'in-region' | 'out-of-region' | 'not-found';
type ShippingState = 'idle' | 'loading' | 'ok' | 'error';

export default function CheckoutPage() {
  const { items, total } = useCart();

  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepCheck, setCepCheck] = useState<CepCheck>('idle');
  const [showReservaDialog, setShowReservaDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<CheckoutSession | null>(null);

  // Frete para fora de Sete Lagoas e região: cotado no backend (Melhor Envio).
  const [shippingState, setShippingState] = useState<ShippingState>('idle');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingSelected, setShippingSelected] = useState<ShippingOption | null>(null);

  const grandTotal = total + (shippingSelected?.price ?? 0);

  const update = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Pagamento em andamento? (cliente foi ao Mercado Pago e voltou sem pagar)
  // Confirma no servidor que o pedido ainda está pendente antes de oferecer
  // o retorno ao pagamento — se já foi pago ou expirou, descarta a sessão.
  useEffect(() => {
    const session = loadCheckoutSession();
    if (!session) return;
    getOrderStatus(session.orderId)
      .then(({ status }) => {
        if (status === 'PENDING') setPendingSession(session);
        else clearCheckoutSession();
      })
      .catch(() => setPendingSession(session)); // rede falhou: melhor oferecer do que sumir
  }, []);

  const dismissSession = () => {
    clearCheckoutSession();
    setPendingSession(null);
  };

  const sessionBanner = pendingSession && (
    <div className={styles.formBlock} role="status" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Clock size={20} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Você tem um pagamento em andamento.</strong>
          <p style={{ margin: '0.35rem 0 0.85rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm, 0.9rem)' }}>
            A obra segue reservada para você por até{' '}
            {Math.max(1, Math.round((pendingSession.expiresAt - Date.now()) / 60000))} minutos.
            Dá para voltar ao Mercado Pago e concluir de onde parou.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a href={pendingSession.initPoint} className="btn btn-primary" id="resume-payment-btn">
              Continuar pagamento
            </a>
            <button type="button" className="btn btn-outline" onClick={dismissSession}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Máscara leve + consulta ao ViaCEP quando o CEP fica completo: preenche o
  // endereço e verifica se a cidade está na área de entrega (Sete Lagoas e região)
  async function handleCep(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    update('zipCode', masked);

    // Qualquer mudança de CEP invalida a cotação anterior
    setShippingState('idle');
    setShippingOptions([]);
    setShippingSelected(null);

    if (digits.length < 8) {
      setCepCheck('idle');
      return;
    }

    setCepCheck('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepCheck('not-found');
        return;
      }
      setForm(f => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
      if (isRegiao(data.localidade || '')) {
        setCepCheck('in-region');
      } else {
        setCepCheck('out-of-region');
        fetchShipping(digits);
      }
    } catch {
      // ViaCEP fora do ar não pode travar a compra — segue sem verificação
      setCepCheck('idle');
    }
  }

  // Cota o frete no backend; se falhar, o fluxo antigo de "reserva sem
  // entrega" continua valendo como fallback.
  async function fetchShipping(cepDigits: string) {
    setShippingState('loading');
    try {
      const options = await quoteShipping(
        cepDigits,
        items.map(i => ({ artworkId: i.artwork._id })),
      );
      if (options.length === 0) {
        setShippingState('error');
        return;
      }
      setShippingOptions(options);
      setShippingSelected(options[0]); // mais barata pré-selecionada
      setShippingState('ok');
    } catch {
      setShippingState('error');
    }
  }

  const isValid = form.name && form.email && form.cpf;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className="container--narrow">
          {sessionBanner}
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    // Dupla verificação: fora da área de entrega E sem frete cotado, o
    // cliente precisa confirmar que entendeu que a compra vale como reserva.
    if (cepCheck === 'out-of-region' && !shippingSelected) {
      setShowReservaDialog(true);
      return;
    }
    submitOrder();
  }

  async function submitOrder() {
    setLoading(true);
    setError('');
    try {
      const { order, initPoint } = await createOrder({
        customer: {
          name: form.name, email: form.email, phone: form.phone, cpf: form.cpf,
          address: {
            street: form.street, number: form.number, complement: form.complement,
            neighborhood: form.neighborhood, city: form.city, state: form.state, zipCode: form.zipCode,
          },
        },
        items: items.map(i => ({ artworkId: i.artwork._id, variant: i.variant })),
        ...(shippingSelected
          ? { shipping: { company: shippingSelected.company, service: shippingSelected.service } }
          : {}),
      });
      // Guarda a sessão para o cliente poder retomar o pagamento se fechar
      // a aba do Mercado Pago (a reserva e o link duram ~30 min).
      saveCheckoutSession({
        orderId: order._id,
        initPoint,
        expiresAt: Date.now() + CHECKOUT_SESSION_TTL_MS,
      });
      // Redireciona para o Checkout Pro do Mercado Pago. O carrinho só é
      // limpo na volta, quando o pagamento é aprovado (página /checkout/retorno).
      window.location.href = initPoint;
    } catch (e: any) {
      setError(e.message || 'Erro ao processar pedido. Tente novamente.');
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

      {sessionBanner && <div className="container--narrow" style={{ marginTop: '1.5rem' }}>{sessionBanner}</div>}

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
                  onChange={e => handleCep(e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  aria-describedby="cep-feedback"
                />
              </div>
              <div className={styles.spanFull} id="cep-feedback" aria-live="polite">
                {cepCheck === 'loading' && (
                  <p className={styles.cepChecking}>Verificando CEP...</p>
                )}
                {cepCheck === 'not-found' && (
                  <p className={styles.cepChecking}>
                    CEP não encontrado — confira o número ou preencha o endereço manualmente.
                  </p>
                )}
                {cepCheck === 'in-region' && (
                  <p className={styles.cepOk}>
                    <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
                    Seu endereço está na nossa área de entrega — Sete Lagoas e região.
                  </p>
                )}
                {cepCheck === 'out-of-region' && shippingState === 'loading' && (
                  <p className={styles.cepChecking}>Calculando frete...</p>
                )}
                {cepCheck === 'out-of-region' && shippingState === 'ok' && (
                  <fieldset className={styles.shippingOptions}>
                    <legend className={styles.shippingLegend}>
                      <Truck size={15} strokeWidth={1.5} aria-hidden="true" /> Escolha o frete
                    </legend>
                    {shippingOptions.map(opt => {
                      const key = `${opt.company}-${opt.service}`;
                      const checked = shippingSelected?.company === opt.company && shippingSelected?.service === opt.service;
                      return (
                        <label key={key} className={`${styles.shippingOption} ${checked ? styles.shippingOptionActive : ''}`}>
                          <input
                            type="radio"
                            name="shipping"
                            checked={checked}
                            onChange={() => setShippingSelected(opt)}
                          />
                          <span className={styles.shippingOptionName}>
                            {opt.service} <span className={styles.shippingOptionCompany}>({opt.company})</span>
                          </span>
                          <span className={styles.shippingOptionEta}>
                            até {opt.deliveryDays} dia{opt.deliveryDays !== 1 ? 's' : ''} úteis
                          </span>
                          <span className={styles.shippingOptionPrice}>{formatPrice(opt.price)}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                {cepCheck === 'out-of-region' && shippingState === 'error' && (
                  <div className={styles.cepNotice} role="status">
                    <Info size={18} strokeWidth={1.5} aria-hidden="true" />
                    <div>
                      <strong>Não conseguimos calcular o frete agora.</strong>
                      <p>
                        Você ainda pode concluir a compra: a obra ficará{' '}
                        <strong>reservada em seu nome</strong> e entraremos em contato
                        para combinar a entrega e o valor do frete.
                      </p>
                    </div>
                  </div>
                )}
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
              <h2 className={styles.blockTitle}>Pagamento</h2>
            </div>
            <div className={styles.paymentDetails}>
              <p className={styles.paymentNote}>
                <Lock size={14} strokeWidth={1.5} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.4em' }} />
                Ao confirmar, você será levado ao ambiente seguro do Mercado Pago
                para escolher e concluir o pagamento (Pix, cartão ou boleto). A obra
                fica reservada para você até a confirmação.
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className={styles.errorMsg} role="alert">
              <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
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
                Redirecionando ao pagamento...
              </span>
            ) : (
              `Ir para o pagamento · ${formatPrice(grandTotal)}`
            )}
          </button>

          {/* Trust signals below CTA */}
          <div className={styles.trustLine}>
            <span className={styles.trustItem}><Lock size={14} strokeWidth={1.5} aria-hidden="true" /> Compra segura</span>
            <span className={styles.trustItem}><Package size={14} strokeWidth={1.5} aria-hidden="true" /> Entrega com seguro</span>
            <span className={styles.trustItem}><BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" /> Certificado incluso</span>
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
            {shippingSelected && (
              <div className={styles.summaryShippingRow}>
                <span>Frete — {shippingSelected.service}</span>
                <span>{formatPrice(shippingSelected.price)}</span>
              </div>
            )}
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalValue}>{formatPrice(grandTotal)}</span>
            </div>
            <p className={styles.summaryNote}>
              Cada obra é uma peça única. Após a confirmação do pagamento,
              ela é marcada como indisponível e reservada exclusivamente para você.
            </p>
          </div>
        </aside>
      </div>

      {/* Dupla verificação: compra fora da área de entrega vale como reserva */}
      {showReservaDialog && (
        <div
          className={styles.dialogOverlay}
          onClick={() => setShowReservaDialog(false)}
          role="presentation"
        >
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reserva-dialog-title"
            aria-describedby="reserva-dialog-text"
            onClick={e => e.stopPropagation()}
          >
            <span className="label">Atenção</span>
            <h2 id="reserva-dialog-title" className={styles.dialogTitle}>
              Seu endereço fica fora de Sete Lagoas e região
            </h2>
            <p id="reserva-dialog-text" className={styles.dialogText}>
              Não foi possível calcular o frete para o seu endereço agora. Você
              pode concluir a compra normalmente e a obra ficará{' '}
              <strong>reservada em seu nome</strong>; entraremos em contato para
              combinar a entrega e o valor do frete.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowReservaDialog(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowReservaDialog(false);
                  submitOrder();
                }}
              >
                Estou ciente, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
