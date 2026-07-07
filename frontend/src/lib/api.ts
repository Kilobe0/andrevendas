// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ArtworkVariant {
  name: string;
  image: string;
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'EXHIBITION';
}

export interface Artwork {
  _id: string;
  title: string;
  slug: string;
  description: string;
  material: string;
  dimensions: string;
  weight?: string;
  year?: number;
  price: number;
  // Unidades ainda disponíveis (obras com cópias idênticas). Ausente = 1.
  quantity?: number;
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'EXHIBITION';
  featured: boolean;
  images: string[];
  variants?: ArtworkVariant[];
  category: Category;
  createdAt: string;
}

export interface Order {
  _id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  // Capturado do Mercado Pago no webhook (account_money, credit_card,
  // bank_transfer, ticket...). Vazio enquanto PENDING.
  paymentMethod?: string;
  totalAmount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  items: Array<{ artwork: string; title: string; price: number; image: string; variant?: string }>;
  createdAt: string;
}

// ─── Artworks ────────────────────────────────────────────
export const getArtworks = (params?: { category?: string; material?: string; status?: string }) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Artwork[]>(`/artworks${query ? `?${query}` : ''}`);
};

export const getFeaturedArtworks = () => apiFetch<Artwork[]>('/artworks/featured');

export const getArtworkBySlug = (slug: string) => apiFetch<Artwork>(`/artworks/${slug}`);

export const getRelatedArtworks = (id: string, categoryId: string) =>
  apiFetch<Artwork[]>(`/artworks/${id}/related?categoryId=${categoryId}`);

export const createArtwork = (data: Partial<Artwork>, token: string) =>
  apiFetch<Artwork>('/artworks', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateArtwork = (id: string, data: Partial<Artwork>, token: string) =>
  apiFetch<Artwork>(`/artworks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteArtwork = (id: string, token: string) =>
  apiFetch<void>(`/artworks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── Categories ──────────────────────────────────────────
export const getCategories = () => apiFetch<Category[]>('/categories');

// ─── Orders ──────────────────────────────────────────────
export const createOrder = (data: {
  customer: Order['customer'];
  items: Array<{ artworkId: string; variant?: string }>;
}) =>
  apiFetch<{ order: Order; initPoint: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getOrders = (token: string) =>
  apiFetch<Order[]>('/orders', { headers: { Authorization: `Bearer ${token}` } });

export const getOrderStats = (token: string) =>
  apiFetch<{ total: number; sold: number; revenue: number; pendingOrders: number }>(
    '/orders/stats',
    { headers: { Authorization: `Bearer ${token}` } },
  );

export const deleteOrder = (id: string, token: string) =>
  apiFetch<void>(`/orders/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── Auth ────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string; admin: { name: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// ─── Upload ──────────────────────────────────────────────
export const uploadImage = async (file: File, token: string): Promise<{ url: string }> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error('Falha no upload');
  return res.json();
};

// ─── Helpers ─────────────────────────────────────────────
export const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

// Rótulo de preço conforme o status. Peças de acervo (EXHIBITION) não têm preço de
// venda: mostram "Sob consulta" quando há um valor de referência (> 0) ou nada
// quando não há preço (ex.: obra que não existe mais). "Sob consulta" só aparece
// em obra disponível sem preço definido; vendida sem preço não exibe nada.
export const priceLabel = (artwork: Pick<Artwork, 'status' | 'price'>): string | null => {
  if (artwork.status === 'EXHIBITION') {
    return artwork.price > 0 ? 'Sob consulta' : null;
  }
  if (artwork.price <= 0) {
    return artwork.status === 'AVAILABLE' ? 'Sob consulta' : null;
  }
  return formatPrice(artwork.price);
};

// Classe de badge + texto por status, usado no card, no detalhe e no admin.
export const statusBadge = (status: Artwork['status']): { cls: string; label: string } => {
  switch (status) {
    case 'AVAILABLE':
      return { cls: 'badge-available', label: 'Disponível' };
    case 'EXHIBITION':
      return { cls: 'badge-exhibition', label: 'Acervo' };
    case 'RESERVED':
      return { cls: 'badge-reserved', label: 'Reservada' };
    default:
      return { cls: 'badge-sold', label: 'Vendida' };
  }
};

export const getImageUrl = (path: string) => {
  if (!path) return '/placeholder.jpg';
  if (path.startsWith('http')) {
    // Cloudinary: entrega otimizada — f_auto escolhe o melhor formato p/ o
    // navegador (AVIF/WebP) e q_auto ajusta a compressão sem perda visível.
    if (path.includes('res.cloudinary.com') && path.includes('/upload/') && !path.includes('/upload/f_auto')) {
      return path.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return path;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${path}`;
};
