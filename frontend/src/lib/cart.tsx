'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Artwork } from './api';

export interface CartItem {
  artwork: Artwork;
  quantity: 1; // Always 1 (unique pieces)
  variant?: string; // Pintura específica em obras de série (ex.: "Café — Azul")
}

interface CartContextType {
  items: CartItem[];
  addItem: (artwork: Artwork, variant?: string) => void;
  removeItem: (artworkId: string, variant?: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  hasItem: (artworkId: string, variant?: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const sameItem = (i: CartItem, id: string, variant?: string) =>
  i.artwork._id === id && (i.variant ?? null) === (variant ?? null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('av_cart');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('av_cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((artwork: Artwork, variant?: string) => {
    setItems(prev => {
      if (prev.find(i => sameItem(i, artwork._id, variant))) return prev;
      return [...prev, { artwork, quantity: 1, variant }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((artworkId: string, variant?: string) => {
    setItems(prev => prev.filter(i => !sameItem(i, artworkId, variant)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.artwork.price, 0);
  const count = items.length;
  const hasItem = (id: string, variant?: string) => items.some(i => sameItem(i, id, variant));

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, clearCart,
      total, count, isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      hasItem,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
