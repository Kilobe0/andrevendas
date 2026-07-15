import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  company: string;
  service: string;
  price: number;
  deliveryDays: number;
}

// Caixa padrão enquanto as obras não têm dimensões de embalagem próprias
// (cotação conservadora; ajustar quando o admin ganhar campos de embalagem).
export const DEFAULT_BOX = { width: 60, height: 70, length: 15 };
export const MIN_WEIGHT_KG = 0.3;

export function buildQuoteProduct(
  artwork: { _id: unknown; weight?: number; price?: number },
  quantity = 1,
): QuoteProduct {
  return {
    id: String(artwork._id),
    ...DEFAULT_BOX,
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
        company: o.company?.name ?? '',
        service: o.name,
        price: Number(o.price),
        deliveryDays: Number(o.delivery_time ?? o.delivery_range?.max ?? 0),
      }))
      .sort((a: QuoteOption, b: QuoteOption) => a.price - b.price);
  }
}
