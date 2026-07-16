import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHmac, timingSafeEqual } from 'crypto';
import { ShippingToken, ShippingTokenDocument } from './shipping-token.schema';

const PROVIDER = 'melhorenvio';

// Escopos pedidos já pensando na compra de etiqueta (fase 2) — evita ter
// que reautorizar quando sairmos da cotação para o envio de verdade.
const OAUTH_SCOPES = [
  'shipping-calculate',
  'shipping-checkout',
  'shipping-companies',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'shipping-tracking',
  'cart-read',
  'cart-write',
  'orders-read',
].join(' ');

export interface QuoteProduct {
  id: string;
  width: number; // cm
  height: number; // cm
  length: number; // cm
  weight: number; // kg
  insurance_value: number; // R$
  quantity: number;
}

export interface QuoteOption {
  // Id numérico do serviço no Melhor Envio (necessário na compra da etiqueta).
  serviceId: number;
  company: string;
  service: string;
  price: number;
  deliveryDays: number;
}

// Dados de quem envia/recebe no formato do carrinho do Melhor Envio.
export interface LabelParty {
  name: string;
  email?: string;
  phone?: string;
  document?: string; // CPF (só dígitos)
  company_document?: string; // CNPJ (só dígitos)
  address: string;
  number: string;
  complement?: string;
  district?: string;
  city: string;
  state_abbr: string;
  postal_code: string;
}

export interface LabelRequest {
  serviceId: number;
  to: LabelParty;
  // Declaração de conteúdo (vai na etiqueta / SEFAZ).
  products: Array<{ name: string; quantity: number; unitary_value: number }>;
  // Correios só aceita 1 volume por etiqueta.
  volume: { width: number; height: number; length: number; weight: number };
  insuranceValue: number;
}

export interface LabelResult {
  meOrderId: string;
  protocol: string;
  price: number;
  status: string;
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;
}

// Caixa padrão quando o texto de dimensões da obra não é parseável
// (cotação conservadora).
export const DEFAULT_BOX = { width: 60, height: 70, length: 15 };
export const MIN_WEIGHT_KG = 0.3;

// Margens de embalagem (papelão + plástico bolha + cantoneiras), em cm.
const FLAT_MARGIN = 8; // telas/desenhos: margem em cada dimensão da face
const FLAT_DEPTH = 10; // telas têm ~2 cm de espessura; o resto é proteção
const SOLID_MARGIN = 6; // esculturas: margem por lado

// Deriva a embalagem a partir do texto livre de dimensões da obra
// ("62 × 43 cm" → pacote 70×51×10). Dois números = obra plana (tela/desenho);
// três = peça tridimensional (escultura); sem números = caixa padrão.
// Mínimos dos Correios (16×11×2) aplicados no final.
export function packageFor(dimensions?: string): { width: number; height: number; length: number } {
  const nums = (dimensions || '')
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map(n => parseFloat(n.replace(',', '.')))
    .filter(n => n > 0) ?? [];

  let dims: number[];
  if (nums.length === 2) {
    dims = [nums[0] + FLAT_MARGIN, nums[1] + FLAT_MARGIN, FLAT_DEPTH];
  } else if (nums.length >= 3) {
    dims = [nums[0] + SOLID_MARGIN, nums[1] + SOLID_MARGIN, nums[2] + SOLID_MARGIN];
  } else {
    return DEFAULT_BOX;
  }
  dims.sort((a, b) => b - a);
  return {
    length: Math.max(Math.ceil(dims[0]), 16),
    width: Math.max(Math.ceil(dims[1]), 11),
    height: Math.max(Math.ceil(dims[2]), 2),
  };
}

// Reduz os pacotes de várias obras a um volume único (Correios só aceita um
// volume por etiqueta): obras empilhadas na menor dimensão, faces pela maior.
export function mergeVolume(
  products: QuoteProduct[],
): { width: number; height: number; length: number; weight: number } {
  return products.reduce(
    (acc, p) => ({
      length: Math.max(acc.length, p.length),
      width: Math.max(acc.width, p.width),
      height: acc.height + p.height * p.quantity,
      weight: acc.weight + p.weight * p.quantity,
    }),
    { length: 0, width: 0, height: 0, weight: 0 },
  );
}

export function buildQuoteProduct(
  artwork: { _id: unknown; weight?: number; price?: number; dimensions?: string },
  quantity = 1,
): QuoteProduct {
  return {
    id: String(artwork._id),
    ...packageFor(artwork.dimensions),
    weight: Math.max(artwork.weight || 0, MIN_WEIGHT_KG),
    insurance_value: artwork.price || 0,
    quantity,
  };
}

@Injectable()
export class MelhorEnvioService {
  private readonly logger = new Logger(MelhorEnvioService.name);

  constructor(
    @InjectModel(ShippingToken.name)
    private tokenModel: Model<ShippingTokenDocument>,
  ) {}

  private get baseUrl(): string {
    return process.env.MELHORENVIO_SANDBOX === 'false'
      ? 'https://melhorenvio.com.br'
      : 'https://sandbox.melhorenvio.com.br';
  }

  private get redirectUri(): string {
    return `${process.env.PUBLIC_API_URL}/shipping/melhorenvio/callback`;
  }

  // O Melhor Envio exige User-Agent identificando a aplicação (e-mail de contato).
  private get userAgent(): string {
    return process.env.MELHORENVIO_USER_AGENT || 'andrevalenca (matheusachim@gmail.com)';
  }

  getAuthorizeUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.MELHORENVIO_CLIENT_ID || '',
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: OAUTH_SCOPES,
    });
    return `${this.baseUrl}/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<void> {
    await this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });
  }

  private async refresh(refreshToken: string): Promise<void> {
    await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  private async requestToken(extra: Record<string, string>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': this.userAgent },
      body: JSON.stringify({
        client_id: process.env.MELHORENVIO_CLIENT_ID,
        client_secret: process.env.MELHORENVIO_CLIENT_SECRET,
        ...extra,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      this.logger.error(`Falha ao obter token do Melhor Envio: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException('Não foi possível autorizar com o Melhor Envio');
    }
    await this.tokenModel.findOneAndUpdate(
      { provider: PROVIDER },
      {
        provider: PROVIDER,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: new Date(Date.now() + (data.expires_in ?? 0) * 1000),
      },
      { upsert: true },
    );
    this.logger.log('Token do Melhor Envio salvo/renovado');
  }

  async isAuthorized(): Promise<boolean> {
    return !!(await this.tokenModel.findOne({ provider: PROVIDER }).exec());
  }

  private async getAccessToken(): Promise<string> {
    const doc = await this.tokenModel.findOne({ provider: PROVIDER }).exec();
    if (!doc) {
      throw new ServiceUnavailableException(
        'Cotação de frete indisponível (Melhor Envio ainda não autorizado)',
      );
    }
    // Renova com 1 dia de folga para nunca cotar com token vencido.
    const nearExpiry = doc.expiresAt && doc.expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;
    if (nearExpiry && doc.refreshToken) {
      await this.refresh(doc.refreshToken);
      const renewed = await this.tokenModel.findOne({ provider: PROVIDER }).exec();
      return renewed!.accessToken;
    }
    return doc.accessToken;
  }

  async calculate(toCep: string, products: QuoteProduct[]): Promise<QuoteOption[]> {
    const fromCep = process.env.MELHORENVIO_FROM_CEP;
    if (!fromCep) {
      throw new ServiceUnavailableException(
        'Cotação de frete indisponível (CEP de origem não configurado)',
      );
    }
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': this.userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: fromCep.replace(/\D/g, '') },
        to: { postal_code: toCep.replace(/\D/g, '') },
        products,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`Falha na cotação Melhor Envio: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException('Não foi possível cotar o frete agora');
    }
    // A API devolve todas as transportadoras; as inviáveis vêm com "error".
    return (Array.isArray(data) ? data : [])
      .filter((o: any) => !o.error && o.price)
      .map((o: any) => ({
        serviceId: Number(o.id),
        company: o.company?.name ?? '',
        service: o.name,
        price: Number(o.price),
        deliveryDays: Number(o.delivery_time ?? o.delivery_range?.max ?? 0),
      }))
      .sort((a: QuoteOption, b: QuoteOption) => a.price - b.price);
  }

  // Chamada autenticada genérica à API do Melhor Envio. `fallbackError` vira a
  // mensagem pública quando a API recusa (a resposta crua vai só para o log).
  private async meFetch(path: string, body: unknown, fallbackError: string): Promise<any> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/api/v2${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': this.userAgent,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Melhor Envio ${path} falhou: ${JSON.stringify(data)}`);
      // A API costuma detalhar o motivo (ex.: saldo insuficiente) em
      // message/error — repassa ao admin para ele saber o que resolver.
      const detail = data?.message || data?.error;
      throw new ServiceUnavailableException(detail ? `${fallbackError}: ${detail}` : fallbackError);
    }
    return data;
  }

  // Remetente montado a partir de envs MELHORENVIO_FROM_* (endereço do ateliê).
  // CPF ou CNPJ: preencher só um dos dois (MELHORENVIO_FROM_CPF / _CNPJ).
  private senderFromEnv(): LabelParty {
    const env = (k: string) => (process.env[`MELHORENVIO_FROM_${k}`] || '').trim();
    const sender: LabelParty = {
      name: env('NAME'),
      email: env('EMAIL') || undefined,
      phone: env('PHONE') || undefined,
      document: env('CPF').replace(/\D/g, '') || undefined,
      company_document: env('CNPJ').replace(/\D/g, '') || undefined,
      address: env('ADDRESS'),
      number: env('NUMBER'),
      complement: env('COMPLEMENT') || undefined,
      district: env('DISTRICT') || undefined,
      city: env('CITY'),
      state_abbr: env('STATE'),
      postal_code: (process.env.MELHORENVIO_FROM_CEP || '').replace(/\D/g, ''),
    };
    const missing = (['name', 'address', 'number', 'city', 'state_abbr', 'postal_code'] as const)
      .filter(k => !sender[k]);
    if (!sender.document && !sender.company_document) missing.push('document' as any);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `Dados do remetente incompletos — configure as envs MELHORENVIO_FROM_* (faltando: ${missing.join(', ')})`,
      );
    }
    return sender;
  }

  // Compra a etiqueta de um envio: carrinho → pagamento (debita a carteira
  // Melhor Envio DE VERDADE) → geração → link de impressão → rastreio.
  // Se o pagamento falhar, o item é removido do carrinho (retry seguro).
  // Depois do pagamento, falhas em gerar/imprimir não são fatais: a etiqueta
  // já existe e o restante pode ser completado depois via refreshLabel().
  async buyLabel(req: LabelRequest): Promise<LabelResult> {
    const cartItem = await this.meFetch(
      '/me/cart',
      {
        service: req.serviceId,
        from: this.senderFromEnv(),
        to: req.to,
        products: req.products,
        volumes: [req.volume],
        options: {
          insurance_value: req.insuranceValue,
          receipt: false,
          own_hand: false,
          reverse: false,
          non_commercial: true, // venda de obra própria, sem NF-e
        },
      },
      'Não foi possível montar o envio no Melhor Envio',
    );
    const meOrderId = String(cartItem.id);

    try {
      await this.meFetch(
        '/me/shipment/checkout',
        { orders: [meOrderId] },
        'Não foi possível pagar a etiqueta',
      );
    } catch (err) {
      await this.removeFromCart(meOrderId);
      throw err;
    }

    const result: LabelResult = {
      meOrderId,
      protocol: cartItem.protocol ?? '',
      price: Number(cartItem.price ?? 0),
      status: 'paid',
    };
    return this.refreshLabel(result);
  }

  // Gera/imprime a etiqueta e busca o rastreio de um envio já pago; completa
  // os campos que faltam em `label` sem falhar (cada passo é best-effort).
  async refreshLabel(label: LabelResult): Promise<LabelResult> {
    const result = { ...label };
    try {
      await this.meFetch('/me/shipment/generate', { orders: [result.meOrderId] }, 'Falha ao gerar');
    } catch {
      // Já gerada ou ainda processando — o tracking abaixo conta a história.
    }
    try {
      const print = await this.meFetch(
        '/me/shipment/print',
        { orders: [result.meOrderId], mode: 'public' },
        'Falha ao obter link de impressão',
      );
      if (print?.url) result.labelUrl = String(print.url);
    } catch {}
    try {
      const tracking = await this.meFetch(
        '/me/shipment/tracking',
        { orders: [result.meOrderId] },
        'Falha ao consultar rastreio',
      );
      const info = tracking?.[result.meOrderId];
      if (info) {
        if (info.status) result.status = String(info.status);
        if (info.tracking) result.trackingCode = String(info.tracking);
        if (info.melhorenvio_tracking || info.tracking_url) {
          result.trackingUrl = String(info.tracking_url || info.melhorenvio_tracking);
        }
        if (info.protocol) result.protocol = String(info.protocol);
      }
    } catch {}
    return result;
  }

  private async removeFromCart(meOrderId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      await fetch(`${this.baseUrl}/api/v2/me/cart/${meOrderId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': this.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao limpar carrinho (item ${meOrderId})`, err as Error);
    }
  }

  // Webhooks do Melhor Envio assinam o corpo cru com HMAC-SHA256 (base64)
  // usando o client secret do app como chave (header X-ME-Signature).
  isValidWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const secret = process.env.MELHORENVIO_CLIENT_SECRET;
    if (!secret || !rawBody || !signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, 'base64');
    } catch {
      return false;
    }
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}
