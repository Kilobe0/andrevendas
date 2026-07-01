'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { useCart } from '@/lib/cart';
import styles from '../page.module.css';

type Outcome = 'approved' | 'pending' | 'failure';

function resolveOutcome(status: string | null): Outcome {
  if (status === 'approved') return 'approved';
  if (status === 'pending' || status === 'in_process') return 'pending';
  return 'failure';
}

const CONTENT: Record<Outcome, { Icon: LucideIcon; title: string; text: string }> = {
  approved: {
    Icon: CheckCircle2,
    title: 'Pagamento confirmado!',
    text: 'Obrigado pela sua aquisição. Entraremos em contato em breve com os detalhes de envio. A obra é sua.',
  },
  pending: {
    Icon: Clock,
    title: 'Pagamento em processamento',
    text: 'Estamos aguardando a confirmação do pagamento (Pix ou boleto podem levar alguns instantes). Assim que for aprovado, você receberá um e-mail. A obra fica reservada até lá.',
  },
  failure: {
    Icon: XCircle,
    title: 'Pagamento não concluído',
    text: 'O pagamento não foi finalizado. A obra voltou a ficar disponível — você pode tentar novamente quando quiser.',
  },
};

function RetornoContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();

  // O Mercado Pago anexa o status do pagamento na URL de retorno.
  const status = params.get('status') || params.get('collection_status');
  const outcome = resolveOutcome(status);
  const { Icon, title, text } = CONTENT[outcome];

  // Esvazia o carrinho quando o pagamento foi aprovado ou está a caminho.
  useEffect(() => {
    if (outcome === 'approved' || outcome === 'pending') clearCart();
  }, [outcome, clearCart]);

  return (
    <div className={styles.page}>
      <div className="container--narrow">
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true"><Icon size={34} strokeWidth={1.5} /></div>
          <h1 className={styles.successTitle}>{title}</h1>
          <p className={styles.successText}>{text}</p>
          {outcome === 'failure' ? (
            <Link href="/checkout" className="btn btn-primary btn-lg">
              Tentar novamente
            </Link>
          ) : (
            <Link href="/" className="btn btn-primary btn-lg">
              Voltar ao início
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RetornoPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <RetornoContent />
    </Suspense>
  );
}
